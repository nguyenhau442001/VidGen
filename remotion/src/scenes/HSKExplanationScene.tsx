import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { HSKExplanationSceneProps } from "../types";
import { INTER } from "../styles";

const RED = "#c0392b";
const BG = "#f5f1eb";
const INK = "#1a1714";
const BAR_X = 60;

const HEADLINE_ENTER_FRAMES = 15;
const BULLET_ENTER_FRAMES = 18;
const BULLET_STAGGER = 8;

function renderAccent(headline: string, accentWord?: string): React.ReactNode {
  if (!accentWord || !headline.includes(accentWord)) return headline;
  const idx = headline.indexOf(accentWord);
  const before = headline.slice(0, idx);
  const after = headline.slice(idx + accentWord.length);
  return (
    <>
      {before}
      <span style={{ color: RED }}>{accentWord}</span>
      {after}
    </>
  );
}

export const HSKExplanationScene: React.FC<HSKExplanationSceneProps> = ({
  headline,
  body,
  bullets,
  accentWord,
}) => {
  const frame = useCurrentFrame();

  const headlineOpacity = interpolate(frame, [0, HEADLINE_ENTER_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const headlineY = interpolate(frame, [0, HEADLINE_ENTER_FRAMES], [16, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      {/* Left accent bar — full height */}
      <div
        style={{
          position: "absolute",
          left: BAR_X,
          top: 0,
          bottom: 0,
          width: 4,
          backgroundColor: RED,
        }}
      />

      <AbsoluteFill
        style={{
          justifyContent: "center",
          paddingLeft: BAR_X + 60,
          paddingRight: 80,
        }}
      >
        <div
          style={{
            fontFamily: INTER,
            fontWeight: 900,
            fontSize: 52,
            lineHeight: 1.2,
            color: INK,
            marginBottom: 40,
            opacity: headlineOpacity,
            transform: `translateY(${headlineY}px)`,
          }}
        >
          {renderAccent(headline, accentWord)}
        </div>

        {bullets && bullets.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {bullets.map((line, i) => {
              const delay = HEADLINE_ENTER_FRAMES + i * BULLET_STAGGER;
              const bulletOpacity = interpolate(
                frame,
                [delay, delay + BULLET_ENTER_FRAMES],
                [0, 1],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
              );
              const bulletX = interpolate(
                frame,
                [delay, delay + BULLET_ENTER_FRAMES],
                [20, 0],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
              );
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 18,
                    opacity: bulletOpacity,
                    transform: `translateX(${bulletX}px)`,
                  }}
                >
                  <div style={{ width: 8, height: 8, flexShrink: 0, backgroundColor: RED }} />
                  <span
                    style={{
                      fontFamily: INTER,
                      fontWeight: 600,
                      fontSize: 28,
                      color: INK,
                    }}
                  >
                    {line}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          body && (
            <div
              style={{
                fontFamily: INTER,
                fontWeight: 600,
                fontSize: 28,
                color: INK,
                opacity: interpolate(
                  frame,
                  [HEADLINE_ENTER_FRAMES, HEADLINE_ENTER_FRAMES + BULLET_ENTER_FRAMES],
                  [0, 1],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                ),
              }}
            >
              {body}
            </div>
          )
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default HSKExplanationScene;
