"use client";

import { useEffect, useMemo } from "react";
import { EffectComposer } from "@react-three/postprocessing";
import { HalftoneEffect, type HalftoneOptions } from "@/shaders/halftoneEffect";

export type PostFXProps = HalftoneOptions;

export default function PostFX({ cellSize = 4, mix = 0.35, grain = 0.1, dotGain, vignette, ink, paper, angle, color }: PostFXProps) {
  const halftone = useMemo(
    () => new HalftoneEffect({ cellSize, mix, grain, dotGain, vignette, ink, paper, angle, color }),
    [cellSize, mix, grain, dotGain, vignette, ink, paper, angle, color],
  );
  useEffect(() => () => halftone.dispose(), [halftone]);

  return (
    // multisampling 0: el antialias lo da la propia trama (fwidth) y ahorramos fill-rate.
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <primitive object={halftone} />
    </EffectComposer>
  );
}
