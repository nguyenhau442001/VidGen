import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ExplanationSceneProps } from "../types";
import { colors, INTER, type as t } from "../styles";
import { SafeZone } from "../SafeZone";

const ENTER_FRAMES = 10;
const EXIT_FRAMES = 8;

export const ExplanationScene: React.FC<ExplanationSceneProps> = ({
  headline,
  body,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const hasExitRoom = durationInFrames > ENTER_FRAMES + EXIT_FRAMES;
  const sceneOpacity = interpolate(
    frame,
    hasExitRoom ? [0, ENTER_FRAMES, durationInFrames - EXIT_FRAMES, durationInFrames] : [0, durationInFrames],
    hasExitRoom ? [0, 1, 1, 0] : [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const sceneY = interpolate(frame, [0, ENTER_FRAMES], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const headlineWords = headline.split(" ");
  const bodyWords = body.split(" ");

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.bg,
        opacity: sceneOpacity,
        transform: `translateY(${sceneY}px)`,
      }}
    >
      <SafeZone style={{ justifyContent: "center", alignItems: "flex-start", flexDirection: "column", fontFamily: INTER }}>
      {/* Cyan accent bar */}
      <div
        style={{
          width: 6,
          height: 64,
          backgroundColor: colors.cyan,
          borderRadius: 3,
          marginBottom: 36,
          opacity: interpolate(frame, [ENTER_FRAMES, ENTER_FRAMES + 6], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      />

      {/* Headline — staggered spring per word */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0 14px", marginBottom: 36 }}>
        {headlineWords.map((word, i) => {
          const s = spring({
            frame: frame - ENTER_FRAMES - i * 3,
            fps,
            config: { stiffness: 300, damping: 20 },
            durationInFrames: 20,
          });
          return (
            <span
              key={i}
              style={{
                ...t.headline,
                color: colors.textPrimary,
                opacity: s,
                transform: `translateY(${interpolate(s, [0, 1], [16, 0])}px)`,
                display: "inline-block",
              }}
            >
              {word}
            </span>
          );
        })}
      </div>

      {/* Body — staggered spring per word, delayed after headline */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0 8px" }}>
        {bodyWords.map((word, i) => {
          const delay = ENTER_FRAMES + headlineWords.length * 3 + i * 2;
          const s = spring({
            frame: frame - delay,
            fps,
            config: { stiffness: 200, damping: 22 },
            durationInFrames: 20,
          });
          return (
            <span
              key={i}
              style={{
                ...t.body,
                color: colors.textDim,
                opacity: s,
                transform: `translateY(${interpolate(s, [0, 1], [10, 0])}px)`,
                display: "inline-block",
              }}
            >
              {word}
            </span>
          );
        })}
      </div>
      </SafeZone>
    </AbsoluteFill>
  );
};
