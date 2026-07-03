import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { MapPingSceneProps } from "../types";
import { colors, INTER } from "../styles";
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
const MUTED_DEFAULT = "rgba(255,255,255,0.28)";

const toPx = (n: number, dim: number) => n * dim;

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
            fill="rgba(255,255,255,0.012)"
          />
        );
      })
    )}

    {/* Horizontal streets */}
    {H_STREETS.map(([y, major]) => (
      <line
        key={`hs${y}`}
        x1={0} y1={toPx(y, VH)} x2={VW} y2={toPx(y, VH)}
        stroke={major ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.04)"}
        strokeWidth={major ? 2.5 : 1.5}
      />
    ))}

    {/* Vertical streets */}
    {V_STREETS.map(([x, major]) => (
      <line
        key={`vs${x}`}
        x1={toPx(x, VW)} y1={0} x2={toPx(x, VW)} y2={VH}
        stroke={major ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.04)"}
        strokeWidth={major ? 2.5 : 1.5}
      />
    ))}

    {/* Vignette overlay */}
    <defs>
      <radialGradient id="mpVig" cx="50%" cy="46%" r="62%" gradientUnits="objectBoundingBox">
        <stop offset="0%" stopColor="transparent" />
        <stop offset="100%" stopColor="#0a0a0f" stopOpacity={0.68} />
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

      {/* Distance label */}
      <text
        x={DRIVER_R + 10}
        y={6}
        fontSize={24}
        fontWeight={600}
        letterSpacing="-0.01em"
        style={{
          fill: state !== "normal" ? dotColor : "rgba(255,255,255,0.4)",
          fontFamily: INTER,
        }}
        opacity={labelOpacity * entrance}
      >
        {label}
      </text>

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
  drivers,
  highlightedDriverIndex,
  nearestDriverIndex,
  selectedDriverIndex,
  phase1End,
  phase2Start,
  accentColor = ACCENT_DEFAULT,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const hasTwoPhase =
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
  const allDotsIn = dotEnterFrames[dotEnterFrames.length - 1] + 18;

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

        {/* ── Customer dot (always on top) ── */}
        <CustomerDot frame={frame} fps={fps} />
      </svg>

      {/* Phase status text overlay */}
      {hasTwoPhase && phase1End != null && phase2Start != null && (
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
