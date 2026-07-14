import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { VerdictItem, VerdictListSceneProps } from "../types";
import { colors, INTER } from "../styles";
import { SafeZone } from "../SafeZone";
import { AmbientBackground } from "../AmbientBackground";

const ENTER_FRAMES = 10;
const EXIT_FRAMES = 8;
const ROWS_START = 22;
const ROW_STAGGER = 16;

const COLOR_MAP: Record<VerdictItem["color"], string> = {
  danger: "#ff6666",
  safe: colors.green,
};

const renderHeadline = (
  headline: string,
  accentWord: string | undefined,
  accentColor: string
): React.ReactNode => {
  if (!accentWord) return <>{headline}</>;
  const index = headline.indexOf(accentWord);
  if (index === -1) return <>{headline}</>;
  const before = headline.slice(0, index);
  const after = headline.slice(index + accentWord.length);
  return (
    <>
      {before}
      <span style={{ color: accentColor, textShadow: `0 0 12px ${accentColor}` }}>{accentWord}</span>
      {after}
    </>
  );
};

export const VerdictListScene: React.FC<VerdictListSceneProps> = ({
  headline,
  accentWord,
  verdicts,
  standard,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const hasExitRoom = durationInFrames > ENTER_FRAMES + EXIT_FRAMES;
  const sceneOpacity = interpolate(
    frame,
    hasExitRoom
      ? [0, ENTER_FRAMES, durationInFrames - EXIT_FRAMES, durationInFrames]
      : [0, durationInFrames],
    hasExitRoom ? [0, 1, 1, 0] : [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const headlineOpacity = interpolate(frame, [0, ENTER_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const standardStart = ROWS_START + verdicts.length * ROW_STAGGER + 14;
  const standardSpring = spring({
    frame: frame - standardStart,
    fps,
    config: { stiffness: 260, damping: 20 },
    durationInFrames: 20,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg, opacity: sceneOpacity }}>
      <AmbientBackground accent={colors.green} />
      <SafeZone
        style={{ justifyContent: "center", alignItems: "stretch", flexDirection: "column", fontFamily: INTER }}
      >
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            lineHeight: 1.2,
            letterSpacing: "-0.02em",
            color: colors.textPrimary,
            opacity: headlineOpacity,
            marginBottom: 56,
          }}
        >
          {renderHeadline(headline, accentWord, colors.green)}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {verdicts.map((v, i) => {
            const start = ROWS_START + i * ROW_STAGGER;
            const s = spring({ frame: frame - start, fps, config: { stiffness: 280, damping: 20 }, durationInFrames: 18 });
            const color = COLOR_MAP[v.color];
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 20,
                  padding: "22px 28px",
                  borderRadius: 20,
                  backgroundColor: "rgba(0,0,0,0.04)",
                  border: `1px solid ${color}44`,
                  opacity: s,
                  transform: `translateX(${interpolate(s, [0, 1], [-30, 0])}px)`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                  <span style={{ fontSize: 36 }}>{v.icon}</span>
                  <span style={{ fontSize: 26, fontWeight: 600, color: colors.textPrimary }}>{v.action}</span>
                </div>
                <span style={{ fontSize: 22, fontWeight: 700, color, textAlign: "right" }}>{v.result}</span>
              </div>
            );
          })}
        </div>

        {standard && (
          <div
            style={{
              marginTop: 48,
              alignSelf: "flex-start",
              padding: "16px 24px",
              borderRadius: 14,
              backgroundColor: `${colors.green}1a`,
              border: `1px solid ${colors.green}55`,
              opacity: Math.min(standardSpring, 1),
              transform: `scale(${interpolate(standardSpring, [0, 1], [0.92, 1])})`,
            }}
          >
            <span style={{ fontSize: 20, fontWeight: 700, color: colors.green }}>{standard}</span>
          </div>
        )}
      </SafeZone>
    </AbsoluteFill>
  );
};

export default VerdictListScene;
