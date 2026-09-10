# Estado del proyecto — Actividades Relevantes CACOM 5

**Última actualización:** 10 de septiembre de 2026
**Documento vivo.** Al cerrar un pendiente o tomar una decisión, actualizarlo aquí en el mismo paso. Si este archivo y el código se contradicen, manda el código: entonces hay que corregir el documento.

---

## 1. Qué es

Página web de una sola pantalla que lleva la cuenta regresiva de las actividades relevantes del Comando Aéreo de Combate No. 5. Cada actividad muestra los días, horas, minutos y segundos que faltan para su fecha objetivo, actualizados cada segundo.

## 2. Cómo está construida

- **Un solo archivo:** `index.html`. Sin compilación, sin dependencias que instalar, sin servidor de aplicaciones. Se abre y funciona.
- **`assets/`** guarda el escudo del CACOM 5 en dos formatos. El que usa la página va incrustado dentro del HTML como texto (base64), no enlazado — así el archivo sigue siendo autónomo y el escudo se ve igual publicado, servido localmente o abierto desde el disco. Los de `assets/` son la fuente para futuras modificaciones.
- **Publicación:** GitHub Pages desde la rama `main`. Cada `push` a `main` actualiza la página publicada en un par de minutos.
- **Tipografías:** Archivo, IBM Plex Mono y Source Sans 3, cargadas desde Google Fonts. Todas tienen alternativa del sistema si no cargan.

### Verla en local

Desde la carpeta del repositorio:

```bash
python3 -m http.server 4173
```

Y abrir `http://localhost:4173`. Hace falta un servidor —no basta con abrir el archivo— porque abierto como archivo el navegador bloquea parte de lo que la página necesita.

## 3. Dónde viven los datos hoy

**En el navegador de cada persona** (`localStorage`), no en un servidor. Esto es lo más importante que hay que entender del estado actual:

- Cada quien ve **su propia copia**. Lo que carga una persona no lo ve nadie más.
- Los datos sobreviven al cerrar el navegador, pero se pierden si se borra el historial o se cambia de dispositivo.
- **Esto es lo que resuelve el pendiente número 1.** La página ya trae escrita la mitad de la maquinaria para leer los datos de un archivo compartido; hoy solo se activa dentro de un artefacto de Claude.

## 4. Lo que ya funciona

**Contador**
- Días, horas, minutos y segundos por actividad, al segundo.
- Fecha objetivo con hora opcional; si se deja vacía cuenta hasta las 00:00.
- Desglose en semanas y en calendario (años, meses, días).
- Las fechas ya pasadas siguen contando el tiempo transcurrido, en gris.
- Nivel de urgencia por color: inminente, próximo, en curso, pasada.
- Reloj y fecha en la banda superior.
- Resumen arriba: total de actividades, próximo vencimiento y fecha más cercana.

**Organización**
- Registro, edición y eliminación de actividades.
- Etiquetas por actividad, con filtro por etiqueta en barra propia y conteo por cada una. Se pueden combinar varias, hay grupo «Sin etiqueta», y se filtra con un clic desde la etiqueta de cualquier tarjeta. La comparación ignora mayúsculas y tildes.
- Sugerencias de etiquetas ya usadas al llenar el formulario.
- Filtro «Todos / Vigentes» y tres órdenes: más próximo, más lejano, alfabético.
- Estrella para destacar una actividad.
- El filtro, el orden y el tema quedan guardados entre visitas.

**Pantalla completa**
- Botón propio en cada tarjeta, que abre esa actividad.
- Contador gigante, fecha objetivo, etiquetas y descripción en grande.
- Navegación entre actividades con ‹ ›, flechas del teclado, `Esc` para salir y `F` para la pantalla completa real del navegador.
- Botón de editar dentro de la vista, que reutiliza el formulario de la página.
- Cuando el navegador no permite la API de pantalla completa (Safari en iPhone, o dentro de un marco), la capa cubre igual toda la ventana.

**Presentación**
- Escudo del CACOM 5 en la banda superior, en la vista a pantalla completa y como icono de la pestaña.
- Lenguaje visual *liquid glass*: superficies traslúcidas con desenfoque, geometría de píldora, banda superior fija que desenfoca el contenido que pasa por debajo.
- Modo día/noche con botón propio. Arranca siguiendo al sistema; en cuanto se pulsa manda la elección del usuario. Se aplica antes del primer pintado para que no haya destello.
- Respaldos: superficies casi sólidas en navegadores sin soporte de desenfoque, y también para quien tenga activado «reducir transparencia» en su sistema.
- Adaptada a celular y a pantallas grandes.

