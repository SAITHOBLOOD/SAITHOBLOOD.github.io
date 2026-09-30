"use client";

import type { CoverItem } from "@/content/types";
import StaticFallback from "@/components/dom/StaticFallback";
import GLStage from "../GLStage";
import HeroScene, { type HeroVideos } from "../HeroScene";

export default function HomeStage({ projects, videos }: { projects: CoverItem[]; videos?: HeroVideos & { backdropPoster?: string; eyePoster?: string } }) {
  return (
    <GLStage
      className="absolute inset-0"
      background="#0a0a0a"
      fog={["#0a0a0a", 9, 22]}
      camera={{ position: [0, 0, 7] }}
      post={{ mix: 0.22, cellSize: 4, vignette: 0.35, color: true }}
      fallback={<HeroFallback projects={projects} videos={videos} />}
    >
      <HeroScene projects={projects} videos={videos} />
    </GLStage>
  );
}

/** Sin WebGL / reduced-motion: pósters estáticos (sin autoplay) con la misma composición. */
function HeroFallback({ projects, videos }: { projects: CoverItem[]; videos?: { backdropPoster?: string; eyePoster?: string } }) {
  if (!videos?.backdropPoster) return <StaticFallback items={projects} />;
  return (
    <div className="absolute inset-0 overflow-hidden bg-ink">
      <img src={videos.backdropPoster} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" />
      {videos.eyePoster && (
        <img src={videos.eyePoster} alt="" className="absolute left-1/2 top-1/2 w-[38vmin] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ clipPath: "circle(45.5%)" }} />
      )}
    </div>
  );
}
