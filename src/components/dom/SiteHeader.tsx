"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { site } from "@/content/site";

const NAV = [
  { href: "/#proyectos", label: "Proyectos", match: () => false },
  { href: "/#archivo", label: "Archivo", match: (p: string) => p === "/" || p.startsWith("/proyecto") },
  { href: "/pasillo", label: "Pasillo", match: (p: string) => p.startsWith("/pasillo") },
  { href: "/info", label: "Info", match: (p: string) => p.startsWith("/info") },
];

/**
 * Cabecera como etiquetas impresas (tinta + papel): se lee igual sobre el ojo blanco,
 * el morado de la portada o el papel del archivo. Sin mix-blend (que se perdía en medios tonos).
 */
export default function SiteHeader({ name }: { name: string }) {
  const path = usePathname();
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-start justify-between gap-3 p-3 md:p-5">
      <Link href="/" className="tag pointer-events-auto gap-2 px-2 py-1.5 font-display text-lg normal-case italic tracking-normal sm:px-2.5 sm:text-xl md:text-2xl" aria-label={`${name} — inicio`}>
        <img src={site.logo.paper} alt="" width={32} height={32} className="h-7 w-7 md:h-8 md:w-8" />
        <span className="hidden min-[400px]:inline">{name}</span>
      </Link>
      <nav className="tag pointer-events-auto gap-0 p-0" aria-label="Principal">
        {NAV.map((n, i) => {
          const active = n.match(path);
          return (
            <Link
              key={n.href}
              href={n.href}
              aria-current={active ? "page" : undefined}
              className={`px-2 py-2.5 text-[10px] tracking-[0.1em] transition-colors sm:px-3 sm:text-[11px] sm:tracking-[0.22em] md:px-4 ${i ? "border-l border-paper/25" : ""} ${active ? "bg-paper text-ink" : "hover:bg-paper/15"}`}
            >
              {n.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
