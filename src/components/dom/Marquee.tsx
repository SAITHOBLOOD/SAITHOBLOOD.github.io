/** Cinta tipográfica en movimiento (CSS puro). Se duplica el contenido para el bucle sin costuras. */
export default function Marquee({ items, className = "" }: { items: string[]; className?: string }) {
  const row = (hidden: boolean) => (
    <div className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {items.map((t, i) => (
        <span key={i} className="flex items-center">
          <span className="whitespace-nowrap px-6 font-display text-3xl italic md:text-5xl">{t}</span>
          <span className="font-mono text-sm opacity-60">✶</span>
        </span>
      ))}
    </div>
  );
  return (
    <div className={`marquee relative z-10 overflow-hidden border-y border-paper/25 bg-ink py-4 text-paper ${className}`}>
      <div className="marquee-track flex w-max">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
