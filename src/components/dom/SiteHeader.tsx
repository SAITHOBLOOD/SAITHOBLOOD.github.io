"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
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
      <Link href="/" className="tag pointer-events-auto px-3 py-2 font-display text-xl normal-case italic tracking-normal md:text-2xl" aria-label={`${name} — inicio`}>
        {name}
      </Link>
      <nav className="tag pointer-events-auto gap-0 p-0" aria-label="Principal">
        {NAV.map((n, i) => {
          const active = n.match(path);
          return (
            <Link
              key={n.href}
              href={n.href}
              aria-current={active ? "page" : undefined}
              className={`px-3 py-2.5 transition-colors md:px-4 ${i ? "border-l border-paper/25" : ""} ${active ? "bg-paper text-ink" : "hover:bg-paper/15"}`}
            >
              {n.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
