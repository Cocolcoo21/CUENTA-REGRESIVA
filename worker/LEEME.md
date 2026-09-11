# Servicio de guardado

Esto es lo único del proyecto que no puede vivir dentro del repositorio, y vale
la pena entender por qué antes de montarlo.

La página es un archivo estático: GitHub Pages la entrega y nada más. Para que
además **escriba** en el repositorio hace falta un token de GitHub. Ese token no
puede ir dentro de `index.html`, por dos razones que no se arreglan con cuidado:

1. Cualquiera que abra el código fuente de la página lo vería. El repositorio es
   público y la página también.
2. GitHub revisa los repositorios públicos buscando credenciales. Encontraría el
   token y lo anularía solo, en cuestión de minutos.

Así que el token vive aquí, como secreto de un Worker de Cloudflare, donde el
navegador no lo alcanza. La página le pide a este servicio que guarde; el
servicio es quien habla con GitHub.

```
   navegador  ──GET/POST──▶  Worker  ──con el token──▶  GitHub
   (sin token)               (guarda el token)          data/hitos.json
```

Es gratis, no pide tarjeta y el plan gratuito da 100.000 pedidos al día: para
esto sobra con muchísimo margen.

---

## Montarlo (una sola vez, unos 15 minutos)

### 1. Crear el token de GitHub

En GitHub: **Settings → Developer settings → Personal access tokens → Fine-grained
tokens → Generate new token**.

| Campo | Qué poner |
|---|---|
| Token name | `cuenta-regresiva-cacom5` |
| Expiration | Lo más largo que ofrezca. Anótalo: cuando venza, la página deja de guardar |
| Repository access | **Only select repositories** → `CUENTA-REGRESIVA` |
| Permissions → Repository → **Contents** | **Read and write** |

Ningún permiso más. Con eso el token solo puede tocar los archivos de este
repositorio y nada más de la cuenta.

Copia el token al generarlo: GitHub no lo vuelve a mostrar. **No lo pegues en
ningún archivo del proyecto** — en el paso 3 se carga directo a Cloudflare.

### 2. Publicar el Worker

Desde la carpeta `worker/`:

```bash
npx wrangler deploy
```

La primera vez abre el navegador para crear la cuenta de Cloudflare o entrar a
la que ya tengas. Al terminar imprime la dirección del servicio, algo como
`https://cuenta-regresiva-cacom5.TU-CUENTA.workers.dev`. Guárdala.

### 3. Cargar el token

```bash
npx wrangler secret put GITHUB_TOKEN
```

Pega el token cuando lo pida. Queda guardado en Cloudflare, cifrado; ni siquiera
el panel lo vuelve a mostrar.

### 4. Decirle a la página dónde guardar

En `index.html`, cerca del comienzo del `<script>`, está la línea:

```js
  var SYNC_URL = "";
```

Ponle la dirección del paso 2:

```js
  var SYNC_URL = "https://cuenta-regresiva-cacom5.TU-CUENTA.workers.dev";
```

Esta dirección **sí** puede ir en el archivo: no es una credencial, es un
buzón. El token sigue en Cloudflare.

### 5. Revisar `wrangler.toml`

Comprueba que `REPO` sea el repositorio correcto y que `ORIGEN` sea la dirección
publicada de la página. Si cambias algo, `npx wrangler deploy` otra vez.

### 6. Subir y probar

```bash
git add -A && git commit -m "Conecta la página con el servicio de guardado" && git push
```

Espera a que GitHub Pages publique (un par de minutos), abre el enlace y
registra una actividad. Abajo a la derecha debe decir **«Guardado en el
repositorio»**. Ábrelo en otro dispositivo: la actividad tiene que estar ahí.

---

## Cómo se comporta

**Mientras `SYNC_URL` esté vacía**, la página funciona igual pero en modo
consulta: muestra lo que hay en `data/hitos.json` y cualquier cambio queda solo
en el navegador de quien lo hizo. No se rompe nada; simplemente no se comparte.

**Si el servicio se cae o no hay señal**, la página lo dice («Guardado en este
navegador») y el trabajo no se pierde: espera en el navegador, sobrevive a
recargar la página y se sube solo cuando el servicio vuelve.

**Si dos personas guardan a la vez**, el servicio responde `409` a la segunda con
la versión que acaba de quedar. La página une los dos trabajos —cada quien
conserva las actividades que tocó— y vuelve a intentar. No gana el último: se
quedan los dos, salvo que ambos hayan editado *la misma* actividad, donde sí
manda quien guardó de último.

---

## Lo que hay que tener presente

**Quien tenga el enlace puede editar.** Fue la decisión tomada: sin contraseñas,
sin cuentas, sin fricción. La consecuencia es que la página está en internet
abierto y no distingue entre quien debe cargar información y quien no. El
servicio revisa la *forma* de lo que recibe —topes de tamaño, campos conocidos,
máximo 500 actividades— así que nadie puede usarlo para meter cualquier cosa en
el repositorio, pero no puede saber quién está del otro lado.

Dos cosas la hacen reversible:

- **Todo cambio queda como un commit firmado con la hora.** Nada se pierde de
  verdad: `git revert` o `git checkout` de la versión anterior devuelve el
  archivo a como estaba.
- **Apagar la edición es una línea.** Dejar `SYNC_URL = ""` y publicar devuelve
  la página a modo consulta de inmediato, sin tocar los datos.

Si algún día hace falta cerrarla, la forma más barata es pedir una clave
compartida: el Worker compara una cabecera contra otro secreto y rechaza lo
demás. Son unas diez líneas en `index.js` y no cambia nada más.

**Cuando el token venza**, la página deja de guardar y empieza a decir «Guardado
en este navegador». Se genera uno nuevo (paso 1) y se vuelve a cargar con
`npx wrangler secret put GITHUB_TOKEN`. No hace falta publicar el Worker de
nuevo ni tocar la página.
