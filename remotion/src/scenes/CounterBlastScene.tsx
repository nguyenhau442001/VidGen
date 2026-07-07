import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  interpolateColors,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { CounterBlastSceneProps } from "../types";
import { colors, INTER, JETBRAINS_MONO } from "../styles";

// ---------------------------------------------------------------------------
// Constants (designed for a ~131-frame scene at 30fps)
// ---------------------------------------------------------------------------
const FLASH_PEAK = 3;
const FLASH_END = 9;
const COUNT_START = 10;
const COUNT_DURATION_DEFAULT = 80;
const LOCK_PULSE_FRAMES = 16;
const SUBLABEL_FADE = 30;

const ACCENT_DEFAULT = "#22C55E";

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export const CounterBlastScene: React.FC<CounterBlastSceneProps> = ({
  finalValue,
  unit,
  subLabel,
  prefix,
  accentColor = ACCENT_DEFAULT,
  countDuration = COUNT_DURATION_DEFAULT,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Keep the lock-in moment inside the scene even when narration runs
  // shorter than the designed 131 frames.
  const effCountDuration = Math.min(
    countDuration,
    Math.max(20, durationInFrames - COUNT_START - LOCK_PULSE_FRAMES - 15)
  );
  const countEnd = COUNT_START + effCountDuration;

  // Transition flash: brief white pop signalling the reveal
  const flashOpacity = interpolate(
    frame,
    [0, FLASH_PEAK, FLASH_END],
    [0, 0.9, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Count-up: sprints out of the gate, decelerates into the final value
  const countT = interpolate(frame, [COUNT_START, countEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.exp),
  });
  const value = Math.round(countT * finalValue);

  // Typography blasts up from 48 → 96 px over the first ~20 frames
  const sizeSpring = spring({
    frame: frame - COUNT_START,
    fps,
    config: { stiffness: 160, damping: 14 },
    durationInFrames: 20,
  });
  const fontSize = 48 + 48 * sizeSpring;

  // White while climbing, settling into the accent as it approaches the end
  const numberColor = interpolateColors(countT, [0.6, 1], ["#ffffff", accentColor]);

  // Lock-in: scale pulse + glow flash the moment the counter lands
  const lockPulse = interpolate(
    frame,
    [countEnd, countEnd + LOCK_PULSE_FRAMES / 2, countEnd + LOCK_PULSE_FRAMES],
    [1, 1.08, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const lockGlow = interpolate(
    frame,
    [countEnd, countEnd + LOCK_PULSE_FRAMES / 2, countEnd + LOCK_PULSE_FRAMES],
    [0, 1, 0.35],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const subLabelStart = countEnd - 20;
  const subLabelOpacity = interpolate(
    frame,
    [subLabelStart, subLabelStart + SUBLABEL_FADE],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const subLabelRise = interpolate(
    frame,
    [subLabelStart, subLabelStart + SUBLABEL_FADE],
    [14, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.bg,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 18,
          transform: `scale(${lockPulse})`,
          textShadow: `0 0 ${30 * lockGlow}px ${accentColor}, 0 0 ${
            60 * lockGlow
          }px ${accentColor}`,
        }}
      >
        {prefix && (
          <span
            style={{
              fontSize: fontSize * 0.7,
              fontWeight: 700,
              color: numberColor,
              fontFamily: JETBRAINS_MONO,
            }}
          >
            {prefix}
          </span>
        )}
        <span
          style={{
            fontSize,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: numberColor,
            fontFamily: JETBRAINS_MONO,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value.toLocaleString("vi-VN")}
        </span>
        {unit && (
          <span
            style={{
              fontSize: fontSize * 0.45,
              fontWeight: 500,
              color: colors.textDim,
              fontFamily: JETBRAINS_MONO,
            }}
          >
            {unit}
          </span>
        )}
      </div>

      {/* Always mounted (opacity-only fade) so the centered layout doesn't
          jump when the label appears */}
      {subLabel && (
        <div
          style={{
            marginTop: 28,
            fontSize: 30,
            fontWeight: 500,
            color: "rgba(255,255,255,0.75)",
            fontFamily: INTER,
            textAlign: "center",
            maxWidth: 760,
            lineHeight: 1.4,
            opacity: subLabelOpacity,
            transform: `translateY(${subLabelRise}px)`,
          }}
        >
          {subLabel}
        </div>
      )}

      {/* Transition flash on top of everything */}
      {flashOpacity > 0 && (
        <AbsoluteFill style={{ backgroundColor: "#ffffff", opacity: flashOpacity }} />
      )}
    </AbsoluteFill>
  );
};
