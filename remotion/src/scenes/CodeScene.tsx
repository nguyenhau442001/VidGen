import React from "react";
import { Highlight, themes, type Language } from "prism-react-renderer";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { CodeSceneProps } from "../types";
import { colors, JETBRAINS_MONO, type as t } from "../styles";

const ENTER_FRAMES = 10;
const EXIT_FRAMES = 8;
const FRAMES_PER_LINE = 6;

export const CodeScene: React.FC<CodeSceneProps> = ({
  language,
  code,
  highlightLines = [],
  durationInFrames,
}) => {
  const frame = useCurrentFrame();

  const sceneOpacity = interpolate(
    frame,
    [0, ENTER_FRAMES, durationInFrames - EXIT_FRAMES, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const sceneY = interpolate(frame, [0, ENTER_FRAMES], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.bg,
        opacity: sceneOpacity,
        transform: `translateY(${sceneY}px)`,
        justifyContent: "center",
        alignItems: "center",
        padding: "0 48px",
        fontFamily: JETBRAINS_MONO,
      }}
    >
      <div
        style={{
          width: "100%",
          backgroundColor: colors.codeBg,
          borderRadius: 16,
          border: `1px solid ${colors.terminalBorder}`,
          overflow: "hidden",
        }}
      >
        {/* Language label bar */}
        <div
          style={{
            padding: "12px 24px",
            borderBottom: `1px solid ${colors.terminalBorder}`,
          }}
        >
          <span style={{ ...t.label, color: colors.cyan }}>{language}</span>
        </div>

        {/* Code block */}
        <div style={{ padding: "24px 32px" }}>
          <Highlight
            theme={themes.nightOwl}
            code={code.trim()}
            language={language as Language}
          >
            {({ tokens, getTokenProps }) =>
              tokens.map((line, lineIdx) => {
                const revealStart = ENTER_FRAMES + lineIdx * FRAMES_PER_LINE;
                const lineOpacity = interpolate(
                  frame,
                  [revealStart, revealStart + 8],
                  [0, 1],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                );
                const isHighlighted = highlightLines.includes(lineIdx + 1);

                return (
                  <div
                    key={lineIdx}
                    style={{
                      ...t.code,
                      opacity: lineOpacity,
                      backgroundColor: isHighlighted
                        ? "rgba(0,255,65,0.08)"
                        : "transparent",
                      borderLeft: isHighlighted
                        ? `3px solid ${colors.green}`
                        : "3px solid transparent",
                      padding: "2px 12px",
                      margin: "0 -12px",
                      whiteSpace: "pre",
                    }}
                  >
                    {line.map((token, tokenIdx) => (
                      <span key={tokenIdx} {...getTokenProps({ token })} />
                    ))}
                  </div>
                );
              })
            }
          </Highlight>
        </div>
      </div>
    </AbsoluteFill>
  );
};
