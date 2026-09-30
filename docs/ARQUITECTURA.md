# Saith — Portafolio inmersivo · Documento técnico

> Surrealismo monocromático: grabado, tinta expandida, papel y grano.
> Principio rector: **el navegador es la prensa**. Todo el pipeline de render existe
> para que cada píxel parezca impreso, no renderizado.


> **v2 (2026-09-30)** — rediseño para catálogos grandes tras revisar el material real (Drive):
> plumilla de rayado denso, fotos de celular con fecha en el nombre, PNG de Procreate de hasta 67 MB, mayoría "sin título".
> Cambios: archivo escalable con Nº de catálogo, proyectos multi-foto + timelapses, ingesta por carpetas (`npm run ingest`),
> 4 escenas 3D (ojo, pasillo sobre todo el catálogo, portada, escalera), shader **C «Plumilla»** (rayado cruzado para geometría 3D),
> y el shader A ahora muestra la obra **fiel en reposo** (la binarización solo ocurre bajo el cursor, para no destruir el rayado).
> Ver README para el flujo de contenido. Las secciones siguientes describen la base; donde difieran, manda el código.

---

## 1. Arquitectura y stack

### 1.1 Justificación de librerías

| Capa | Elección | Por qué |
|---|---|---|
| Framework | **Next.js 16 (App Router, Turbopack)** | SSG de cada obra (`generateStaticParams`) → SEO y compartir en redes con HTML real; el 3D se carga como chunk aparte solo en cliente (`dynamic(..., { ssr:false })`) y no bloquea el LCP. `next/image` sirve AVIF/WebP para el DOM/fallback. |
| Render 3D | **three r186 + React Three Fiber 9** | R3F da un grafo de escena declarativo que convive con el árbol React (routing, contexto y estado compartidos; R3F hace de puente de contexto automáticamente). El loop imperativo (`useFrame`) muta refs sin re-renders. |
| Helpers 3D | **@react-three/drei 10** | `shaderMaterial` (uniforms tipados + HMR), `useKTX2`, `useTexture`, `useVideoTexture`, `PerformanceMonitor`, `Preload`. Evita reescribir loaders y utilidades probadas. |
| Post-procesado | **postprocessing 6 + @react-three/postprocessing 3** | `EffectComposer` **fusiona todos los efectos en un único pass** de pantalla completa (vs. `EffectComposer` de three, que hace un pass por efecto). Crítico para fill-rate en móvil. |
| Animación | **GSAP 3 + @gsap/react** | Timelines precisas para intros, revelados y transiciones de página; `useGSAP` limpia automáticamente (StrictMode-safe). Animamos uniforms directamente (`gsap.to(mat.uniforms.uX, { value })`). |
| Scroll | **Lenis** (modo `infinite`) | Scroll suave nativo (no secuestra el DOM ni rompe accesibilidad/teclado), con `animatedScroll` sin envolver = profundidad infinita para la cámara. **GSAP es el único reloj**: `gsap.ticker` llama a `lenis.raf` → un solo rAF para DOM, scroll y ScrollTrigger. |
| Estilos | **Tailwind CSS 4** | Tokens de marca en `@theme` (`ink`, `paper`, `fog`), cero CSS muerto. La capa DOM es mínima (tipografía, overlay, fallback). |
| Detección de GPU | **detect-gpu** | Clasifica la GPU (tier 0–3, móvil) con benchmarks reales → decide la calidad antes de montar el canvas. |

**Descartados a propósito:** Theatre.js (no necesitamos editor de timeline aún), Rapier/cannon (la "física" de la dinámica 2 se resuelve en GPU con una simulación de fluidos, más barata y más estética), glslify (los chunks GLSL como template strings evitan configurar loaders en Turbopack).

### 1.2 Estructura de carpetas

