import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { IncomeScannerLayersSceneProps } from "../types";
import { colors, INTER } from "../styles";
import { SafeZone } from "../SafeZone";
import { AmbientBackground } from "../AmbientBackground";
import { xanhSmBlue } from "./greensmBikePalette";

const ENTER_FRAMES = 10;
const EXIT_FRAMES = 8;
const SCAN_START = 14;
const LAYER_GAP = 46; // frames between the sweep reaching each successive layer
const ROW_HEIGHT = 84;
const ROW_GAP = 16;

export const IncomeScannerLayersShot: React.FC<IncomeScannerLayersSceneProps> = ({
  amountLabel,
  layers,
  footnote,
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

  const amountSpring = spring({ frame, fps, config: { stiffness: 220, damping: 18 }, durationInFrames: 20 });

  const stackHeight = layers.length * ROW_HEIGHT + (layers.length - 1) * ROW_GAP;
  const sweepEnd = SCAN_START + layers.length * LAYER_GAP;
  const sweepProgress = interpolate(frame, [SCAN_START, sweepEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const sweepY = sweepProgress * stackHeight;

  const footnoteOpacity = interpolate(frame, [sweepEnd + 6, sweepEnd + 24], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg, opacity: sceneOpacity }}>
      <AmbientBackground accent={xanhSmBlue} />
      <SafeZone
        style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", fontFamily: INTER }}
      >
        <div
          style={{
            fontSize: 58,
            fontWeight: 900,
            color: colors.textPrimary,
            opacity: Math.min(1, amountSpring),
            transform: `scale(${0.9 + Math.min(1, amountSpring) * 0.1})`,
            marginBottom: 44,
          }}
        >
          {amountLabel}
        </div>

        <div style={{ position: "relative", width: 620, maxWidth: "90%", height: stackHeight }}>
          {layers.map((layer, i) => {
            const layerFoundFrame = SCAN_START + (i + 1) * LAYER_GAP;
            const found = frame >= layerFoundFrame;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  top: i * (ROW_HEIGHT + ROW_GAP),
                  left: 0,
                  right: 0,
                  height: ROW_HEIGHT,
                  borderRadius: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: found ? "rgba(14,165,233,0.1)" : "rgba(0,0,0,0.04)",
                  border: `1px solid ${found ? xanhSmBlue : "rgba(0,0,0,0.1)"}`,
                  fontSize: 24,
                  fontWeight: 800,
                  color: found ? colors.textPrimary : colors.textDim,
                  transition: "background-color 0.15s, border-color 0.15s",
                }}
              >
                {layer}
              </div>
            );
          })}

          {sweepProgress > 0 && sweepProgress < 1 && (
            <div
              style={{
                position: "absolute",
                left: -16,
                right: -16,
                top: sweepY - 2,
                height: 4,
                backgroundColor: xanhSmBlue,
                boxShadow: `0 0 24px ${xanhSmBlue}`,
              }}
            />
          )}
        </div>

        {footnote && (
          <div
            style={{
              marginTop: 40,
              fontSize: 18,
              fontWeight: 600,
              color: colors.textDim,
              textAlign: "center",
              maxWidth: 640,
              opacity: footnoteOpacity,
            }}
          >
            {footnote}
          </div>
        )}
      </SafeZone>
    </AbsoluteFill>
  );
};

export default IncomeScannerLayersShot;
