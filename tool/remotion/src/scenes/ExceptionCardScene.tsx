import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ExceptionCardItem, ExceptionCardSceneProps } from "../types";
import { colors, INTER, JETBRAINS_MONO } from "../styles";
import { SafeZone } from "../SafeZone";
import { AmbientBackground } from "../AmbientBackground";

const ENTER_FRAMES = 10;
const EXIT_FRAMES = 8;
const BARS_START = 22;
const BAR_STAGGER = 16;
const BAR_MAX_HEIGHT = 360;

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

const Bar: React.FC<{ item: ExceptionCardItem; frame: number; fps: number; start: number; color: string }> = ({
  item,
  frame,
  fps,
  start,
  color,
}) => {
  const s = spring({ frame: frame - start, fps, config: { stiffness: 120, damping: 20 }, durationInFrames: 40 });
  const height = interpolate(s, [0, 1], [0, (item.bar / 100) * BAR_MAX_HEIGHT]);
  const labelOpacity = interpolate(frame, [start, start + 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, width: "42%" }}>
      <span
        style={{
          fontSize: 20,
          fontWeight: 600,
          color,
          display: "flex",
          alignItems: "center",
          gap: 8,
          opacity: labelOpacity,
        }}
      >
        <span style={{ fontSize: 26 }}>{item.icon}</span>
        {item.label}
      </span>
      <div
        style={{
          width: "100%",
          height: BAR_MAX_HEIGHT,
          display: "flex",
          alignItems: "flex-end",
          borderRadius: 14,
          backgroundColor: "rgba(0,0,0,0.03)",
          border: "1px solid rgba(0,0,0,0.08)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: "100%",
            height,
            background: `linear-gradient(180deg, ${color}, ${color}66)`,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            paddingTop: 14,
          }}
        >
          <span
            style={{
              fontFamily: `${JETBRAINS_MONO}, monospace`,
              fontSize: 30,
              fontWeight: 800,
              color: "#0a0a0f",
              opacity: interpolate(s, [0, 0.3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            }}
          >
            {item.bar}%
          </span>
        </div>
      </div>
      <span style={{ fontSize: 18, fontWeight: 500, color: colors.textDim, opacity: labelOpacity }}>
        {item.recovery}
      </span>
    </div>
  );
};

export const ExceptionCardScene: React.FC<ExceptionCardSceneProps> = ({
  headline,
  accentWord,
  comparison,
  caveat,
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

  const caveatStart = BARS_START + comparison.length * BAR_STAGGER + 40;
  const caveatSpring = spring({
    frame: frame - caveatStart,
    fps,
    config: { stiffness: 260, damping: 20 },
    durationInFrames: 20,
  });

  const barColors = ["#ff6666", colors.green];

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg, opacity: sceneOpacity }}>
      <AmbientBackground accent={colors.green} />
      <SafeZone
        style={{ justifyContent: "center", alignItems: "stretch", flexDirection: "column", fontFamily: INTER }}
      >
        <div
          style={{
            fontSize: 44,
            fontWeight: 700,
            lineHeight: 1.2,
            letterSpacing: "-0.02em",
            color: colors.textPrimary,
            textAlign: "center",
            opacity: headlineOpacity,
            marginBottom: 50,
          }}
        >
          {renderHeadline(headline, accentWord, colors.green)}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          {comparison.map((item, i) => (
            <Bar
              key={i}
              item={item}
              frame={frame}
              fps={fps}
              start={BARS_START + i * BAR_STAGGER}
              color={barColors[i % barColors.length]}
            />
          ))}
        </div>

        {caveat && (
          <div
            style={{
              marginTop: 44,
              alignSelf: "center",
              padding: "18px 26px",
              borderRadius: 16,
              backgroundColor: `${colors.cyan}1a`,
              border: `1px solid ${colors.cyan}55`,
              opacity: Math.min(caveatSpring, 1),
              transform: `scale(${interpolate(caveatSpring, [0, 1], [0.92, 1])})`,
            }}
          >
            <span style={{ fontSize: 22, fontWeight: 600, color: colors.cyan, textAlign: "center" }}>{caveat}</span>
          </div>
        )}
      </SafeZone>
    </AbsoluteFill>
  );
};

export default ExceptionCardScene;
