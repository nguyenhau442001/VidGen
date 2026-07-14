import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { BubbleComparatorSceneProps } from "../types";
import { colors, INTER, JETBRAINS_MONO } from "../styles";

const VB_W = 750;
const VB_H = 1080;

type BubbleColor = "green" | "cyan" | "red";

const getBubbleStyles = (color?: BubbleColor) => {
  switch (color) {
    case "green":
      return {
        fill: `${colors.green}18`,
        stroke: colors.green,
        labelColor: colors.green,
        valueColor: colors.green,
      };
    case "cyan":
      return {
        fill: `${colors.cyan}18`,
        stroke: colors.cyan,
        labelColor: colors.cyan,
        valueColor: colors.cyan,
      };
    case "red":
      return {
        fill: `${colors.errorRed}18`,
        stroke: colors.errorRed,
        labelColor: colors.errorRed,
        valueColor: colors.errorRed,
      };
    default:
      return {
        fill: "#00000008",
        stroke: "#00000033",
        labelColor: colors.textPrimary,
        valueColor: "#00000033",
      };
  }
};

const BubbleComparatorScene: React.FC<BubbleComparatorSceneProps> = ({
  items = [],
  headline,
  accentWord,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // 1. Scaled container to fit 750x1080 viewBox inside the 1080x1920 target composition
  // ("contain" fit — the viewBox is wider-aspect than a 1080x1920 target, so scaling
  // by height alone overflows the width and clips the sides)
  const scale = Math.min(width / VB_W, height / VB_H);
  const scaledWidth = VB_W * scale;
  const scaledHeight = VB_H * scale;
  const leftOffset = (width - scaledWidth) / 2;
  const topOffset = (height - scaledHeight) / 2;

  // 2. Headline fade in (Frame 0-20)
  const headlineOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Highlight logic for accentWord in the headline
  const renderHeadline = () => {
    const index = headline.indexOf(accentWord);
    if (index === -1) {
      return <span>{headline}</span>;
    }
    const before = headline.substring(0, index);
    const after = headline.substring(index + accentWord.length);
    return (
      <>
        {before}
        <span
          style={{
            textShadow: `0 0 12px ${colors.green}`,
            color: colors.green,
          }}
        >
          {accentWord}
        </span>
        {after}
      </>
    );
  };

  // 3. Proportional bubble radius calculation
  const values = items.map((item) => item.value);
  const maxValue = values.length > 0 ? Math.max(...values) : 1;

  // Horizontal centers depending on item count (2 or 3 items)
  const M = items.length;
  const centers =
    M === 2
      ? [230, 520]
      : M === 3
      ? [230, 375, 520]
      : [375];

  const cy = VB_H / 2;

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          top: topOffset,
          left: leftOffset,
          width: VB_W,
          height: VB_H,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {/* Headline */}
        <div
          style={{
            position: "absolute",
            top: 80,
            width: VB_W,
            textAlign: "center",
            color: colors.textPrimary,
            fontFamily: `${INTER}, sans-serif`,
            fontSize: 28,
            fontWeight: 700,
            opacity: headlineOpacity,
            padding: "0 20px",
            boxSizing: "border-box",
          }}
        >
          {renderHeadline()}
        </div>

        {/* SVG Container for bubbles */}
        <svg
          width={VB_W}
          height={VB_H}
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            pointerEvents: "none",
          }}
        >
          {items.map((item, i) => {
            const cx = centers[i] ?? 375;
            // Proportional radius (normalize: largest = 160px)
            const targetRadius = maxValue > 0 ? (item.value / maxValue) * 160 : 160;

            // Frame 20+: staggered spring scale-in (each 18 frames apart)
            const startFrame = 20 + i * 18;
            const bubbleSpring = frame >= startFrame
              ? spring({
                  frame: frame - startFrame,
                  fps,
                  config: { damping: 14, stiffness: 100 },
                })
              : 0;

            // Frame 60+: counters count up from 0 to final value
            const counterProgress = interpolate(frame, [60, 90], [0, item.value], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const currentValue = Math.round(counterProgress);

            const styles = getBubbleStyles(item.color);

            // Text vertical centering adjustments depending on if unit exists
            const hasUnit = !!item.unit;
            const labelY = hasUnit ? cy - 18 : cy - 10;
            const valueY = hasUnit ? cy + 10 : cy + 16;
            const unitY = cy + 30;

            return (
              <g
                key={`bubble-${i}`}
                style={{
                  transform: `scale(${bubbleSpring})`,
                  transformOrigin: `${cx}px ${cy}px`,
                  opacity: bubbleSpring,
                }}
              >
                {/* Bubble Circle */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={targetRadius}
                  fill={styles.fill}
                  stroke={styles.stroke}
                  strokeWidth={2}
                />

                {/* Label */}
                <text
                  x={cx}
                  y={labelY}
                  fill={styles.labelColor}
                  fontFamily={`${INTER}, sans-serif`}
                  fontSize={15}
                  fontWeight={600}
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {item.label}
                </text>

                {/* Value Counter */}
                <text
                  x={cx}
                  y={valueY}
                  fill={styles.valueColor}
                  fontFamily={`${JETBRAINS_MONO}, sans-serif`}
                  fontSize={22}
                  fontWeight={700}
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {currentValue}
                </text>

                {/* Unit */}
                {hasUnit && (
                  <text
                    x={cx}
                    y={unitY}
                    fill="#00000066"
                    fontFamily={`${INTER}, sans-serif`}
                    fontSize={11}
                    fontWeight={400}
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    {item.unit}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </AbsoluteFill>
  );
};

export default BubbleComparatorScene;
