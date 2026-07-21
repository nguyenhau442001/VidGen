import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { LedgerEntrySceneProps } from "../types";
import { SafeZone } from "../SafeZone";
import { AmbientBackground } from "../AmbientBackground";
import { BE_VIETNAM_PRO } from "../styles";
import { p3Colors, P3Icons } from "./grabfoodP3Palette";

// Frame plan: a small "Tạo ưu đãi" toggle switches on (0-30) representing the
// restaurant authoring its own promo, then the scene settles into a ledger
// card whose rows fade/slide in top-to-bottom, one at a time (40+), with the
// cost row rendered in red to read as the debited line.
const TOGGLE_FRAME = 14;

export const LedgerEntryShot: React.FC<LedgerEntrySceneProps> = ({
  eyebrow,
  toggleLabel = "Tạo ưu đãi",
  lineItems,
  sourceLabel,
  illustrativeLabel,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const toggleSpring = spring({ frame: frame - TOGGLE_FRAME, fps, config: { damping: 16, stiffness: 180 }, durationInFrames: 20 });
  const toggleOn = Math.min(1, toggleSpring);
  const cardOpacity = interpolate(frame, [36, 56], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cardY = interpolate(frame, [36, 56], [24, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const badgeOpacity = interpolate(frame, [8, 24], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const sourceOpacity = interpolate(frame, [durationInFrames - 60, durationInFrames - 36], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitOpacity = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const ROW_START = 60;
  const ROW_GAP = 26;

  return (
    <AbsoluteFill style={{ backgroundColor: p3Colors.bg, fontFamily: BE_VIETNAM_PRO, overflow: "hidden" }}>
      <AbsoluteFill style={{ opacity: exitOpacity }}>
        <AmbientBackground accent={p3Colors.grab} />
        <SafeZone style={{ justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
          {illustrativeLabel && (
            <div
              style={{
                position: "absolute",
                top: 0,
                opacity: badgeOpacity,
                padding: "8px 18px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.16)",
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: 0.5,
                color: p3Colors.textDim,
              }}
            >
              {illustrativeLabel}
            </div>
          )}

          <div
            style={{
              opacity: interpolate(frame, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
              display: "flex",
              alignItems: "center",
              gap: 14,
              marginBottom: 30,
            }}
          >
            <P3Icons.Store size={26} />
            {eyebrow && <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: 1, color: p3Colors.textDim }}>{eyebrow}</span>}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "12px 20px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.14)",
              marginBottom: 34,
            }}
          >
            <span style={{ fontSize: 17, fontWeight: 700, color: p3Colors.textPrimary }}>{toggleLabel}</span>
            <div
              style={{
                width: 46,
                height: 26,
                borderRadius: 999,
                background: `rgba(0,177,79,${0.25 + toggleOn * 0.55})`,
                border: `1.5px solid ${p3Colors.grab}`,
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 2,
                  left: 2 + toggleOn * 20,
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: "#fff",
                }}
              />
            </div>
          </div>

          <div
            style={{
              opacity: cardOpacity,
              transform: `translateY(${cardY}px)`,
              width: 640,
              borderRadius: 24,
              background: "rgba(255,255,255,0.045)",
              border: "1px solid rgba(255,255,255,0.12)",
              padding: "34px 34px 30px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
              <P3Icons.Ledger size={22} />
              <span style={{ fontSize: 18, fontWeight: 800, color: p3Colors.textDim, letterSpacing: 0.5 }}>SỔ ĐỐI SOÁT</span>
            </div>

            {lineItems.map((row, i) => {
              const start = ROW_START + i * ROW_GAP;
              const s = spring({ frame: frame - start, fps, config: { damping: 15, stiffness: 150 }, durationInFrames: 20 });
              const rowColor = row.emphasis ? p3Colors.cost : p3Colors.textPrimary;
              return (
                <div
                  key={i}
                  style={{
                    opacity: Math.min(1, s),
                    transform: `translateX(${(1 - Math.min(1, s)) * -16}px)`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "14px 0",
                    borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <span
                    style={{
                      fontSize: row.emphasis ? 21 : 19,
                      fontWeight: row.emphasis ? 900 : 600,
                      color: row.emphasis ? p3Colors.cost : p3Colors.textDim,
                      letterSpacing: row.emphasis ? 0.4 : 0,
                    }}
                  >
                    {row.label}
                  </span>
                  <span style={{ fontSize: row.emphasis ? 24 : 20, fontWeight: 900, color: rowColor }}>{row.value}</span>
                </div>
              );
            })}
          </div>

          {sourceLabel && (
            <div
              style={{
                marginTop: 26,
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

export default LedgerEntryShot;
