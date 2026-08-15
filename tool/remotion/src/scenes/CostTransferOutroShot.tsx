import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { CostTransferOutroSceneProps } from "../types";
import { SafeZone } from "../SafeZone";
import { AmbientBackground } from "../AmbientBackground";
import { BE_VIETNAM_PRO } from "../styles";
import { p3Colors } from "./shared/grabfoodP3Palette";

// Frame plan: the discount pill cycles between the three destination
// silhouettes (Nhà hàng / Grab / Nhãn hàng) while the narration explains the
// payer isn't fixed, then everything fades to black and the two closing
// lines print on a bare screen — a silent card, no further narration, so the
// line has room to land per the video's retention-arc "let it land" beat.
const CYCLE_START = 10;
const CYCLE_STEP = 42;
const CARD_HOLD_FRAMES = 90;

export const CostTransferOutroShot: React.FC<CostTransferOutroSceneProps> = ({
  amount,
  destinations,
  closingLines,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardStart = durationInFrames - CARD_HOLD_FRAMES;
  const sceneOpacity = interpolate(frame, [cardStart - 10, cardStart + 8], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const blackOpacity = interpolate(frame, [cardStart - 10, cardStart + 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const activeIndex = Math.min(destinations.length - 1, Math.max(0, Math.floor((frame - CYCLE_START) / CYCLE_STEP)));
  const cyclePhase = Math.max(0, frame - CYCLE_START - activeIndex * CYCLE_STEP);
  const moveSpring = spring({ frame: cyclePhase, fps, config: { damping: 16, stiffness: 90 }, durationInFrames: CYCLE_STEP });
  const slots = destinations.length;
  const slotWidth = 620 / slots;
  const targetX = -310 + slotWidth * (activeIndex + 0.5);
  const prevX = activeIndex === 0 ? targetX : -310 + slotWidth * (activeIndex - 0.5);
  const pillX = interpolate(Math.min(1, moveSpring), [0, 1], [prevX, targetX]);

  return (
    <AbsoluteFill style={{ backgroundColor: p3Colors.bg, fontFamily: BE_VIETNAM_PRO, overflow: "hidden" }}>
      <AbsoluteFill style={{ opacity: sceneOpacity }}>
        <AmbientBackground accent={p3Colors.grab} />
        <SafeZone style={{ justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
          <div style={{ position: "relative", width: 620, height: 220 }}>
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, display: "flex", justifyContent: "space-between" }}>
              {destinations.map((label, i) => (
                <div
                  key={i}
                  style={{
                    width: slotWidth - 20,
                    textAlign: "center",
                    opacity: i === activeIndex ? 1 : 0.35,
                    transition: "opacity 0.2s",
                  }}
                >
                  <svg width="64" height="80" viewBox="0 0 64 80" style={{ margin: "0 auto", display: "block" }}>
                    <circle cx="32" cy="20" r="16" fill={i === activeIndex ? p3Colors.grab : "rgba(255,255,255,0.25)"} />
                    <path
                      d="M8 78 C8 54 16 44 32 44 C48 44 56 54 56 78 Z"
                      fill={i === activeIndex ? p3Colors.grab : "rgba(255,255,255,0.25)"}
                    />
                  </svg>
                  <div
                    style={{
                      marginTop: 10,
                      fontSize: 16,
                      fontWeight: 800,
                      color: i === activeIndex ? p3Colors.textPrimary : p3Colors.textDim,
                    }}
                  >
                    {label}
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                position: "absolute",
                top: 0,
                left: "50%",
                transform: `translateX(calc(-50% + ${pillX}px))`,
                padding: "14px 28px",
                borderRadius: 999,
                background: p3Colors.cost,
                color: "#fff",
                fontSize: 28,
                fontWeight: 900,
                whiteSpace: "nowrap",
                boxShadow: "0 16px 40px rgba(239,68,68,0.4)",
              }}
            >
              −{amount}
            </div>
          </div>
        </SafeZone>
      </AbsoluteFill>

      <AbsoluteFill style={{ backgroundColor: "#000000", opacity: blackOpacity }} />

      <AbsoluteFill style={{ opacity: blackOpacity }}>
        <SafeZone style={{ justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
          {closingLines.map((line, i) => {
            const lineStart = cardStart + 14 + i * 24;
            const lineOpacity = interpolate(frame, [lineStart, lineStart + 20], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            return (
              <div
                key={i}
                style={{
                  opacity: lineOpacity,
                  fontSize: i === closingLines.length - 1 ? 46 : 30,
                  fontWeight: 900,
                  color: p3Colors.textPrimary,
                  textAlign: "center",
                  maxWidth: 820,
                  lineHeight: 1.3,
                  marginTop: i === 0 ? 0 : 14,
                }}
              >
                {line}
              </div>
            );
          })}
        </SafeZone>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default CostTransferOutroShot;
