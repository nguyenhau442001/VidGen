import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BatteryTimelineSceneProps } from "../types";
import { colors, INTER } from "../styles";
import { SafeZone } from "../SafeZone";
import { AmbientBackground } from "../AmbientBackground";
import { xanhSmBlue } from "./greensmBikePalette";

const ENTER_FRAMES = 10;
const EXIT_FRAMES = 8;
const TIMELINE_START = 10;
const TIMELINE_DURATION = 140; // frames for the two-battery fill animation
const COUNTER_START = TIMELINE_START + TIMELINE_DURATION + 10;

export const BatteryTimelineShot: React.FC<BatteryTimelineSceneProps> = ({
  startLabel,
  batteries,
  counterLabel,
  badgeLabel,
  sourceLabel,
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

  const labelOpacity = interpolate(frame, [0, ENTER_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const segmentFrames = TIMELINE_DURATION / batteries.length;

  const counterSpring = spring({
    frame: frame - COUNTER_START,
    fps,
    config: { stiffness: 220, damping: 18 },
    durationInFrames: 20,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg, opacity: sceneOpacity }}>
      <AmbientBackground accent={xanhSmBlue} />
      <SafeZone
        style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", fontFamily: INTER }}
      >
        <div
          style={{
            opacity: labelOpacity,
            fontSize: 20,
            fontWeight: 700,
            color: colors.textDim,
            letterSpacing: "0.06em",
            marginBottom: 34,
          }}
        >
          {startLabel} → TỐI
        </div>

        <div
          style={{
            width: 780,
            maxWidth: "90%",
            display: "flex",
            gap: 10,
            marginBottom: 44,
          }}
        >
          {batteries.map((battery, i) => {
            const start = TIMELINE_START + i * segmentFrames;
            const fillProgress = interpolate(
              frame,
              [start, start + segmentFrames * 0.85],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            );
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: 64,
                  borderRadius: 14,
                  position: "relative",
                  overflow: "hidden",
                  backgroundColor: "rgba(0,0,0,0.05)",
                  border: `2px solid ${xanhSmBlue}55`,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: `${fillProgress * 100}%`,
                    backgroundColor: `${xanhSmBlue}33`,
                  }}
                />
                <div
                  style={{
                    position: "relative",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    fontWeight: 800,
                    color: colors.textPrimary,
                    letterSpacing: "0.04em",
                  }}
                >
                  {battery.label}
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            fontSize: 68,
            fontWeight: 900,
            color: xanhSmBlue,
            opacity: Math.min(1, counterSpring),
            transform: `scale(${0.88 + Math.min(1, counterSpring) * 0.12})`,
            marginBottom: 20,
          }}
        >
          {counterLabel}
        </div>

        {badgeLabel && (
          <div
            style={{
              padding: "10px 22px",
              borderRadius: 999,
              backgroundColor: "rgba(0,0,0,0.05)",
              border: "1px solid rgba(0,0,0,0.14)",
              fontSize: 17,
              fontWeight: 700,
              color: colors.textDim,
              opacity: Math.min(1, counterSpring),
            }}
          >
            {badgeLabel}
          </div>
        )}

        {sourceLabel && (
          <div
            style={{
              position: "absolute",
              bottom: 0,
              fontSize: 16,
              fontWeight: 600,
              color: colors.textDim,
              opacity: interpolate(frame, [COUNTER_START, COUNTER_START + 20], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            {sourceLabel}
          </div>
        )}
      </SafeZone>
    </AbsoluteFill>
  );
};

export default BatteryTimelineShot;
