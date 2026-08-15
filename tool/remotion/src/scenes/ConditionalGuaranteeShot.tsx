import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ConditionalGuaranteeSceneProps } from "../types";
import { colors, INTER } from "../styles";
import { SafeZone } from "../SafeZone";
import { AmbientBackground } from "../AmbientBackground";
import { xanhSmBlue } from "./shared/greensmBikePalette";

const ENTER_FRAMES = 10;
const EXIT_FRAMES = 8;
const TARGET_ENTER = 18;
const CONDITIONS_START = 34;
const CONDITION_STAGGER = 14;
const STAMP_START = 100;

export const ConditionalGuaranteeShot: React.FC<ConditionalGuaranteeSceneProps> = ({
  targetLabel,
  conditions,
  stampLabel,
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

  const targetSpring = spring({ frame, fps, config: { stiffness: 240, damping: 18 }, durationInFrames: TARGET_ENTER });

  const stampSpring = spring({
    frame: frame - STAMP_START,
    fps,
    config: { stiffness: 260, damping: 12 },
    durationInFrames: 18,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg, opacity: sceneOpacity }}>
      <AmbientBackground accent={xanhSmBlue} />
      <SafeZone
        style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", fontFamily: INTER }}
      >
        <div style={{ position: "relative", marginBottom: 48 }}>
          <div
            style={{
              fontSize: 80,
              fontWeight: 900,
              color: colors.textPrimary,
              opacity: Math.min(1, targetSpring),
              transform: `scale(${0.9 + Math.min(1, targetSpring) * 0.1})`,
              borderBottom: `6px solid ${xanhSmBlue}`,
              paddingBottom: 10,
            }}
          >
            {targetLabel}
          </div>

          {stampSpring > 0.05 && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: "78%",
                opacity: Math.min(1, stampSpring * 1.3),
                transform: `translate(-50%, -8px) rotate(-8deg) scale(${0.7 + Math.min(1, stampSpring) * 0.3})`,
                padding: "14px 26px",
                borderRadius: 12,
                border: `4px solid ${colors.errorRed}`,
                color: colors.errorRed,
                fontSize: 26,
                fontWeight: 900,
                letterSpacing: "0.04em",
                whiteSpace: "nowrap",
                backgroundColor: "rgba(255,255,255,0.85)",
              }}
            >
              {stampLabel}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 14,
            maxWidth: 820,
          }}
        >
          {conditions.map((condition, i) => {
            const start = CONDITIONS_START + i * CONDITION_STAGGER;
            const s = spring({ frame: frame - start, fps, config: { stiffness: 280, damping: 20 }, durationInFrames: 16 });
            return (
              <div
                key={i}
                style={{
                  padding: "14px 20px",
                  borderRadius: 999,
                  backgroundColor: "rgba(14,165,233,0.08)",
                  border: `1px solid ${xanhSmBlue}66`,
                  opacity: Math.min(1, s),
                  transform: `translateY(${(1 - Math.min(1, s)) * 14}px)`,
                  fontSize: 20,
                  fontWeight: 700,
                  color: colors.textPrimary,
                  whiteSpace: "nowrap",
                }}
              >
                {condition}
              </div>
            );
          })}
        </div>

        {sourceLabel && (
          <div
            style={{
              position: "absolute",
              bottom: 0,
              fontSize: 16,
              fontWeight: 600,
              color: colors.textDim,
              opacity: interpolate(frame, [60, 80], [0, 1], {
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

export default ConditionalGuaranteeShot;
