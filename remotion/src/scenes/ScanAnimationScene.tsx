import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ScanAnimationSceneProps } from "../types";
import { colors, INTER, JETBRAINS_MONO } from "../styles";
import { SafeZone } from "../SafeZone";
import { AmbientBackground } from "../AmbientBackground";

const ENTER_FRAMES = 10;
const EXIT_FRAMES = 8;
const SCAN_START = 20;
const SCAN_DURATION = 60;
const TARGET_STAGGER = 14;

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

export const ScanAnimationScene: React.FC<ScanAnimationSceneProps> = ({
  headline,
  accentWord,
  scanLabel,
  targets,
  result,
  note,
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

  const GRID_H = 420;
  const scanY = interpolate(frame, [SCAN_START, SCAN_START + SCAN_DURATION], [0, GRID_H], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scanOpacity = interpolate(
    frame,
    [SCAN_START, SCAN_START + 6, SCAN_START + SCAN_DURATION - 6, SCAN_START + SCAN_DURATION],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const targetsStart = SCAN_START + SCAN_DURATION - 20;
  const resultStart = targetsStart + targets.length * TARGET_STAGGER + 10;
  const resultSpring = spring({
    frame: frame - resultStart,
    fps,
    config: { stiffness: 260, damping: 20 },
    durationInFrames: 20,
  });
  const noteOpacity = interpolate(frame, [resultStart + 20, resultStart + 34], [0, 1], {
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
            fontSize: 44,
            fontWeight: 700,
            lineHeight: 1.2,
            letterSpacing: "-0.02em",
            color: colors.textPrimary,
            opacity: headlineOpacity,
            marginBottom: 40,
          }}
        >
          {renderHeadline(headline, accentWord, accentColor)}
        </div>

        <div
          style={{
            fontFamily: `${JETBRAINS_MONO}, monospace`,
            fontSize: 16,
            fontWeight: 600,
            color: accentColor,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: 18,
          }}
        >
          {scanLabel}
        </div>

        <div
          style={{
            position: "relative",
            height: GRID_H,
            borderRadius: 16,
            overflow: "hidden",
            border: `1px solid ${accentColor}33`,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
            backgroundSize: "36px 36px",
            backgroundColor: "rgba(255,255,255,0.02)",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: scanY,
              left: 0,
              right: 0,
              height: 3,
              backgroundColor: accentColor,
              boxShadow: `0 0 20px 4px ${accentColor}aa`,
              opacity: scanOpacity,
            }}
          />
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 26 }}>
          {targets.map((target, i) => {
            const start = targetsStart + i * TARGET_STAGGER;
            const s = spring({ frame: frame - start, fps, config: { stiffness: 300, damping: 20 }, durationInFrames: 14 });
            return (
              <div
                key={i}
                style={{
                  padding: "10px 20px",
                  borderRadius: 999,
                  backgroundColor: `${accentColor}1a`,
                  border: `1px solid ${accentColor}55`,
                  opacity: s,
                  transform: `scale(${interpolate(s, [0, 1], [0.8, 1])})`,
                }}
              >
                <span style={{ fontSize: 18, fontWeight: 600, color: accentColor }}>{target}</span>
              </div>
            );
          })}
        </div>

        <div
          style={{
            marginTop: 34,
            fontSize: 28,
            fontWeight: 700,
            color: colors.textPrimary,
            opacity: Math.min(resultSpring, 1),
            transform: `translateY(${interpolate(resultSpring, [0, 1], [12, 0])}px)`,
          }}
        >
          {result}
        </div>

        {note && (
          <div style={{ marginTop: 14, fontSize: 20, fontWeight: 400, color: colors.textDim, opacity: noteOpacity }}>
            {note}
          </div>
        )}
      </SafeZone>
    </AbsoluteFill>
  );
};

export default ScanAnimationScene;