```
src/
├─ app/                        # Rutas (Server Components por defecto)
│  ├─ layout.tsx               # Fuentes (next/font), metadata
│  ├─ page.tsx                 # Home: SmoothScroll + CanvasRoot + Overlay + índice sr-only
│  ├─ globals.css              # Tailwind 4 @theme, grano CSS del fallback
│  └─ work/[slug]/page.tsx     # Ficha SSG por obra (SEO, OG, deep-link)
├─ components/
│  ├─ canvas/                  # Todo lo que vive dentro de <Canvas> (solo cliente)
│  │  ├─ CanvasRoot.tsx        # dynamic import ssr:false → chunk 3D separado
│  │  ├─ Experience.tsx        # <Canvas>, tiers, context-loss, PerformanceMonitor
│  │  ├─ ContextLossGuard.tsx  # webglcontextlost/restored → UI
│  │  ├─ Corridor.tsx          # Dinámica 1: pasillo infinito con reciclado de slots
│  │  ├─ WorkMedia.tsx         # Despacho por tipo: placeholder | image | ktx2 | video
│  │  ├─ WorkPlane.tsx         # Malla + InkPlaneMaterial + interacción
│  │  └─ PostFX.tsx            # EffectComposer + HalftoneEffect
│  └─ dom/                     # Capa HTML
│     ├─ SmoothScroll.tsx      # Lenis ↔ GSAP ticker ↔ scrollState
│     ├─ Overlay.tsx           # Tipografía, caption de la obra en hover
│     └─ StaticFallback.tsx    # Grid B/N sin WebGL (graceful degradation)
├─ content/works.ts            # Modelo de datos + getWorks()/getWork() (swap a CMS)
├─ lib/
│  ├─ quality.tsx              # Detección de tier + presets + contexto
│  ├─ scroll-state.ts          # Puente DOM→GL mutable (sin re-renders)
│  ├─ ui-store.ts              # Puente GL→DOM para eventos discretos (hover)
│  └─ placeholder-texture.ts   # Láminas procedurales mientras no hay assets
└─ shaders/
   ├─ noise.glsl.ts            # Chunks: hash, value noise, fBm, luma
   ├─ inkPlaneMaterial.ts      # Shader A (material)
   └─ halftoneEffect.ts        # Shader B (post)
public/
├─ works/                      # Assets finales (cache immutable vía next.config)
└─ basis/                      # Transcoder KTX2 auto-hospedado
```

**Regla de fronteras:** `components/canvas/*` nunca importa DOM; `components/dom/*` nunca importa three. Se comunican solo por `lib/scroll-state` (continuo, por frame) y `lib/ui-store` (discreto, por evento).

### 1.3 Modelo de contenido

`Work` (ver `src/content/works.ts`) discrimina el medio con una unión etiquetada:

- `kind`: `poster | animation | sketch` → filtros, rutas y comportamiento (las animaciones usan `VideoTexture`).
- `media`: `image` (AVIF/WebP + `ktx2` opcional) · `video` (MP4 + WebM + póster) · `placeholder` (seed procedural).
- `ink`: parámetros artísticos **por obra** que llegan como uniforms (`threshold`, `bleed`) → el artista puede "entintar" cada pieza distinto sin tocar código.
- `series`, `tags`, `featured` para agrupaciones y navegación.

Migración a CMS (Sanity/Payload): mantener la firma de `getWorks()`; añadir webhook de revalidación (`revalidateTag('works')`).

---

## 2. Concepto creativo de navegación

### Dinámica 1 — «El Pasillo de las Puertas» (implementada en el boilerplate)

Un corredor infinito de umbrales de tinta que se pierde en la niebla. **Scroll = caminar.**

- Las obras cuelgan entre puertas, alternando lados. Al acercarte, **se abren hacia los lados como hojas de puerta** y te dejan pasar; una luna que nunca se acerca (se mueve con la cámara) rompe la lógica espacial.
- **Infinito real con coste constante:** N slots (≥10) se reciclan con aritmética modular al quedar detrás de la cámara (`wrap()` en `Corridor.tsx`). 10 obras o 200 → mismo número de draw calls visibles.
- La **velocidad** del scroll alimenta: inclinación de cámara (`rotation.z`), curvatura del papel (vértices) y estiramiento vertical (fragment).
- Hover: la tinta sangra desde el cursor y la lámina ondula; el caption tipográfico aparece en el DOM. Click → `/work/[slug]`.
- Extensiones previstas: puertas "equivocadas" que giran 90° el corredor (el scroll pasa a mover la cámara en Y — escalera de Escher); transición a la ficha donde la obra "se despega" y llena la pantalla (GSAP Flip de un plano 3D a un `<img>` con la misma bounding box).

