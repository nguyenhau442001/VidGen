import React, { useEffect, useRef, useState } from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { NetworkFlowSceneProps } from "../types";
import { colors, colorsDark, INTER, JETBRAINS_MONO } from "../styles";

// Re-exported for callers that only need the shape (signals/outputLabel/
// accentColor), matching the props interface as authored:
//   signals: Array<{ icon: string; label: string; color: string }>
//   outputLabel: string
//   accentColor?: string
// durationInFrames is appended by NetworkFlowSceneProps in ../types to match
// the manifest scene-renderer pattern (SceneRenderer spreads scene.visual +
// durationInFrames into every scene component); this scene's own animation
// is fully fixed-frame (0–180) and doesn't use it.
export type { NetworkFlowSceneProps };

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Authored on this viewBox. The SVG covers the full 1080×1920 canvas with
// preserveAspectRatio="slice", which crops the sides: only x ≈ 71–679 of the
// viewBox is visible. Keep nodes inside that band.
const VB_W = 750;
const VB_H = 1080;

// Phase boundaries, generalized from the spec's 2-signal (A/B) timeline so
// they extend cleanly to any signals.length:
//   input i:  [i*20, i*20+20]                 fade + scale 0.5 → 1.0
//   path i:   [40 + i*20, 40 + i*20 + 50]      strokeDashoffset 1 → 0
//   output:   [last path end, +40]             scale 0 → 1.1 → 1.0
//   pulse:    [output end, +30]                ring expand + fade
// For signals.length === 2 this reproduces exactly 0–20, 20–40, 40–90,
// 60–110, 110–150, 150–180.
const INPUT_STAGGER = 20;
const INPUT_ENTER_DURATION = 20;
const PATH_START_OFFSET = 40;
const PATH_DRAW_DURATION = 50;
const OUTPUT_ENTER_DURATION = 40;
const PULSE_DURATION = 30;

const ACCENT_DEFAULT = "#00ff41";

const INPUT_X = 190;
const OUTPUT_X = 550;
const INPUT_RADIUS = 40; // ~80px diameter
const OUTPUT_RADIUS = 60; // ~120px diameter
const INPUT_SPACING = 170;
const CONTENT_CENTER_Y = 460;

