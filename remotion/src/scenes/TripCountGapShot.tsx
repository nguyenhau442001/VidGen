import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { TripCountGapSceneProps } from "../types";
import { colors, INTER } from "../styles";
import { SafeZone } from "../SafeZone";
import { AmbientBackground } from "../AmbientBackground";
import { xanhSmBlue } from "./greensmBikePalette";

const ENTER_FRAMES = 10;
const EXIT_FRAMES = 8;
const ICON_START = 8;
const ICON_STAGGER = 4;
const LABELS_START = 110;

export const TripCountGapShot: React.FC<TripCountGapSceneProps> = ({
  allocatedTrips,
  completedTrips,
  allocatedLabel,
  completedLabel,
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

  const dashedFrom = Math.max(0, allocatedTrips - (allocatedTrips - completedTrips));

  const allocatedOpacity = interpolate(frame, [LABELS_START, LABELS_START + 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const completedSpring = spring({
    frame: frame - (LABELS_START + 14),
    fps,
    config: { stiffness: 240, damping: 18 },
    durationInFrames: 18,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg, opacity: sceneOpacity }}>
      <AmbientBackground accent={xanhSmBlue} />
      <SafeZone
        style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", fontFamily: INTER }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 12,
            maxWidth: 820,
            marginBottom: 56,
          }}
        >
          {Array.from({ length: allocatedTrips }).map((_, i) => {
            const start = ICON_START + i * ICON_STAGGER;
            const s = spring({ frame: frame - start, fps, config: { stiffness: 300, damping: 18 }, durationInFrames: 14 });
            const isDashed = i >= dashedFrom;
            return (
              <div
                key={i}
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: Math.min(1, s),
                  transform: `scale(${0.6 + Math.min(1, s) * 0.4})`,
                  backgroundColor: isDashed ? "transparent" : "rgba(14,165,233,0.1)",
                  border: isDashed ? `2px dashed ${colors.textDim}` : `2px solid ${xanhSmBlue}`,
                  fontSize: 20,
                }}
              >
                🛵
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18, alignItems: "center" }}>
          {allocatedLabel && (
            <div
              style={{
                opacity: allocatedOpacity,
                fontSize: 30,
                fontWeight: 800,
                color: colors.textPrimary,
              }}
            >
              {allocatedLabel}
            </div>
          )}
          {completedLabel && (
            <div
              style={{
                opacity: Math.min(1, completedSpring),
                transform: `translateY(${(1 - Math.min(1, completedSpring)) * 14}px)`,
                fontSize: 24,
                fontWeight: 700,
                color: colors.textDim,
                textAlign: "center",
              }}
            >
              {completedLabel}
            </div>
          )}
        </div>
      </SafeZone>
    </AbsoluteFill>
  );
};

export default TripCountGapShot;
