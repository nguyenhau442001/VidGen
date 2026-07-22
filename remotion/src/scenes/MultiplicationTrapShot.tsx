import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { MultiplicationTrapSceneProps } from "../types";
import { colors, INTER } from "../styles";
import { SafeZone } from "../SafeZone";
import { AmbientBackground } from "../AmbientBackground";

const ENTER_FRAMES = 10;
const EXIT_FRAMES = 8;
const WOBBLE_START = 40;
const WOBBLE_END = 76;
const MORPH_FRAME = 82;

export const MultiplicationTrapShot: React.FC<MultiplicationTrapSceneProps> = ({
  leftLabel,
  operatorLabel,
  rightLabel,
  transformTo,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();

  const hasExitRoom = durationInFrames > ENTER_FRAMES + EXIT_FRAMES;
  const sceneOpacity = interpolate(
    frame,
    hasExitRoom
      ? [0, ENTER_FRAMES, durationInFrames - EXIT_FRAMES, durationInFrames]
      : [0, durationInFrames],
    hasExitRoom ? [0, 1, 1, 0] : [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const equationOpacity = interpolate(frame, [0, ENTER_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const inWobble = frame >= WOBBLE_START && frame < WOBBLE_END;
  const wobbleT = inWobble ? (frame - WOBBLE_START) / 4 : 0;
  const wobbleRotate = inWobble ? Math.sin(wobbleT * Math.PI) * 14 : 0;
  const wobbleScale = inWobble ? 1 + Math.abs(Math.sin(wobbleT * Math.PI)) * 0.18 : 1;

  const morphed = frame >= MORPH_FRAME;
  const morphOpacity = interpolate(frame, [MORPH_FRAME - 6, MORPH_FRAME + 4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const operatorOpacity = interpolate(frame, [MORPH_FRAME - 6, MORPH_FRAME + 4], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const questionColor = morphed ? colors.errorRed : colors.textPrimary;

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg, opacity: sceneOpacity }}>
      <AmbientBackground accent={colors.errorRed} />
      <SafeZone
        style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", fontFamily: INTER }}
      >
        <div
          style={{
            opacity: equationOpacity,
            display: "flex",
            alignItems: "baseline",
            gap: 24,
            maxWidth: 880,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <span style={{ fontSize: 46, fontWeight: 800, color: colors.textPrimary, whiteSpace: "nowrap" }}>
            {leftLabel}
          </span>

          <span style={{ position: "relative", width: 56, height: 56, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <span
              style={{
                position: "absolute",
                fontSize: 48,
                fontWeight: 900,
                color: colors.textDim,
                opacity: operatorOpacity,
                transform: `rotate(${wobbleRotate}deg) scale(${wobbleScale})`,
              }}
            >
              {operatorLabel}
            </span>
            <span
              style={{
                position: "absolute",
                fontSize: 52,
                fontWeight: 900,
                color: questionColor,
                opacity: morphOpacity,
                transform: `scale(${0.7 + morphOpacity * 0.3})`,
              }}
            >
              {transformTo}
            </span>
          </span>

          <span style={{ fontSize: 46, fontWeight: 800, color: colors.textPrimary, whiteSpace: "nowrap" }}>
            {rightLabel}
          </span>
        </div>
      </SafeZone>
    </AbsoluteFill>
  );
};

export default MultiplicationTrapShot;
