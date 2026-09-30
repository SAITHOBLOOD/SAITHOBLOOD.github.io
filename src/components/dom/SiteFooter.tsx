import Link from "next/link";
import { site } from "@/content/site";

export default function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-ink bg-ink px-5 pb-8 pt-16 text-paper md:px-8">
      <p className="font-mono text-[11px] uppercase tracking-[0.25em] opacity-60">¿Un encargo, un póster, una portada?</p>
      <a href={`mailto:${site.email}`} className="mt-4 block break-all font-display text-[11vw] italic leading-[0.9] hover:underline md:text-[7vw]">
        {site.email}
      </a>
      <div className="mt-16 flex flex-wrap items-end justify-between gap-6 font-mono text-[11px] uppercase tracking-[0.25em]">
        <div className="flex gap-6">
          {site.links.map((l) => (
            <a key={l.href} href={l.href} target="_blank" rel="noreferrer" className="ink-link">
              {l.label}
            </a>
          ))}
        </div>
        <p className="opacity-60">
          © {new Date().getFullYear()} {site.name} · {site.city} · <Link href="/info" className="ink-link">Info</Link>
        </p>
      </div>
    </footer>
  );
}
