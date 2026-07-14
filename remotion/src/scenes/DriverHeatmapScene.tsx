import React from "react";
import {
  AbsoluteFill,
  interpolate,
  random,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { DriverHeatmapSceneProps } from "../types";
import { colors, INTER, JETBRAINS_MONO, SAFE_ZONE } from "../styles";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const VW = 1080;
const VH = 1920;
const BG = colors.bg;

const ACCENT_DEFAULT = colors.green;
const TOPIC_DEFAULT = "THUẬT TOÁN ẨN";

const DEFAULT_DRIVER_COUNT = 140;
const DEFAULT_GRID_CELL_SIZE = 105; // 38px on the 390-wide reference layout, scaled to this 1080-wide canvas
const DEFAULT_GRID_OPACITY = 0.06;
const DOT_SIZE = 16; // 6px on the 390-wide reference layout, scaled up

// Ping color gradient by spawn order (0 → 1): early pings render cool, the
// most recently spawned lean toward the accent green.
const PING_COLOR_STOPS: [string, string, string] = ["#1db87a", "#39d98a", "#00ff41"];
const GLOW_ORDER_THRESHOLD = 0.85; // last 15% spawned (by order, not time) get a glow

const HEADLINE_TEXT = "Hệ thống đã chạy từ 05:00 sáng";
const CAPTION_TEXT = "Grab không đợi bạn mở app";
const CAPTION_MAX_OPACITY = 0.4;

const DEFAULT_TIMESTAMP_LABELS = [
  "05:00:00", "05:36:33", "06:13:06", "06:49:39", "07:26:12", "08:02:44",
];

// The spec's literal frame numbers (spawn ends 207, headline 180-207, caption
// 210-230) assume a 244-frame scene — scale them if the pipeline hands this
// scene a different duration (narration-driven timing varies per shot).
const REF_DURATION = 244;
const REF_SPAWN_END = 207;
const REF_HEADLINE_START = 180;
const REF_CAPTION_START = 210;
const HEADLINE_FADE_FRAMES = 27;
const CAPTION_FADE_FRAMES = 20;
const EXIT_FRAMES = 12;

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------
const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const pingColor = (t: number): string => {
  const [c1, c2, c3] = PING_COLOR_STOPS;
  const [from, to, localT] = t <= 0.5 ? [c1, c2, t / 0.5] : [c2, c3, (t - 0.5) / 0.5];
  const [ar, ag, ab] = hexToRgb(from);
  const [br, bg, bb] = hexToRgb(to);
  return `rgb(${Math.round(lerp(ar, br, localT))}, ${Math.round(lerp(ag, bg, localT))}, ${Math.round(lerp(ab, bb, localT))})`;
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export const DriverHeatmapScene: React.FC<DriverHeatmapSceneProps> = ({
  gridCellSize = DEFAULT_GRID_CELL_SIZE,
  gridOpacity = DEFAULT_GRID_OPACITY,
  driverCount = DEFAULT_DRIVER_COUNT,
  spawnDuration,
  timestampSequence,
  headlineRevealFrame,
  captionRevealFrame,
  accentColor = ACCENT_DEFAULT,
  topicLabel = TOPIC_DEFAULT,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const durationScale = durationInFrames / REF_DURATION;
  const resolvedSpawnDuration = spawnDuration ?? Math.round(REF_SPAWN_END * durationScale);
  const resolvedHeadlineStart = headlineRevealFrame ?? Math.round(REF_HEADLINE_START * durationScale);
  const resolvedCaptionStart = captionRevealFrame ?? Math.round(REF_CAPTION_START * durationScale);

  const resolvedTimestamps =
    timestampSequence && timestampSequence.length > 0
      ? timestampSequence
      : DEFAULT_TIMESTAMP_LABELS.map((label, i) => ({
          frame: Math.round((i * resolvedSpawnDuration) / (DEFAULT_TIMESTAMP_LABELS.length - 1)),
          label,
        }));

  // Stratified positions: the canvas is divided into a grid of cells (at
  // least one per driver) and each driver lands in a shuffled cell + jitter,
  // so pings cover the full canvas evenly instead of clustering — while
  // staying deterministic across every rendered frame.
  const cols = Math.max(1, Math.ceil(Math.sqrt((driverCount * VW) / VH)));
  const rows = Math.max(1, Math.ceil(driverCount / cols));
  const cellW = VW / cols;
  const cellH = VH / rows;

  const driverPings = React.useMemo(() => {
    const totalCells = cols * rows;
    const order = Array.from({ length: totalCells }, (_, i) => i);
    for (let i = totalCells - 1; i > 0; i--) {
      const j = Math.floor(random(`heatmap-cell-${i}`) * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    return Array.from({ length: driverCount }, (_, i) => {
      const cellIdx = order[i % totalCells];
      const col = cellIdx % cols;
      const row = Math.floor(cellIdx / cols);
      const jx = (random(`heatmap-jx-${i}`) - 0.5) * cellW * 0.72;
      const jy = (random(`heatmap-jy-${i}`) - 0.5) * cellH * 0.72;
      return { x: col * cellW + cellW / 2 + jx, y: row * cellH + cellH / 2 + jy };
    });
  }, [driverCount, cols, rows, cellW, cellH]);

  const activeTimestamp = resolvedTimestamps.reduce(
    (acc, mark) => (frame >= mark.frame ? mark : acc),
    resolvedTimestamps[0]
  );
  const spawnedCount = driverPings.filter((_, i) => {
    const t = driverCount > 1 ? i / (driverCount - 1) : 0;
    return frame >= Math.round(t * resolvedSpawnDuration);
  }).length;

  const headlineOpacity = interpolate(
    frame,
    [resolvedHeadlineStart, resolvedHeadlineStart + HEADLINE_FADE_FRAMES],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const headlineY = interpolate(
    frame,
    [resolvedHeadlineStart, resolvedHeadlineStart + HEADLINE_FADE_FRAMES],
    [10, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const captionEntrance = interpolate(
    frame,
    [resolvedCaptionStart, resolvedCaptionStart + CAPTION_FADE_FRAMES],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const hasExitRoom = durationInFrames > resolvedCaptionStart + CAPTION_FADE_FRAMES + EXIT_FRAMES;
  const sceneOpacity = hasExitRoom
    ? interpolate(frame, [durationInFrames - EXIT_FRAMES, durationInFrames], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 1;

  return (
    <AbsoluteFill style={{ backgroundColor: BG, opacity: sceneOpacity }}>
      {/* Geohash grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `linear-gradient(${accentColor} 1px, transparent 1px), linear-gradient(90deg, ${accentColor} 1px, transparent 1px)`,
          backgroundSize: `${gridCellSize}px ${gridCellSize}px`,
          opacity: gridOpacity,
        }}
      />

      {/* Driver pings */}
      {driverPings.map((pos, i) => {
        const t = driverCount > 1 ? i / (driverCount - 1) : 0;
        const color = pingColor(t);
        const enterFrame = Math.round(t * resolvedSpawnDuration);
        const entrance = spring({
          frame: frame - enterFrame,
          fps,
          from: 0,
          to: 1,
          config: { stiffness: 260, damping: 18 },
          durationInFrames: 16,
        });
        if (entrance <= 0) return null;

        const isGlow = t > GLOW_ORDER_THRESHOLD;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: pos.x,
              top: pos.y,
              width: DOT_SIZE,
              height: DOT_SIZE,
              borderRadius: "50%",
              backgroundColor: color,
              transform: `translate(-50%, -50%) scale(${entrance})`,
              opacity: entrance,
              boxShadow: isGlow ? `0 0 6px ${color}, 0 0 14px ${color}` : undefined,
            }}
          />
        );
      })}

      {/* Topic pill */}
      <div
        style={{
          position: "absolute",
          top: SAFE_ZONE.top,
          left: SAFE_ZONE.left,
          padding: "6px 14px",
          borderRadius: 20,
          border: `1px solid ${accentColor}`,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: accentColor,
            fontFamily: INTER,
          }}
        >
          {topicLabel}
        </span>
      </div>

      {/* Headline */}
      <div
        style={{
          position: "absolute",
          bottom: SAFE_ZONE.bottom + 96,
          left: SAFE_ZONE.left,
          right: SAFE_ZONE.right,
          opacity: headlineOpacity,
          transform: `translateY(${headlineY}px)`,
        }}
      >
        <span style={{ fontSize: 22, fontWeight: 700, color: colors.textPrimary, fontFamily: INTER, letterSpacing: "-0.01em" }}>
          {HEADLINE_TEXT}
        </span>
      </div>

      {/* Caption */}
      <div
        style={{
          position: "absolute",
          bottom: SAFE_ZONE.bottom + 62,
          left: SAFE_ZONE.left,
          right: SAFE_ZONE.right,
          opacity: captionEntrance * CAPTION_MAX_OPACITY,
        }}
      >
        <span style={{ fontSize: 13, color: colors.textPrimary, fontFamily: INTER }}>{CAPTION_TEXT}</span>
      </div>

      {/* Timestamp + driver count */}
      <div
        style={{
          position: "absolute",
          bottom: SAFE_ZONE.bottom,
          left: SAFE_ZONE.left,
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <span
          style={{
            fontSize: 13,
            color: "rgba(0,0,0,0.4)",
            fontFamily: JETBRAINS_MONO,
            fontVariantNumeric: "tabular-nums",
            letterSpacing: "0.02em",
          }}
        >
          {activeTimestamp.label}
        </span>
        <span
          style={{
            fontSize: 13,
            color: "rgba(0,0,0,0.4)",
            fontFamily: JETBRAINS_MONO,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {spawnedCount} tài xế đang hoạt động
        </span>
      </div>
    </AbsoluteFill>
  );
};
