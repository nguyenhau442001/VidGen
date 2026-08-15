import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { HistoryGapVisual } from "../types";
import { colors, INTER } from "../styles";
import { SafeZone } from "../SafeZone";
import { AmbientBackground } from "../AmbientBackground";
import { BrowserChrome, HeadlineBar } from "./shared/incognitoShared";
import { phaseProgress } from "./shared/cinematicPrimitives";

export type HistoryGapSceneProps = HistoryGapVisual & { durationInFrames: number };

// Frame plan:
//   0–16          incognito windows close (fade out dark overlay)
//   18–?          normal history card fades in
//   +i*10         each existing row enters, top to bottom
//   after rows    the "gap" row (no entry) pulses briefly to draw the eye
//   +20           headline punches in and the frame holds ~0.5s extra
const CLOSE_END = 16;
const CARD_START = 22;
const ROW_STAGGER = 10;
const ROW_DURATION = 14;

export const HistoryGapShot: React.FC<HistoryGapSceneProps> = ({
  existingRows = ["22:41 · Xem lịch chiếu phim cuối tuần", "21:58 · Tra cứu điểm thi"],
  headline = "KHÔNG CÓ TRONG LỊCH SỬ",
  accentWord = "KHÔNG CÓ",
  accentColor = colors.green,
}) => {
  const frame = useCurrentFrame();

  const closeOverlayOpacity = 1 - phaseProgress(frame, 0, CLOSE_END);
  const cardOpacity = phaseProgress(frame, CARD_START, 16);
  const cardY = interpolate(cardOpacity, [0, 1], [24, 0]);

  const rowsEnd = CARD_START + existingRows.length * ROW_STAGGER + ROW_DURATION;
  const gapPulseStart = rowsEnd + 6;
  const gapPulse = 0.5 + Math.sin(Math.max(0, frame - gapPulseStart) * 0.22) * 0.5;
  const gapOpacity = phaseProgress(frame, gapPulseStart, 10);

  const headlineStart = gapPulseStart + 24;
  const headlineOpacity = phaseProgress(frame, headlineStart, 18);

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      <AmbientBackground accent={accentColor} />
      <SafeZone style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ opacity: cardOpacity, transform: `translateY(${cardY}px)` }}>
          <BrowserChrome width={900} urlLabel="chrome://history" accentColor={accentColor}>
            <div
              style={{
                fontFamily: INTER,
                fontWeight: 700,
                fontSize: 20,
                color: colors.textDim,
                letterSpacing: "0.08em",
                marginBottom: 18,
              }}
            >
              LỊCH SỬ DUYỆT WEB
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {existingRows.map((row, i) => {
                const start = CARD_START + i * ROW_STAGGER;
                const opacity = phaseProgress(frame, start, ROW_DURATION);
                return (
                  <div
                    key={i}
                    style={{
                      opacity,
                      transform: `translateX(${interpolate(opacity, [0, 1], [-16, 0])}px)`,
                      fontFamily: INTER,
                      fontSize: 24,
                      color: "rgba(0,0,0,0.72)",
                      padding: "10px 4px",
                      borderBottom: "1px solid rgba(0,0,0,0.06)",
                    }}
                  >
                    {row}
                  </div>
                );
              })}

              <div
                style={{
                  opacity: gapOpacity,
                  marginTop: 4,
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: `1.5px dashed ${accentColor}`,
                  background: `${accentColor}14`,
                  boxShadow: `0 0 ${gapPulse * 22}px ${accentColor}55`,
                  fontFamily: INTER,
                  fontSize: 22,
                  fontWeight: 700,
                  color: accentColor,
                  textAlign: "center",
                }}
              >
                — không có mục nào —
              </div>
            </div>
          </BrowserChrome>
        </div>

        <AbsoluteFill
          style={{ backgroundColor: "#0c0b14", opacity: closeOverlayOpacity, pointerEvents: "none" }}
        />

        <HeadlineBar
          headline={headline}
          accentWord={accentWord}
          accentColor={accentColor}
          opacity={headlineOpacity}
          translateY={interpolate(headlineOpacity, [0, 1], [16, 0])}
        />
      </SafeZone>
    </AbsoluteFill>
  );
};

export default HistoryGapShot;
