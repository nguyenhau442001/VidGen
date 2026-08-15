import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { HSKCTASceneProps } from "../types";
import { INTER } from "../styles";

const BG = "#b52a1c";
const CREAM = "#f5f1eb";
const PULSE_PERIOD = 60;
const ENTER_FRAMES = 20;

function renderAccent(headline: string, accentWord: string | undefined, pulseScale: number): React.ReactNode {
  if (!accentWord || !headline.includes(accentWord)) return headline.toUpperCase();
  const idx = headline.indexOf(accentWord);
  const before = headline.slice(0, idx);
  const after = headline.slice(idx + accentWord.length);
  return (
    <>
      {before.toUpperCase()}
      <span
        style={{
          color: CREAM,
          display: "inline-block",
          transform: `scale(${pulseScale})`,
        }}
      >
        {accentWord.toUpperCase()}
      </span>
      {after.toUpperCase()}
    </>
  );
}

export const HSKCTAScene: React.FC<HSKCTASceneProps> = ({ headline, accentWord, body }) => {
  const frame = useCurrentFrame();

  const contentOpacity = interpolate(frame, [0, ENTER_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // scale 1 -> 1.04 -> 1, looping every PULSE_PERIOD frames
  const pulseScale = 1 + 0.02 * (1 - Math.cos((2 * Math.PI * (frame % PULSE_PERIOD)) / PULSE_PERIOD));

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
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          opacity: contentOpacity,
        }}
      >
        <div
          style={{
            fontFamily: INTER,
            fontWeight: 900,
            fontSize: 64,
            lineHeight: 1.15,
            color: "#ffffff",
            textAlign: "center",
          }}
        >
          {renderAccent(headline, accentWord, pulseScale)}
        </div>

        {body && (
          <div
            style={{
              fontFamily: INTER,
              fontWeight: 700,
              fontSize: 24,
              color: "rgba(255,255,255,0.8)",
              textAlign: "center",
              marginTop: 28,
            }}
          >
            {body}
          </div>
        )}
      </div>

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 6,
          backgroundColor: CREAM,
        }}
      />
    </AbsoluteFill>
  );
};

export default HSKCTAScene;
