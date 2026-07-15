import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { CharacterIconSceneProps } from "../types";
import { colors, type as t, INTER, SAFE_ZONE } from "../styles";
import { AmbientBackground } from "../AmbientBackground";

// ---------------------------------------------------------------------------
// Scene timing
// ---------------------------------------------------------------------------
const ENTER_FRAMES = 8;
const EXIT_FRAMES = 10;
const ICON_STAGGER = 10; // icon enters this many frames after character

// Distance-pin entrance stagger: the convergence dot (the viewer's own
// location) appears with the character; the two distant driver pins appear
// after, as if the dispatch search is happening in front of you.
const CONVERGE_ENTER = ENTER_FRAMES;
const REJECTED_PIN_ENTER = ICON_STAGGER + 10;
const SELECTED_PIN_ENTER = REJECTED_PIN_ENTER + 10;
const PART_INDICATOR_ENTER = SELECTED_PIN_ENTER + 12;

const SILHOUETTE_DEFAULT = "#173B6D";
const ACCENT_DEFAULT = "#00c896";
const MUTED_PIN = "#94A3B8";

// Pin/convergence-dot positions, in character-local coordinates (offsets
// from CHAR_X/CHAR_Y, defined further below) — mirrors the reference hook
// frame: two labeled dots above the character with lines converging on a
// dot at the character's feet (the viewer's own location).
const REJECTED_PIN_DX = -150;
const REJECTED_PIN_DY = -190;
const SELECTED_PIN_DX = 170;
const SELECTED_PIN_DY = -260;
const CONVERGE_DX = 0;
// Far enough below the feet that a straight line from either pin's anchor
// converging here clears the leg silhouette — at the old value (95) both
// route lines clipped a leg on their way in (barely missed for the muted
// rejected line, plainly visible for the solid accent line).
const CONVERGE_DY = 150;

// SVG canvas dimensions
const SVG_W = 520;
const SVG_H = 560;

// Character center in SVG space (all character shapes are drawn relative to
// this) — kept at the canvas midpoint (SVG_W / 2) so the character lines up
// with frame-centered overlays like TopicBadge/PartIndicator.
const CHAR_X = SVG_W / 2;
const CHAR_Y = 310;

// Accompanying icon center in SVG space — close enough to read as "beside
// the character" while clearing both the head and the selected-pin's route
// line down to the convergence dot (see CONVERGE_DY).
const ICON_X = CHAR_X + 75;
const ICON_Y = 140;

// ---------------------------------------------------------------------------
// SVG rotation math (SVG Y-axis points DOWN, rotate() is clockwise visually)
//
// For arm rect with y=0 at shoulder extending downward (y+):
//   rotate(θ) produces direction (-sinθ, cosθ) in SVG space
//
// Key angles (from right-shoulder perspective):
//   rotate(0)    → arm straight DOWN
//   rotate(-10)  → arm slightly to the right  (idle right arm)
//   rotate(130)  → arm points upper-left      (toward face, holding-phone)
//   rotate(-135) → arm points upper-right     (pointing gesture)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Character silhouette
// ---------------------------------------------------------------------------

// Arms are stateful per pose — rendered as a JSX group of rects/paths
const IdleArms: React.FC<{ c: string }> = ({ c }) => (
  <>
    {/* Left arm: shoulder at (-44,-80), hangs lower-left ~10° */}
    <g transform="translate(-44,-80) rotate(10)">
      <rect x="-8" y="0" width="16" height="62" rx="8" fill={c} />
    </g>
    {/* Right arm: shoulder at (44,-80), hangs lower-right ~10° */}
    <g transform="translate(44,-80) rotate(-10)">
      <rect x="-8" y="0" width="16" height="62" rx="8" fill={c} />
    </g>
  </>
);

const HoldingPhoneArms: React.FC<{ c: string }> = ({ c }) => (
  <>
    {/* Left: idle */}
    <g transform="translate(-44,-80) rotate(10)">
      <rect x="-8" y="0" width="16" height="62" rx="8" fill={c} />
    </g>
    {/* Right: rotate(130°) → direction (-sin130,cos130)=(-0.77,-0.64) → upper-left toward face */}
    <g transform="translate(44,-82) rotate(130)">
      <rect x="-8" y="0" width="16" height="58" rx="8" fill={c} />
    </g>
  </>
);

const PointingArms: React.FC<{ c: string }> = ({ c }) => (
  <>
    {/* Left: idle */}
    <g transform="translate(-44,-80) rotate(10)">
      <rect x="-8" y="0" width="16" height="62" rx="8" fill={c} />
    </g>
    {/* Right: rotate(-135°) → direction (0.71,-0.71) → upper-right pointing gesture */}
    <g transform="translate(44,-82) rotate(-135)">
      <rect x="-8" y="0" width="16" height="74" rx="8" fill={c} />
    </g>
  </>
);

