"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/#archivo", label: "Archivo", match: (p: string) => p === "/" || p.startsWith("/proyecto") },
  { href: "/pasillo", label: "Pasillo", match: (p: string) => p.startsWith("/pasillo") },
  { href: "/info", label: "Info", match: (p: string) => p.startsWith("/info") },
];

export default function SiteHeader({ name }: { name: string }) {
  const path = usePathname();
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-start justify-between p-5 text-paper mix-blend-difference md:p-8">
      <Link href="/" className="pointer-events-auto font-display text-2xl italic leading-none md:text-3xl">
        {name}
      </Link>
      <nav className="pointer-events-auto flex gap-5 font-mono text-[11px] uppercase tracking-[0.25em] md:gap-8">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className={`ink-link ${n.match(path) ? "is-active" : ""}`}>
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
