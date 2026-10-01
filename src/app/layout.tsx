import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, IBM_Plex_Mono } from "next/font/google";
import { site } from "@/content/site";
import SiteHeader from "@/components/dom/SiteHeader";
import Loader from "@/components/dom/Loader";
import "./globals.css";

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["400"], style: ["normal", "italic"], variable: "--font-cormorant", display: "swap" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400"], variable: "--font-plex-mono", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: `${site.name} — ${site.role}`, template: `%s — ${site.name}` },
  description: site.statement,
};

export const viewport: Viewport = { themeColor: "#0a0a0a" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${cormorant.variable} ${plexMono.variable}`}>
      <body className="antialiased">
        <Loader name={site.name} />
        <SiteHeader name={site.name} />
        {children}
      </body>
    </html>
  );
}