type Pose = "idle" | "holding-phone" | "pointing";

const HumanSilhouette: React.FC<{ pose: Pose; c: string }> = ({ pose, c }) => {
  const Arms =
    pose === "holding-phone" ? HoldingPhoneArms :
    pose === "pointing" ? PointingArms :
    IdleArms;

  return (
    <>
      {/* Head */}
      <circle cx="0" cy="-118" r="34" fill={c} />

      {/* Torso: top at y=-82, bottom at y=-8, width 68 */}
      <rect x="-34" y="-82" width="68" height="74" rx="13" fill={c} />

      {/* Arms (pose-dependent) */}
      <Arms c={c} />

      {/* Left leg: pivot at torso bottom-left, slight outward tilt */}
      <g transform="translate(-16,-8) rotate(-4)">
        <rect x="-12" y="0" width="24" height="90" rx="12" fill={c} />
      </g>
      {/* Right leg: pivot at torso bottom-right */}
      <g transform="translate(16,-8) rotate(4)">
        <rect x="-12" y="0" width="24" height="90" rx="12" fill={c} />
      </g>
    </>
  );
};

// ---------------------------------------------------------------------------
// Accompanying icons (each centered at 0,0 in their own space)
// ---------------------------------------------------------------------------

const PhoneIcon: React.FC<{ c: string }> = ({ c }) => (
  <g>
    <rect x="-17" y="-27" width="34" height="54" rx="7" fill={c} />
    <rect x="-13" y="-22" width="26" height="38" rx="3" fill="rgba(0,0,0,0.22)" />
    <circle cx="0" cy="18" r="4" fill="rgba(0,0,0,0.3)" />
  </g>
);

const CarIcon: React.FC<{ c: string }> = ({ c }) => (
  <g>
    {/* Roof */}
    <path d="M -14 -6 L -5 -20 L 16 -20 L 24 -6 Z" fill={c} />
    {/* Window cutout */}
    <path d="M -11 -6 L -4 -17 L 14 -17 L 21 -6 Z" fill="rgba(0,0,0,0.2)" />
    {/* Body */}
    <rect x="-28" y="-6" width="56" height="20" rx="6" fill={c} />
    {/* Wheels */}
    <circle cx="-16" cy="14" r="8" fill={c} />
    <circle cx="16" cy="14" r="8" fill={c} />
    <circle cx="-16" cy="14" r="4" fill="rgba(0,0,0,0.28)" />
    <circle cx="16" cy="14" r="4" fill="rgba(0,0,0,0.28)" />
  </g>
);

const MapPinIcon: React.FC<{ c: string }> = ({ c }) => (
  <g>
    {/*
      Teardrop path: circle portion on top, tapers to a point at bottom.
      Derived from circle center at (0,-10) radius 20, meeting at a point (0,24).
      Arc path: M bottom-point → curve left → arc top → curve right → back to point
    */}
    <path
      d="M 0 24 C -22 10 -22 -28 0 -28 C 22 -28 22 10 0 24 Z"
      fill={c}
    />
    {/* Inner hole */}
    <circle cx="0" cy="-10" r="9" fill="rgba(0,0,0,0.28)" />
  </g>
);

type IconType = "car" | "phone" | "map-pin";

const AccompanyingIcon: React.FC<{ type: IconType; c: string }> = ({ type, c }) => {
  switch (type) {
    case "phone":   return <PhoneIcon c={c} />;
    case "car":     return <CarIcon c={c} />;
    case "map-pin": return <MapPinIcon c={c} />;
  }
};

// ---------------------------------------------------------------------------
// Scene-1 "hook" framing: topic badge, part indicator, distance pins
// ---------------------------------------------------------------------------

const TopicBadge: React.FC<{ text: string; accent: string; frame: number; fps: number }> = ({
  text,
  accent,
  frame,
  fps,
}) => {
  const entrance = spring({
    frame,
    fps,
    from: 0,
    to: 1,
    config: { stiffness: 200, damping: 20 },
    durationInFrames: 20,
  });

  return (
    <div
      style={{
        position: "absolute",
        top: SAFE_ZONE.top + 20,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        opacity: entrance,
        transform: `translateY(${interpolate(entrance, [0, 1], [-12, 0])}px)`,
      }}
    >
      <div
        style={{
          padding: "14px 32px",
          borderRadius: 999,
          border: `2px solid ${accent}`,
          background: "rgba(232, 242, 255, 0.92)",
          boxShadow: `0 16px 42px ${accent}26`,
        }}
      >
        <span style={{ ...t.label, fontSize: 26, color: accent, fontFamily: INTER }}>{text}</span>
      </div>
    </div>
  );
};

