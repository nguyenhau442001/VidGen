import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { TimelineStage, TimelineStagesSceneProps } from "../types";
import { colors, colorsDark, INTER } from "../styles";
import { SafeZone } from "../SafeZone";
import { AmbientBackground } from "../AmbientBackground";

const ENTER_FRAMES = 10;
const EXIT_FRAMES = 8;
const STAGES_START = 24;
const STAGE_STAGGER = 14;

const stateColorFor = (state: TimelineStage["state"], green: string): string => {
  if (state === "danger") return "#ff6666";
  if (state === "warning") return "#f5a623";
  return green;
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

export const TimelineStagesScene: React.FC<TimelineStagesSceneProps> = ({
  headline,
  accentWord,
  stages,
  note,
  accentColor,
  theme = "light",
  durationInFrames,
}) => {
  const palette = theme === "dark" ? colorsDark : colors;
  const accent = accentColor ?? palette.cyan;
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

  const lineEnd = STAGES_START + (stages.length - 1) * STAGE_STAGGER + 10;
  const lineDraw = interpolate(frame, [STAGES_START, lineEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const noteStart = lineEnd + 16;
  const noteOpacity = interpolate(frame, [noteStart, noteStart + 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: palette.bg, opacity: sceneOpacity }}>
      <AmbientBackground accent={accent} />
      <SafeZone
        style={{ justifyContent: "center", alignItems: "stretch", flexDirection: "column", fontFamily: INTER }}
      >
        <div
          style={{
            fontSize: 44,
            fontWeight: 700,
            lineHeight: 1.2,
            letterSpacing: "-0.02em",
            color: palette.textPrimary,
            opacity: headlineOpacity,
            marginBottom: 90,
          }}
        >
          {renderHeadline(headline, accentWord, accent)}
        </div>

        <div style={{ position: "relative", display: "flex", justifyContent: "space-between", padding: "0 4px" }}>
          <div
            style={{
              position: "absolute",
              top: 27,
              left: 27,
              right: 27,
              height: 3,
              backgroundColor: "rgba(0,0,0,0.1)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 27,
              left: 27,
              height: 3,
              width: `calc((100% - 54px) * ${lineDraw})`,
              backgroundColor: accent,
            }}
          />
          {stages.map((stage, i) => {
            const start = STAGES_START + i * STAGE_STAGGER;
            const s = spring({ frame: frame - start, fps, config: { stiffness: 300, damping: 18 }, durationInFrames: 16 });
            const color = stateColorFor(stage.state, palette.green);
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12,
                  width: `${100 / stages.length}%`,
                  opacity: s,
                  transform: `translateY(${interpolate(s, [0, 1], [14, 0])}px) scale(${interpolate(s, [0, 1], [0.85, 1])})`,
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    backgroundColor: `${color}22`,
                    border: `2px solid ${color}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 26,
                  }}
                >
                  {stage.icon}
                </div>
                <span style={{ fontSize: 16, fontWeight: 600, color, textAlign: "center", maxWidth: 150 }}>
                  {stage.label}
                </span>
              </div>
            );
          })}
        </div>

        {note && (
          <div
            style={{
              marginTop: 70,
              fontSize: 24,
              fontWeight: 500,
              color: palette.textDim,
              textAlign: "center",
              opacity: noteOpacity,
            }}
          >
            {note}
          </div>
        )}
      </SafeZone>
    </AbsoluteFill>
  );
};

export default TimelineStagesScene;
