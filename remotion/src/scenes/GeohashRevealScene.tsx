import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GeohashRevealSceneProps } from "../types";
import { colors, INTER, JETBRAINS_MONO } from "../styles";
import { AmbientBackground } from "../AmbientBackground";
import { rgba as hexRgba } from "./shared/colorHelpers";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const VW = 1080;
const VH = 1920;

const EXIT_FRAMES = 30;

// Phase boundaries (designed for a ~310-frame scene at 30fps)
const OUTLINE_IN_END = 30;
const GRID_START = 30;
const CELL_STAGGER = 4; // frames per diagonal wave step
const BREATHE_START = 120;
const BREATHE_RAMP = 20;
const LABEL_START = 200;

const ACCENT_DEFAULT = "#22C55E";
const CELL_BORDER = "rgba(0, 255, 65, 0.3)"; // dim green, all base cells
const CELL_FILL = "#00ff41";

// Cells with demandLevel at or above this read as "hot" — they pulse in the
// accent color instead of the dim base green.
const HIGH_DEMAND_THRESHOLD = 0.55;

// Grid geometry: centered slightly above canvas middle (caption band sits
// below), cells slightly taller than wide so the block reads map-like on
// the 9:16 canvas.
const GRID_LEFT = 90;
const GRID_RIGHT = 90;
const CELL_GAP = 6;
const CELL_ASPECT = 1.2; // height / width
const GRID_CENTER_NY = 0.46;

// Color legend — the grid encodes demand purely as fill opacity/color, which
// reads as "just a heatmap" to non-technical viewers without a key. Sits in
// the dead space between the top safe zone (244) and the grid's top edge.
const LEGEND_START = 90;
const LEGEND_FADE = 20;
const LEGEND_SENTENCE_Y = 288;
const LEGEND_BAR_Y = 328;
const LEGEND_BAR_WIDTH = 220;
const LEGEND_BAR_HEIGHT = 16;

