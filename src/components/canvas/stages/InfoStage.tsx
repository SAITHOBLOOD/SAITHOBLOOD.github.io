"use client";

import GLStage from "../GLStage";
import StairScene from "../StairScene";

export default function InfoStage() {
  return (
    <GLStage className="absolute inset-0" background="#ecebe6" fog={["#ecebe6", 6, 14]} camera={{ fov: 40, position: [0, 0.5, 8] }} post={{ mix: 0.25, cellSize: 4, vignette: 0.15 }} fallback={<div className="paper-grain absolute inset-0 bg-paper" />}>
      <StairScene />
    </GLStage>
  );
}
