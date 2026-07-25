import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ProgressMemoryTrailSceneProps } from "../types";
import { SafeZone } from "../SafeZone";
import { AmbientBackground } from "../AmbientBackground";
import { BE_VIETNAM_PRO } from "../styles";
import { p2Colors } from "./shared/grabfoodP2Palette";

export const ProgressMemoryTrailShot: React.FC<ProgressMemoryTrailSceneProps> = ({
  headline,
  subheadline,
  totalCells,
  filledCells,
  illustrativeLabel,
  memoryFragments,
  morphCellsToRoad,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const headlineOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const labelOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const tugPhase = interpolate(frame, [totalCells * 8 + 40, totalCells * 8 + 100], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // Road-morph plays after the tug beat settles, in the shot's closing third.
  const roadMorph = morphCellsToRoad
    ? interpolate(frame, [totalCells * 8 + 110, totalCells * 8 + 160], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;
  const exitOpacity = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: p2Colors.bg, fontFamily: BE_VIETNAM_PRO, overflow: "hidden" }}>
      <AbsoluteFill style={{ opacity: exitOpacity }}>
      <AmbientBackground accent={p2Colors.grab} />
      <SafeZone style={{ justifyContent: "center", flexDirection: "column", alignItems: "center" }}>
        {illustrativeLabel && (
          <div
            style={{
              opacity: labelOpacity,
              marginBottom: 18,
              padding: "6px 16px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.16)",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 0.5,
              color: p2Colors.textDim,
            }}
          >
            {illustrativeLabel}
          </div>
        )}
        <div style={{ fontSize: 40, fontWeight: 800, textAlign: "center", color: p2Colors.textPrimary, opacity: headlineOpacity }}>
          {headline}
        </div>
        {subheadline && (
          <div style={{ fontSize: 24, fontWeight: 700, textAlign: "center", color: p2Colors.textDim, opacity: headlineOpacity, marginTop: 10 }}>
            {subheadline}
          </div>
        )}

        {memoryFragments && memoryFragments.length > 0 && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", maxWidth: 720, marginTop: 26, marginBottom: 8 }}>
            {memoryFragments.map((fragment, i) => {
              const start = 30 + i * 22;
              const fragOpacity = interpolate(frame, [start, start + 16, start + 90, start + 110], [0, 1, 1, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              const drift = interpolate(frame, [start, start + 110], [8, -6], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              return (
                <div
                  key={i}
                  style={{
                    opacity: fragOpacity,
                    transform: `translateY(${drift}px)`,
                    padding: "5px 12px",
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    fontSize: 13,
                    fontWeight: 600,
                    color: p2Colors.textDim,
                  }}
                >
                  {fragment}
                </div>
              );
            })}
          </div>
        )}

        {/* Cell size scales down as totalCells grows so the grid still packs
            into clean, evenly-filled rows (e.g. 10 per row at 20 cells)
            instead of leaving a lonely cell dangling on its own row. */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: totalCells > 12 ? 10 : 14,
            // 590px fits exactly 10 cells of 48px + 9×10px gaps per row —
            // keeps a 20-cell grid at an even 10-per-row instead of spilling
            // an odd count onto a lonely trailing row.
            maxWidth: totalCells > 12 ? 590 : 720,
            justifyContent: "center",
          }}
        >
          {Array.from({ length: totalCells }).map((_, i) => {
            const start = i * 8;
            const enter = spring({ frame: frame - start, fps, config: { damping: 15, stiffness: 180 }, durationInFrames: 20 });
            const filled = i < filledCells;
            const tugOffset = filled ? Math.sin((tugPhase - i * 0.05) * Math.PI) * (filled ? -6 : 0) * tugPhase : 0;
            const cellSize = totalCells > 12 ? 48 : 64;
            // Filled cells stretch into road-dash segments (wide, low, fully
            // rounded ends) so the tally reads as distance driven, not just
            // a completed checklist.
            const cellWidth = filled ? cellSize + (cellSize * 0.9 - cellSize) * roadMorph : cellSize;
            const cellHeight = filled ? cellSize - (cellSize - cellSize * 0.4) * roadMorph : cellSize;
            const cellRadius = filled
              ? (totalCells > 12 ? 10 : 14) + (cellHeight / 2 - (totalCells > 12 ? 10 : 14)) * roadMorph
              : totalCells > 12
              ? 10
              : 14;
            return (
              <div
                key={i}
                style={{
                  width: cellWidth,
                  height: cellHeight,
                  borderRadius: cellRadius,
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
