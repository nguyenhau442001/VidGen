import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { TerminalSceneProps } from "../types";
import { colors, JETBRAINS_MONO, SAFE_ZONE, type as t } from "../styles";
import { SafeZone } from "../SafeZone";
import { AmbientBackground } from "../AmbientBackground";

const ENTER_FRAMES = 10;
const EXIT_FRAMES = 8;
const CHARS_PER_FRAME = 3;

export const TerminalScene: React.FC<TerminalSceneProps> = ({ lines, accentColor = colors.green, durationInFrames }) => {
  const frame = useCurrentFrame();
  const items = lines.map((l) => (typeof l === "string" ? { text: l, highlight: false } : { highlight: false, ...l }));

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
  for (const item of items) {
    lineStartFrames.push(cursor);
    cursor += Math.ceil(item.text.length / CHARS_PER_FRAME) + 4;
  }

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.bg,
        opacity: sceneOpacity,
        transform: `translateY(${sceneY}px)`,
      }}
    >
      <AmbientBackground accent={accentColor} />
      <SafeZone style={{ justifyContent: "center", alignItems: "center", fontFamily: JETBRAINS_MONO, paddingBottom: SAFE_ZONE.bottom + 240 }}>
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
          {items.map((item, lineIdx) => {
            const { text } = item;
            const isCommand = text.startsWith("$ ") || text.trimStart().startsWith("// ");
            const isFail = text.includes("❌") || text.trim().startsWith("✗");
            const isSuccess = text.includes("✅") || text.trim().startsWith("✓");
            const isAccented = item.highlight || isSuccess || isCommand;
            const lineColor = isFail ? colors.errorRed : isAccented ? accentColor : colors.textDim;
            const startFrame = lineStartFrames[lineIdx];
            const charsToShow = Math.floor(
              interpolate(
                frame,
                [startFrame, startFrame + Math.max(1, Math.ceil(text.length / CHARS_PER_FRAME))],
                [0, text.length],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
              )
            );
            const visible = frame >= startFrame;
            const stillTyping = charsToShow < text.length;

            return (
              <div
                key={lineIdx}
                style={{
                  ...t.terminal,
                  color: lineColor,
                  fontWeight: isFail || isAccented ? 700 : 400,
                  textShadow: isFail || isAccented ? `0 0 18px ${lineColor}66` : "none",
                  whiteSpace: "pre",
                  opacity: visible ? 1 : 0,
                  minHeight: "1.7em",
                }}
              >
                {text.slice(0, charsToShow)}
                {visible && stillTyping && (
                  <span
                    style={{
                      color: accentColor,
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
