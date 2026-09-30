# Saith — Portafolio inmersivo

Next.js 16 · React Three Fiber 9 · GLSL · GSAP · Lenis · Tailwind 4

```bash
npm install
npm run dev        # http://localhost:3000
```

## Secciones

| Ruta | Qué es | 3D |
|---|---|---|
| `/` | Portada + **Archivo** (filtros, búsqueda por Nº/título, cuadrícula/índice, carga incremental) | Ojo a plumilla que sigue al cursor, puertas flotantes, anillo de obras |
| `/pasillo` | Recorrido inmersivo por **todo** el catálogo (filtrable por tipo) | Corredor infinito de puertas |
| `/proyecto/<slug>` | Ficha: portada, **timelapses de proceso** (arrastrables), fotos del resultado con visor, anterior/siguiente | Portada WebGL con tinta líquida |
| `/info` | Bio, encargos, recorrido, contacto | Escalera de caracol infinita |

Forzar calidad para QA: `?quality=high|mid|low|none`.

## Cargar las obras (flujo con Drive)

```bash
npm run sync     # baja SOLO lo nuevo de la carpeta pública de Drive a contenido/
npm run ingest   # optimiza lo nuevo y regenera el catálogo
```

La carpeta de Drive (`portafolio_saith`) está configurada en `scripts/drive-sync.mjs` (o variable `DRIVE_FOLDER_ID`).
Una carpeta en la raíz que no sea una categoría (p. ej. «Animación Aniversario Tunhouse») se trata como **un proyecto**.

Estructura esperada (la misma de Drive):
   ```
   contenido/
     Ilustración/   CECAELIA.jpg, 143 sin título.png …    ← cada archivo = 1 proyecto
     Bocetos/       IMG_20190419_161854354.jpg …
     Animación/     Resultado.mp4 …
     Ilustración/Mi proyecto/  01.jpg, 02.jpg, proceso/timelapse.mp4   ← subcarpeta = proyecto con varias fotos + timelapses
   ```
2. `npm run ingest` → comprime (AVIF/WebP en 3 tamaños + textura WebGL), nivela el papel de las fotos de celular,
   convierte vídeos a H.264 720p con póster, saca el año del nombre (`IMG_2019…`) y detecta los "sin título".
   **Incremental**: solo procesa lo nuevo, así que se puede correr cada vez que suban más cosas.
3. Nombres, descripciones y destacados sin renombrar archivos: `src/content/overrides.json` (clave = slug de la URL).
4. El catálogo demo está desactivado (`DEMO_CATALOG=false` en `.env`).
5. Textos del artista (bio, email, redes): `src/content/site.ts` (marcados con ✎).

Requiere `ffmpeg` en el PATH para los vídeos y los HEIC del iPhone. Obras sin fecha (ni en el nombre ni en EXIF) se muestran como «s. f.».

Documentación técnica completa: [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md)
