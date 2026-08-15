import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { ErrorLogSceneProps } from "../types";
import { colors, JETBRAINS_MONO, type as t } from "../styles";
import { SafeZone } from "../SafeZone";
import { AmbientBackground } from "../AmbientBackground";

const ENTER_FRAMES = 10;
const EXIT_FRAMES = 8;
const SHAKE_DURATION = 12;
const CHARS_PER_FRAME = 3;

export const ErrorLogScene: React.FC<ErrorLogSceneProps> = ({
  lines,
  highlightKeywords = [],
  durationInFrames,
}) => {
  const frame = useCurrentFrame();

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

  // Sine shake: decays to zero over SHAKE_DURATION frames
  const shakeX =
    frame < ENTER_FRAMES + SHAKE_DURATION
      ? Math.sin((frame - ENTER_FRAMES) * 1.8) *
        8 *
        Math.max(0, 1 - (frame - ENTER_FRAMES) / SHAKE_DURATION)
      : 0;

  // Stagger lines same as TerminalScene
  const lineStartFrames: number[] = [];
  let cursor = ENTER_FRAMES + SHAKE_DURATION;
  for (const line of lines) {
    lineStartFrames.push(cursor);
    cursor += Math.ceil(line.length / CHARS_PER_FRAME) + 4;
  }

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.bg,
        opacity: sceneOpacity,
        transform: `translateY(${sceneY}px) translateX(${shakeX}px)`,
      }}
    >
      <AmbientBackground accent={colors.errorRed} />
      <SafeZone style={{ justifyContent: "center", alignItems: "center", fontFamily: JETBRAINS_MONO }}>
      <div
        style={{
          width: "100%",
          backgroundColor: colors.terminalBg,
          borderRadius: 16,
          border: `1px solid ${colors.errorRed}`,
          overflow: "hidden",
        }}
      >
        {/* Top bar — red tinted */}
        <div
          style={{
            height: 44,
            backgroundColor: "rgba(255,59,59,0.12)",
            display: "flex",
            alignItems: "center",
            padding: "0 20px",
            gap: 8,
            borderBottom: `1px solid ${colors.errorRed}`,
          }}
        >
          <span style={{ ...t.label, color: colors.errorRed }}>ERROR</span>
        </div>

        {/* Lines */}
        <div style={{ padding: "28px 32px", minHeight: 200 }}>
          {lines.map((line, lineIdx) => {
            const startFrame = lineStartFrames[lineIdx];
            const charsToShow = Math.floor(
              interpolate(
                frame,
                [startFrame, startFrame + Math.max(1, Math.ceil(line.length / CHARS_PER_FRAME))],
                [0, line.length],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
              )
            );
            const visible = frame >= startFrame;
            const visibleText = line.slice(0, charsToShow);

            // Highlight matching keywords in red
            const renderedLine = highlightKeywords.length > 0
              ? renderWithKeywords(visibleText, highlightKeywords, colors.errorRed, colors.textDim)
              : <span style={{ color: colors.textDim }}>{visibleText}</span>;

            return (
              <div
                key={lineIdx}
                style={{
                  ...t.terminal,
                  whiteSpace: "pre",
                  opacity: visible ? 1 : 0,
                  minHeight: "1.7em",
                }}
              >
                {renderedLine}
              </div>
            );
          })}
        </div>
      </div>
      </SafeZone>
    </AbsoluteFill>
  );
};

function renderWithKeywords(
  text: string,
  keywords: string[],
  highlightColor: string,
  baseColor: string
): React.ReactNode {
  const pattern = new RegExp(`(${keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "g");
  const parts = text.split(pattern);
  return (
    <>
      {parts.map((part, i) =>
        keywords.includes(part) ? (
          <span key={i} style={{ color: highlightColor, fontWeight: 700 }}>
            {part}
          </span>
        ) : (
          <span key={i} style={{ color: baseColor }}>
            {part}
          </span>
        )
      )}
    </>
  );
}
