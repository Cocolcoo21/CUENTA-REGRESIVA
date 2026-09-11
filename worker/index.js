// Guardado de las actividades en el repositorio.
//
// Este es el único pedazo del proyecto que no puede vivir dentro del repo, y
// la razón es concreta: para escribir en GitHub hace falta un token, y el
// repositorio es público. Un token escrito en index.html quedaría a la vista
// de cualquiera que abra el código fuente de la página —y GitHub, que revisa
// los repositorios públicos buscando credenciales, lo anularía solo en
// cuestión de minutos. Así que el token vive aquí, como secreto del Worker,
// donde nadie lo lee desde el navegador.
//
// La página habla con este servicio de dos maneras:
//
//   GET   ->  { sha, data }        la versión vigente del archivo
//   POST  ->  { sha, autor, data } guarda, si nadie cambió el archivo antes
//
// El POST lleva el `sha` sobre el que se hicieron los cambios. Si en el
// entretanto otra persona guardó, el sha ya no coincide y se responde 409 con
// la versión nueva: la página une los dos trabajos y vuelve a intentar. Nadie
// pierde lo que escribió por haber guardado un segundo más tarde.

const RUTA = "data/hitos.json";
const GH = "https://api.github.com";

// Topes de tamaño. Cualquiera con el enlace puede guardar, así que el servicio
// no da por buena la información que recibe: la revisa antes de escribirla.
const MAX_BYTES = 256 * 1024;
const MAX_ENTRIES = 500;
const MAX_HIST = 40;

export default {
  async fetch(pedido, env) {
    const origen = cabecerasCORS(pedido, env);

    if (pedido.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: origen });
    }

    const cfg = {
      repo: env.REPO,
      rama: env.RAMA || "main",
      token: env.GITHUB_TOKEN
    };
    if (!cfg.repo || !cfg.token) {
      return json({ error: "El Worker no tiene configurado REPO o GITHUB_TOKEN" }, 500, origen);
    }

    try {
      if (pedido.method === "GET") return await leer(cfg, origen);
      if (pedido.method === "POST") return await guardar(pedido, cfg, origen);
    } catch (e) {
      return json({ error: String(e && e.message ? e.message : e) }, 502, origen);
    }
    return json({ error: "Solo se admiten GET y POST" }, 405, origen);
  }
};

// ---------------------------------------------------------------- lectura

async function leer(cfg, origen) {
  const r = await gh(cfg, `/repos/${cfg.repo}/contents/${RUTA}?ref=${cfg.rama}`);

  // Primera vez: el archivo todavía no existe en el repositorio.
  if (r.status === 404) {
    return json({ sha: null, data: { v: 1, entries: [], historial: [] } }, 200, origen);
  }
  if (!r.ok) return json({ error: `GitHub respondió ${r.status}` }, 502, origen);

  const meta = await r.json();
  let data;
  try {
    data = JSON.parse(decodeURIComponent(escape(atob(meta.content.replace(/\n/g, "")))));
  } catch (e) {
    return json({ error: "El archivo del repositorio no es un JSON legible" }, 502, origen);
  }
  return json({ sha: meta.sha, data }, 200, origen);
}

// ---------------------------------------------------------------- escritura

async function guardar(pedido, cfg, origen) {
  const crudo = await pedido.text();
  if (crudo.length > MAX_BYTES) {
    return json({ error: "La información recibida es demasiado grande" }, 413, origen);
  }

  let cuerpo;
  try { cuerpo = JSON.parse(crudo); }
  catch (e) { return json({ error: "El cuerpo del pedido no es JSON" }, 400, origen); }

  const limpio = revisar(cuerpo && cuerpo.data);
  if (!limpio) return json({ error: "La información no tiene la forma esperada" }, 400, origen);

  // ¿Sigue el archivo como estaba cuando esta persona empezó a editar?
  const actual = await gh(cfg, `/repos/${cfg.repo}/contents/${RUTA}?ref=${cfg.rama}`);
  let shaActual = null;
  let dataActual = null;
  if (actual.ok) {
    const meta = await actual.json();
    shaActual = meta.sha;
    try {
      dataActual = JSON.parse(decodeURIComponent(escape(atob(meta.content.replace(/\n/g, "")))));
    } catch (e) { dataActual = null; }
  } else if (actual.status !== 404) {
    return json({ error: `GitHub respondió ${actual.status}` }, 502, origen);
  }

  const shaEnviado = (cuerpo && typeof cuerpo.sha === "string") ? cuerpo.sha : null;
  if (shaActual !== shaEnviado) {
    return json({ conflicto: true, sha: shaActual, data: dataActual }, 409, origen);
  }

  const autor = String((cuerpo && cuerpo.autor) || "").trim().slice(0, 40);
  const cuerpoPUT = {
    message: mensajeCommit(autor, limpio),
    content: b64(JSON.stringify(limpio, null, 2) + "\n"),
    branch: cfg.rama
  };
  if (shaActual) cuerpoPUT.sha = shaActual;

  const puesto = await gh(cfg, `/repos/${cfg.repo}/contents/${RUTA}`, {
    method: "PUT",
    body: JSON.stringify(cuerpoPUT)
  });

  // GitHub también detecta la carrera por su lado.
  if (puesto.status === 409 || puesto.status === 422) {
    return json({ conflicto: true, sha: shaActual, data: dataActual }, 409, origen);
  }
  if (!puesto.ok) {
    const detalle = await puesto.text();
    return json({ error: `GitHub respondió ${puesto.status}`, detalle: detalle.slice(0, 300) }, 502, origen);
  }

  const hecho = await puesto.json();
  return json({ sha: hecho.content && hecho.content.sha, commit: hecho.commit && hecho.commit.sha }, 200, origen);
}

