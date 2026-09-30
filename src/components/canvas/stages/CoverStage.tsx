"use client";

import type { ResultMedia } from "@/content/types";
import Thumb from "@/components/dom/Thumb";
import GLStage from "../GLStage";
import CoverScene from "../CoverScene";

/** Sin post-procesado: la portada debe verse fiel al dibujo original. */
export default function CoverStage({ media, alt }: { media: ResultMedia; alt: string }) {
  return (
    <GLStage className="absolute inset-0" background="#ecebe6" camera={{ fov: 30, position: [0, 0, 6] }} post={false} fallback={<Thumb media={media} alt={alt} priority sizes="60vw" className="h-full w-full" />}>
      <CoverScene media={media} />
    </GLStage>
  );
}
