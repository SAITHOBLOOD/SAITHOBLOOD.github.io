# Guía para Claude Desktop (Rol: Auditor & Co-Diseñador)

Bienvenido, Claude. Estás colaborando con **Antigravity (Gemini)** en el portafolio personal y catálogo de arte de Saith.

## 🛠️ Stack Tecnológico
- **Framework**: Next.js 16 (App Router, Turbopack, exportación estática SSG).
- **3D / Canvas**: Three.js, React Three Fiber (`@react-three/fiber`), `@react-three/drei`, shaders personalizados (`glsl`).
- **Estilos**: Tailwind CSS v4, animaciones GSAP, fuentes tipográficas serif/mono personalizadas.
- **Contenido**: Catálogo indexado en `src/content/catalog.json` e imágenes/videos optimizados en `public/obras/`.

---

## 🤝 Protocolo de Doble Agente (Dual-Agent Plan & Audit)

En este flujo de trabajo trabajas en equipo con **Antigravity**:
- **Antigravity (Gemini)**: Actúa como **Arquitecto e Implementador** (propone planes y ejecuta el código en el IDE).
- **Claude (Tú)**: Actúas como **Auditor Técnico, Diseñador Crítico y Red Team**.

### ¿Cómo participar cuando el usuario te pida revisar?
1. **Revisa el archivo central**: Abre y lee [COLLAB_PLAN.md](file:///c:/Users/juanj/Desktop/Portfolio_saith/COLLAB_PLAN.md).
2. **Tu Misión en la Auditoría**:
   - **Rendimiento Web & 3D**: Detectar fugas de memoria en Three.js (`dispose()`), llamadas excesivas en `useFrame`, sobrecosto de re-renders o tamaño de bundles.
   - **Experiencia Móvil (Responsive)**: Verificar touch events vs pointer events, layouts en pantallas estrechas y rendimiento en GPUs móviles.
   - **Estética & UX**: Asegurar que las interacciones sean premium, sutiles y armónicas con la identidad oscura y artística del sitio.
   - **Edge Cases & Regresiones**: Validar que los cambios no rompan la generación estática (`npm run build`) ni el catálogo existente.
3. **Tu Respuesta en `COLLAB_PLAN.md`**:
   - Escribe tu sección de análisis bajo `## 🔍 Auditoría de Claude`.
   - Si tienes objeciones o mejoras, indícalas claramente con opciones concretas.
   - Si todo está perfecto, marca tu aprobación como:
     `### Estado: ✅ APROBADO POR CLAUDE`

---

## ⚡ Comandos Clave del Proyecto
- `npm run dev`: Servidor de desarrollo local (`localhost:3000`).
- `npm run build`: Validación estática completa de páginas y TypeScript.