### Historial

| Commit | Fecha | Qué entró |
|---|---|---|
| `ceac4f3` | 2026-09-10 | Rediseño *liquid glass*, modo día/noche, pantalla completa siguiendo el tema, editar desde ella, «Descripción» más grande y reubicada |
| `ef43680` | 2026-09-10 | Escudo CACOM 5, filtro por etiquetas, vista a pantalla completa, título «Actividades Relevantes» |
| `76f725d` | 2026-08-31 | Mejoras visuales |
| `471a6eb` | 2026-08-28 | Corrección de formato del HTML |
| `457ffb2` | 2026-08-28 | Primera versión |

---

## 5. Lo que falta

### 5.1 Que la información sea común a todos — **prioridad**

Hoy cada quien ve su propia copia. El objetivo es que unas pocas personas designadas carguen la información y todos los demás la consulten.

**Camino elegido: Supabase** (base de datos gestionada, plan gratuito). Lectura abierta para cualquiera con el enlace; escritura solo para los editores autorizados, con correo y contraseña.

| Fase | Qué se hace | Quién | Tiempo |
|---|---|---|---|
| 0 | Publicar lo construido hasta hoy | — | ✅ hecho |
| 1 | Crear la cuenta y el proyecto en Supabase | Hernán | 30 min |
| 2 | Tablas y reglas de acceso (SQL listo para pegar) | Claude escribe, Hernán ejecuta | 30 min |
| 3 | Conectar la página: leer y escribir en la base, modo solo lectura sin sesión, copia local para cuando no haya señal, refresco automático | Claude | 3–4 h |
| 4 | Invitar a los editores por correo | Hernán | 20 min |
| 5 | Probar con dos sesiones a la vez y entregar instrucciones | ambos | 30 min |

**Riesgos anotados:**
- El proyecto gratuito **se pausa tras cerca de una semana sin uso**. Se reactiva en un clic desde el panel y no se pierde nada, pero alguien tiene que entrar a hacerlo.
- La información queda en un servicio comercial fuera del país. Decisión ya tomada y consciente: se descartó la vía institucional para no depender de trámites con terceros.
- Con varios editores hay que definir qué pasa si dos guardan a la vez. Acordado: **gana el último que guarda**, dejando registro de quién y cuándo.

**Por qué no las otras opciones**
- *Colaboradores de GitHub editando desde la página:* funciona, pero obliga a cada editor a crear cuenta de GitHub y generar un token. Demasiada fricción para quienes no son técnicos.
- *SharePoint / Microsoft 365 institucional:* era la opción más limpia —autenticación institucional, auditoría, datos adentro— pero exige coordinar con quien administre el tenant. Descartada por decisión explícita.
- *Servidor propio en infraestructura interna:* correcta a largo plazo, descartada por el mismo motivo y por el esfuerzo.

**Si algún día se quiere llevar adentro:** los datos son una tabla simple, se exportan a un archivo y se migran en minutos. No hay encierro.

### 5.2 Decidir la visibilidad del repositorio

El repositorio es **público** y GitHub Pages está activo, así que las actividades que se carguen quedan visibles en internet e indexables. Hoy no expone nada porque todavía no hay información real cargada.

Punto a tener en cuenta al decidir: en cuenta gratuita, **volver privado el repositorio desactiva GitHub Pages**. Privado y publicado no se pueden tener a la vez por esa vía; habría que mover la publicación a otro lado.

### 5.3 Pendientes menores

- **Unificar el vocabulario.** La interfaz todavía dice «hito» en varios sitios («Hitos registrados», «Hito o compromiso», «cambiar de hito») mientras el título dice «Actividades». Conviene dejar una sola palabra.
- **Botón de día/noche dentro de la pantalla completa.** Hoy hay que cambiar el modo antes de entrar.
- **Pantalla completa siempre oscura, opcional.** Hoy sigue el tema. Si se va a proyectar en pared podría convenir forzarla oscura; son dos líneas.

---

## 6. Reglas de este repositorio

- **Es público.** Nada de lo que se suba aquí debe contener información que no pueda estar en internet abierto.
- **Nunca subir credenciales.** Cuando llegue Supabase habrá dos claves: la pública puede ir en la página (así está diseñada), y la de servicio **no puede salir del panel de Supabase** bajo ninguna circunstancia. El `.gitignore` ya bloquea los archivos donde suelen quedar por descuido, pero el `.gitignore` no protege de pegarlas dentro de `index.html`.
- **El token de GitHub** se guarda en el Llavero de macOS, no en la URL del remoto ni en ningún archivo del repositorio.
