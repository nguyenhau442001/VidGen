import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { PayerMatrixSceneProps } from "../types";
import { SafeZone } from "../SafeZone";
import { AmbientBackground } from "../AmbientBackground";
import { BE_VIETNAM_PRO } from "../styles";
import { p3Colors } from "./grabfoodP3Palette";

// Frame plan: three rows light up top-to-bottom, each row's left label
// glowing in for a beat before its description fades in beside it — reads
// like a short matrix/checklist of the three funding arrangements.
const ROW_START = 24;
const ROW_GAP = 46;
const SOURCE_START = ROW_START + 2 * ROW_GAP + 34; // after the 3rd row's description fades in

export const PayerMatrixShot: React.FC<PayerMatrixSceneProps> = ({ headline, rows, sourceLabel, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headlineOpacity = interpolate(frame, [0, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const sourceOpacity = interpolate(frame, [SOURCE_START, SOURCE_START + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitOpacity = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: p3Colors.bg, fontFamily: BE_VIETNAM_PRO, overflow: "hidden" }}>
      <AbsoluteFill style={{ opacity: exitOpacity }}>
        <AmbientBackground accent={p3Colors.grab} />
        <SafeZone style={{ justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
          {headline && (
            <div
              style={{
                opacity: headlineOpacity,
                fontSize: 26,
                fontWeight: 800,
                color: p3Colors.textDim,
                marginBottom: 36,
                textAlign: "center",
                maxWidth: 700,
              }}
            >
              {headline}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 22, width: 680 }}>
            {rows.map((row, i) => {
              const start = ROW_START + i * ROW_GAP;
              const labelSpring = spring({ frame: frame - start, fps, config: { damping: 14, stiffness: 170 }, durationInFrames: 20 });
              const descOpacity = interpolate(frame, [start + 10, start + 28], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              const glow = interpolate(frame, [start, start + 12, start + 28], [0, 1, 0.5], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              return (
                <div
                  key={i}
                  style={{
                    opacity: Math.min(1, labelSpring),
                    transform: `translateX(${(1 - Math.min(1, labelSpring)) * -24}px)`,
                    display: "flex",
                    alignItems: "center",
                    gap: 24,
                    padding: "20px 26px",
                    borderRadius: 18,
                    background: `rgba(0,177,79,${0.05 + glow * 0.1})`,
                    border: `1.5px solid rgba(0,177,79,${0.25 + glow * 0.45})`,
                  }}
                >
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 900,
                      color: p3Colors.grab,
                      minWidth: 150,
                      letterSpacing: 0.5,
                    }}
                  >
                    {row.label}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: p3Colors.textPrimary, opacity: descOpacity, lineHeight: 1.35 }}>
                    {row.description}
                  </div>
                </div>
              );
            })}
          </div>

          {sourceLabel && (
            <div
              style={{
                marginTop: 30,
                fontSize: 14,
                fontWeight: 600,
                color: p3Colors.textDim,
                opacity: sourceOpacity,
              }}
            >
              {sourceLabel}
            </div>
          )}
        </SafeZone>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default PayerMatrixShot;
