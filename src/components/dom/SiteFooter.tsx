import Link from "next/link";
import { contactHref, contactLabel, site } from "@/content/site";

export default function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-ink bg-ink px-5 pb-8 pt-16 text-paper md:px-8">
      <div className="flex items-start justify-between gap-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] opacity-60">¿Un encargo, un póster, una portada?</p>
        <img src={site.logo.paper} alt={`Logo de ${site.name}`} width={160} height={154} className="h-16 w-auto shrink-0 opacity-90 md:h-28" />
      </div>
      <a href={contactHref} target={site.email ? undefined : "_blank"} rel="noreferrer" className="mt-4 block break-all font-display text-[11vw] italic leading-[0.9] hover:underline md:text-[7vw]">
        {contactLabel}
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
