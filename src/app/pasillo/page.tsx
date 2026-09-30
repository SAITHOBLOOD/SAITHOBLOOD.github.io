import type { Metadata } from "next";
import Link from "next/link";
import { getProjects } from "@/content/projects";
import { catalogCode, displayTitle, toCoverItem } from "@/content/types";
import PasilloClient from "@/components/dom/PasilloClient";

export const metadata: Metadata = { title: "Pasillo" };

export default function Pasillo() {
  const projects = getProjects();
  return (
    <>
      <PasilloClient projects={projects.map(toCoverItem)} />
      <nav className="sr-only" aria-label="Obras">
        <ul>
          {projects.map((p) => (
            <li key={p.slug}>
              <Link href={`/proyecto/${p.slug}`}>
                {catalogCode(p)} {displayTitle(p)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
