import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { colors, INTER, JETBRAINS_MONO } from "../styles";

const BG = colors.bg;

const COLOR_MAP: Record<"green" | "cyan", { text: string; shadow: string }> = {
  green: { text: colors.green, shadow: `0 0 30px ${colors.green}66` },
  cyan: { text: colors.cyan, shadow: `0 0 30px ${colors.cyan}66` },
};
const DEFAULT_COLOR = { text: colors.textPrimary, shadow: "none" };

export type CounterAnimSceneProps = {
  value: number;
  unit: string;
  label: string;
  prefix?: string;
  color?: "green" | "cyan";
  headline?: string;
  durationInFrames: number;
};

const CounterAnimScene: React.FC<CounterAnimSceneProps> = ({
  value,
  unit,
  label,
  prefix,
  color,
  headline,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const palette = color ? COLOR_MAP[color] : DEFAULT_COLOR;

  // Frame 0-20: headline fade in (if provided)
  const headlineOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Frame 20-30: number container scale in (0.8 -> 1 spring, damping 20)
  const scaleSpring = spring({
    frame: frame - 20,
    fps,
    config: { damping: 20 },
  });
  const containerScale = interpolate(scaleSpring, [0, 1], [0.8, 1]);
  const containerOpacity = Math.min(scaleSpring, 1);

  // Frame 30 -> durationInFrames-20: counter animates 0 -> value
  const countStart = 30;
  const countEnd = Math.max(countStart + 1, durationInFrames - 20);
  const countValue = interpolate(frame, [countStart, countEnd], [0, value], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const displayValue = Math.round(countValue).toLocaleString("vi-VN");

  // Frame durationInFrames-20 -> end: subtle pulse glow (scale + brightness)
  const pulseStart = countEnd;
  const pulseMid = durationInFrames - 10;
  const pulseEnd = durationInFrames;
  const pulseScale = interpolate(
    frame,
    [pulseStart, pulseMid, pulseEnd],
    [1, 1.03, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const pulseBrightness = interpolate(
    frame,
    [pulseStart, pulseMid, pulseEnd],
    [1, 1.4, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BG,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {headline && (
        <div
          style={{
            position: "absolute",
            top: 140,
            width: "100%",
            textAlign: "center",
            color: colors.textPrimary,
            fontFamily: `${INTER}, sans-serif`,
            fontSize: 28,
            fontWeight: 700,
            opacity: headlineOpacity,
            padding: "0 60px",
            boxSizing: "border-box",
          }}
        >
          {headline}
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          opacity: containerOpacity,
          transform: `scale(${containerScale})`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 12,
            transform: `scale(${pulseScale})`,
            filter: `brightness(${pulseBrightness})`,
          }}
        >
          {prefix && (
            <span
              style={{
                fontFamily: `${JETBRAINS_MONO}, monospace`,
                fontSize: 64,
                fontWeight: 800,
                color: palette.text,
                textShadow: palette.shadow,
              }}
            >
              {prefix}
            </span>
          )}
          <span
            style={{
              fontFamily: `${JETBRAINS_MONO}, monospace`,
              fontSize: 96,
              fontWeight: 800,
              color: palette.text,
              textShadow: palette.shadow,
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1,
            }}
          >
            {displayValue}
          </span>
        </div>

        <div
          style={{
            marginTop: 18,
            fontFamily: `${INTER}, sans-serif`,
            fontSize: 22,
            fontWeight: 500,
            color: "rgba(0,0,0,0.5)",
          }}
        >
          {unit}
        </div>

        <div
          style={{
            marginTop: 10,
            fontFamily: `${INTER}, sans-serif`,
            fontSize: 16,
            fontWeight: 400,
            color: "#00000088",
            textAlign: "center",
            maxWidth: 560,
          }}
        >
          {label}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export default CounterAnimScene;
