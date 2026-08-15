import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { MapPingAxis, MapPingSceneProps, MapPingZone } from "../types";
import { colors, INTER, SAFE_ZONE } from "../styles";
import { AmbientBackground } from "../AmbientBackground";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const ENTER_FRAMES = 12;
const EXIT_FRAMES = 8;
const VW = 1080;
const VH = 1920;

const CUST_NX = 0.5;
const CUST_NY = 0.46;

const DRIVER_R = 16;
const CUST_R = 20;
const GLOW_BASE_R = 28;

const BAIT_COLOR = "#f5c542";
const ACCENT_DEFAULT = "#00c896";
const MUTED_DEFAULT = "rgba(0,0,0,0.28)";

const toPx = (n: number, dim: number) => n * dim;

// ---------------------------------------------------------------------------
// Axis-comparison geometry (fixed screen bearings, not authored per-shot):
// "forward" points straight up from the rider, matching a compass mental
// model, so destination/rider/toward-driver read as one honest vertical
// line. The away-driver branches to the lower-left so its vector is
// unambiguously distinct from that line rather than merely its reverse.
// ---------------------------------------------------------------------------
const AXIS_DIR = { x: 0, y: -1 };
const OFF_AXIS_DIR = { x: -0.85, y: 0.53 };
const AXIS_METERS_TO_PX = 0.55;
const AXIS_DEST_DIST_PX = 300;

// Keeps the axis-comparison driver dot *and* its text label fully inside the
// frame regardless of the real-world distanceMeters a shot authors — that
// value is illustrative, not to-scale, so a large enough number (e.g. a
// driver 2+ km away) must not be allowed to push the dot past the canvas
// edge, and a long label must not be allowed to run off it either.
const AXIS_EDGE_MARGIN = 32;
const AXIS_LABEL_GAP = DRIVER_R + 14;
// The toward driver sits on the same vertical centerline as a bottom-anchored
// on_screen_text caption (both horizontally centered), so its dot+label stack
// must clear the caption's safe zone, not just the raw screen edge — this
// scene has no visibility into whether a caption prop is set for this shot,
// so it always reserves the room. ~160px covers a two-line headline_bold box.
const AXIS_CAPTION_CLEARANCE = 160;
// Rough average glyph width as a fraction of font size for Inter at the
// weights used here — matches the `badge.length * 11 + 24` estimate already
// used for the phase badge above, just parameterized by font size/weight.
const estimateTextWidth = (text: string, fontSize: number, bold: boolean) =>
  text.length * fontSize * (bold ? 0.62 : 0.56);

// ---------------------------------------------------------------------------
// Street grid: [normalizedPos, isMajor]
// ---------------------------------------------------------------------------
const H_STREETS: [number, boolean][] = [
  [0.08, false], [0.17, false], [0.26, true],  [0.35, false],
  [0.44, true],  [0.53, false], [0.62, true],  [0.71, false],
  [0.80, true],  [0.90, false], [0.96, false],
];
const V_STREETS: [number, boolean][] = [
  [0.08, false], [0.19, true],  [0.31, false], [0.43, false],
  [0.54, true],  [0.65, false], [0.76, false], [0.87, true],
  [0.95, false],
];

// ---------------------------------------------------------------------------
// Map background — SVG group rendered inside the main <svg>
// ---------------------------------------------------------------------------
const MapGrid: React.FC = () => (
  <>
    {/* Block fills between street lines */}
    {H_STREETS.slice(0, -1).flatMap(([hy], hi) =>
      V_STREETS.slice(0, -1).map(([vx], vi) => {
        const hy2 = H_STREETS[hi + 1][0];
        const vx2 = V_STREETS[vi + 1][0];
        return (
          <rect
            key={`blk-${hi}-${vi}`}
            x={toPx(vx, VW) + 1}
            y={toPx(hy, VH) + 1}
            width={toPx(vx2 - vx, VW) - 2}
            height={toPx(hy2 - hy, VH) - 2}
            fill="rgba(0,0,0,0.012)"
          />
        );
      })
    )}

    {/* Horizontal streets */}
    {H_STREETS.map(([y, major]) => (
      <line
        key={`hs${y}`}
        x1={0} y1={toPx(y, VH)} x2={VW} y2={toPx(y, VH)}
        stroke={major ? "rgba(0,0,0,0.09)" : "rgba(0,0,0,0.04)"}
        strokeWidth={major ? 2.5 : 1.5}
      />
    ))}

    {/* Vertical streets */}
    {V_STREETS.map(([x, major]) => (
      <line
        key={`vs${x}`}
        x1={toPx(x, VW)} y1={0} x2={toPx(x, VW)} y2={VH}
        stroke={major ? "rgba(0,0,0,0.09)" : "rgba(0,0,0,0.04)"}
        strokeWidth={major ? 2.5 : 1.5}
      />
    ))}

    {/* Vignette overlay */}
    <defs>
      <radialGradient id="mpVig" cx="50%" cy="46%" r="62%" gradientUnits="objectBoundingBox">
        <stop offset="0%" stopColor="transparent" />
        <stop offset="100%" stopColor={colors.bg} stopOpacity={0.68} />
      </radialGradient>
    </defs>
    <rect x={0} y={0} width={VW} height={VH} fill="url(#mpVig)" />
  </>
);