const PartIndicator: React.FC<{ text: string; frame: number; fps: number; enterFrame: number; accent: string }> = ({
  text,
  frame,
  fps,
  enterFrame,
  accent,
}) => {
  const entrance = spring({
    frame: frame - enterFrame,
    fps,
    from: 0,
    to: 1,
    config: { stiffness: 200, damping: 22 },
    durationInFrames: 20,
  });

  return (
    <div
      style={{
        // Sits directly above Caption.tsx's own bottom-anchored pill so the
        // two never overlap in the reserved bottom safe zone.
        position: "absolute",
        bottom: SAFE_ZONE.bottom + 90,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        opacity: entrance,
      }}
    >
      <div
        style={{
          padding: "8px 20px",
          borderRadius: 999,
          border: `1.5px solid ${accent}55`,
          background: "rgba(232, 242, 255, 0.9)",
          boxShadow: `0 10px 30px ${accent}20`,
        }}
      >
        <span style={{ ...t.label, fontSize: 15, color: accent, fontFamily: INTER }}>
          {text}
        </span>
      </div>
    </div>
  );
};

type PinState = "rejected" | "selected";

// A labeled dot above the character with a line down to the convergence
// point — adapts MapPingScene's dot + route-line technique to this scene's
// small centered canvas instead of the full-frame street map.
const DistancePin: React.FC<{
  x: number;
  y: number;
  toX: number;
  toY: number;
  label: string;
  state: PinState;
  accent: string;
  frame: number;
  fps: number;
  enterFrame: number;
}> = ({ x, y, toX, toY, label, state, accent, frame, fps, enterFrame }) => {
  const color = state === "selected" ? accent : MUTED_PIN;
  const pillFill = state === "selected" ? "rgba(232,242,255,0.96)" : "rgba(255,255,255,0.96)";
  const textColor = state === "selected" ? accent : "#64748B";
  const mark = state === "selected" ? "✓" : "✕";
  const text = `${label} ${mark}`;

  const entrance = spring({
    frame: frame - enterFrame,
    fps,
    from: 0,
    to: 1,
    config: { stiffness: 260, damping: 18 },
    durationInFrames: 22,
  });

  const anchorY = y + 14;
  const lineLength = Math.hypot(toX - x, toY - anchorY);
  const drawP = interpolate(frame, [enterFrame + 10, enterFrame + 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const pillW = text.length * 12 + 28;

  if (entrance <= 0) return null;

  return (
    <g opacity={entrance}>
      {state === "rejected" ? (
        <line
          x1={x} y1={anchorY} x2={toX} y2={toY}
          stroke={color}
          strokeWidth={2.5}
          strokeDasharray="6 6"
          strokeLinecap="round"
          opacity={0.75}
        />
      ) : (
        <line
          x1={x} y1={anchorY} x2={toX} y2={toY}
          stroke={color}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeDasharray={`${lineLength}`}
          strokeDashoffset={lineLength * (1 - drawP)}
          opacity={0.82 * drawP}
        />
      )}

      <circle cx={x} cy={anchorY} r={6} fill={color} />

      <g transform={`translate(${x - pillW / 2},${y - 26})`}>
        <rect
          width={pillW}
          height={32}
          rx={16}
          fill={pillFill}
          stroke={color}
          strokeWidth={1.5}
        />
        <text
          x={pillW / 2}
          y={21}
          textAnchor="middle"
          fontSize={17}
          fontWeight={700}
          fontFamily={INTER}
          fill={textColor}
        >
          {text}
        </text>
      </g>
    </g>
  );
};

const ConvergenceDot: React.FC<{
  x: number;
  y: number;
  accent: string;
  frame: number;
  fps: number;
  enterFrame: number;
}> = ({ x, y, accent, frame, fps, enterFrame }) => {
  const entrance = spring({
    frame: frame - enterFrame,
    fps,
    from: 0,
    to: 1,
    config: { stiffness: 260, damping: 18 },
    durationInFrames: 20,
  });
  const pulse = 1 + Math.sin(frame * 0.12) * 0.15;

  if (entrance <= 0) return null;

  return (
    <g transform={`translate(${x},${y})`} opacity={entrance}>
      <circle r={16 * pulse * entrance} fill="none" stroke={accent} strokeWidth={1.5} opacity={0.3} />
      <circle r={7 * entrance} fill={accent} />
      <circle r={2.6 * entrance} fill="rgba(255,255,255,0.85)" />
    </g>
  );
};

// ---------------------------------------------------------------------------
// Main scene
// ---------------------------------------------------------------------------

export const CharacterIconScene: React.FC<CharacterIconSceneProps> = ({
  pose,
  accompanyingIcon,
  accentColor,
  silhouetteColor,
  topicLabel,
  partLabel,
  rejectedPin,
  selectedPin,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const accent = accentColor ?? ACCENT_DEFAULT;
  const silhouette = silhouetteColor ?? SILHOUETTE_DEFAULT;

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

  // Character entrance spring — slight overshoot for liveliness
  const charSpring = spring({
    frame,
    fps,
    from: 0,
    to: 1,
    config: { stiffness: 180, damping: 14 },
    durationInFrames: 30,
  });

  // Icon entrance spring — staggered, snappier
  const iconSpring = spring({
    frame: frame - ICON_STAGGER,
    fps,
    from: 0,
    to: 1,
    config: { stiffness: 260, damping: 16 },
    durationInFrames: 22,
  });

  // Idle bob: very subtle Y oscillation (~4px amplitude, ~2.6s period at 30fps)
  const bobY = Math.sin(frame * 0.075) * 4;

  // Subtle breathing: slight scale oscillation on top of charSpring
  const breathScale = charSpring * (1 + Math.sin(frame * 0.075) * 0.008);

  // Glow halo pulse behind character
  const haloPulse = 1 + Math.sin(frame * 0.075) * 0.06;

  return (
    <AbsoluteFill
      style={
        {
          backgroundColor: colors.bg,
          opacity: sceneOpacity,
          "--accent": accent,
          "--silhouette": silhouette,
        } as React.CSSProperties
      }
    >
      <AmbientBackground accent={accent} />

      {/* SVG canvas, centered in the video */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      >
        <svg
          width={SVG_W}
          height={SVG_H}
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          overflow="visible"
        >
          {/* ── Character group ── */}
          {/* 1. Place character center at (CHAR_X, CHAR_Y) */}
          {/* 2. Apply bob (translateY oscillation) */}
          {/* 3. Scale from center using translate-scale-translate trick */}
          <g transform={`translate(${CHAR_X},${CHAR_Y}) translate(0,${bobY})`}>
            {/* Halo glow ring behind character */}
            <circle
              cx="0"
              cy="-40"
              r={120 * haloPulse * charSpring}
              fill={accent}
              opacity={0.07 * charSpring}
            />

            {/* Spring scale from character center (0,0 in character-space) */}
            <g transform={`scale(${breathScale})`}>
              <HumanSilhouette pose={pose} c={silhouette} />
            </g>
          </g>

          {/* ── Accompanying icon ── */}
          {accompanyingIcon && (
            <g transform={`translate(${ICON_X},${ICON_Y})`}>
              {/* Scale from icon center */}
              <g transform={`scale(${iconSpring})`}>
                {/* Background circle */}
                <circle r="44" fill={accent} opacity={0.13} />
                <circle r="34" fill={accent} opacity={0.10} />
                {/* Icon scaled up slightly so it's prominent */}
                <g transform="scale(1.25)">
                  <AccompanyingIcon type={accompanyingIcon} c={accent} />
                </g>
              </g>
            </g>
          )}

          {/* ── Distance pins + convergence dot ── */}
          {(rejectedPin || selectedPin) && (
            <ConvergenceDot
              x={CHAR_X + CONVERGE_DX}
              y={CHAR_Y + CONVERGE_DY}
              accent={accent}
              frame={frame}
              fps={fps}
              enterFrame={CONVERGE_ENTER}
            />
          )}
          {rejectedPin && (
            <DistancePin
              x={CHAR_X + REJECTED_PIN_DX}
              y={CHAR_Y + REJECTED_PIN_DY}
              toX={CHAR_X + CONVERGE_DX}
              toY={CHAR_Y + CONVERGE_DY}
              label={rejectedPin.label}
              state="rejected"
              accent={accent}
              frame={frame}
              fps={fps}
              enterFrame={REJECTED_PIN_ENTER}
            />
          )}
          {selectedPin && (
            <DistancePin
              x={CHAR_X + SELECTED_PIN_DX}
              y={CHAR_Y + SELECTED_PIN_DY}
              toX={CHAR_X + CONVERGE_DX}
              toY={CHAR_Y + CONVERGE_DY}
              label={selectedPin.label}
              state="selected"
              accent={accent}
              frame={frame}
              fps={fps}
              enterFrame={SELECTED_PIN_ENTER}
            />
          )}
        </svg>
      </div>

      {topicLabel && <TopicBadge text={topicLabel} accent={accent} frame={frame} fps={fps} />}
      {partLabel && (
        <PartIndicator text={partLabel} frame={frame} fps={fps} enterFrame={PART_INDICATOR_ENTER} accent={accent} />
      )}
    </AbsoluteFill>
  );
};