### Dinámica 2 — «La Mesa de Grabado» (canvas de tinta viva)

Un plano infinito de papel visto cenitalmente, cubierto de tinta líquida. **El cursor es un pincel/raedor.**

- Una **simulación de fluidos 2D en GPU** (Navier–Stokes estable, ping-pong de FBOs a ¼ de resolución) mueve la tinta: arrastrar deja estelas, la velocidad del cursor inyecta fuerza, la tinta se difunde y "seca" (disipación).
- Las obras están **sumergidas bajo la tinta**: el campo de densidad actúa como máscara; donde el usuario raspa, la obra emerge (como un mezzotinto al revés). Al soltar, la tinta vuelve a cerrarse lentamente → invita a explorar.
- Navegación: drag para desplazar la mesa (inercia con Lenis/`gsap.quickTo`), rueda para zoom (cámara ortográfica). Las obras se agrupan por serie en "islas".
- Click sobre una obra: una prensa (plano negro) baja, y al levantarse la obra queda "impresa" limpia — transición a la ficha.
- Móvil: el dedo reemplaza al cursor; en tier `low` se sustituye la simulación por una máscara de ruido animada + trail de puntos (sin FBO).

Ambas dinámicas comparten `content/`, `shaders/` y la capa DOM; se pueden ofrecer como dos "salas" (`/` y `/mesa`) o alternar con un toggle.

---

## 3. Pipeline de shaders

Orden de render: **escena (materiales Shader A) → EffectComposer (Shader B, un solo pass) → pantalla**. Todo en espacio lineal con `flat` (sin tone mapping): el blanco y negro lo decidimos nosotros, no ACES.

### Shader A — «Tinta Líquida» (material por obra) · `src/shaders/inkPlaneMaterial.ts`

| Uniform | Tipo | Función |
|---|---|---|
| `uTexture` | sampler2D | Obra (CanvasTexture / KTX2 / Video) |
| `uPlaneSize`, `uImageSize` | vec2 | Cover-fit en shader (`object-fit: cover`) |
| `uMouse` | vec2 | UV del cursor (raycast de R3F → `e.uv`) |
| `uHover` | float | 0→1, amortiguado en CPU (`MathUtils.damp`) |
| `uReveal` | float | Disolución de entrada animada con GSAP |
| `uThreshold`, `uBleed` | float | Parámetros artísticos por obra (`work.ink`) |
| `uScrollVelocity` | float | Curvatura y estiramiento por inercia |
| `uWaves` | float | Desactiva la onda de vértices en tier `low` |

**Vertex:** onda concéntrica desde `uMouse` (`sin(d·22 − t·4)` con caída `smoothstep`) × `uHover`; curvatura tipo hoja `sin(uv.y·π) · velocity`. Malla 48×48 (tier high/mid) o 1×1 (low).

**Fragment:**
1. **Domain warping** (Íñigo Quílez): `q = fbm(uv·3 ± t)`, `warp = fbm(uv·3 + 2q)` → desplazamiento de UV localizado alrededor del cursor. Da la sensación de tinta todavía húmeda.
2. **Binarización de grabado:** `ink = smoothstep(th ± 0.03, luma)` con `th = uThreshold + (fbm(uv·60) − 0.5)·0.18 + bleed`. El fBm de alta frecuencia simula la fibra del papel → bordes irregulares. `bleed` crece cerca del cursor → **la tinta avanza** sobre la imagen.
3. **Grano** con `hash12` animado (amplitud 0.08).
4. **Revelado:** un frente que avanza sobre un campo fBm con un filo de tinta húmeda (`rim`).

