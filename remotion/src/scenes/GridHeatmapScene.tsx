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
// Constants
// ---------------------------------------------------------------------------

const GRID_BOX_W = 620;
const GRID_BOX_H = 700;
const CELL_GAP = 3;
const CELL_RADIUS = 4;

const HEADLINE_FADE_END = 15;
const WAVE_START = 15;
const WAVE_STEP = 3; // frames of delay per (row + col)
const SPRING_SETTLE = 25; // frames for a damping-22 spring to visually settle
const PULSE_GAP = 20; // frames after last cell settles before hot-cell pulse starts
const PULSE_PERIOD = 30;
const LEGEND_FADE = 20;

const MAX_LABELED_CELLS = 48;

const HUE_MAP: Record<"green" | "cyan", number> = { green: 120, cyan: 197 };

// ---------------------------------------------------------------------------
// Color helper — intensity 0->1 maps to lightness 5%->50% on a fixed hue,
// so cold cells read near-black and hot cells burn at full saturation.
// ---------------------------------------------------------------------------
const cellColor = (
  scheme: "green" | "cyan",
  intensity: number,
  alpha?: number
): string => {
  const hue = HUE_MAP[scheme];
  const t = Math.max(0, Math.min(1, intensity));
  const lightness = 5 + t * 45;
  return alpha === undefined
    ? `hsl(${hue}, 100%, ${lightness}%)`
    : `hsla(${hue}, 100%, ${lightness}%, ${alpha})`;
};

export type GridHeatmapSceneProps = {
  grid: number[][];
  headline: string;
  cellLabel?: string;
  colorScheme?: "green" | "cyan";
  durationInFrames: number;
};

const GridHeatmapScene: React.FC<GridHeatmapSceneProps> = ({
  grid,
  headline,
  cellLabel,
  colorScheme = "green",
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const rows = grid.length;
  const cols = rows > 0 ? Math.max(...grid.map((r) => r.length)) : 0;
  const totalCells = rows * cols;
  const showValues = totalCells > 0 && totalCells <= MAX_LABELED_CELLS;

  const cellW =
    cols > 0 ? (GRID_BOX_W - (cols - 1) * CELL_GAP) / cols : GRID_BOX_W;
  const cellH =
    rows > 0 ? (GRID_BOX_H - (rows - 1) * CELL_GAP) / rows : GRID_BOX_H;

  const lastCellStart = WAVE_START + Math.max(0, rows - 1 + cols - 1) * WAVE_STEP;
  const allVisibleFrame = lastCellStart + SPRING_SETTLE;
  const pulseStart = allVisibleFrame + PULSE_GAP;

  const headlineOpacity = interpolate(frame, [0, HEADLINE_FADE_END], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const legendOpacity = interpolate(
    frame,
    [allVisibleFrame, allVisibleFrame + LEGEND_FADE],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      <div
        style={{
          position: "absolute",
          top: 60,
          width: "100%",
          textAlign: "center",
          color: "#ffffff",
          fontFamily: `${INTER}, sans-serif`,
          fontSize: 26,
          fontWeight: 700,
          opacity: headlineOpacity,
          padding: "0 60px",
          boxSizing: "border-box",
        }}
      >
        {headline}
      </div>

      <div
        style={{
          position: "absolute",
          top: (1080 - GRID_BOX_H) / 2,
          left: (750 - GRID_BOX_W) / 2,
          width: GRID_BOX_W,
          height: GRID_BOX_H,
          display: "grid",
          gridTemplateColumns: `repeat(${Math.max(1, cols)}, ${cellW}px)`,
          gridTemplateRows: `repeat(${Math.max(1, rows)}, ${cellH}px)`,
          gap: CELL_GAP,
        }}
      >
        {grid.map((row, r) =>
          row.map((intensity, c) => {
            const startFrame = WAVE_START + (r + c) * WAVE_STEP;
            const reveal = spring({
              frame: frame - startFrame,
              fps,
              config: { damping: 22 },
            });
            const revealOpacity = Math.min(1, reveal);
            const revealScale = interpolate(reveal, [0, 1], [0.6, 1]);

            const isHot = intensity > 0.8;
            const hasGlow = intensity > 0.7;

            const pulse =
              isHot && frame >= pulseStart
                ? 0.925 +
                  0.075 *
                    Math.sin(
                      (2 * Math.PI * (frame - pulseStart)) / PULSE_PERIOD
                    )
                : 1;

            const fill = cellColor(colorScheme, intensity);

            return (
              <div
                key={`${r}-${c}`}
                style={{
                  backgroundColor: fill,
                  borderRadius: CELL_RADIUS,
                  opacity: revealOpacity * pulse,
                  transform: `scale(${revealScale})`,
                  boxShadow: hasGlow
                    ? `0 0 8px ${cellColor(colorScheme, intensity, 0.5)}`
                    : "none",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                {showValues && (
                  <>
                    {cellLabel && (
                      <span
                        style={{
                          fontFamily: `${JETBRAINS_MONO}, monospace`,
                          fontSize: 10,
                          color: "rgba(255,255,255,0.7)",
                          lineHeight: 1.2,
                        }}
                      >
                        {cellLabel}
                      </span>
                    )}
                    <span
                      style={{
                        fontFamily: `${JETBRAINS_MONO}, monospace`,
                        fontSize: 10,
                        color: "rgba(255,255,255,0.7)",
                        lineHeight: 1.2,
                      }}
                    >
                      {intensity.toFixed(2)}
                    </span>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 60,
          left: "50%",
          transform: "translateX(-50%)",
          width: 300,
          opacity: legendOpacity,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div
          style={{
            width: 300,
            height: 40,
            borderRadius: 4,
            background: `linear-gradient(90deg, ${cellColor(
              colorScheme,
              0
            )}, ${cellColor(colorScheme, 1)})`,
          }}
        />
        <div
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            fontFamily: `${INTER}, sans-serif`,
            fontSize: 14,
            fontWeight: 600,
            color: "rgba(255,255,255,0.7)",
          }}
        >
          <span>Low</span>
          <span>Medium</span>
          <span>High</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export default GridHeatmapScene;
