"use client";

import type { CoverItem } from "@/content/types";
import StaticFallback from "@/components/dom/StaticFallback";
import GLStage from "../GLStage";
import Corridor from "../Corridor";

export default function PasilloStage({ projects, onIndex }: { projects: CoverItem[]; onIndex?: (i: number) => void }) {
  return (
    <GLStage className="fixed inset-0" background="#bdbcb8" fog={["#bdbcb8", 6, 34]} camera={{ fov: 50, position: [0, 0, 5] }} post={{ mix: 0.3, cellSize: 4, color: true }} fallback={<StaticFallback items={projects} />}>
      <Corridor projects={projects} onIndex={onIndex} />
    </GLStage>
  );
}