// Deterministic per-cell noise so breathing phases/speeds differ but every
// render of the same frame is identical (Remotion renders frames in any order).
const cellNoise = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// ---------------------------------------------------------------------------
// Faint abstract city outline — irregular district blobs and a river-ish
// polyline, no real map data. Fades in over frames 0–30.
// ---------------------------------------------------------------------------
const CityOutline: React.FC<{ opacity: number }> = ({ opacity }) => (
  <g opacity={opacity}>
    <polygon
      points="140,420 380,330 690,360 930,470 990,860 900,1310 640,1520 300,1470 110,1150 90,720"
      fill="rgba(0,0,0,0.015)"
      stroke="rgba(0,0,0,0.08)"
      strokeWidth={2}
      strokeLinejoin="round"
    />
    <polygon
      points="300,560 560,520 700,640 660,900 420,960 280,820"
      fill="none"
      stroke="rgba(0,0,0,0.05)"
      strokeWidth={1.5}
      strokeLinejoin="round"
    />
    <polygon
      points="620,980 840,930 900,1130 760,1330 560,1260"
      fill="none"
      stroke="rgba(0,0,0,0.05)"
      strokeWidth={1.5}
      strokeLinejoin="round"
    />
    {/* River cutting through the city */}
    <path
      d="M 160 1460 C 320 1280, 300 1040, 480 900 S 800 640, 940 460"
      fill="none"
      stroke="rgba(97,218,251,0.10)"
      strokeWidth={10}
      strokeLinecap="round"
    />
  </g>
);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export const GeohashRevealScene: React.FC<GeohashRevealSceneProps> = ({
  districts = [],
  accentColor = ACCENT_DEFAULT,
  gridRows = 7,
  gridCols = 9,
  headline,
  badgeText,
  caption,
  sourceLabel,
  mode = "heatmap",
  zones = [],
  durationInFrames,
}) => {
  const isHub = mode === "hub";
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cellW = (VW - GRID_LEFT - GRID_RIGHT) / gridCols;
  const cellH = cellW * CELL_ASPECT;
  const gridTop = VH * GRID_CENTER_NY - (gridRows * cellH) / 2;

  // District lookup by grid cell (x = column index, y = row index)
  const districtByCell = new Map<string, (typeof districts)[number]>();
  for (const d of districts) {
    const col = Math.min(gridCols - 1, Math.max(0, Math.round(d.x)));
    const row = Math.min(gridRows - 1, Math.max(0, Math.round(d.y)));
    districtByCell.set(`${col},${row}`, d);
  }

  // Scene duration comes from narration length in the pipeline, so anchor
  // the exits to it: labels still get screen time on shorter scenes, and
  // the fade-out always lands on the final EXIT_FRAMES.
  const labelStart = Math.max(BREATHE_START, Math.min(LABEL_START, durationInFrames - 70));
  const hasExitRoom = durationInFrames > OUTLINE_IN_END + EXIT_FRAMES;
  const sceneOpacity = hasExitRoom
    ? interpolate(
        frame,
        [durationInFrames - EXIT_FRAMES, durationInFrames],
        [1, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      )
    : 1;

  const outlineOpacity = interpolate(frame, [0, OUTLINE_IN_END], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const legendOpacity = interpolate(
    frame,
    [LEGEND_START, LEGEND_START + LEGEND_FADE],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Breathing ramps in at BREATHE_START and stays alive until the fade-out —
  // labels in the last phase sit on a living heatmap, not a frozen one.
  const breatheAmount = interpolate(
    frame,
    [BREATHE_START, BREATHE_START + BREATHE_RAMP],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const cells = [];
  for (let row = 0; row < gridRows && !isHub; row++) {
    for (let col = 0; col < gridCols; col++) {
      const i = row * gridCols + col;
      const district = districtByCell.get(`${col},${row}`);
      const isHot = district != null && district.demandLevel >= HIGH_DEMAND_THRESHOLD;

      // Stagger by diagonal wave index, not flat cell index: 63 cells at
      // 4 frames each would take 250+ frames, blowing past the grid-entry
      // window — the diagonal index keeps every entrance inside frames
      // 30–120 while preserving the one-by-one ripple.
      const enterFrame = GRID_START + (row + col) * CELL_STAGGER;
      const scale = spring({
        frame: frame - enterFrame,
        fps,
        from: 0,
        to: 1,
        config: { stiffness: 200, damping: 18 },
        durationInFrames: 20,
      });
      if (scale <= 0) continue;

      // Per-cell breathing: opacity swings across the 0.2–0.8 band, scaled
      // by demand so hot cells dominate and quiet cells shimmer faintly.
      const phase = cellNoise(i) * Math.PI * 2;
      const speed = 0.05 + cellNoise(i + 1000) * 0.03;
      const breath = 0.5 + 0.3 * Math.sin(frame * speed + phase);
      const demand = district
        ? district.demandLevel
        : 0.08 + cellNoise(i + 2000) * 0.22;
      const restingOpacity = 0.35 * demand;
      const fillOpacity =
        restingOpacity + (breath * demand - restingOpacity) * breatheAmount;

      const cx = GRID_LEFT + col * cellW + cellW / 2;
      const cy = gridTop + row * cellH + cellH / 2;

      cells.push(
        <g key={i} transform={`translate(${cx},${cy}) scale(${scale})`}>
          <rect
            x={-(cellW - CELL_GAP) / 2}
            y={-(cellH - CELL_GAP) / 2}
            width={cellW - CELL_GAP}
            height={cellH - CELL_GAP}
            rx={6}
            fill={isHot ? accentColor : CELL_FILL}
            fillOpacity={fillOpacity}
            stroke={isHot ? accentColor : CELL_BORDER}
            strokeOpacity={isHot ? 0.4 + 0.3 * breath * breatheAmount : 1}
            strokeWidth={isHot ? 2 : 1.5}
          />
        </g>
      );
    }
  }

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg, opacity: sceneOpacity }}>
      <AmbientBackground accent={accentColor} />

      <svg
        width={VW}
        height={VH}
        viewBox={`0 0 ${VW} ${VH}`}
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        <defs>
          <linearGradient id="demand-legend-gradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={CELL_FILL} stopOpacity={0.15} />
            <stop offset="100%" stopColor={accentColor} stopOpacity={1} />
          </linearGradient>
        </defs>

        <CityOutline opacity={outlineOpacity} />

        {/* Legend: heatmap reads intensity by color, hub reads a fixed
            bordered outline — never the same visual grammar for both. */}
        <g opacity={legendOpacity}>
          {isHub ? (
            <text
              x={VW / 2}
              y={LEGEND_SENTENCE_Y}
              textAnchor="middle"
              fontSize={24}
              fontWeight={600}
              style={{ fill: "rgba(0,0,0,0.6)", fontFamily: INTER }}
            >
              Đường viền rõ — vùng cố định, không đổi theo thời gian
            </text>
          ) : (
            <>
              <text
                x={VW / 2}
                y={LEGEND_SENTENCE_Y}
                textAnchor="middle"
                fontSize={24}
                fontWeight={600}
                style={{ fill: "rgba(0,0,0,0.6)", fontFamily: INTER }}
              >
                Màu càng đậm — nhu cầu càng cao
              </text>
              <rect
                x={VW / 2 - LEGEND_BAR_WIDTH / 2}
                y={LEGEND_BAR_Y - LEGEND_BAR_HEIGHT / 2}
                width={LEGEND_BAR_WIDTH}
                height={LEGEND_BAR_HEIGHT}
                rx={LEGEND_BAR_HEIGHT / 2}
                fill="url(#demand-legend-gradient)"
                stroke={CELL_BORDER}
                strokeWidth={1.5}
              />
              <text
                x={VW / 2 - LEGEND_BAR_WIDTH / 2 - 14}
                y={LEGEND_BAR_Y}
                textAnchor="end"
                dominantBaseline="central"
                fontSize={18}
                fontWeight={600}
                style={{ fill: "rgba(0,0,0,0.45)", fontFamily: INTER }}
              >
                Nhạt
              </text>
              <text
                x={VW / 2 + LEGEND_BAR_WIDTH / 2 + 14}
                y={LEGEND_BAR_Y}
                textAnchor="start"
                dominantBaseline="central"
                fontSize={18}
                fontWeight={700}
                style={{ fill: accentColor, fontFamily: INTER }}
              >
                Đậm
              </text>
            </>
          )}
        </g>

        {cells}

        {/* Hub mode: static bordered zones — no breathing, no demand color,
            label drawn directly on the zone so it never reads as a heatmap. */}
        {isHub &&
          zones.map((zone, zi) => {
            const w = zone.w ?? 2;
            const h = zone.h ?? 2;
            const enterFrame = GRID_START + zi * 10;
            const scale = spring({
              frame: frame - enterFrame,
              fps,
              from: 0,
              to: 1,
              config: { stiffness: 170, damping: 20 },
              durationInFrames: 24,
            });
            if (scale <= 0) return null;
            const x = GRID_LEFT + (zone.x - w / 2) * cellW;
            const y = gridTop + (zone.y - h / 2) * cellH;
            const boxW = w * cellW - CELL_GAP;
            const boxH = h * cellH - CELL_GAP;
            return (
              <g key={zi} opacity={scale}>
                <rect
                  x={x}
                  y={y}
                  width={boxW}
                  height={boxH}
                  rx={14}
                  fill={hexRgba(accentColor, 0.08)}
                  stroke={accentColor}
                  strokeWidth={2.5}
                />
                <text
                  x={x + boxW / 2}
                  y={y + boxH / 2 + 8}
                  textAnchor="middle"
                  fontSize={22}
                  fontWeight={700}
                  paintOrder="stroke"
                  stroke={colors.bg}
                  strokeWidth={6}
                  strokeLinejoin="round"
                  style={{ fill: colors.textPrimary, fontFamily: JETBRAINS_MONO }}
                >
                  {zone.label}
                </text>
              </g>
            );
          })}

        {/* District labels on up to 6 cells (heatmap mode only) */}
        {!isHub && districts.slice(0, 6).map((d, li) => {
          const col = Math.min(gridCols - 1, Math.max(0, Math.round(d.x)));
          const row = Math.min(gridRows - 1, Math.max(0, Math.round(d.y)));
          const enterAt = labelStart + li * 8;
          const opacity = interpolate(frame, [enterAt, enterAt + 14], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          if (opacity <= 0) return null;
          const rise = interpolate(frame, [enterAt, enterAt + 14], [8, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          const cx = GRID_LEFT + col * cellW + cellW / 2;
          const cy = gridTop + row * cellH + cellH / 2;

          return (
            <text
              key={li}
              x={cx}
              y={cy + 8 + rise}
              textAnchor="middle"
              fontSize={24}
              fontWeight={700}
              paintOrder="stroke"
              stroke={colors.bg}
              strokeWidth={6}
              strokeLinejoin="round"
              style={{ fill: colors.textPrimary, fontFamily: JETBRAINS_MONO }}
              opacity={opacity}
            >
              {d.label}
            </text>
          );
        })}
      </svg>

      {(headline || badgeText) && (
        <div
          style={{
            position: "absolute",
            top: 96,
            left: 90,
            right: 90,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            opacity: interpolate(frame, [0, 20], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          {headline && (
            <span
              style={{
                fontSize: 32,
                fontWeight: 700,
                color: colors.textPrimary,
                fontFamily: INTER,
                letterSpacing: "-0.01em",
              }}
            >
              {headline}
            </span>
          )}
          {badgeText && (
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: accentColor,
                border: `1px solid ${accentColor}`,
                borderRadius: 20,
                padding: "6px 14px",
                whiteSpace: "nowrap",
                marginLeft: 16,
              }}
            >
              {badgeText}
            </span>
          )}
        </div>
      )}

      {(caption || sourceLabel) && (
        <div
          style={{
            position: "absolute",
            bottom: 56,
            left: 60,
            right: 60,
            textAlign: "center",
            opacity: interpolate(
              frame,
              [Math.max(0, durationInFrames - 70), Math.max(1, durationInFrames - 40)],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            ),
          }}
        >
          {caption && (
            <div style={{ fontSize: 17, fontWeight: 600, color: colors.textDim, fontFamily: INTER, marginBottom: 6 }}>
              {caption}
            </div>
          )}
          {sourceLabel && (
            <div style={{ fontSize: 15, fontWeight: 600, color: colors.textDim, fontFamily: INTER }}>
              {sourceLabel}
            </div>
          )}
        </div>
      )}
    </AbsoluteFill>
  );
};
