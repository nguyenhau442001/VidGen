import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { TerminalSceneProps } from "../types";
import { colors, JETBRAINS_MONO, type as t } from "../styles";
import { SafeZone } from "../SafeZone";
import { AmbientBackground } from "../AmbientBackground";

const ENTER_FRAMES = 10;
const EXIT_FRAMES = 8;
const CHARS_PER_FRAME = 3;

export const TerminalScene: React.FC<TerminalSceneProps> = ({ lines, durationInFrames }) => {
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

  // Each line starts typing after the previous one finishes
  const lineStartFrames: number[] = [];
  let cursor = ENTER_FRAMES;
  for (const line of lines) {
    lineStartFrames.push(cursor);
    cursor += Math.ceil(line.length / CHARS_PER_FRAME) + 4;
  }

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.bg,
        opacity: sceneOpacity,
        transform: `translateY(${sceneY}px)`,
      }}
    >
      <AmbientBackground accent={colors.cyan} />
      <SafeZone style={{ justifyContent: "center", alignItems: "center", fontFamily: JETBRAINS_MONO }}>
      <div
        style={{
          width: "100%",
          backgroundColor: colors.terminalBg,
          borderRadius: 16,
          border: `1px solid ${colors.terminalBorder}`,
          overflow: "hidden",
        }}
      >
        {/* Top bar with traffic-light dots */}
        <div
          style={{
            height: 44,
            backgroundColor: "#1a1a2e",
            display: "flex",
            alignItems: "center",
            padding: "0 20px",
            gap: 8,
          }}
        >
          {(["#ff5f57", "#febc2e", "#28c840"] as const).map((c, i) => (
            <div
              key={i}
              style={{ width: 14, height: 14, borderRadius: "50%", backgroundColor: c }}
            />
          ))}
        </div>

        {/* Lines */}
        <div style={{ padding: "28px 32px", minHeight: 200 }}>
          {lines.map((line, lineIdx) => {
            const isCommand = line.startsWith("$ ") || line.trimStart().startsWith("// ");
            const isFail = line.includes("❌") || line.trim().startsWith("✗");
            const isSuccess = line.includes("✅") || line.trim().startsWith("✓");
            const lineColor = isFail
              ? colors.errorRed
              : isSuccess
              ? colors.green
              : isCommand
              ? colors.green
              : colors.textDim;
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
            const stillTyping = charsToShow < line.length;

            return (
              <div
                key={lineIdx}
                style={{
                  ...t.terminal,
                  color: lineColor,
                  fontWeight: isFail || isSuccess ? 700 : 400,
                  textShadow: isFail || isSuccess ? `0 0 18px ${lineColor}66` : "none",
                  whiteSpace: "pre",
                  opacity: visible ? 1 : 0,
                  minHeight: "1.7em",
                }}
              >
                {line.slice(0, charsToShow)}
                {visible && stillTyping && (
                  <span
                    style={{
                      color: colors.green,
                      opacity: Math.floor(frame / 8) % 2 === 0 ? 1 : 0,
                    }}
                  >
                    █
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
      </SafeZone>
    </AbsoluteFill>
  );
};
