import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { RouteTimelineSceneProps, RouteTimelineStop } from "../types";
import { ABOVE_CAPTION_BOTTOM, colors, INTER, SAFE_ZONE } from "../styles";

export type { RouteTimelineStop, RouteTimelineSceneProps };

// ---------------------------------------------------------------------------
// Constants — frame ranges generalized from the spec's 4-stop timeline so
// they extend cleanly to any stops.length:
//   node i:  [i*NODE_STAGGER, i*NODE_STAGGER + NODE_ENTER_DURATION]        fade + spring scale
//   line i:  [node i start + LINE_START_OFFSET, +LINE_DRAW_DURATION]       strokeDashoffset draw
//   settle:  [last node end + SETTLE_GAP, +SETTLE_DURATION]                scale 1 → 1.05 → 1, all nodes
// For stops.length === 4 this reproduces exactly 0–30, 15–50, 40–70, 55–90,
// 80–110, 95–130, 120–150, 160–180.
// ---------------------------------------------------------------------------
const NODE_STAGGER = 40;
const NODE_ENTER_DURATION = 30;
const LINE_START_OFFSET = 15;
const LINE_DRAW_DURATION = 35;
const SETTLE_GAP = 10;
const SETTLE_DURATION = 20;
const FINAL_HOLD_FRAMES = 18;

const ACCENT_DEFAULT = "#00ff41";
const LINE_COLOR_DEFAULT = "rgba(0,0,0,0.15)";

const NODE_RADIUS = 32; // 64px diameter
const CENTER_Y_FRACTION = 0.45;
const CANVAS_W = 1080;
const CANVAS_H = 1920;

// Highlighted nodes keep a steady glow at GLOW_BASE and bump up to
// GLOW_PULSE_PEAK across their own enter window for extra emphasis.
const GLOW_BASE = 3;
const GLOW_PULSE_PEAK = 7;

const glowStdDeviation = (frame: number, start: number, end: number) => {
  const t = interpolate(frame, [start, (start + end) / 2, end], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return GLOW_BASE + t * (GLOW_PULSE_PEAK - GLOW_BASE);
};

export const RouteTimelineScene: React.FC<RouteTimelineSceneProps> = ({
  stops = [],
  accentColor = ACCENT_DEFAULT,
  lineColor = LINE_COLOR_DEFAULT,
  onScreenText,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const centerY = CANVAS_H * CENTER_Y_FRACTION;
  const contentLeft = SAFE_ZONE.left;
  const contentRight = CANVAS_W - SAFE_ZONE.right;
  const n = stops.length;
  const xs =
    n <= 1
      ? [(contentLeft + contentRight) / 2]
      : stops.map((_, i) => contentLeft + ((contentRight - contentLeft) / (n - 1)) * i);

  // The authored 4-stop animation naturally ends at frame 180, but narration
  // can produce shorter scenes. Compress every phase together and preserve a
  // final hold so the last routing decision is readable before the cut.
  const naturalLastNodeEnd = (n > 0 ? (n - 1) * NODE_STAGGER : 0) + NODE_ENTER_DURATION;
  const naturalSettleEnd = naturalLastNodeEnd + SETTLE_GAP + SETTLE_DURATION;
  const timingScale = Math.min(1, Math.max(0.35, (durationInFrames - FINAL_HOLD_FRAMES) / naturalSettleEnd));
  const scaled = (frames: number) => Math.round(frames * timingScale);
  const enterDuration = Math.max(1, scaled(NODE_ENTER_DURATION));

  const nodeStart = (i: number) => scaled(i * NODE_STAGGER);
  const nodeEnd = (i: number) => nodeStart(i) + enterDuration;
  const lineStart = (i: number) => nodeStart(i) + scaled(LINE_START_OFFSET);
  const lineEnd = (i: number) => lineStart(i) + Math.max(1, scaled(LINE_DRAW_DURATION));

  const lastNodeEnd = n > 0 ? nodeEnd(n - 1) : NODE_ENTER_DURATION;
  const settleStart = lastNodeEnd + scaled(SETTLE_GAP);
  const settleEnd = settleStart + Math.max(1, scaled(SETTLE_DURATION));
  const settleScale = interpolate(
    frame,
    [settleStart, (settleStart + settleEnd) / 2, settleEnd],
    [1, 1.05, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        <defs>
          {stops.map((s, i) =>
            s.highlight ? (
              <filter key={i} id={`route-glow-${i}`} x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation={glowStdDeviation(frame, nodeStart(i), nodeEnd(i))} result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            ) : null
          )}
        </defs>

        {/* Connecting lines — straight horizontal segments drawn in
            left→right via strokeDashoffset, each clamped to its own
            [lineStart(i), lineEnd(i)] window */}
        {stops.slice(0, -1).map((_, i) => {
          const length = Math.abs(xs[i + 1] - xs[i]);
          const t = interpolate(frame, [lineStart(i), lineEnd(i)], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <line
              key={i}
              x1={xs[i]}
              y1={centerY}
              x2={xs[i + 1]}
              y2={centerY}
              stroke={lineColor}
              strokeWidth={2}
              strokeDasharray={length || 1}
              strokeDashoffset={length * (1 - t)}
            />
          );
        })}

        {/* Nodes — fade + spring scale 0→1 per stop, then all nodes settle
            with a shared 1→1.05→1 pulse once the last one has entered */}
        {stops.map((stop, i) => {
          const start = nodeStart(i);
          const opacity = interpolate(frame, [start, start + enterDuration], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          if (opacity <= 0) return null;

          const enterScale = spring({
            frame: Math.max(0, frame - start),
            fps,
            config: { stiffness: 200, damping: 13, mass: 0.6 },
            durationInFrames: enterDuration,
          });

          const x = xs[i];
          const stroke = stop.highlight ? accentColor : lineColor;
          const numberColor = stop.highlight ? accentColor : colors.textPrimary;

          return (
            <g
              key={i}
              opacity={opacity}
              transform={`translate(${x}, ${centerY}) scale(${enterScale * settleScale})`}
            >
              <circle
                r={NODE_RADIUS}
                fill="transparent"
                stroke={stroke}
                strokeWidth={2}
                filter={stop.highlight ? `url(#route-glow-${i})` : undefined}
              />
              <text
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={26}
                fontWeight={700}
                style={{ fill: numberColor, fontFamily: INTER }}
              >
                {i + 1}
              </text>
              <text
                y={NODE_RADIUS + 34}
                textAnchor="middle"
                fontSize={22}
                fontWeight={500}
                style={{ fill: colors.textPrimary, fontFamily: INTER }}
              >
                {stop.label}
              </text>
              {stop.sublabel && (
                <text
                  y={NODE_RADIUS + 58}
                  textAnchor="middle"
                  fontSize={16}
                  fontWeight={400}
                  style={{ fill: "rgba(0,0,0,0.5)", fontFamily: INTER }}
                >
                  {stop.sublabel}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {onScreenText && (
        <AbsoluteFill
          style={{
            justifyContent: "flex-end",
            alignItems: "center",
            paddingBottom: ABOVE_CAPTION_BOTTOM,
            paddingLeft: SAFE_ZONE.left,
            paddingRight: SAFE_ZONE.right,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              padding: "16px 40px",
              borderRadius: 16,
              background: "rgba(0,0,0,0.65)",
              backdropFilter: "blur(12px)",
              maxWidth: 840,
              textAlign: "center",
            }}
          >
            <span style={{ fontSize: 28, fontWeight: 500, color: "#fff", lineHeight: 1.35, fontFamily: INTER }}>
              {onScreenText}
            </span>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
