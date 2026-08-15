import React from "react";
import { AbsoluteFill, interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ComparisonSceneProps } from "../types";
import { colors, INTER } from "../styles";
import { SafeZone } from "../SafeZone";
import { AmbientBackground } from "../AmbientBackground";

const ENTER_FRAMES = 10;
const EXIT_FRAMES = 8;
const GLITCH_END = 16; // frames 0-16: left side flickers before settling

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

export const ComparisonScene: React.FC<ComparisonSceneProps> = ({
  headline,
  accentWord,
  subtext,
  visualEffect,
  leftIcon,
  leftLabel,
  rightIcon,
  rightLabel,
  connector = "→",
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

  const leftSpring = spring({ frame, fps, config: { stiffness: 260, damping: 18 }, durationInFrames: 24 });
  const rightSpring = spring({
    frame: frame - 10,
    fps,
    config: { stiffness: 260, damping: 18 },
    durationInFrames: 24,
  });
  const connectorSpring = spring({
    frame: frame - 20,
    fps,
    config: { stiffness: 300, damping: 20 },
    durationInFrames: 18,
  });

  // Glitch: the left (rejected) side jitters horizontally + flashes red for
  // its first GLITCH_END frames, then settles — reads as "this is broken".
  const inGlitch = visualEffect === "glitch" && frame < GLITCH_END;
  const glitchSeedX = inGlitch ? (random(`glitchx-${Math.floor(frame / 2)}`) - 0.5) * 14 : 0;
  const glitchOpacity = inGlitch ? 0.6 + random(`glitcho-${frame}`) * 0.4 : 1;

  const subtextOpacity = interpolate(frame, [30, 42], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg, opacity: sceneOpacity }}>
      <AmbientBackground accent={colors.cyan} />
      <SafeZone style={{ justifyContent: "center", alignItems: "center", fontFamily: INTER }}>
        <div
          style={{
            fontSize: 50,
            fontWeight: 700,
            lineHeight: 1.2,
            letterSpacing: "-0.02em",
            color: colors.textPrimary,
            textAlign: "center",
            opacity: headlineOpacity,
            marginBottom: 90,
          }}
        >
          {renderHeadline(headline, accentWord, colors.cyan)}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 14,
              opacity: Math.min(leftSpring, 1) * glitchOpacity,
              transform: `translateX(${interpolate(leftSpring, [0, 1], [-40, 0]) + glitchSeedX}px)`,
            }}
          >
            <span style={{ fontSize: 84 }}>{leftIcon}</span>
            <span style={{ fontSize: 24, fontWeight: 600, color: "#ff6666", textAlign: "center", maxWidth: 260 }}>
              {leftLabel}
            </span>
          </div>

          <span
            style={{
              fontSize: 44,
              fontWeight: 700,
              color: colors.textDim,
              opacity: Math.min(connectorSpring, 1),
              transform: `scale(${interpolate(connectorSpring, [0, 1], [0.7, 1])})`,
            }}
          >
            {connector}
          </span>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 14,
              opacity: Math.min(rightSpring, 1),
              transform: `translateX(${interpolate(rightSpring, [0, 1], [40, 0])}px)`,
            }}
          >
            <span style={{ fontSize: 84 }}>{rightIcon}</span>
            <span
              style={{
                fontSize: 24,
                fontWeight: 600,
                color: colors.green,
                textAlign: "center",
                maxWidth: 260,
                textShadow: `0 0 14px ${colors.green}66`,
              }}
            >
              {rightLabel}
            </span>
          </div>
        </div>

        {subtext && (
          <div
            style={{
              marginTop: 90,
              fontSize: 26,
              fontWeight: 500,
              color: colors.textDim,
              textAlign: "center",
              opacity: subtextOpacity,
            }}
          >
            {subtext}
          </div>
        )}
      </SafeZone>
    </AbsoluteFill>
  );
};

export default ComparisonScene;