const hexToRgb = (hex: string): [number, number, number] => {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const rgba = (hex: string, alpha: number): string => {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export const NetworkFlowScene: React.FC<NetworkFlowSceneProps> = ({
  signals = [],
  outputLabel,
  accentColor = ACCENT_DEFAULT,
  theme = "light",
}) => {
  const palette = theme === "dark" ? colorsDark : colors;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const inputYs = signals.map(
    (_, i) => CONTENT_CENTER_Y + (i - (signals.length - 1) / 2) * INPUT_SPACING
  );

  const inputStart = (i: number) => i * INPUT_STAGGER;
  const pathStart = (i: number) => PATH_START_OFFSET + i * INPUT_STAGGER;
  const pathEnd = (i: number) => pathStart(i) + PATH_DRAW_DURATION;

  const lastPathEnd = signals.length > 0 ? pathEnd(signals.length - 1) : PATH_START_OFFSET + PATH_DRAW_DURATION;
  const outputStart = lastPathEnd;
  const outputEnd = outputStart + OUTPUT_ENTER_DURATION;
  const pulseStart = outputEnd;
  const pulseEnd = pulseStart + PULSE_DURATION;

  // Real path lengths, measured post-mount so the strokeDashoffset draw-in
  // uses the actual rendered geometry rather than an estimate.
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const [pathLengths, setPathLengths] = useState<number[]>([]);

  useEffect(() => {
    setPathLengths(pathRefs.current.map((el) => (el ? el.getTotalLength() : 0)));
  }, [signals.length]);

  // Output node: scale 0 → 1.1 → 1.0 via a spring, frozen once its own
  // stage (outputStart–outputEnd) ends so it never drifts during the pulse
  // stage that follows.
  const outputFrame = Math.min(frame, outputEnd) - outputStart;
  const outputScale = spring({
    frame: outputFrame,
    fps,
    config: { stiffness: 200, damping: 12, mass: 0.6 },
    durationInFrames: OUTPUT_ENTER_DURATION,
  });

  // Pulse ring: expands and fades within its own stage only.
  const pulseT = interpolate(frame, [pulseStart, pulseEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const pulseOpacity = interpolate(frame, [pulseStart, pulseEnd], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const pulseRadius = OUTPUT_RADIUS + pulseT * OUTPUT_RADIUS * 0.9;

  return (
    <AbsoluteFill style={{ backgroundColor: palette.bg }}>
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid slice"
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        {/* Connectors — cubic Bezier from each input node into the output
            node, drawn in with a strokeDashoffset reveal clamped to its own
            [pathStart(i), pathEnd(i)] range */}
        {signals.map((s, i) => {
          const y0 = inputYs[i];
          const cp1x = INPUT_X + 200;
          const cp1y = y0;
          const cp2x = OUTPUT_X - 200;
          const cp2y = CONTENT_CENTER_Y;
          const length = pathLengths[i] ?? 0;
          const drawT = interpolate(frame, [pathStart(i), pathEnd(i)], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const dashOffset = length * (1 - drawT);

          return (
            <path
              key={i}
              ref={(el) => {
                pathRefs.current[i] = el;
              }}
              d={`M ${INPUT_X} ${y0} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${OUTPUT_X} ${CONTENT_CENTER_Y}`}
              fill="none"
              stroke={accentColor}
              strokeWidth={2}
              strokeDasharray={length || 1}
              strokeDashoffset={length ? dashOffset : 1}
            />
          );
        })}

        {/* Input nodes — fade + scale 0.5 → 1.0, staggered per index */}
        {signals.map((s, i) => {
          const start = inputStart(i);
          const t = interpolate(frame, [start, start + INPUT_ENTER_DURATION], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          if (t <= 0) return null;
          const scale = 0.5 + t * 0.5;
          const y = inputYs[i];

          return (
            <g key={i} opacity={t} transform={`translate(${INPUT_X}, ${y}) scale(${scale})`}>
              <circle
                r={INPUT_RADIUS}
                fill={rgba(s.color, 0.1)}
                stroke={s.color}
                strokeWidth={2}
              />
              <text textAnchor="middle" dominantBaseline="central" fontSize={36}>
                {s.icon}
              </text>
              <text
                y={INPUT_RADIUS + 30}
                textAnchor="middle"
                fontSize={22}
                fontWeight={600}
                style={{ fill: palette.textPrimary, fontFamily: INTER }}
              >
                {s.label}
              </text>
            </g>
          );
        })}

        {/* Output node — spring scale 0 → 1.1 → 1.0 */}
        {outputScale > 0 && (
          <g transform={`translate(${OUTPUT_X}, ${CONTENT_CENTER_Y}) scale(${outputScale})`}>
            {frame >= pulseStart && pulseOpacity > 0 && (
              <circle
                r={pulseRadius}
                fill="none"
                stroke={accentColor}
                strokeWidth={2}
                opacity={pulseOpacity}
              />
            )}
            <circle
              r={OUTPUT_RADIUS}
              fill={rgba(accentColor, 0.1)}
              stroke={accentColor}
              strokeWidth={2}
            />
            {outputLabel && (
              <text
                y={OUTPUT_RADIUS + 40}
                textAnchor="middle"
                fontSize={26}
                fontWeight={700}
                paintOrder="stroke"
                stroke={palette.bg}
                strokeWidth={7}
                strokeLinejoin="round"
                style={{ fill: palette.textPrimary, fontFamily: JETBRAINS_MONO }}
              >
                {outputLabel}
              </text>
            )}
          </g>
        )}
      </svg>
    </AbsoluteFill>
  );
};
