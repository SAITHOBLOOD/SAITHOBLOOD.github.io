import Link from "next/link";
import { catalogCode, displayTitle, type ResultMedia } from "@/content/types";
import Thumb from "./Thumb";

/**
 * Degradación elegante (sin WebGL / reduced-motion / contexto perdido):
 * un collage estático de obras con la misma estética. Todo sigue navegable.
 */
export default function StaticFallback({ items }: { items: { slug: string; n: number; title?: string; cover: ResultMedia }[] }) {
  return (
    <div className="paper-grain absolute inset-0 overflow-hidden bg-fog">
      <ul className="absolute inset-0 grid grid-cols-3 gap-3 p-3 opacity-70 md:grid-cols-6">
        {items.slice(0, 12).map((p, i) => (
          <li key={p.slug} style={{ transform: `translateY(${(i % 3) * 24}px) rotate(${((i % 5) - 2) * 1.5}deg)` }}>
            <Link href={`/proyecto/${p.slug}`} aria-label={`${catalogCode(p)} ${displayTitle(p)}`}>
              <Thumb media={p.cover} alt="" sizes="16vw" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
