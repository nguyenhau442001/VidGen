import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { DualClockRouteSceneProps } from "../types";
import { SafeZone } from "../SafeZone";
import { AmbientBackground } from "../AmbientBackground";
import { BE_VIETNAM_PRO } from "../styles";
import { p2Colors, P2Icons } from "./shared/grabfoodP2Palette";

const MAP_DOTS = [
  { x: 180, y: 260 }, { x: 620, y: 180 }, { x: 860, y: 340 }, { x: 320, y: 420 },
  { x: 740, y: 520 }, { x: 140, y: 560 }, { x: 940, y: 640 }, { x: 460, y: 260 },
];

// Frame plan: a faint demand-heatmap sits behind everything from frame 0.
// The left column (published benefits) and right column (state while the
// mode is on) enter as staggered rows; once the right column's last row
// ("bản đồ nhu cầu không khả dụng") lands, the map dims and a small "lock"
// mark settles over it — the map itself demonstrates the trade-off instead
// of a static two-column list standing alone.
export const DualClockRouteShot: React.FC<DualClockRouteSceneProps> = ({
  headline,
  leftColumn,
  rightColumn,
  sourceLabel,
  footnote,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headlineOpacity = interpolate(frame, [0, 24], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const rightItemCount = rightColumn.items.length;
  const mapUnavailableAt = 90 + (rightItemCount - 1) * 18 + 20;
  const mapDim = interpolate(frame, [mapUnavailableAt, mapUnavailableAt + 30], [1, 0.22], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const lockOpacity = interpolate(frame, [mapUnavailableAt + 10, mapUnavailableAt + 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const sourceOpacity = interpolate(frame, [durationInFrames - 90, durationInFrames - 60], [0, 1], {
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

        {/* Demand map backdrop */}
        <svg
          width="1080"
          height="640"
          viewBox="0 0 1080 640"
          style={{ position: "absolute", top: 260, left: 0, opacity: mapDim * 0.5 }}
        >
          {MAP_DOTS.map((d, i) => {
            const pulse = 0.6 + Math.sin((frame - i * 6) / 12) * 0.3;
            return <circle key={i} cx={d.x} cy={d.y} r={10 + pulse * 4} fill={p2Colors.grab} opacity={0.35} />;
          })}
        </svg>
        {lockOpacity > 0 && (
          <div
            style={{
              position: "absolute",
              top: 500,
              left: "50%",
              transform: "translateX(-50%)",
              opacity: lockOpacity,
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.14)",
            }}
          >
            <P2Icons.Lock size={16} color={p2Colors.textDim} />
            <span style={{ fontSize: 13, fontWeight: 700, color: p2Colors.textDim, letterSpacing: 0.5 }}>
              BẢN ĐỒ NHU CẦU KHÔNG KHẢ DỤNG
            </span>
          </div>
        )}

        <SafeZone style={{ justifyContent: "flex-start", flexDirection: "column", alignItems: "center", paddingTop: 130 }}>
          <div
            style={{
              fontSize: 34,
              fontWeight: 800,
              lineHeight: 1.25,
              textAlign: "center",
              color: p2Colors.textPrimary,
              opacity: headlineOpacity,
              maxWidth: 880,
              marginBottom: 40,
            }}
          >
            {headline}
          </div>

          <div style={{ display: "flex", gap: 24, width: "100%", justifyContent: "center" }}>
            <div style={{ flex: 1, maxWidth: 420 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: p2Colors.grab, letterSpacing: 0.8, marginBottom: 14, textAlign: "center" }}>
                {leftColumn.label}
              </div>
              {leftColumn.items.map((item, i) => {
                const start = 20 + i * 16;
                const rowSpring = spring({ frame: frame - start, fps, config: { damping: 15, stiffness: 170 }, durationInFrames: 20 });
                return (
                  <div
                    key={i}
                    style={{
                      opacity: Math.min(1, rowSpring),
                      transform: `translateX(${(1 - Math.min(1, rowSpring)) * -24}px)`,
                      padding: "10px 16px",
                      marginBottom: 10,
                      borderRadius: 12,
                      background: p2Colors.grabDim,
                      border: `1px solid ${p2Colors.grab}`,
                      fontSize: 15,
                      fontWeight: 700,
                      color: p2Colors.textPrimary,
                      textAlign: "center",
                    }}
                  >
                    {item}
                  </div>
                );
              })}
            </div>

            <div style={{ width: 2, alignSelf: "stretch", background: "rgba(255,255,255,0.1)" }} />

            <div style={{ flex: 1, maxWidth: 420 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: p2Colors.textDim, letterSpacing: 0.8, marginBottom: 14, textAlign: "center" }}>
                {rightColumn.label}
              </div>
              {rightColumn.items.map((item, i) => {
                const start = 90 + i * 18;
                const rowSpring = spring({ frame: frame - start, fps, config: { damping: 15, stiffness: 170 }, durationInFrames: 20 });
                return (
                  <div
                    key={i}
                    style={{
                      opacity: Math.min(1, rowSpring),
                      transform: `translateX(${(1 - Math.min(1, rowSpring)) * 24}px)`,
                      padding: "10px 16px",
                      marginBottom: 10,
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.14)",
                      fontSize: 15,
                      fontWeight: 700,
                      color: p2Colors.textDim,
                      textAlign: "center",
                    }}
                  >
                    {item}
                  </div>
                );
              })}
            </div>
          </div>

          {(sourceLabel || footnote) && (
            <div style={{ position: "absolute", bottom: 40, left: 60, right: 60, opacity: sourceOpacity, textAlign: "center" }}>
              {sourceLabel && (
                <div style={{ fontSize: 15, fontWeight: 600, color: p2Colors.textDim }}>{sourceLabel}</div>
              )}
              {footnote && (
                <div style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>{footnote}</div>
              )}
            </div>
          )}
        </SafeZone>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default DualClockRouteShot;
