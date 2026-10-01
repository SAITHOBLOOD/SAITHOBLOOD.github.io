# 🎯 Bitácora de Planificación & Auditoría (Dual-Agent)

> **Estado Actual**: `UNDER_AUDIT` (Esperando revisión de Claude)  
> **Participantes**: Antigravity (Arquitecto / Ejecutor) & Claude Desktop (Auditor Crítico / Red Team)

---

## 📌 1. Objetivo / Requerimiento del Usuario
**Corrección de errores en la visualización de colores e interacción de cursor sobre pinturas con color.**
- El usuario reporta: *"hay uno que otro error con respecto a los colores, teoricamente se deberia ver cuando pase el cursor sobre las pinturas con color"*.
- Las obras con color deben revelar su paleta original de forma limpia y fluida (efecto acuarela floreciendo bajo el puntero) tanto en las miniaturas 2D (Archivo, Showcase, Galería) como en los planos 3D (Hero y Pasillo).

---

## 📐 2. Diagnóstico & Propuesta Técnica (por Antigravity)

### Hallazgos de Errores en el Código:

1. **Bug Crítico en CSS (`src/app/globals.css`, L63-66)**:
   ```css
   .card:hover .card-media img,
   .card:hover .card-media canvas {
     filter: url(#ink-liquid) grayscale(1) contrast(1.35);
     transform: scale(1.03);
   }
   ```
   **Causa**: `.color-bloom` es una etiqueta `<img>` hija de `.card-media`. Cuando el cursor entra en la tarjeta (`.card:hover`), el selector genérico `img` le clava `grayscale(1)`. Por lo tanto, aunque la máscara radial de acuarela florezca, la imagen revelada se vuelve 100% blanco y negro. ¡El color quedaba neutralizado por el propio CSS!
   **Solución**: Excluir expresamente `.color-bloom` y `.spot-plate` del filtro de escala de grises:
   ```css
   .card:hover .card-media img:not(.color-bloom):not(.spot-plate),
   .card:hover .card-media canvas {
     filter: url(#ink-liquid) grayscale(1) contrast(1.35);
     transform: scale(1.03);
   }
   .card-media .color-bloom {
     filter: none !important;
   }
   ```

2. **Fragilidad de `@property --bloom` en navegadores**:
   `@property` para interpolar porcentajes en `mask-image: radial-gradient` no tiene soporte completo en navegadores anteriores o ciertos WebKit móviles.
   **Solución**: Implementar una animación de transición segura con fallback de opacidad / escala o soporte estándar para que en ningún navegador se quede atascado en 0%.

3. **Falta de `accent` en proyectos con piezas a color (`src/app/page.tsx` y `projects.ts`)**:
   Proyectos como `dino-west` o `tunhouse` tienen piezas a color en `results`, pero su portada (`results[0]`) es un boceto en blanco y negro. En `page.tsx`, `accent: accentOf(p)` solo evaluaba `cover`, por lo que el archivo marcaba `accent: undefined` y la miniatura no activaba la capa `has-color`.
   **Solución**:
   - `accent: accentOf(p) ?? p.results.find(r => r.accent)?.accent`
   - Permitir que si una pieza tiene color, su miniatura en la galería (`Gallery.tsx`) y en el showcase florezca con su acento respectivo.

4. **Ajuste en Shader 3D (`src/shaders/inkPlaneMaterial.ts`)**:
   En el shader, el radio de floración bajo el cursor `r = uHover * 0.45` es muy estrecho (un círculo de apenas 0.31 de radio efectivo). Aumentar el radio a `r = uHover * 0.85` para que el florecimiento de acuarela bajo el cursor sea claramente perceptible y espectacular al explorar las pinturas en 3D.

---

### Archivos a Modificar:
- `src/app/globals.css`: Corrección de selectores `.card:hover` y reglas de `.color-bloom`.
- `src/components/dom/Thumb.tsx`: Robustez de eventos pointer y fallback de revelado de color.
- `src/app/page.tsx`: Detección de color compuesta para el archivo (`accent`).
- `src/shaders/inkPlaneMaterial.ts`: Radio orgánico de acuarela en el shader `Tinta Líquida`.

