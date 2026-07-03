import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { CharacterIconSceneProps } from "../types";
import { colors } from "../styles";
import { AmbientBackground } from "../AmbientBackground";

// ---------------------------------------------------------------------------
// Scene timing
// ---------------------------------------------------------------------------
const ENTER_FRAMES = 8;
const EXIT_FRAMES = 10;
const ICON_STAGGER = 10; // icon enters this many frames after character

const SILHOUETTE_DEFAULT = "rgba(255,255,255,0.88)";
const ACCENT_DEFAULT = "#00c896";

// SVG canvas dimensions
const SVG_W = 520;
const SVG_H = 560;

// Character center in SVG space (all character shapes are drawn relative to this)
const CHAR_X = 230;
const CHAR_Y = 310;

// Accompanying icon center in SVG space
const ICON_X = 375;
const ICON_Y = 178;

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
// Main scene
// ---------------------------------------------------------------------------

export const CharacterIconScene: React.FC<CharacterIconSceneProps> = ({
  pose,
  accompanyingIcon,
  accentColor,
  silhouetteColor,
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
        </svg>
      </div>
    </AbsoluteFill>
  );
};
