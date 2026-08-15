import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { colors } from "../styles";

// ---------------------------------------------------------------------------
// Timing constants (frames)
// ---------------------------------------------------------------------------
const ENTER_FRAMES = 6;
const EXIT_FRAMES = 8;
const HOLD_FRAMES = 18; // settle beat once fully zoomed out, before <Series> hands off

const VW = 1080;
const VH = 1920;

const ACCENT_DEFAULT = "#00c896";
const DOT_DEFAULT = "rgba(0,0,0,0.45)";

// ---------------------------------------------------------------------------
// Duration helper — pass to calculateMetadata or use as a fixed durationInFrames.
// The pull-back needs real screen time to read clearly before the hold beat.
// ---------------------------------------------------------------------------
export function calculateZoomRevealDuration(fps = 30, zoomSeconds = 2): number {
  return Math.round(fps * zoomSeconds) + HOLD_FRAMES;
}

// ---------------------------------------------------------------------------
// Shared zoom curve — both the scene and DotField (which reads its own frame
// via useCurrentFrame, matching this codebase's AmbientBackground convention)
// evaluate this so their timing always stays in lockstep.
// ---------------------------------------------------------------------------
function zoomScaleAt(
  frame: number,
  durationInFrames: number,
  zoomStartScale: number,
  zoomEndScale: number
): number {
  const zoomFrames = Math.max(1, durationInFrames - HOLD_FRAMES);
  return interpolate(frame, [0, zoomFrames], [zoomStartScale, zoomEndScale], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
}

// ---------------------------------------------------------------------------
// Deterministic pseudo-random hash — never Math.random(): Remotion re-invokes
// render per-frame (and across worker processes), so layout must stay stable.
// ---------------------------------------------------------------------------
function hash(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

// ---------------------------------------------------------------------------
// FocalDot — default "single highlighted dot" focusElement. It never animates
// itself: the wrapping scale() transform is what makes it loom large up close
// and shrink to true size once fully zoomed out.
// ---------------------------------------------------------------------------
export const FocalDot: React.FC<{ color?: string; size?: number }> = ({
  color,
  size = 22,
}) => {
  const c = color ?? "var(--focal-color)";
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <div
        style={{
          position: "absolute",
          inset: -size * 0.9,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${c} 0%, transparent 70%)`,
          opacity: 0.35,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          backgroundColor: c,
          boxShadow: `0 0 0 4px ${c}33`,
        }}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// DotField — default "busy world" revealContent: a deterministic scatter of
// small dots. Each dot's opacity is interpolate()-mapped from the live zoom
// scale, keyed to its distance from the focal point, so the field appears to
// populate as the camera passes it rather than being visible instantly.
// ---------------------------------------------------------------------------
export const DotField: React.FC<{
  durationInFrames: number;
  zoomStartScale: number;
  zoomEndScale: number;
  count?: number;
  color?: string;
  centerClearRadius?: number;
}> = ({
  durationInFrames,
  zoomStartScale,
  zoomEndScale,
  count = 160,
  color,
  centerClearRadius = 100,
}) => {
  const frame = useCurrentFrame();
  const scale = zoomScaleAt(frame, durationInFrames, zoomStartScale, zoomEndScale);

  const dotColor = color ?? "var(--dot-color)";
  const cx = VW / 2;
  const cy = VH / 2;
  const maxD = Math.hypot(cx, cy);
  const fadeBand = Math.max(0.35, Math.abs(zoomStartScale - zoomEndScale) * 0.18);

  const dots = React.useMemo(() => {
    const arr: { x: number; y: number; r: number; d: number }[] = [];
    for (let i = 0; i < count; i++) {
      const x = hash(i * 2.13 + 1) * VW;
      const y = hash(i * 3.71 + 7) * VH;
      const d = Math.max(Math.hypot(x - cx, y - cy), centerClearRadius);
      const r = 5 + hash(i * 5.37 + 3) * 6;
      arr.push({ x, y, r, d });
    }
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, centerClearRadius]);

  return (
    <svg
      width={VW}
      height={VH}
      viewBox={`0 0 ${VW} ${VH}`}
      style={{ position: "absolute", inset: 0 }}
    >
      {dots.map((dot, i) => {
        const dNorm = Math.min(1, dot.d / maxD);
        const revealAt = interpolate(dNorm, [0, 1], [zoomStartScale, zoomEndScale]);
        const opacity = interpolate(
          scale,
          [revealAt - fadeBand, revealAt + fadeBand],
          [0.85, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );
        return <circle key={i} cx={dot.x} cy={dot.y} r={dot.r} fill={dotColor} opacity={opacity} />;
      })}
    </svg>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export type ZoomRevealSceneProps = {
  focusElement: React.ReactNode;
  revealContent: React.ReactNode;
  zoomStartScale?: number;
  zoomEndScale?: number;
  accentColor?: string;
  dotColor?: string;
  backgroundColor?: string;
  durationInFrames: number;
};

export const ZoomRevealScene: React.FC<ZoomRevealSceneProps> = ({
  focusElement,
  revealContent,
  zoomStartScale = 8,
  zoomEndScale = 1,
  accentColor,
  dotColor,
  backgroundColor,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();

  const accent = accentColor ?? ACCENT_DEFAULT;
  const dot = dotColor ?? DOT_DEFAULT;
  const bg = backgroundColor ?? colors.bg;

  const scale = zoomScaleAt(frame, durationInFrames, zoomStartScale, zoomEndScale);

  // Scene fade in/out — brief, so it doesn't blunt the zoom itself
  const hasExitRoom = durationInFrames > ENTER_FRAMES + EXIT_FRAMES;
  const sceneOpacity = interpolate(
    frame,
    hasExitRoom
      ? [0, ENTER_FRAMES, durationInFrames - EXIT_FRAMES, durationInFrames]
      : [0, durationInFrames],
    hasExitRoom ? [0, 1, 1, 0] : [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={
        {
          backgroundColor: bg,
          opacity: sceneOpacity,
          overflow: "hidden",
          "--focal-color": accent,
          "--dot-color": dot,
          "--bg-color": bg,
        } as React.CSSProperties
      }
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${scale})`,
          transformOrigin: "50% 50%",
        }}
      >
        {/* The "world" — sized to fill the frame exactly once zoomEndScale is reached */}
        <div style={{ position: "relative", width: VW, height: VH, flexShrink: 0 }}>
          {revealContent}

          {/* Focal point pinned to dead-center, under the container's transform-origin,
              so it stays visually fixed on screen for the entire pull-back. */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}
          >
            {focusElement}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
