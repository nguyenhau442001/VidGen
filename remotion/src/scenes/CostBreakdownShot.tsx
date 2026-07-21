import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { CostBreakdownSceneProps } from "../types";
import { SafeZone } from "../SafeZone";
import { AmbientBackground } from "../AmbientBackground";
import { BE_VIETNAM_PRO } from "../styles";
import { p3Colors } from "./grabfoodP3Palette";

// Frame plan: a merchant-side ledger panel (top) reveals its two cost rows
// one at a time, then a dashed connector draws down to a small "customer
// screen" panel (bottom) that only ever shows the first row — visualizing
// that the display fee stays invisible to the customer.
export const CostBreakdownShot: React.FC<CostBreakdownSceneProps> = ({
  merchantLabel = "PHÍA NHÀ HÀNG",
  merchantLines,
  customerLabel = "PHÍA KHÁCH HÀNG",
  customerValue,
  sourceLabel,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const panelOpacity = interpolate(frame, [0, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const connectorProgress = interpolate(frame, [70, 100], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const customerSpring = spring({ frame: frame - 96, fps, config: { damping: 15, stiffness: 150 }, durationInFrames: 24 });
  const sourceOpacity = interpolate(frame, [durationInFrames - 60, durationInFrames - 36], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitOpacity = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const ROW_START = 24;
  const ROW_GAP = 34;

  return (
    <AbsoluteFill style={{ backgroundColor: p3Colors.bg, fontFamily: BE_VIETNAM_PRO, overflow: "hidden" }}>
      <AbsoluteFill style={{ opacity: exitOpacity }}>
        <AmbientBackground accent={p3Colors.sponsor} />
        <SafeZone style={{ justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
          <div
            style={{
              opacity: panelOpacity,
              width: 640,
              borderRadius: 24,
              background: "rgba(255,255,255,0.045)",
              border: "1px solid rgba(255,255,255,0.12)",
              padding: "30px 32px",
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: 1.2, color: p3Colors.textDim, marginBottom: 18 }}>
              {merchantLabel}
            </div>
            {merchantLines.map((line, i) => {
              const start = ROW_START + i * ROW_GAP;
              const s = spring({ frame: frame - start, fps, config: { damping: 15, stiffness: 150 }, durationInFrames: 22 });
              return (
                <div
                  key={i}
                  style={{
                    opacity: Math.min(1, s),
                    transform: `translateY(${(1 - Math.min(1, s)) * 14}px)`,
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "12px 0",
                    borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <span style={{ fontSize: 20, fontWeight: 800, color: i === 0 ? p3Colors.textPrimary : p3Colors.sponsor }}>
                    {line.label}
                  </span>
                  <span style={{ fontSize: 21, fontWeight: 900, color: i === 0 ? p3Colors.cost : p3Colors.sponsor }}>
                    {line.value}
                  </span>
                </div>
              );
            })}
          </div>

          <svg width="4" height="70" style={{ marginTop: 4, marginBottom: 4 }}>
            <line
              x1="2"
              y1="0"
              x2="2"
              y2={70 * connectorProgress}
              stroke="rgba(255,255,255,0.35)"
              strokeWidth="3"
              strokeDasharray="6 8"
            />
          </svg>

          <div
            style={{
              opacity: Math.min(1, customerSpring),
              transform: `translateY(${(1 - Math.min(1, customerSpring)) * 16}px)`,
              width: 460,
              borderRadius: 20,
              background: p3Colors.paper,
              padding: "22px 28px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 1, color: "rgba(20,30,24,0.55)", marginBottom: 8 }}>
              {customerLabel}
            </div>
            <div style={{ fontSize: 30, fontWeight: 900, color: "#0e3b20" }}>{customerValue}</div>
          </div>

          {sourceLabel && (
            <div
              style={{
                marginTop: 26,
                fontSize: 14,
                fontWeight: 600,
                color: p3Colors.textDim,
                opacity: sourceOpacity,
                textAlign: "center",
                maxWidth: 640,
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

export default CostBreakdownShot;
