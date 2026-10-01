/** Datos del artista. EDITAR: todo lo marcado con ✎ es texto provisional. */
export const site = {
  name: "Saithoblood",
  role: "Ilustración · Animación · Grabado",
  city: "Tunja, Boyacá",
  /** Logo del artista (generado por `npm run ingest` desde la carpeta Logo de Drive). */
  logo: { paper: "/brand/logo-paper.webp", ink: "/brand/logo-ink.webp" },
  email: "hola@saithoblood.art", // ✎ provisional
  links: [
    { label: "Instagram", href: "https://www.instagram.com/saithobloodart/" },
    { label: "Behance", href: "https://behance.net/" }, // ✎
  ],
  statement:
    "Dibujo lo que queda cuando el sueño se retira: arquitecturas que no sostienen nada, ojos que miran hacia adentro, escaleras que terminan en el aire. Trabajo con tinta, grafito y grabado, y a veces dejo que las imágenes se muevan.", // ✎
  bio: [
    "Artista visual dedicado a la ilustración surrealista en blanco y negro. Su práctica cruza el dibujo tradicional, el grabado en relieve y la animación cuadro a cuadro.", // ✎
    "Ha realizado pósters, portadas, piezas editoriales y loops animados para músicos, editoriales y espacios culturales.", // ✎
  ],
  /** Portada: rutas fijas en public/hero (no dependen del catálogo). Si faltan, se usa el ojo procedural. */
  hero: {
    eye: "/hero/eye.webp", // cuadro fijo de «Dream 11» (iris centrado): el ojo solo sigue al cursor
    backdrop: "/hero/backdrop.mp4", // ojos con cabellera de tentáculos (Animación/Nuevo Plano 3)
    backdropPoster: "/hero/backdrop-poster.webp",
  },
  services: ["Ilustración editorial", "Pósters y portadas", "Animación 2D / loops", "Grabado y ediciones limitadas", "Murales"],
  timeline: [
    { year: 2025, text: "Exposición individual — «Pozos» (✎ lugar)" },
    { year: 2024, text: "Serie de pósters para ✎ festival" },
    { year: 2023, text: "Residencia de grabado — ✎ taller" },
    { year: 2022, text: "Colectiva «Tinta negra» — ✎ galería" },
  ],
};