Coste: ~12 evaluaciones de value noise por fragmento; aceptable porque las obras ocupan una fracción de la pantalla. Si hiciera falta: precomputar el fBm en una textura de ruido 256² tileable.

### Shader B — «Imprenta» (post-procesado) · `src/shaders/halftoneEffect.ts`

Clase `HalftoneEffect extends Effect` (postprocessing): se fusiona con cualquier otro efecto futuro en el mismo pass.

1. **Trama AM rotada** (45° por defecto, `uCellSize` px): radio del punto `r = √(1 − tono) · 0.72` → **el área del punto es proporcional a la densidad de tinta**, como una trama offset real (una trama lineal en radio oscurece de más los medios tonos).
2. **Antialiasing analítico:** `smoothstep(r ± fwidth(d))` → puntos nítidos a cualquier DPR sin MSAA (por eso `multisampling={0}`).
3. **Ganancia de punto:** `r += dotGain · (1 − tono) · 0.15` → en sombras los puntos se funden, como la tinta en papel poroso.
4. **Registro desalineado:** muestrea `inputBuffer` desplazado ~0.6 texel con una órbita lenta → vibración sutil de impresión.
5. **Mezcla** `uMix` entre tono continuo y trama (0.55) para no destruir el detalle fino de las obras.
6. **Grano a 24 fps** (`floor(time·24)` como semilla) → se siente filmado, no digital. **Viñeta** de entintado.
7. Salida: `mix(uInk, uPaper, t)` → paleta de dos tintas controlable (papel crema, tinta azul-negra, etc.).

### Shader C — «Plumilla» (geometría 3D) · `src/shaders/hatchMaterial.ts`

Half-lambert + rim → tono; 4 capas de trazos en espacio de pantalla (45°, −45°, 0°, 90°) que aparecen bajo umbrales
de tono cada vez más oscuros (tonal art map simplificado), con temblor fBm de "mano", contorno por fresnel y motas de tinta.
Soporta `InstancedMesh` (`#ifdef USE_INSTANCING`). Lo usan el ojo, las puertas y la escalera: los objetos 3D quedan
dibujados como los grabados del artista.

### Shader D (roadmap, Dinámica 2) — «Fluido de tinta»

Passes a ¼ de resolución, `HalfFloatType`: `advect(velocity) → splat(cursor) → divergence → pressure (Jacobi ×20) → gradient subtract → advect(density)`. La densidad se compone en el material de las obras como máscara (`mix(obra, tinta, density)`) antes del Shader B. Presupuesto: <2 ms/frame en GPU integrada. Referencia: GPU Gems cap. 38 (Stam, "Stable Fluids").

---

## 4. Dependencias y herramientas

### 4.1 NPM (instaladas en este repo)

```bash
npm i next react react-dom three @react-three/fiber @react-three/drei \
      @react-three/postprocessing postprocessing gsap @gsap/react lenis detect-gpu
npm i -D typescript @types/react @types/react-dom @types/node @types/three \
      tailwindcss @tailwindcss/postcss
```

Recomendadas al crecer:

| Paquete | Uso |
|---|---|
| `r3f-perf` (dev) | Overlay de draw calls, GPU ms, memoria de texturas |
| `leva` (dev) | Panel para tunear uniforms en vivo con el artista |
| `@gltf-transform/cli` (dev) | Compresión Draco/Meshopt + KTX2 de glTF |
| `sharp` (dev) | Script de build para AVIF/WebP/blurDataURL |
| `zustand` | Si el estado GL↔DOM crece más allá de `ui-store` |
| `maath` | Easing/damp/random utilitarios para R3F |

### 4.2 Pipeline de assets

