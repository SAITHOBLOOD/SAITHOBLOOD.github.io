/**
 * Datos del artista. El sitio está publicado: aquí solo va información REAL.
 * Lo que aún no se sabe queda vacío y su sección se oculta sola (email, recorrido).
 */
export const site = {
  name: "Saithoblood",
  role: "Ilustración · Animación · Bocetos",
  city: "Tunja, Boyacá",
  /** Logo del artista (generado por `npm run ingest` desde la carpeta Logo de Drive). */
  logo: { paper: "/brand/logo-paper.webp", ink: "/brand/logo-ink.webp" },
  /** Vacío = el contacto principal es Instagram. Poner aquí el correo real cuando lo haya. */
  email: "",
  links: [{ label: "Instagram", href: "https://www.instagram.com/saithobloodart/" }],
  /** Texto descriptivo (no es una cita del artista). Reemplazar por su propio texto cuando lo envíe. */
  statement:
    "Lo que queda cuando el sueño se retira: ojos que miran hacia adentro, criaturas de tinta y cuerpos entre la sombra y el papel. Ilustración en blanco y negro, bocetos a tinta y grafito, y animaciones que dejan moverse a las imágenes.",
  bio: [
    "Ilustración surrealista y oscura en blanco y negro: tinta, grafito y trazo digital, con rayado denso y mucho contraste.",
    "El archivo reúne piezas terminadas, bocetos, animaciones y proyectos completos.",
  ],
  /** Portada: rutas fijas en public/hero (no dependen del catálogo). Si faltan, se usa el ojo procedural. */
  hero: {
    eye: "/hero/eye.webp", // cuadro fijo de «Dream 11» (iris centrado): el ojo solo sigue al cursor
    backdrop: "/hero/backdrop.mp4", // ojos con cabellera de tentáculos (Animación/Nuevo Plano 3)
    backdropPoster: "/hero/backdrop-poster.webp",
  },
  /** Lo que se ve en su obra; ajustar con lo que el artista realmente ofrece. */
  services: ["Ilustración", "Pósters y portadas", "Animación 2D / loops", "Arte conceptual y bocetos"],
  /** Exposiciones, encargos, publicaciones… Vacío = la sección no se muestra. */
  timeline: [] as { year: number; text: string }[],
};

/** Enlace de contacto principal: correo si existe, si no Instagram. */
export const contactHref = site.email ? `mailto:${site.email}` : site.links[0].href;
export const contactLabel = site.email || "@saithobloodart";
