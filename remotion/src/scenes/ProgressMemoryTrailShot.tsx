import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ProgressMemoryTrailSceneProps } from "../types";
import { SafeZone } from "../SafeZone";
import { AmbientBackground } from "../AmbientBackground";
import { BE_VIETNAM_PRO } from "../styles";
import { p2Colors } from "./grabfoodP2Palette";

export const ProgressMemoryTrailShot: React.FC<ProgressMemoryTrailSceneProps> = ({
  headline,
  totalCells,
  filledCells,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const headlineOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const tugPhase = interpolate(frame, [totalCells * 8 + 40, totalCells * 8 + 100], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitOpacity = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: p2Colors.bg, fontFamily: BE_VIETNAM_PRO, overflow: "hidden" }}>
      <AbsoluteFill style={{ opacity: exitOpacity }}>
      <AmbientBackground accent={p2Colors.grab} />
      <SafeZone style={{ justifyContent: "center", flexDirection: "column", alignItems: "center" }}>
        <div style={{ fontSize: 40, fontWeight: 800, textAlign: "center", color: p2Colors.textPrimary, opacity: headlineOpacity, marginBottom: 48 }}>
          {headline}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, maxWidth: 720, justifyContent: "center" }}>
          {Array.from({ length: totalCells }).map((_, i) => {
            const start = i * 8;
            const enter = spring({ frame: frame - start, fps, config: { damping: 15, stiffness: 180 }, durationInFrames: 20 });
            const filled = i < filledCells;
            const tugOffset = filled ? Math.sin((tugPhase - i * 0.05) * Math.PI) * (filled ? -6 : 0) * tugPhase : 0;
            return (
              <div
                key={i}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 14,
                  background: filled ? p2Colors.grabDim : "rgba(255,255,255,0.05)",
                  border: `2px solid ${filled ? p2Colors.grab : "rgba(255,255,255,0.12)"}`,
                  boxShadow: filled ? `0 0 18px rgba(0,177,79,0.3)` : undefined,
                  opacity: Math.min(1, enter),
                  transform: `scale(${Math.min(1, enter)}) translateY(${tugOffset}px)`,
                }}
              />
            );
          })}
        </div>

        <div style={{ marginTop: 40, fontSize: 22, fontWeight: 700, color: p2Colors.textDim }}>
          {filledCells}/{totalCells}
        </div>
      </SafeZone>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default ProgressMemoryTrailShot;