// ---------------------------------------------------------------------------
// Route line with draw-in animation
// ---------------------------------------------------------------------------
const RouteLine: React.FC<{
  toNX: number;
  toNY: number;
  color: string;
  frame: number;
  drawStart: number;
  drawDuration?: number;
  fadeStart?: number;
  fadeDuration?: number;
}> = ({ toNX, toNY, color, frame, drawStart, drawDuration = 26, fadeStart, fadeDuration = 14 }) => {
  const x1 = toPx(CUST_NX, VW);
  const y1 = toPx(CUST_NY, VH);
  const x2 = toPx(toNX, VW);
  const y2 = toPx(toNY, VH);
  const length = Math.hypot(x2 - x1, y2 - y1);

  const drawP = interpolate(frame, [drawStart, drawStart + drawDuration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const opacity =
    fadeStart != null
      ? interpolate(frame, [fadeStart, fadeStart + fadeDuration], [0.82, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 0.82;

  if (drawP <= 0 || opacity <= 0) return null;

  return (
    <line
      x1={x1} y1={y1} x2={x2} y2={y2}
      stroke={color}
      strokeWidth={3.5}
      strokeLinecap="round"
      strokeDasharray={`${length}`}
      strokeDashoffset={`${length * (1 - drawP)}`}
      opacity={opacity}
    />
  );
};

// ---------------------------------------------------------------------------
// Driver dot
// ---------------------------------------------------------------------------
type DotState = "normal" | "bait" | "selected";

const DriverDot: React.FC<{
  nx: number;
  ny: number;
  label: string;
  state: DotState;
  frame: number;
  fps: number;
  enterFrame: number;
  highlightStartFrame: number | null;
  accentColor: string;
  badge?: string;
  badgeFrame?: number;
}> = ({
  nx, ny, label, state, frame, fps,
  enterFrame, highlightStartFrame, accentColor, badge, badgeFrame,
}) => {
  const cx = toPx(nx, VW);
  const cy = toPx(ny, VH);

  const dotColor =
    state === "bait" ? BAIT_COLOR :
    state === "selected" ? accentColor :
    MUTED_DEFAULT;

  const glowColor = state === "bait" ? BAIT_COLOR : accentColor;

  // Entrance spring (dot pops in when it first appears)
  const entrance = spring({
    frame: frame - enterFrame,
    fps,
    from: 0,
    to: 1,
    config: { stiffness: 280, damping: 20 },
    durationInFrames: 24,
  });

  // Glow spring — anchored to when this dot becomes highlighted
  const glowPop =
    highlightStartFrame != null && state !== "normal"
      ? spring({
          frame: frame - highlightStartFrame,
          fps,
          from: 0.5,
          to: 1,
          config: { stiffness: 200, damping: 10 },
          durationInFrames: 30,
        })
      : 0;

  // Sine oscillation layered on top of the spring
  const glowPulse = state !== "normal"
    ? glowPop * (1 + Math.sin(frame * 0.13) * 0.26)
    : 0;

  // Distance label fade in after dot appears
  const labelOpacity = interpolate(
    frame,
    [enterFrame + 14, enterFrame + 28],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Badge fade in
  const badgeOpacity =
    badge && badgeFrame != null
      ? interpolate(frame, [badgeFrame, badgeFrame + 12], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 0;

  const dotR = state !== "normal" ? DRIVER_R * 1.35 : DRIVER_R;
  // Rough badge width: chars * 11 + padding
  const badgeW = badge ? badge.length * 11 + 24 : 0;

  return (
    <g transform={`translate(${cx},${cy})`}>
      {/* Outer glow ring */}
      {state !== "normal" && (
        <circle
          r={GLOW_BASE_R * glowPulse * 1.75}
          fill="none"
          stroke={glowColor}
          strokeWidth={1.5}
          opacity={0.18 * entrance}
        />
      )}
      {/* Inner glow ring */}
      {state !== "normal" && (
        <circle
          r={GLOW_BASE_R * glowPulse}
          fill="none"
          stroke={glowColor}
          strokeWidth={2.5}
          opacity={0.48 * entrance}
        />
      )}

      {/* Main dot body */}
      <circle r={dotR * entrance} fill={dotColor} opacity={entrance} />
      {/* Specular highlight */}
      <circle r={dotR * 0.38 * entrance} fill="rgba(255,255,255,0.65)" opacity={entrance} />

      {/* Distance label — offset scales with the dot's own (possibly
          enlarged, highlighted) radius, and a dark stroke halo keeps it
          legible over the glow rings regardless of how far they pulse.
          Empty label (axis mode renders its own side-aware label instead,
          since a fixed rightward offset can run into other diagram content
          when a dot sits off-center) renders nothing. */}
      {label && (
        <text
          x={dotR + 14}
          y={6}
          fontSize={24}
          fontWeight={600}
          letterSpacing="-0.01em"
          paintOrder="stroke"
          stroke={colors.bg}
          strokeWidth={5}
          strokeLinejoin="round"
          style={{
            fill: state !== "normal" ? dotColor : "rgba(0,0,0,0.4)",
            fontFamily: INTER,
          }}
          opacity={labelOpacity * entrance}
        >
          {label}
        </text>
      )}

      {/* Phase badge */}
      {badge && badgeOpacity > 0 && (
        <g transform={`translate(0,${-dotR * entrance - 36})`} opacity={badgeOpacity}>
          <rect x={-6} y={-24} width={badgeW} height={28} rx={8} fill={glowColor} />
          <text
            x={6}
            y={-4}
            fontSize={18}
            fontWeight={700}
            style={{ fill: "#0a0a0f", fontFamily: INTER }}
          >
            {badge}
          </text>
        </g>
      )}
    </g>
  );
};

// ---------------------------------------------------------------------------
// Customer dot
// ---------------------------------------------------------------------------
const CustomerDot: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const entrance = spring({
    frame: frame - 5,
    fps,
    from: 0,
    to: 1,
    config: { stiffness: 260, damping: 18 },
    durationInFrames: 22,
  });
  const outerPulse = 1 + Math.sin(frame * 0.1) * 0.16;

  return (
    <g transform={`translate(${toPx(CUST_NX, VW)},${toPx(CUST_NY, VH)})`}>
      <circle
        r={CUST_R * 2.6 * outerPulse * entrance}
        fill="none"
        stroke={colors.cyan}
        strokeWidth={1.5}
        opacity={0.18 * entrance}
      />
      <circle
        r={CUST_R * 1.65 * entrance}
        fill="none"
        stroke={colors.cyan}
        strokeWidth={2}
        opacity={0.36 * entrance}
      />
      <circle r={CUST_R * entrance} fill={colors.cyan} opacity={entrance} />
      <circle r={CUST_R * 0.38 * entrance} fill="white" opacity={0.85 * entrance} />
    </g>
  );
};

// ---------------------------------------------------------------------------
// Axis-comparison mode: rider→destination "ground truth" direction vs. two
// drivers' own travel vectors (one aligned, one opposed) — dedicated layout
// for explaining that raw distance loses to direction of travel.
// ---------------------------------------------------------------------------

// Flag/pin marker for the destination — deliberately not a circular dot, so
// it reads as distinct from the rider/driver nodes at a glance.
const DestinationNode: React.FC<{
  x: number;
  y: number;
  label: string;
  frame: number;
  fps: number;
  enterFrame: number;
}> = ({ x, y, label, frame, fps, enterFrame }) => {
  const entrance = spring({
    frame: frame - enterFrame,
    fps,
    from: 0,
    to: 1,
    config: { stiffness: 220, damping: 16 },
    durationInFrames: 24,
  });

  if (entrance <= 0) return null;

  return (
    <g transform={`translate(${x},${y}) scale(${entrance})`} opacity={entrance}>
      <line x1={0} y1={10} x2={0} y2={-26} stroke="#fff" strokeWidth={3} strokeLinecap="round" />
      <path d="M 0 -26 L 22 -19 L 0 -12 Z" fill="#fff" />
      <circle cx={0} cy={12} r={4} fill="#fff" />

      <text
        x={30}
        y={-10}
        fontSize={24}
        fontWeight={600}
        letterSpacing="-0.01em"
        paintOrder="stroke"
        stroke={colors.bg}
        strokeWidth={5}
        strokeLinejoin="round"
        style={{ fill: "#fff", fontFamily: INTER }}
      >
        {label}
      </text>
    </g>
  );
};

// A drawn-in line with an optional directional arrowhead. `dashed` renders
// the rider→destination "ground truth" axis (fades in, doesn't imply
// motion); solid segments are driver vectors that draw in stroke-first, same
// technique as RouteLine, to read as "this is the way it's moving."
const AxisSegment: React.FC<{
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  markerId?: string;
  dashed?: boolean;
  frame: number;
  drawStart: number;
  drawDuration?: number;
}> = ({ x1, y1, x2, y2, color, markerId, dashed, frame, drawStart, drawDuration = 22 }) => {
  const length = Math.hypot(x2 - x1, y2 - y1);
  const drawP = interpolate(frame, [drawStart, drawStart + drawDuration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  if (drawP <= 0) return null;

  const markerEnd = markerId ? `url(#${markerId})` : undefined;

  return dashed ? (
    <line
      x1={x1} y1={y1} x2={x2} y2={y2}
      stroke={color}
      strokeWidth={3}
      strokeDasharray="10 8"
      strokeLinecap="round"
      opacity={0.75 * drawP}
      markerEnd={markerEnd}
    />
  ) : (
    <line
      x1={x1} y1={y1} x2={x2} y2={y2}
      stroke={color}
      strokeWidth={3.5}
      strokeLinecap="round"
      strokeDasharray={`${length}`}
      strokeDashoffset={`${length * (1 - drawP)}`}
      opacity={0.9}
      markerEnd={markerEnd}
    />
  );
};

// Distance label + ETA + (when present) the real-world reason distance
// alone is misleading — all three lines anchored to the same side, chosen
// by the caller based on which way the dot has room to breathe, so a driver
// sitting off-center never has its own label text cross back over the
// rider→destination axis or another driver's vector.
const AxisDriverLabel: React.FC<{
  x: number;
  y: number;
  dotR: number;
  side: "left" | "right";
  distanceLabel: string;
  etaLabel?: string;
  constraintNote?: string | null;
  color: string;
  mutedColor: string;
  frame: number;
  enterFrame: number;
}> = ({ x, y, dotR, side, distanceLabel, etaLabel, constraintNote, color, mutedColor, frame, enterFrame }) => {
  const opacity = interpolate(frame, [enterFrame, enterFrame + 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  if (opacity <= 0) return null;

  const sign = side === "left" ? -1 : 1;
  const anchor = side === "left" ? "end" : "start";
  const tx = sign * (dotR + 14);

  return (
    <g transform={`translate(${x},${y})`} opacity={opacity}>
      <text
        x={tx}
        y={6}
        textAnchor={anchor}
        fontSize={24}
        fontWeight={600}
        letterSpacing="-0.01em"
        paintOrder="stroke"
        stroke={colors.bg}
        strokeWidth={5}
        strokeLinejoin="round"
        style={{ fill: mutedColor, fontFamily: INTER }}
      >
        {distanceLabel}
      </text>
      {etaLabel && (
        <text
          x={tx}
          y={42}
          textAnchor={anchor}
          fontSize={26}
          fontWeight={700}
          paintOrder="stroke"
          stroke={colors.bg}
          strokeWidth={5}
          strokeLinejoin="round"
          style={{ fill: color, fontFamily: INTER }}
        >
          {etaLabel}
        </text>
      )}
      {constraintNote && (
        <text
          x={tx}
          y={72}
          textAnchor={anchor}
          fontSize={17}
          fontWeight={500}
          paintOrder="stroke"
          stroke={colors.bg}
          strokeWidth={4}
          strokeLinejoin="round"
          style={{ fill: "rgba(0,0,0,0.55)", fontFamily: INTER }}
        >
          {constraintNote}
        </text>
      )}
    </g>
  );
};

// Physical barrier glyph (e.g. a road median) drawn across a driver's vector
// — the concrete, visible reason their route can't run straight to the
// rider, perpendicular to the vector it's blocking.
const MedianStrip: React.FC<{
  midX: number;
  midY: number;
  perp: { x: number; y: number };
  frame: number;
  enterFrame: number;
}> = ({ midX, midY, perp, frame, enterFrame }) => {
  const opacity = interpolate(frame, [enterFrame, enterFrame + 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  if (opacity <= 0) return null;

  const len = 46;
  const x1 = midX - perp.x * (len / 2);
  const y1 = midY - perp.y * (len / 2);
  const x2 = midX + perp.x * (len / 2);
  const y2 = midY + perp.y * (len / 2);

  return (
    <line
      x1={x1} y1={y1} x2={x2} y2={y2}
      stroke={BAIT_COLOR}
      strokeWidth={5}
      strokeLinecap="round"
      strokeDasharray="9 7"
      opacity={opacity}
    />
  );
};

const AxisComparisonDiagram: React.FC<{
  axis: MapPingAxis;
  accentColor: string;
  roadConstraint?: "median";
  frame: number;
  fps: number;
}> = ({ axis, accentColor, roadConstraint, frame, fps }) => {
  const riderX = toPx(CUST_NX, VW);
  const riderY = toPx(CUST_NY, VH);

  const destX = riderX + AXIS_DIR.x * AXIS_DEST_DIST_PX;
  const destY = riderY + AXIS_DIR.y * AXIS_DEST_DIST_PX;

  const towardDriver = axis.drivers.find((d) => d.direction === "toward");
  const awayDriver = axis.drivers.find((d) => d.direction === "away");

  // Widest line each driver's own label will render (distance / ETA /
  // constraint note), used below to keep that specific label on-screen
  // instead of guessing a single worst-case width for every shot.
  const labelWidth = (d?: typeof towardDriver) =>
    d
      ? Math.max(
          estimateTextWidth(d.label, 24, false),
          d.etaLabel ? estimateTextWidth(d.etaLabel, 26, true) : 0,
          d.constraintNote ? estimateTextWidth(d.constraintNote, 17, false) : 0
        )
      : 0;

  // Toward driver sits straight below the rider (AXIS_DIR is purely
  // vertical) — cap how far down that can push it so the dot plus its
  // label stack (~92px tall) stay above the bottom edge.
  const towardMaxPx = Math.max(
    0,
    VH - SAFE_ZONE.bottom - AXIS_CAPTION_CLEARANCE - 92 - riderY
  );
  const towardPx = towardDriver
    ? Math.min(towardDriver.distanceMeters * AXIS_METERS_TO_PX, towardMaxPx)
    : 0;

  // Away driver branches to the lower-left — cap how far that can push it so
  // its own (left-anchored) label never runs past the left edge.
  const awayMaxPx = awayDriver
    ? Math.max(
        0,
        (riderX - AXIS_EDGE_MARGIN - labelWidth(awayDriver) - AXIS_LABEL_GAP) /
          Math.abs(OFF_AXIS_DIR.x)
      )
    : 0;
  const awayPx = awayDriver
    ? Math.min(awayDriver.distanceMeters * AXIS_METERS_TO_PX, awayMaxPx)
    : 0;

  const towardPos = towardDriver && {
    x: riderX - AXIS_DIR.x * towardPx,
    y: riderY - AXIS_DIR.y * towardPx,
  };
  const awayPos = awayDriver && {
    x: riderX + OFF_AXIS_DIR.x * awayPx,
    y: riderY + OFF_AXIS_DIR.y * awayPx,
  };

  // Perpendicular to the away driver's own vector — where a median glyph
  // crosses it, at the segment's midpoint.
  const awayPerp = { x: -OFF_AXIS_DIR.y, y: OFF_AXIS_DIR.x };
  const awayMid = awayPos && { x: (riderX + awayPos.x) / 2, y: (riderY + awayPos.y) / 2 };

  // Staggered reveal: ground-truth axis first, then the aligned driver
  // "arriving" along it, then the opposed driver branching away — so the
  // eye reads the correct direction before it's contradicted.
  const destEnter = ENTER_FRAMES + 6;
  const axisLineDraw = destEnter + 18;
  const towardEnter = axisLineDraw + 10;
  const towardArrowDraw = towardEnter + 16;
  const towardAnnotationEnter = towardArrowDraw + 14;
  const awayEnter = towardArrowDraw + 8;
  const awayArrowDraw = awayEnter + 16;
  const medianEnter = awayArrowDraw + 6;
  const awayAnnotationEnter = medianEnter + 10;

  return (
    <>
      <defs>
        <marker id="axisArrowAccent" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 Z" fill={accentColor} />
        </marker>
        <marker id="axisArrowMuted" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 Z" fill={MUTED_DEFAULT} />
        </marker>
        <marker id="axisArrowGhost" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 Z" fill="rgba(0,0,0,0.5)" />
        </marker>
      </defs>

      {/* Ground-truth axis: rider → destination */}
      <AxisSegment
        x1={riderX} y1={riderY} x2={destX} y2={destY}
        color="rgba(0,0,0,0.5)"
        markerId="axisArrowGhost"
        dashed
        frame={frame}
        drawStart={axisLineDraw}
      />

      {/* Aligned driver's own vector, pointing toward (and through) the
          rider — stops just short of the rider's own dot so the arrowhead
          isn't drawn underneath it (CustomerDot always renders on top). */}
      {towardPos && (
        <AxisSegment
          x1={towardPos.x} y1={towardPos.y}
          x2={riderX - AXIS_DIR.x * (CUST_R + 6)}
          y2={riderY - AXIS_DIR.y * (CUST_R + 6)}
          color={accentColor}
          markerId="axisArrowAccent"
          frame={frame}
          drawStart={towardArrowDraw}
        />
      )}

      {/* Opposed driver's own vector, pointing away from the rider */}
      {awayPos && (
        <AxisSegment
          x1={riderX} y1={riderY} x2={awayPos.x} y2={awayPos.y}
          color={MUTED_DEFAULT}
          markerId="axisArrowMuted"
          frame={frame}
          drawStart={awayArrowDraw}
        />
      )}

      {/* Physical reason the opposed driver can't go straight to the rider */}
      {roadConstraint === "median" && awayMid && (
        <MedianStrip
          midX={awayMid.x}
          midY={awayMid.y}
          perp={awayPerp}
          frame={frame}
          enterFrame={medianEnter}
        />
      )}

      <DestinationNode
        x={destX}
        y={destY}
        label={axis.destinationLabel ?? "Điểm đến"}
        frame={frame}
        fps={fps}
        enterFrame={destEnter}
      />

      {towardPos && towardDriver && (
        <>
          <DriverDot
            nx={towardPos.x / VW}
            ny={towardPos.y / VH}
            label=""
            state="selected"
            frame={frame}
            fps={fps}
            enterFrame={towardEnter}
            highlightStartFrame={towardEnter}
            accentColor={accentColor}
          />
          <AxisDriverLabel
            x={towardPos.x}
            y={towardPos.y}
            dotR={DRIVER_R * 1.35}
            side="right"
            distanceLabel={towardDriver.label}
            etaLabel={towardDriver.etaLabel}
            constraintNote={towardDriver.constraintNote}
            color={accentColor}
            mutedColor={accentColor}
            frame={frame}
            enterFrame={towardAnnotationEnter}
          />
        </>
      )}
      {awayPos && awayDriver && (
        <>
          <DriverDot
            nx={awayPos.x / VW}
            ny={awayPos.y / VH}
            label=""
            state="normal"
            frame={frame}
            fps={fps}
            enterFrame={awayEnter}
            highlightStartFrame={null}
            accentColor={accentColor}
          />
          <AxisDriverLabel
            x={awayPos.x}
            y={awayPos.y}
            dotR={DRIVER_R}
            side="left"
            distanceLabel={awayDriver.label}
            etaLabel={awayDriver.etaLabel}
            constraintNote={awayDriver.constraintNote}
            color={MUTED_DEFAULT}
            mutedColor="rgba(0,0,0,0.4)"
            frame={frame}
            enterFrame={awayAnnotationEnter}
          />
        </>
      )}
    </>
  );
};

// ---------------------------------------------------------------------------
// Demand-heatmap mode: named zones step from a baseline demand multiplier to
// a higher one at their own triggerFrame (e.g. rain landing on a district),
// with an optional rain overlay and a city-wide radar-sweep ping layered on
// top of each zone's own pulse.
// ---------------------------------------------------------------------------

// Fixed positions for known HCMC district ids used across scripts; unknown
// ids spread across FALLBACK_POSITIONS by array index so authors never have
// to hand-place coordinates.
const ZONE_LAYOUT: Record<string, { nx: number; ny: number }> = {
  q1: { nx: 0.4, ny: 0.62 },
  q3: { nx: 0.64, ny: 0.4 },
  binh_thanh: { nx: 0.26, ny: 0.34 },
};

const ZONE_FALLBACK_POSITIONS: { nx: number; ny: number }[] = [
  { nx: 0.5, ny: 0.5 },
  { nx: 0.3, ny: 0.62 },
  { nx: 0.7, ny: 0.36 },
  { nx: 0.3, ny: 0.3 },
  { nx: 0.7, ny: 0.66 },
];

const zonePosition = (id: string, fallbackIndex: number) =>
  ZONE_LAYOUT[id] ?? ZONE_FALLBACK_POSITIONS[fallbackIndex % ZONE_FALLBACK_POSITIONS.length];

const ZONE_RISE_FRAMES = 34;
const ZONE_PING_FRAMES = 30;

const ZoneDot: React.FC<{
  nx: number;
  ny: number;
  label: string;
  demandBefore: number;
  demandAfter: number;
  triggerFrame: number;
  frame: number;
  fps: number;
  enterFrame: number;
  accentColor: string;
}> = ({ nx, ny, label, demandBefore, demandAfter, triggerFrame, frame, fps, enterFrame, accentColor }) => {
  const cx = toPx(nx, VW);
  const cy = toPx(ny, VH);

  const entrance = spring({
    frame: frame - enterFrame,
    fps,
    from: 0,
    to: 1,
    config: { stiffness: 260, damping: 20 },
    durationInFrames: 24,
  });

  const demandT = interpolate(frame, [triggerFrame, triggerFrame + ZONE_RISE_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const demand = demandBefore + (demandAfter - demandBefore) * demandT;

  const baseR = 26 + demandBefore * 16;
  const afterR = 26 + demandAfter * 16;
  const r = baseR + (afterR - baseR) * demandT;

  const heatOpacity = 0.3 + demandT * 0.5;
  const ringPulse = 1 + Math.sin(frame * 0.14) * 0.12 * demandT;

  const pingP = interpolate(frame, [triggerFrame, triggerFrame + ZONE_PING_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const pingOpacity = demandT > 0 && pingP < 1 ? (1 - pingP) * 0.55 : 0;

  return (
    <g transform={`translate(${cx},${cy})`} opacity={entrance}>
      {pingOpacity > 0 && (
        <circle r={r * (1 + pingP * 1.8)} fill="none" stroke={accentColor} strokeWidth={2.5} opacity={pingOpacity} />
      )}
      <circle r={r * 1.7 * ringPulse} fill={accentColor} opacity={0.14 * heatOpacity} />
      <circle r={r * entrance} fill={accentColor} opacity={heatOpacity * entrance} />
      <circle r={r * 0.32 * entrance} fill="rgba(255,255,255,0.7)" opacity={entrance} />

      <text
        y={-r - 20}
        textAnchor="middle"
        fontSize={26}
        fontWeight={700}
        paintOrder="stroke"
        stroke={colors.bg}
        strokeWidth={5}
        strokeLinejoin="round"
        style={{ fill: "#fff", fontFamily: INTER }}
      >
        {label}
      </text>
      <text
        y={r + 42}
        textAnchor="middle"
        fontSize={30}
        fontWeight={800}
        paintOrder="stroke"
        stroke={colors.bg}
        strokeWidth={5}
        strokeLinejoin="round"
        style={{ fill: accentColor, fontFamily: INTER }}
      >
        {demand.toFixed(1)}x
      </text>
    </g>
  );
};

// Diagonal rain streaks looping across the canvas; drops are deterministic
// (seeded from index) so the pattern is stable across re-renders.
const RAIN_DROPS = Array.from({ length: 70 }, (_, i) => ({
  x: (i * 173) % VW,
  y0: (i * 947) % (VH + 200),
  len: 28 + (i % 5) * 11,
  speed: 15 + (i % 4) * 4,
}));

const RainOverlay: React.FC<{ frame: number; opacity: number }> = ({ frame, opacity }) => {
  if (opacity <= 0) return null;
  return (
    <>
      {RAIN_DROPS.map((d, i) => {
        const y = ((d.y0 + frame * d.speed) % (VH + 200)) - 100;
        return (
          <line
            key={i}
            x1={d.x}
            y1={y}
            x2={d.x - 9}
            y2={y + d.len}
            stroke="rgba(160,200,255,0.35)"
            strokeWidth={2}
            opacity={opacity}
          />
        );
      })}
    </>
  );
};

// A single expanding radar ring swept across the whole map, layered on top
// of each zone's own trigger ping — reads as "the whole city reacting at
// once" rather than three isolated blips.
const GlobalPingSweep: React.FC<{ frame: number; range?: [number, number]; accentColor: string }> = ({
  frame,
  range,
  accentColor,
}) => {
  if (!range) return null;
  const [start, end] = range;
  const span = Math.max(end - start, 1);
  const p = interpolate(frame, [start, end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const opacity = interpolate(
    frame,
    [start, start + span * 0.15, end - span * 0.15, end + 30],
    [0, 0.35, 0.18, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  if (opacity <= 0) return null;

  const r = 60 + p * 620;
  return (
    <circle cx={VW / 2} cy={VH * 0.46} r={r} fill="none" stroke={accentColor} strokeWidth={2} opacity={opacity} />
  );
};

const ZonesHeatmapDiagram: React.FC<{
  zones: MapPingZone[];
  accentColor: string;
  weatherOverlay?: "rain";
  animatePingFrames?: [number, number];
  frame: number;
  fps: number;
}> = ({ zones, accentColor, weatherOverlay, animatePingFrames, frame, fps }) => {
  const rainOpacity =
    weatherOverlay === "rain"
      ? interpolate(frame, [15, 45], [0, 0.85], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
      : 0;

  return (
    <>
      {rainOpacity > 0 && <RainOverlay frame={frame} opacity={rainOpacity} />}
      <GlobalPingSweep frame={frame} range={animatePingFrames} accentColor={accentColor} />
      {zones.map((zone, i) => {
        const { nx, ny } = zonePosition(zone.id, i);
        return (
          <ZoneDot
            key={zone.id}
            nx={nx}
            ny={ny}
            label={zone.label}
            demandBefore={zone.demandBefore}
            demandAfter={zone.demandAfter}
            triggerFrame={zone.triggerFrame}
            frame={frame}
            fps={fps}
            enterFrame={ENTER_FRAMES + i * 6}
            accentColor={accentColor}
          />
        );
      })}
    </>
  );
};

// ---------------------------------------------------------------------------
// Phase status label (HTML overlay, sits in the safe zone)
// ---------------------------------------------------------------------------
const PhaseLabel: React.FC<{
  frame: number;
  phase1End: number;
  phase2Start: number;
  inPhase2: boolean;
  accentColor: string;
}> = ({ frame, phase1End, phase2Start, inPhase2, accentColor }) => {
  const phase1Opacity = interpolate(frame, [phase1End - 4, phase1End + 10], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const phase2Opacity = interpolate(frame, [phase2Start, phase2Start + 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        bottom: 460,
        left: 60,
        right: 60,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 0,
        pointerEvents: "none",
      }}
    >
      {/* Phase 1 label */}
      <div
        style={{
          opacity: inPhase2 ? 0 : phase1Opacity,
          display: "flex",
          alignItems: "center",
          gap: 12,
          position: "absolute",
        }}
      >
        <div
          style={{
            width: 11,
            height: 11,
            borderRadius: "50%",
            backgroundColor: BAIT_COLOR,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: 28,
            fontWeight: 600,
            color: BAIT_COLOR,
            fontFamily: INTER,
            whiteSpace: "nowrap",
          }}
        >
          Tài xế gần nhất
        </span>
      </div>

      {/* Phase 2 label */}
      <div
        style={{
          opacity: inPhase2 ? phase2Opacity : 0,
          display: "flex",
          alignItems: "center",
          gap: 12,
          position: "absolute",
        }}
      >
        <div
          style={{
            width: 11,
            height: 11,
            borderRadius: "50%",
            backgroundColor: accentColor,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: 28,
            fontWeight: 600,
            color: accentColor,
            fontFamily: INTER,
            whiteSpace: "nowrap",
          }}
        >
          Được chọn bởi thuật toán
        </span>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export const MapPingScene: React.FC<MapPingSceneProps> = ({
  drivers = [],
  highlightedDriverIndex,
  nearestDriverIndex,
  selectedDriverIndex,
  phase1End,
  phase2Start,
  accentColor = ACCENT_DEFAULT,
  axis,
  roadConstraint,
  zones,
  weatherOverlay,
  animatePingFrames,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const hasTwoPhase =
    !axis &&
    nearestDriverIndex != null &&
    selectedDriverIndex != null &&
    phase1End != null &&
    phase2Start != null;

  const inPhase2 = hasTwoPhase && frame >= (phase2Start as number);

  // Which driver index is currently the "active" one
  const activeIdx = hasTwoPhase
    ? inPhase2
      ? selectedDriverIndex!
      : nearestDriverIndex!
    : (highlightedDriverIndex ?? -1);

  // Scene fade in/out
  const hasExitRoom = durationInFrames > ENTER_FRAMES + EXIT_FRAMES;
  const sceneOpacity = interpolate(
    frame,
    hasExitRoom
      ? [0, ENTER_FRAMES, durationInFrames - EXIT_FRAMES, durationInFrames]
      : [0, durationInFrames],
    hasExitRoom ? [0, 1, 1, 0] : [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Stagger: each driver dot enters 6 frames apart, starting at ENTER_FRAMES
  const dotEnterFrames = drivers.map((_, i) => ENTER_FRAMES + i * 6);
  const allDotsIn = dotEnterFrames.length ? dotEnterFrames[dotEnterFrames.length - 1] + 18 : ENTER_FRAMES;

  // Route draw timing
  const phase1DrawStart = allDotsIn;
  const phase2DrawStart = phase2Start ?? allDotsIn;

  return (
    <AbsoluteFill
      style={
        {
          backgroundColor: colors.bg,
          opacity: sceneOpacity,
          "--accent": accentColor,
          "--bait": BAIT_COLOR,
          "--muted": MUTED_DEFAULT,
        } as React.CSSProperties
      }
    >
      <AmbientBackground accent={accentColor} />

      {/* Full-canvas SVG: grid + routes + dots */}
      <svg
        width={VW}
        height={VH}
        viewBox={`0 0 ${VW} ${VH}`}
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        <MapGrid />

        {zones && zones.length ? (
          <ZonesHeatmapDiagram
            zones={zones}
            accentColor={accentColor}
            weatherOverlay={weatherOverlay}
            animatePingFrames={animatePingFrames}
            frame={frame}
            fps={fps}
          />
        ) : axis ? (
          <AxisComparisonDiagram
            axis={axis}
            accentColor={accentColor}
            roadConstraint={roadConstraint}
            frame={frame}
            fps={fps}
          />
        ) : (
          <>
            {/* ── Routes ── */}

            {/* Two-phase: phase 1 line (bait), fades when phase 2 begins */}
            {hasTwoPhase && nearestDriverIndex != null && (
              <RouteLine
                toNX={drivers[nearestDriverIndex].x}
                toNY={drivers[nearestDriverIndex].y}
                color={BAIT_COLOR}
                frame={frame}
                drawStart={phase1DrawStart}
                drawDuration={28}
                fadeStart={phase1End}
                fadeDuration={14}
              />
            )}

            {/* Two-phase: phase 2 line (selected) */}
            {hasTwoPhase && selectedDriverIndex != null && (
              <RouteLine
                toNX={drivers[selectedDriverIndex].x}
                toNY={drivers[selectedDriverIndex].y}
                color={accentColor}
                frame={frame}
                drawStart={phase2DrawStart}
                drawDuration={28}
              />
            )}

            {/* Static mode: single route to highlighted driver */}
            {!hasTwoPhase && activeIdx >= 0 && activeIdx < drivers.length && (
              <RouteLine
                toNX={drivers[activeIdx].x}
                toNY={drivers[activeIdx].y}
                color={accentColor}
                frame={frame}
                drawStart={phase1DrawStart}
                drawDuration={28}
              />
            )}

            {/* ── Driver dots ── */}
            {drivers.map((driver, i) => {
              const isBait = hasTwoPhase && i === nearestDriverIndex && !inPhase2;
              const isSelected = hasTwoPhase
                ? i === selectedDriverIndex && inPhase2
                : i === activeIdx;
              const dotState: DotState = isBait ? "bait" : isSelected ? "selected" : "normal";

              // When does this dot's highlight glow start?
              const highlightStartFrame =
                dotState === "bait" ? phase1DrawStart - 6 :
                dotState === "selected" ? phase2DrawStart :
                null;

              // Badges only on the currently active phase's driver
              const badge =
                dotState === "bait" ? "Gần nhất" :
                dotState === "selected" && hasTwoPhase ? "Được chọn!" :
                undefined;

              const badgeFrame =
                badge === "Gần nhất" ? phase1DrawStart + 22 :
                badge === "Được chọn!" ? phase2DrawStart + 12 :
                undefined;

              return (
                <DriverDot
                  key={i}
                  nx={driver.x}
                  ny={driver.y}
                  label={driver.label}
                  state={dotState}
                  frame={frame}
                  fps={fps}
                  enterFrame={dotEnterFrames[i]}
                  highlightStartFrame={highlightStartFrame}
                  accentColor={accentColor}
                  badge={badge}
                  badgeFrame={badgeFrame}
                />
              );
            })}
          </>
        )}

        {/* ── Customer dot (always on top, not used in zones mode) ── */}
        {!zones?.length && <CustomerDot frame={frame} fps={fps} />}
      </svg>

      {/* Phase status text overlay */}
      {!axis && hasTwoPhase && phase1End != null && phase2Start != null && (
        <PhaseLabel
          frame={frame}
          phase1End={phase1End}
          phase2Start={phase2Start}
          inPhase2={inPhase2}
          accentColor={accentColor}
        />
      )}
    </AbsoluteFill>
  );
};
