import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { HSKHookSceneProps } from "../types";
import { INTER } from "../styles";

const RED = "#c0392b";
const BG = "#f5f1eb";
const INK = "#1a1714";

const HEADLINE_ENTER_FRAMES = 20;
const SUBTEXT_DELAY = 10;
const SUBTEXT_ENTER_FRAMES = 15;

function renderAccent(headline: string, accentWord?: string): React.ReactNode {
  if (!accentWord || !headline.includes(accentWord)) return headline.toUpperCase();
  const idx = headline.indexOf(accentWord);
  const before = headline.slice(0, idx);
  const after = headline.slice(idx + accentWord.length);
  return (
    <>
      {before.toUpperCase()}
      <span style={{ color: RED }}>{accentWord.toUpperCase()}</span>
      {after.toUpperCase()}
    </>
  );
}

export const HSKHookScene: React.FC<HSKHookSceneProps> = ({ headline, accentWord, body }) => {
  const frame = useCurrentFrame();

  const headlineOpacity = interpolate(frame, [0, HEADLINE_ENTER_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const headlineY = interpolate(frame, [0, HEADLINE_ENTER_FRAMES], [40, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const subtextOpacity = interpolate(
    frame,
    [SUBTEXT_DELAY, SUBTEXT_DELAY + SUBTEXT_ENTER_FRAMES],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BG,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 80px",
      }}
    >
      <div
        style={{
          fontFamily: INTER,
          fontWeight: 900,
          fontSize: 72,
          lineHeight: 1.1,
          color: INK,
          textAlign: "center",
          opacity: headlineOpacity,
          transform: `translateY(${headlineY}px)`,
        }}
      >
        {renderAccent(headline, accentWord)}
      </div>

      {body && (
        <>
          <div
            style={{
              width: 120,
              height: 2,
              backgroundColor: RED,
              margin: "32px 0",
              opacity: subtextOpacity,
            }}
          />

          <div
            style={{
              fontFamily: INTER,
              fontWeight: 700,
              fontSize: 22,
              color: "rgba(26,23,20,0.6)",
              textAlign: "center",
              opacity: subtextOpacity,
            }}
          >
            {body}
          </div>
        </>
      )}
    </AbsoluteFill>
  );
};

export default HSKHookScene;
