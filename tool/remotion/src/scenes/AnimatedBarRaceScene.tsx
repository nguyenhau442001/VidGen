import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { colors, INTER, JETBRAINS_MONO } from "../styles";

// ---------------------------------------------------------------------------
// Virtual canvas — "contain" fit inside the real composition, matching
// TimelineScene/BeforeAfterScene/BubbleComparatorScene conventions.
// ---------------------------------------------------------------------------
const VB_W = 750;
const VB_H = 1080;

const BG = colors.bg;
const GRID_LINE_COLOR = "#00000006";

const HEADLINE_TOP = 80;
const UNIT_TOP = 84;

const LABEL_WIDTH = 120;
const BAR_START_X = 140;
const BAR_MAX_WIDTH = 560;
const BAR_HEIGHT = 44;
const BAR_GAP = 16;
const ROW_HEIGHT = BAR_HEIGHT + BAR_GAP;
const BARS_START_Y = 220;

const MAX_BARS = 6;
const HEADLINE_ANIM_FRAMES = 20;
const BAR_STAGGER = 10;

type BarColor = "green" | "cyan" | "amber";

const COLOR_MAP: Record<BarColor, { fill: string; stroke: string; label: string }> = {
  green: { fill: `${colors.green}33`, stroke: colors.green, label: colors.green },
  cyan: { fill: `${colors.cyan}33`, stroke: colors.cyan, label: colors.cyan },
  amber: { fill: "#ffa50033", stroke: "#ffa500", label: "#ffa500" },
};
const DEFAULT_COLOR = { fill: "#0000000a", stroke: "#00000044", label: colors.textPrimary };

export type AnimatedBarRaceDatum = {
  label: string;
  value: number;
  color?: BarColor;
};

export type AnimatedBarRaceSceneProps = {
  data: AnimatedBarRaceDatum[];
  headline: string;
  unit?: string;
  durationInFrames: number;
};

interface BarRowProps {
  datum: AnimatedBarRaceDatum;
  index: number;
  y: number;
  maxValue: number;
  frame: number;
  fps: number;
}

const BarRow: React.FC<BarRowProps> = ({ datum, index, y, maxValue, frame, fps }) => {
  const palette = datum.color ? COLOR_MAP[datum.color] : DEFAULT_COLOR;
  const startFrame = HEADLINE_ANIM_FRAMES + index * BAR_STAGGER;

  const growSpring = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 15 },
  });

  const finalWidth = maxValue > 0 ? (datum.value / maxValue) * BAR_MAX_WIDTH : 0;
  const barWidth = interpolate(growSpring, [0, 1], [0, finalWidth]);
  const displayValue = Math.max(0, Math.round(growSpring * datum.value));

  return (
    <React.Fragment>
      {/* Row grid line */}
      <div
        style={{
          position: "absolute",
          top: y + BAR_HEIGHT / 2,
          left: 0,
          width: VB_W,
          height: 1,
          backgroundColor: GRID_LINE_COLOR,
        }}
      />

      {/* Row label */}
      <div
        style={{
          position: "absolute",
          top: y,
          left: 0,
          width: LABEL_WIDTH,
          height: BAR_HEIGHT,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          textAlign: "right",
          fontFamily: `${INTER}, sans-serif`,
          fontSize: 13,
          fontWeight: 500,
          color: colors.textPrimary,
        }}
      >
        {datum.label}
      </div>

      {/* Bar track */}
      <div
        style={{
          position: "absolute",
          top: y,
          left: BAR_START_X,
          width: BAR_MAX_WIDTH,
          height: BAR_HEIGHT,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: Math.max(0, barWidth),
            height: BAR_HEIGHT,
            backgroundColor: palette.fill,
            borderRight: `2px solid ${palette.stroke}`,
            borderRadius: 4,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: Math.max(0, barWidth) + 8,
            transform: "translateY(-50%)",
            whiteSpace: "nowrap",
            fontFamily: `${JETBRAINS_MONO}, monospace`,
            fontSize: 13,
            fontWeight: 600,
            color: palette.label,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {displayValue.toLocaleString("vi-VN")}
        </div>
      </div>
    </React.Fragment>
  );
};

const AnimatedBarRaceScene: React.FC<AnimatedBarRaceSceneProps> = ({
  data,
  headline,
  unit,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // "Contain" fit — avoids clipping when the real composition's aspect ratio
  // doesn't match the 750x1080 virtual canvas.
  const scale = Math.min(width / VB_W, height / VB_H);
  const scaledWidth = VB_W * scale;
  const scaledHeight = VB_H * scale;
  const leftOffset = (width - scaledWidth) / 2;
  const topOffset = (height - scaledHeight) / 2;

  const sortedData = [...data].sort((a, b) => b.value - a.value).slice(0, MAX_BARS);
  const maxValue = sortedData.reduce((max, d) => Math.max(max, d.value), 0);

  // Frame 0-20: headline fade + slide up
  const headlineOpacity = interpolate(frame, [0, HEADLINE_ANIM_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const headlineTranslateY = interpolate(
    frame,
    [0, HEADLINE_ANIM_FRAMES],
    [20, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ backgroundColor: BG, overflow: "hidden" }}>
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
            top: HEADLINE_TOP,
            left: 0,
            width: VB_W,
            color: colors.textPrimary,
            fontFamily: `${INTER}, sans-serif`,
            fontSize: 26,
            fontWeight: 700,
            opacity: headlineOpacity,
            transform: `translateY(${headlineTranslateY}px)`,
            padding: "0 30px",
            boxSizing: "border-box",
          }}
        >
          {headline}
        </div>

        {/* Unit label */}
        {unit && (
          <div
            style={{
              position: "absolute",
              top: UNIT_TOP,
              right: 30,
              fontFamily: `${INTER}, sans-serif`,
              fontSize: 11,
              fontWeight: 400,
              color: "#00000044",
              opacity: headlineOpacity,
            }}
          >
            {unit}
          </div>
        )}

        {/* Bars */}
        {sortedData.map((datum, i) => (
          <BarRow
            key={datum.label}
            datum={datum}
            index={i}
            y={BARS_START_Y + i * ROW_HEIGHT}
            maxValue={maxValue}
            frame={frame}
            fps={fps}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};

export default AnimatedBarRaceScene;