### Verificación Propuesta:
- `npm run build` (cero errores TypeScript y SSG).
- Comprobación visual en navegador de hover sobre obras con color en Archivo, Portada 3D y Ficha de proyecto.

---

## 🔍 3. Auditoría & Crítica Técnica (por Claude Desktop)
Revisé el código y lo comprobé en el navegador (`localhost:3000`, 1280 px, hover real sobre una tarjeta
del Archivo con color). Resumen: **el punto 1 es el bug real y está bien diagnosticado, pero la solución
propuesta introduce una regresión**. Los puntos 2 y 4 no los apruebo; el 3 solo en parte.

#### Punto 1: bug de CSS → ✅ diagnóstico confirmado, ❌ solución con cambios
Medido con `getComputedStyle` durante el hover:
```
base        → url(#ink-liquid) grayscale(1) contrast(1.35)
spot-plate  → url(#ink-liquid) grayscale(1) contrast(1.35)   ← la segunda tinta también se vuelve gris
color-bloom → url(#ink-liquid) grayscale(1) contrast(1.35)   ← el color florece… en gris
```
Afecta al **Archivo** y a **Proyectos (showcase)**, que usan `.card` + `.card-media`. La **Galería** de la
ficha no está afectada (no va dentro de `.card`).

**Problema de la solución propuesta**: `img:not(.color-bloom):not(.spot-plate)` quita a esas capas el
`filter` y también el `transform: scale(1.03)`. Además, `filter: none !important` les quita la deformación
`#ink-liquid` (desplazamiento de hasta ±7 px). Resultado: la base se escala un 3 % y ondula, mientras el
color y la plancha se quedan quietos. Se ve una **imagen fantasma desalineada** en el borde de la mancha
de color. Las tres capas tienen que moverse juntas para quedar en registro.

**Opción A (recomendada, mínima)**: mismo filtro y misma escala en todas las capas, sin gris en las de color.
Sin `!important`: la especificidad (0,4,0) ya gana a la regla genérica (0,3,1).
```css
.card:hover .card-media img,
.card:hover .card-media canvas {
  filter: url(#ink-liquid) grayscale(1) contrast(1.35);
  transform: scale(1.03);
}
/* Capas de color: misma deformación y escala que la base (registro intacto), sin gris */
.card:hover .card-media .color-bloom {
  filter: url(#ink-liquid);
}
.card:hover .card-media .spot-plate {
  filter: url(#ink-liquid);
  transform: translate(1.5px, -1px) scale(1.03); /* conserva el fuera de registro de la plancha */
}
```
Con el mismo `<filter>` y el mismo tamaño de elemento, el ruido de desplazamiento sale idéntico en las tres
capas, así que se mantienen alineadas.

**Opción B (opcional, por rendimiento)**: hoy, al pasar el cursor por una fila del showcase, se activan hasta
6 miniaturas × 3 capas = **18 filtros SVG animados** a la vez (el `feTurbulence` tiene `<animate>` y se
redibuja en cada frame). Poner la deformación una sola vez en el contenedor lo baja a 6 y deja el registro
perfecto por construcción:
```css
.card:hover .card-media { filter: url(#ink-liquid); }
.card:hover .card-media img,
.card:hover .card-media canvas { transform: scale(1.03); }
.card:hover .card-media > img:first-child,
.card:hover .card-media canvas { filter: grayscale(1) contrast(1.35); }
.card:hover .card-media .spot-plate { transform: translate(1.5px, -1px) scale(1.03); }
```
Efecto secundario: en el showcase el borde de la miniatura también ondula. A mí me gusta, pero es una
decisión estética.

#### Punto 2: `@property --bloom` → ❌ no hace falta
`@property` funciona en Chrome/Edge 85+, Safari 16.4+ (iOS incluido) y Firefox 128+. Donde no existe, la
variable no se interpola pero **sí cambia**: el color aparece de golpe, no se queda en 0 %. Un fallback de
opacidad/escala añade complejidad y no corrige nada visible. Descartar.

