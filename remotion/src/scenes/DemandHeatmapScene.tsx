import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { DemandHeatmapSceneProps } from "../types";
import { colors, JETBRAINS_MONO } from "../styles";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Hotspot coordinates are authored on this viewBox. The SVG covers the full
// 1080×1920 canvas with preserveAspectRatio="slice", which crops the sides:
// only x ≈ 71–679 of the viewBox is visible. Keep hotspots inside that band.
const VB_W = 750;
const VB_H = 1080;

// Phase boundaries (designed for a ~298-frame scene at 30fps)
const GRID_IN_END = 20;
const BLOBS_START = 20;
const BLOBS_END = 100;
const BREATHE_START = 100;
const BREATHE_RAMP = 20;
const LABEL_START = 210;
const LABEL_FADE = 30;
const EXIT_FRAMES = 38;

const GRID_STEP = 75;
const GRID_COLOR = "#1a1a2e";

const ACCENT_DEFAULT = "#22C55E";
const HOT_COLOR = "#ff4444";

// Hotspots at or above this intensity burn in the hot red; cooler ones use
// the accent green — the two-tone read of a live demand map.
const HOT_THRESHOLD = 0.55;

const BLOB_START_RADIUS = 20;
const BREATHE_AMPLITUDE = 15;

// ---------------------------------------------------------------------------
// Color helpers — intensity maps to saturation by mixing the base color
// toward its own gray, so weak hotspots read washed-out, strong ones vivid.
// ---------------------------------------------------------------------------
const hexToRgb = (hex: string): [number, number, number] => {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const saturatedColor = (hex: string, intensity: number): string => {
  const [r, g, b] = hexToRgb(hex);
  const gray = 0.299 * r + 0.587 * g + 0.114 * b;
  const t = 0.35 + 0.65 * Math.min(1, Math.max(0, intensity));
  const mix = (c: number) => Math.round(gray + (c - gray) * t);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
};

// ---------------------------------------------------------------------------
// Subtle city grid — fades in over frames 0–20. Exported for other map-style
// scenes on the same 750×1080 viewBox (e.g. DriverSwarmScene).
// ---------------------------------------------------------------------------
export const CityGrid: React.FC<{ opacity: number }> = ({ opacity }) => {
  const verticals = [];
  for (let x = 0; x <= VB_W; x += GRID_STEP) {
    verticals.push(<line key={`v${x}`} x1={x} y1={0} x2={x} y2={VB_H} />);
  }
  const horizontals = [];
  for (let y = 0; y <= VB_H; y += GRID_STEP) {
    horizontals.push(<line key={`h${y}`} x1={0} y1={y} x2={VB_W} y2={y} />);
  }
  return (
    <g stroke={GRID_COLOR} strokeWidth={1.5} opacity={opacity}>
      {verticals}
      {horizontals}
      {/* Two diagonal "avenues" so the lattice reads as a city, not graph paper */}
      <line x1={0} y1={720} x2={750} y2={310} strokeWidth={2.5} />
      <line x1={190} y1={0} x2={620} y2={1080} strokeWidth={2.5} />
    </g>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export const DemandHeatmapScene: React.FC<DemandHeatmapSceneProps> = ({
  hotspots = [],
  accentColor = ACCENT_DEFAULT,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Spread blob entrances across the 20–100 window, leaving ~30 frames for
  // the last spring to settle before the breathing phase takes over.
  const stagger =
    hotspots.length > 1
      ? Math.min(14, (BLOBS_END - BLOBS_START - 30) / (hotspots.length - 1))
      : 0;

  const gridOpacity = interpolate(frame, [0, GRID_IN_END], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Breathing ramps in at BREATHE_START and stays alive until the fade-out,
  // so the label phase sits on a living heatmap rather than a frozen one.
  const breatheAmount = interpolate(
    frame,
    [BREATHE_START, BREATHE_START + BREATHE_RAMP],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Scene duration comes from narration length in the pipeline — anchor the
  // exit fade to it so the last EXIT_FRAMES always land at the end.
  const hasExitRoom = durationInFrames > GRID_IN_END + EXIT_FRAMES;
  const sceneOpacity = hasExitRoom
    ? interpolate(
        frame,
        [durationInFrames - EXIT_FRAMES, durationInFrames],
        [1, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      )
    : 1;

  // Label still gets screen time on scenes shorter than the designed ~298.
  const labelStart = Math.max(
    BREATHE_START + 10,
    Math.min(LABEL_START, durationInFrames - EXIT_FRAMES - LABEL_FADE - 20)
  );

  const primary = hotspots[0];
  const labelOpacity = primary?.label
    ? interpolate(frame, [labelStart, labelStart + LABEL_FADE], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;
  const labelRise = interpolate(frame, [labelStart, labelStart + LABEL_FADE], [10, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // The background stays solid and only the content fades — fading the whole
  // fill would let whatever is behind the scene bleed through during the exit.
  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid slice"
        style={{ position: "absolute", top: 0, left: 0, opacity: sceneOpacity }}
      >
        <CityGrid opacity={gridOpacity} />

        {hotspots.map((h, i) => {
          const enterFrame = BLOBS_START + i * stagger;
          const grow = spring({
            frame: frame - enterFrame,
            fps,
            config: { stiffness: 140, damping: 16 },
            durationInFrames: 30,
          });
          if (grow <= 0) return null;

          const fadeIn = interpolate(frame, [enterFrame, enterFrame + 12], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          // Different phase per blob so the cluster shimmers instead of
          // pumping in unison.
          const breathe = Math.sin(frame / 20 + i) * BREATHE_AMPLITUDE * breatheAmount;
          const r = Math.max(
            4,
            BLOB_START_RADIUS + (h.radius - BLOB_START_RADIUS) * grow + breathe
          );

          const base = h.intensity >= HOT_THRESHOLD ? HOT_COLOR : accentColor;
          const color = saturatedColor(base, h.intensity);

          // Overlapping gradients auto-blend in SVG, merging nearby blobs.
          return (
            <g key={i} opacity={fadeIn}>
              <defs>
                <radialGradient
                  id={`demand-heat-${i}`}
                  gradientUnits="userSpaceOnUse"
                  cx={h.x}
                  cy={h.y}
                  r={r}
                >
                  <stop offset="0%" stopColor={color} stopOpacity={0.8} />
                  <stop offset="35%" stopColor={color} stopOpacity={0.42} />
                  <stop offset="70%" stopColor={color} stopOpacity={0.14} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </radialGradient>
              </defs>
              <circle cx={h.x} cy={h.y} r={r} fill={`url(#demand-heat-${i})`} />
            </g>
          );
        })}

        {/* Label above the densest cluster (hotspots[0]) */}
        {primary?.label && labelOpacity > 0 && (
          <text
            x={primary.x}
            y={primary.y - primary.radius - 26 + labelRise}
            textAnchor="middle"
            fontSize={30}
            fontWeight={700}
            paintOrder="stroke"
            stroke={colors.bg}
            strokeWidth={7}
            strokeLinejoin="round"
            style={{ fill: colors.textPrimary, fontFamily: JETBRAINS_MONO }}
            opacity={labelOpacity}
          >
            {primary.label}
          </text>
        )}
      </svg>
    </AbsoluteFill>
  );
};
