import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { DriverSwarmSceneProps } from "../types";
import { colors, JETBRAINS_MONO } from "../styles";
import { CityGrid } from "./DemandHeatmapScene";
import { rgba } from "./colorHelpers";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Authored on this viewBox. The SVG covers the full 1080×1920 canvas with
// preserveAspectRatio="slice", which crops the sides: only x ≈ 71–679 of the
// viewBox is visible. Keep driver/hotspot coordinates inside that band.
const VB_W = 750;
const VB_H = 1080;

// Phase boundaries (designed for a ~281-frame scene at 30fps)
const GRID_IN_END = 30;
const ZONE_START = 30;
const ZONE_LABEL_START = 45;
const DRIVERS_START = 60;
const TRAVEL_START = 70;
const TRAVEL_END = 200;
const PARK_LABELS_START = 200;
const EXIT_FRAMES = 30;

const ACCENT_DEFAULT = "#22C55E";

const ZONE_RADIUS = 72;
const ZONE_PULSE_PERIOD = 45;
const ARC_OFFSET = 30; // px the path midpoint deviates from the straight line

// Standard CSS "ease" curve, per spec
const TRAVEL_EASING = Easing.bezier(0.25, 0.1, 0.25, 1);

// Point on a quadratic bezier: B(t) = (1-t)²·P0 + 2(1-t)t·C + t²·P1
const quadPoint = (
  t: number,
  x0: number,
  y0: number,
  cx: number,
  cy: number,
  x1: number,
  y1: number
): [number, number] => {
  const u = 1 - t;
  return [
    u * u * x0 + 2 * u * t * cx + t * t * x1,
    u * u * y0 + 2 * u * t * cy + t * t * y1,
  ];
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export const DriverSwarmScene: React.FC<DriverSwarmSceneProps> = ({
  drivers = [],
  hotspot,
  accentColor = ACCENT_DEFAULT,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const gridOpacity = interpolate(frame, [0, GRID_IN_END], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Demand zone: springs in at ZONE_START, then breathes and emits an
  // expanding radar ring for the rest of the scene.
  const zoneScale = spring({
    frame: frame - ZONE_START,
    fps,
    config: { stiffness: 170, damping: 14 },
    durationInFrames: 25,
  });
  const zoneBreath = 1 + 0.04 * Math.sin(frame / 9);
  const pulseAge = frame - DRIVERS_START;
  const pulseT =
    pulseAge >= 0 ? (pulseAge % ZONE_PULSE_PERIOD) / ZONE_PULSE_PERIOD : -1;

  const zoneLabelOpacity = interpolate(
    frame,
    [ZONE_LABEL_START, ZONE_LABEL_START + 15],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Shared travel progress, eased per spec
  const travelT = interpolate(frame, [TRAVEL_START, TRAVEL_END], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: TRAVEL_EASING,
  });

  // Park labels: anchored to the pipeline duration so they get screen time
  // on shorter scenes too.
  const parkLabelsStart = Math.max(
    TRAVEL_START + 30,
    Math.min(PARK_LABELS_START, durationInFrames - EXIT_FRAMES - 40)
  );

  // Gentle hold, then fade over the final EXIT_FRAMES
  const hasExitRoom = durationInFrames > TRAVEL_START + EXIT_FRAMES;
  const sceneOpacity = hasExitRoom
    ? interpolate(
        frame,
        [durationInFrames - EXIT_FRAMES, durationInFrames],
        [1, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      )
    : 1;

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid slice"
        style={{ position: "absolute", top: 0, left: 0, opacity: sceneOpacity }}
      >
        <defs>
          {/* userSpaceOnUse at (0,0): referenced inside the zone group, whose
              local origin is the hotspot center */}
          <radialGradient id="swarm-zone-glow" gradientUnits="userSpaceOnUse" cx={0} cy={0} r={ZONE_RADIUS * 2.2}>
            <stop offset="0%" stopColor={accentColor} stopOpacity={0.3} />
            <stop offset="55%" stopColor={accentColor} stopOpacity={0.1} />
            <stop offset="100%" stopColor={accentColor} stopOpacity={0} />
          </radialGradient>
        </defs>

        <CityGrid opacity={gridOpacity} />

        {/* Demand zone */}
        {zoneScale > 0 && (
          <g transform={`translate(${hotspot.x}, ${hotspot.y}) scale(${zoneScale * zoneBreath})`}>
            <circle r={ZONE_RADIUS * 2.2} fill="url(#swarm-zone-glow)" />
            <circle
              r={ZONE_RADIUS}
              fill={rgba(accentColor, 0.08)}
              stroke={accentColor}
              strokeWidth={2.5}
            />
            {pulseT >= 0 && (
              <circle
                r={ZONE_RADIUS * (1 + pulseT * 0.7)}
                fill="none"
                stroke={rgba(accentColor, 0.5 * (1 - pulseT))}
                strokeWidth={2}
              />
            )}
          </g>
        )}
        {hotspot.label && zoneLabelOpacity > 0 && (
          <text
            x={hotspot.x}
            y={hotspot.y - ZONE_RADIUS - 24}
            textAnchor="middle"
            fontSize={28}
            fontWeight={700}
            paintOrder="stroke"
            stroke={colors.bg}
            strokeWidth={7}
            strokeLinejoin="round"
            style={{ fill: colors.textPrimary, fontFamily: JETBRAINS_MONO }}
            opacity={zoneLabelOpacity}
          >
            {hotspot.label}
          </text>
        )}

        {/* Drivers */}
        {drivers.map((d, i) => {
          const popScale = spring({
            frame: frame - (DRIVERS_START + i * 2),
            fps,
            config: { stiffness: 220, damping: 14 },
            durationInFrames: 18,
          });
          if (popScale <= 0) return null;

          // Curved path: quadratic bezier whose control point pushes the
          // curve ±ARC_OFFSET off the straight line at its midpoint
          // (alternating sides per driver so the swarm fans naturally).
          const side = i % 2 === 0 ? 1 : -1;
          const dx = d.endX - d.startX;
          const dy = d.endY - d.startY;
          const len = Math.max(1, Math.hypot(dx, dy));
          const perpX = (-dy / len) * ARC_OFFSET * 2 * side;
          const perpY = (dx / len) * ARC_OFFSET * 2 * side;
          const ctrlX = (d.startX + d.endX) / 2 + perpX;
          const ctrlY = (d.startY + d.endY) / 2 + perpY;
          const [x, y] = quadPoint(travelT, d.startX, d.startY, ctrlX, ctrlY, d.endX, d.endY);

          // ▲ points up; atan2 measures from +x, so rotate by angle + 90°
          const angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;

          const labelEnter = parkLabelsStart + i * 6;
          const labelOpacity = d.label
            ? interpolate(frame, [labelEnter, labelEnter + 14], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              })
            : 0;

          // Park labels sit radially outward from the hotspot so they ring
          // the zone instead of colliding with its label (or each other) when
          // drivers park close together around the circle.
          const outDx = d.endX - hotspot.x;
          const outDy = d.endY - hotspot.y;
          const outLen = Math.hypot(outDx, outDy);
          const labelX = x + (outLen > 0 ? outDx / outLen : 0) * 46;
          const labelY = y + (outLen > 0 ? outDy / outLen : -1) * 46;

          return (
            <g key={i}>
              <g transform={`translate(${x}, ${y}) scale(${popScale}) rotate(${angle})`}>
                {/* Simple car/arrow glyph pointing "up" pre-rotation */}
                <polygon
                  points="0,-14 9,11 0,5 -9,11"
                  fill={accentColor}
                  stroke={colors.bg}
                  strokeWidth={2}
                  strokeLinejoin="round"
                />
              </g>
              {d.label && labelOpacity > 0 && (
                <text
                  x={labelX}
                  y={labelY}
                  dominantBaseline="central"
                  textAnchor="middle"
                  fontSize={22}
                  fontWeight={700}
                  paintOrder="stroke"
                  stroke={colors.bg}
                  strokeWidth={6}
                  strokeLinejoin="round"
                  style={{ fill: colors.textPrimary, fontFamily: JETBRAINS_MONO }}
                  opacity={labelOpacity}
                >
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
