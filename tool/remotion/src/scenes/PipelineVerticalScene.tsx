import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { PipelineStep, PipelineVerticalSceneProps } from "../types";
import { colors, INTER } from "../styles";
import { SafeZone } from "../SafeZone";
import { AmbientBackground } from "../AmbientBackground";

const ENTER_FRAMES = 10;
const EXIT_FRAMES = 8;
const STEPS_START = 24;
const STEP_STAGGER = 16;

const STATUS_COLOR: Record<PipelineStep["status"], string> = {
  exists: colors.textPrimary,
  deleted: "#ff6666",
  still_here: colors.green,
  neutral: colors.textDim,
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

export const PipelineVerticalScene: React.FC<PipelineVerticalSceneProps> = ({
  headline,
  accentWord,
  steps,
  accentColor = colors.cyan,
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

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg, opacity: sceneOpacity }}>
      <AmbientBackground accent={accentColor} />
      <SafeZone
        style={{ justifyContent: "center", alignItems: "stretch", flexDirection: "column", fontFamily: INTER }}
      >
        <div
          style={{
            fontSize: 46,
            fontWeight: 700,
            lineHeight: 1.2,
            letterSpacing: "-0.02em",
            color: colors.textPrimary,
            opacity: headlineOpacity,
            marginBottom: 60,
          }}
        >
          {renderHeadline(headline, accentWord, accentColor)}
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          {steps.map((step, i) => {
            const start = STEPS_START + i * STEP_STAGGER;
            const s = spring({ frame: frame - start, fps, config: { stiffness: 260, damping: 20 }, durationInFrames: 18 });
            const color = STATUS_COLOR[step.status] ?? colors.textPrimary;
            const arrowSpring = spring({
              frame: frame - start - 12,
              fps,
              config: { stiffness: 260, damping: 20 },
              durationInFrames: 14,
            });
            return (
              <React.Fragment key={i}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 20,
                    width: "100%",
                    padding: "20px 28px",
                    borderRadius: 18,
                    backgroundColor: "rgba(0,0,0,0.04)",
                    border: `1px solid ${color}44`,
                    opacity: s,
                    transform: `translateY(${interpolate(s, [0, 1], [16, 0])}px)`,
                  }}
                >
                  <span style={{ fontSize: 38 }}>{step.icon}</span>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: 26, fontWeight: 600, color }}>{step.label}</span>
                    {step.note && (
                      <span style={{ fontSize: 18, fontWeight: 400, color: colors.textDim, marginTop: 2 }}>
                        {step.note}
                      </span>
                    )}
                  </div>
                </div>
                {i < steps.length - 1 && (
                  <div
                    style={{
                      fontSize: 30,
                      color: colors.textDim,
                      opacity: Math.min(arrowSpring, 1),
                      padding: "6px 0",
                    }}
                  >
                    ↓
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </SafeZone>
    </AbsoluteFill>
  );
};

export default PipelineVerticalScene;
