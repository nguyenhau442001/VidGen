import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { StoryCardSceneProps } from "../types";
import { colors, INTER, JETBRAINS_MONO } from "../styles";
import { SafeZone } from "../SafeZone";
import { AmbientBackground } from "../AmbientBackground";

const ENTER_FRAMES = 10;
const EXIT_FRAMES = 8;
const CARD_START = 18;
const OUTCOME_DELAY = 26;
const VERDICT_DELAY = 20;

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

export const StoryCardScene: React.FC<StoryCardSceneProps> = ({
  headline,
  accentWord,
  year,
  flag,
  location,
  event,
  outcome,
  verdict,
  accentColor = colors.green,
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
  const headlineY = interpolate(frame, [0, ENTER_FRAMES], [16, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const cardSpring = spring({
    frame: frame - CARD_START,
    fps,
    config: { stiffness: 260, damping: 22 },
    durationInFrames: 24,
  });

  const outcomeStart = CARD_START + OUTCOME_DELAY;
  const outcomeOpacity = interpolate(frame, [outcomeStart, outcomeStart + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const verdictStart = outcomeStart + VERDICT_DELAY;
  const verdictSpring = spring({
    frame: frame - verdictStart,
    fps,
    config: { stiffness: 260, damping: 20 },
    durationInFrames: 18,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg, opacity: sceneOpacity }}>
      <AmbientBackground accent={accentColor} />
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
            transform: `translateY(${headlineY}px)`,
            marginBottom: 44,
          }}
        >
          {renderHeadline(headline, accentWord, accentColor)}
        </div>

        <div
          style={{
            borderRadius: 24,
            padding: "36px 34px",
            backgroundColor: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            opacity: Math.min(cardSpring, 1),
            transform: `translateY(${interpolate(cardSpring, [0, 1], [24, 0])}px) scale(${interpolate(
              cardSpring,
              [0, 1],
              [0.96, 1]
            )})`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 22 }}>
            <span style={{ fontSize: 44 }}>{flag}</span>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  fontFamily: `${JETBRAINS_MONO}, monospace`,
                  fontSize: 15,
                  fontWeight: 600,
                  color: accentColor,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                {year}
              </span>
              <span style={{ fontSize: 22, fontWeight: 600, color: colors.textPrimary }}>{location}</span>
            </div>
          </div>

          <div style={{ fontSize: 28, fontWeight: 500, color: colors.textPrimary, marginBottom: 20, lineHeight: 1.4 }}>
            {event}
          </div>

          <div style={{ fontSize: 24, fontWeight: 600, color: accentColor, opacity: outcomeOpacity }}>{outcome}</div>
        </div>

        {verdict && (
          <div
            style={{
              marginTop: 40,
              alignSelf: "flex-start",
              padding: "18px 26px",
              borderRadius: 16,
              backgroundColor: `${accentColor}1a`,
              border: `1px solid ${accentColor}55`,
              opacity: Math.min(verdictSpring, 1),
              transform: `scale(${interpolate(verdictSpring, [0, 1], [0.92, 1])})`,
            }}
          >
            <span style={{ fontSize: 26, fontWeight: 700, color: accentColor }}>{verdict}</span>
          </div>
        )}
      </SafeZone>
    </AbsoluteFill>
  );
};

export default StoryCardScene;