#### Punto 3: `accent` de proyectos → ⚠️ solo en parte
Solo 3 proyectos tienen color fuera de la portada: `dino-west` (1/13 piezas), `nidra` (3/9, portada = póster
de vídeo) y `tunhouse` (4/5). Sus portadas son **en blanco y negro**.
- ✅ Sí: en `page.tsx`, `ArchiveItem.accent` con el color de cualquier pieza. Así aparecen el punto de color
  y el filtro «◐ Color» del Archivo. Usar `[...p.results, ...p.process]`, no solo `results`, para que entre
  `nidra`. Mismo patrón que ya usan `ProjectsShowcase` y la ficha.
- ❌ No: forzar `has-color` en esas miniaturas. La miniatura muestra la portada, que no tiene color: el
  «florecimiento» revelaría la misma imagen en gris y no hay plancha `-spot.webp` para ella. `Thumb` debe
  seguir leyendo `media.accent` de la imagen que dibuja.
- Galería y showcase **ya** usan el acento de cada pieza; no hay que tocarlos.
- Detalle: para esos 3 casos, el `title` del punto debería decir «Contiene piezas a color», no «Pieza con color».

#### Punto 4: radio del shader → ❌ 0.85 no
`d = distance(vUv, uMouse)` está en coordenadas UV (0–1). Con `r = 0.45`, el color es pleno hasta 0.31 y se
desvanece hasta 0.45, más ±0.15 de ruido: la mancha ya cubre del 60 al 90 % del ancho de la lámina. Con 0.85,
desde casi cualquier punto se colorea **la lámina entera**: desaparece el efecto «brota bajo el cursor» y
queda igual que el botón Color (`uColorReveal`).
- Si se quiere más presencia: **0.55 como máximo**.
- Mejora real (opcional): corregir el aspecto para que la mancha sea un círculo y no un óvalo en láminas
  verticales. Hacerlo **solo dentro del bloque de color** (`d` también alimenta la deformación):
  ```glsl
  vec2 asp = vec2(uPlaneSize.x / uPlaneSize.y, 1.0);
  float dc = distance(vUv * asp, uMouse * asp);   // usar dc en lugar de d en el bloom
  ```

#### `Thumb.tsx`
El plan dice «robustez de eventos pointer y fallback», pero no concreta nada. Con la opción A **no hace falta
tocarlo**. Si se cambia, que sea con un cambio concreto descrito aquí antes.

#### Móvil (no bloquea)
En táctil no hay hover: en Archivo y showcase solo se ve la plancha de color, y el color completo se ve al
abrir la foto en el visor de la ficha (allí no hay gris). Es aceptable. Si más adelante se quiere, se puede
florecer el color con `@media (hover: none)` cuando la tarjeta queda centrada en pantalla (IntersectionObserver).

#### Verificación que pido además del build
1. Hover en una tarjeta con punto de color del **Archivo** y en la fila de **tunhouse** del showcase: el color
   florece desde el cursor **sin borde fantasma** al 3 % de escala.
2. Botón Tinta/Color y galería de la ficha de `tunhouse` siguen igual.
3. Pasillo con `?quality=low` y `?quality=high`: el hover 3D sigue brotando bajo el cursor, no lámina completa.
4. 375 px: la plancha de color se ve y no hay errores de consola.

### Estado: ⚠️ APROBADO CON CAMBIOS
Aprobado ejecutar: **punto 1 con la opción A** (B opcional) y **punto 3 solo para el punto/filtro del Archivo**.
Descartados: punto 2 y el radio 0.85 del punto 4 (se acepta ≤ 0.55 y/o la corrección de aspecto).

---

## ⚖️ 4. Ajustes & Consenso Final
- **Veredicto de Antigravity**: ✅ Consenso alcanzado. Se adopta la Opción A de Claude (mismo `#ink-liquid` + escala sin escala de grises para conservar registro perfecto) y la detección compuesta de acento en `page.tsx`.
- **Veredicto de Claude**: ✅ Aprobado con cambios (Opción A en CSS, acento compuesto en Archivo).
- **Estado de Ejecución**: `APPROVED - LISTO PARA IMPLEMENTACIÓN`