**Ilustraciones (escaneos/TIFF → web)**
1. Escaneo 600 dpi en escala de grises 16-bit; limpieza de niveles en Photoshop/Affinity (negro puro, papel sin amarillear — el color del papel lo pone el shader).
2. Master a 4096 px lado mayor.
3. **DOM/fallback/OG:** `sharp` → AVIF (q≈50) + WebP (q≈75) en 640/1280/2048 + `blurDataURL` de 16 px.
4. **GPU:** KTX2 **UASTC + zstd** para obras en primer plano (calidad), **ETC1S** para miniaturas/lejanas (tamaño). Mip-maps obligatorios (evitan moiré con el halftone).
   ```bash
   toktx --t2 --encode uastc --uastc_quality 2 --zcmp 19 --genmipmap --assign_oetf srgb obra.ktx2 obra.png
   ```
   Lado máximo 2048 (móvil) / 4096 (desktop high) — servir según tier.
5. Copiar el transcoder Basis de `node_modules/three/examples/jsm/libs/basis/` a `public/basis/`.

**Animaciones (loops 2D)**
```bash
# MP4 H.264 (compatibilidad universal, iOS)
ffmpeg -i loop.mov -vf "scale=1280:-2,format=gray,format=yuv420p" -c:v libx264 -crf 24 -preset slow -movflags +faststart -an loop.mp4
# WebM AV1 (≈40% menor)
ffmpeg -i loop.mov -vf "scale=1280:-2,format=gray" -c:v libsvtav1 -crf 38 -an loop.webm
# Póster
ffmpeg -i loop.mov -frames:v 1 -vf scale=1280:-2 loop-poster.avif
```
Monocromo = el codec gasta casi todos los bits en luminancia → archivos muy pequeños. Reproducir solo los vídeos visibles (pausar fuera del frustum).

**Mallas 3D (Blender → web)** — para elementos escenográficos (puertas talladas, escaleras, objetos surrealistas)
1. Modelado low-poly; el detalle va en **normal/AO bakeados** a texturas en escala de grises (el halftone hace el resto; no hace falta PBR complejo).
2. Export glTF 2.0 (`.glb`), +Y up, transformaciones aplicadas, sin cámaras/luces.
3. Compresión:
   ```bash
   npx @gltf-transform/cli optimize in.glb out.glb --compress draco --texture-compress ktx2 --texture-size 2048
   ```
   (Meshopt en lugar de Draco si hay animación de huesos/morphs.)
4. Carga con `useGLTF(url, true /* draco */)` de drei; decoder Draco auto-hospedado en `public/draco/`.
5. Presupuesto: <50k triángulos en escena, <30 draw calls, <64 MB VRAM de texturas en móvil.

**Otras herramientas:** Blender 4.x (modelado/bake), Krita/Procreate (texturas de tinta y manchas), Squoosh (pruebas puntuales), KTX-Software (`toktx`, `ktx info`), Spector.js (inspección de draw calls), Chrome Performance + `r3f-perf`.

### 4.3 Rendimiento y degradación (implementado)

| Mecanismo | Dónde |
|---|---|
| Tiers `high / mid / low / none` con detect-gpu + `prefers-reduced-motion` + `saveData` | `lib/quality.tsx` |
| Override de QA `?quality=high\|mid\|low\|none` | `lib/quality.tsx` |
| DPR adaptativo en caliente con `PerformanceMonitor` (baja a 1 si caen los fps) | `Experience.tsx` |
| Sin post-procesado ni ondas de vértice en `low` | `Experience.tsx`, `WorkPlane.tsx` |
| Pérdida de contexto: overlay → restauración; si no vuelve en 4 s → fallback DOM | `ContextLossGuard.tsx`, `Experience.tsx` |
| Chunk 3D diferido (`ssr:false`) + Suspense por obra | `CanvasRoot.tsx`, `WorkMedia.tsx` |
| Reciclado de slots (coste constante) | `Corridor.tsx` |
| Índice semántico `sr-only` + fichas SSG → SEO y lectores de pantalla | `page.tsx`, `work/[slug]` |

Pendiente para producción: auto-hospedar benchmarks de detect-gpu, `IntersectionObserver`/frustum para pausar vídeos, precarga de las 3 texturas siguientes según dirección de scroll, `frameloop="demand"` cuando la pestaña/escena está quieta, focus visible y navegación por teclado entre obras (flechas → scroll a slot).