function mensajeCommit(autor, data) {
  const n = data.entries.length;
  const ultimo = data.historial && data.historial[0];
  const quien = autor || (ultimo && ultimo.quien) || "alguien";
  let qué = "actualiza las actividades";
  if (ultimo && ultimo.titulo) {
    const verbo = { crear: "registra", editar: "actualiza", borrar: "elimina",
                    destacar: "destaca", "quitar-destacado": "quita el destacado de" };
    qué = `${verbo[ultimo.accion] || "cambia"} «${ultimo.titulo}»`;
  }
  return `${qué} (${n} ${n === 1 ? "actividad" : "actividades"}) — ${quien}`;
}

// ---------------------------------------------------------------- revisión

// Se queda solo con los campos conocidos y recorta lo que venga de más. Lo que
// no pase por aquí no llega al repositorio.
function revisar(data) {
  if (!data || typeof data !== "object" || !Array.isArray(data.entries)) return null;
  if (data.entries.length > MAX_ENTRIES) return null;

  const texto = (v, n) => String(v == null ? "" : v).slice(0, n);
  const fecha = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? String(v) : null);

  const entries = [];
  for (const e of data.entries) {
    if (!e || typeof e !== "object") return null;
    const f = fecha(e.fecha);
    if (!f) return null;
    entries.push({
      id: texto(e.id, 40) || ("h" + Math.random().toString(36).slice(2, 9)),
      titulo: texto(e.titulo, 120),
      fecha: f,
      hora: /^\d{2}:\d{2}$/.test(String(e.hora)) ? String(e.hora) : "",
      nota: texto(e.nota, 600),
      etiquetas: Array.isArray(e.etiquetas)
        ? e.etiquetas.slice(0, 12).map((t) => texto(t, 40)).filter(Boolean)
        : [],
      destacado: e.destacado === true,
      creado: fecha(e.creado) || new Date().toISOString().slice(0, 10)
    });
  }

  const historial = (Array.isArray(data.historial) ? data.historial : [])
    .slice(0, MAX_HIST)
    .filter((h) => h && typeof h === "object" && !isNaN(Date.parse(h.ts)))
    .map((h) => ({
      ts: new Date(h.ts).toISOString(),
      quien: texto(h.quien, 60),
      accion: texto(h.accion, 24),
      titulo: texto(h.titulo, 120)
    }));

  return { v: 1, actualizado: new Date().toISOString(), entries, historial };
}

// ---------------------------------------------------------------- auxiliares

function gh(cfg, ruta, extra) {
  return fetch(GH + ruta, {
    method: (extra && extra.method) || "GET",
    headers: {
      "Authorization": `Bearer ${cfg.token}`,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "cuenta-regresiva-cacom5",
      "Content-Type": "application/json"
    },
    body: extra && extra.body
  });
}

function b64(txt) {
  return btoa(unescape(encodeURIComponent(txt)));
}

function cabecerasCORS(pedido, env) {
  // Solo se atiende a la página publicada. Si no se configura ORIGEN, se
  // atiende a cualquiera: cómodo para probar, conviene fijarlo después.
  const permitido = env.ORIGEN || "*";
  const suyo = pedido.headers.get("Origin") || "";
  const valor = permitido === "*" ? "*"
    : (permitido.split(",").map((o) => o.trim()).includes(suyo) ? suyo : permitido.split(",")[0].trim());
  return {
    "Access-Control-Allow-Origin": valor,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

function json(obj, status, cabeceras) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: Object.assign({
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }, cabeceras)
  });
}
