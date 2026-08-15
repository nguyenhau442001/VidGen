import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { DebateConclusionSceneProps } from "../types";
import { colors, INTER } from "../styles";
import { SafeZone } from "../SafeZone";
import { AmbientBackground } from "../AmbientBackground";
import { xanhSmBlue } from "./shared/greensmBikePalette";

const ENTER_FRAMES = 10;
const EXIT_FRAMES = 8;
const HEADLINE_ENTER = 10;
const OPTIONS_START = 24;
const OPTION_STAGGER = 16;
const PROMPT_START = 110;

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
      <span style={{ color: accentColor }}>{accentWord}</span>
      {after}
    </>
  );
};

export const DebateConclusionShot: React.FC<DebateConclusionSceneProps> = ({
  headline,
  accentWord,
  options,
  promptLabel,
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

  const headlineOpacity = interpolate(frame, [0, HEADLINE_ENTER], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const promptSpring = spring({
    frame: frame - PROMPT_START,
    fps,
    config: { stiffness: 220, damping: 20 },
    durationInFrames: 20,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg, opacity: sceneOpacity }}>
      <AmbientBackground accent={xanhSmBlue} />
      <SafeZone
        style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", fontFamily: INTER }}
      >
        <div
          style={{
            fontSize: 42,
            fontWeight: 800,
            lineHeight: 1.25,
            textAlign: "center",
            maxWidth: 800,
            color: colors.textPrimary,
            opacity: headlineOpacity,
            marginBottom: 48,
          }}
        >
          {renderHeadline(headline, accentWord, xanhSmBlue)}
        </div>

        <div style={{ display: "flex", gap: 16, marginBottom: 52, flexWrap: "wrap", justifyContent: "center" }}>
          {options.map((option, i) => {
            const start = OPTIONS_START + i * OPTION_STAGGER;
            const s = spring({ frame: frame - start, fps, config: { stiffness: 260, damping: 20 }, durationInFrames: 18 });
            return (
              <div
                key={i}
                style={{
                  padding: "22px 24px",
                  borderRadius: 20,
                  textAlign: "center",
                  whiteSpace: "nowrap",
                  backgroundColor: "rgba(0,0,0,0.04)",
                  border: `1px solid ${xanhSmBlue}55`,
                  opacity: Math.min(1, s),
                  transform: `translateY(${(1 - Math.min(1, s)) * 20}px)`,
                  fontSize: 18,
                  fontWeight: 800,
                  color: colors.textPrimary,
                }}
              >
                {option}
              </div>
            );
          })}
        </div>

        {promptLabel && (
          <div
            style={{
              width: 720,
              maxWidth: "90%",
              padding: "20px 26px",
              borderRadius: 18,
              backgroundColor: "rgba(0,0,0,0.03)",
              border: "1px dashed rgba(0,0,0,0.2)",
              opacity: Math.min(1, promptSpring),
              transform: `translateY(${(1 - Math.min(1, promptSpring)) * 14}px)`,
              fontSize: 18,
              fontWeight: 600,
              color: colors.textDim,
              textAlign: "center",
            }}
          >
            {promptLabel}
          </div>
        )}
      </SafeZone>
    </AbsoluteFill>
  );
};

export default DebateConclusionShot;
