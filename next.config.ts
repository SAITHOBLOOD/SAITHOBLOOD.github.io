import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // GitHub Pages: genera /info/index.html (no info.html), así /info y /info/ funcionan las dos.
  // Sin esto, cualquier enlace compartido con barra final daba 404.
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
