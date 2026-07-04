import React, { useId } from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { CharacterIconCoverSceneProps } from "../types";
import { colors, BE_VIETNAM_PRO } from "../styles";
import { AmbientBackground } from "../AmbientBackground";

// ---------------------------------------------------------------------------
// Design canvas — this scene is authored in a fixed 390×700 coordinate space
// (a mobile-mockup frame) and scaled up to whatever the composition's actual
// width/height is. Every position below is a coordinate in that space.
// ---------------------------------------------------------------------------
const CANVAS_W = 390;
const CANVAS_H = 700;

// Top 62% is the character/icon visual, bottom 38% is the typography block.
const VISUAL_ZONE_H = CANVAS_H * 0.62; // 434

const ACCENT_DEFAULT = "#22C55E";
const SILHOUETTE_COLOR = "rgba(255,255,255,0.88)";
const MUTED_PIN = "rgba(255,255,255,0.32)";

// Fixed brand tints for the typography block that are deliberately distinct
// from `accent` (lighter green steps), per the cover design spec.
const LINE2_COLOR = "#4ADE80";
const SUBTITLE_COLOR = "#6EE7A0";

const LINE1_DEFAULT = "Tài xế cách bạn";
const LINE2_DEFAULT = "200 mét";
const LINE3_DEFAULT = "vừa bị bỏ qua";
const SUBTITLE_DEFAULT = "và bạn không bao giờ biết tại sao";
const SERIES_LABEL_DEFAULT = "PHẦN 1 / 4";
const REJECTED_LABEL_DEFAULT = "200m ✕";
const SELECTED_LABEL_DEFAULT = "350m ✓";

// ---------------------------------------------------------------------------
// Part A layout — character, accompanying car icon, and the two distance
// pins converging on the viewer's own location. Values are variables (not
// inlined) so a future pass can drive them from useCurrentFrame() springs.
// ---------------------------------------------------------------------------
const CHAR_X = CANVAS_W / 2;
const CHAR_Y = 268;

const ICON_X = 302;
const ICON_Y = 178;

const CONVERGE_DX = 0;
const CONVERGE_DY = 82;

const REJECTED_PIN_DX = -108;
const REJECTED_PIN_DY = -138;
const SELECTED_PIN_DX = 108;
const SELECTED_PIN_DY = -195;

// ---------------------------------------------------------------------------
// Part B layout — typography block, bottom 38% of the canvas.
// ---------------------------------------------------------------------------
const LINE1_Y = 526;
const HIGHLIGHT_RECT_Y = 534;
const HIGHLIGHT_RECT_H = 46;
const HIGHLIGHT_RECT_W = 214;
const LINE2_Y = 566;
const LINE3_Y = 610; // rect bottom (580) + 30px min gap
const SUBTITLE_Y = 642;
const SERIES_PILL_Y = 658;
const SERIES_PILL_W = 100;
const SERIES_PILL_H = 20;
const SERIES_PILL_TEXT_Y = 672;

const EYEBROW_Y = 40;

// ---------------------------------------------------------------------------
// Character silhouette — fixed "holding-phone" pose (this is a bespoke cover
// illustration, not the general-purpose CharacterIconScene, so the pose isn't
// parameterized).
// ---------------------------------------------------------------------------
const HumanSilhouette: React.FC<{ c: string }> = ({ c }) => (
  <>
    {/* Head */}
    <circle cx="0" cy="-118" r="34" fill={c} />
    {/* Torso */}
    <rect x="-34" y="-82" width="68" height="74" rx="13" fill={c} />
    {/* Left arm: idle, hangs lower-left ~10° */}
    <g transform="translate(-44,-80) rotate(10)">
      <rect x="-8" y="0" width="16" height="62" rx="8" fill={c} />
    </g>
    {/* Right arm: rotate(130°) → upper-left toward face, holding phone */}
    <g transform="translate(44,-82) rotate(130)">
      <rect x="-8" y="0" width="16" height="58" rx="8" fill={c} />
    </g>
    {/* Left leg */}
    <g transform="translate(-16,-8) rotate(-4)">
      <rect x="-12" y="0" width="24" height="90" rx="12" fill={c} />
    </g>
    {/* Right leg */}
    <g transform="translate(16,-8) rotate(4)">
      <rect x="-12" y="0" width="24" height="90" rx="12" fill={c} />
    </g>
  </>
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

type PinState = "rejected" | "selected";

const DistancePin: React.FC<{
  x: number;
  y: number;
  toX: number;
  toY: number;
  label: string;
  state: PinState;
  accent: string;
}> = ({ x, y, toX, toY, label, state, accent }) => {
  const color = state === "selected" ? accent : MUTED_PIN;
  const anchorY = y + 14;
  const pillW = label.length * 9 + 28;

  return (
    <g>
      <line
        x1={x}
        y1={anchorY}
        x2={toX}
        y2={toY}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray={state === "rejected" ? "6 6" : undefined}
        opacity={state === "selected" ? 0.82 : 0.5}
      />
      <circle cx={x} cy={anchorY} r={5} fill={color} />
      <g transform={`translate(${x - pillW / 2},${y - 24})`}>
        <rect width={pillW} height={28} rx={14} fill="rgba(10,10,15,0.85)" stroke={color} strokeWidth={1.5} />
        <text
          x={pillW / 2}
          y={19}
          textAnchor="middle"
          fontSize={14}
          fontWeight={700}
          fontFamily={BE_VIETNAM_PRO}
          fill={color}
        >
          {label}
        </text>
      </g>
    </g>
  );
};

const ConvergenceDot: React.FC<{ x: number; y: number; accent: string }> = ({ x, y, accent }) => (
  <g transform={`translate(${x},${y})`}>
    <circle r={16} fill="none" stroke={accent} strokeWidth={1.5} opacity={0.3} />
    <circle r={7} fill={accent} />
    <circle r={2.6} fill="rgba(255,255,255,0.85)" />
  </g>
);

// ---------------------------------------------------------------------------
// Main scene
// ---------------------------------------------------------------------------

export const CharacterIconCoverScene: React.FC<CharacterIconCoverSceneProps> = ({
  accentColor,
  line1,
  line2,
  line3,
  subtitle,
  eyebrowText,
  seriesLabel,
  rejectedLabel,
  selectedLabel,
}) => {
  const { width, height } = useVideoConfig();
  const sx = width / CANVAS_W;
  const sy = height / CANVAS_H;

  const accent = accentColor ?? ACCENT_DEFAULT;
  const gradientId = useId();

  const convergeX = CHAR_X + CONVERGE_DX;
  const convergeY = CHAR_Y + CONVERGE_DY;

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      <AmbientBackground accent={accent} />

      <svg
        width={CANVAS_W}
        height={CANVAS_H}
        viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
        overflow="visible"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          transform: `scale(${sx}, ${sy})`,
          transformOrigin: "top left",
        }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFFFFF" />
            <stop offset="1" stopColor="#A3F0BF" />
          </linearGradient>
        </defs>

        {/* ── Part A: character + icon + distance pins (top 62%) ── */}
        <g>
          {eyebrowText && (
            <g transform={`translate(${CANVAS_W / 2},${EYEBROW_Y})`}>
              <rect
                x={-(eyebrowText.length * 3.6 + 16)}
                y={-13}
                width={eyebrowText.length * 7.2 + 32}
                height={26}
                rx={13}
                fill="rgba(10,10,15,0.55)"
                stroke={accent}
                strokeWidth={1.2}
              />
              <text
                textAnchor="middle"
                y={4}
                fontSize={12}
                fontWeight={600}
                fontFamily={BE_VIETNAM_PRO}
                letterSpacing="0.08em"
                fill={accent}
              >
                {eyebrowText}
              </text>
            </g>
          )}

          <g transform={`translate(${CHAR_X},${CHAR_Y})`}>
            {/* Halo glow behind character */}
            <circle cx="0" cy="-40" r={80} fill={accent} opacity={0.09} />
            <HumanSilhouette c={SILHOUETTE_COLOR} />
          </g>

          <g transform={`translate(${ICON_X},${ICON_Y})`}>
            <circle r="34" fill={accent} opacity={0.13} />
            <circle r="26" fill={accent} opacity={0.1} />
            <g transform="scale(1)">
              <CarIcon c={accent} />
            </g>
          </g>

          <ConvergenceDot x={convergeX} y={convergeY} accent={accent} />

          <DistancePin
            x={CHAR_X + REJECTED_PIN_DX}
            y={CHAR_Y + REJECTED_PIN_DY}
            toX={convergeX}
            toY={convergeY}
            label={rejectedLabel ?? REJECTED_LABEL_DEFAULT}
            state="rejected"
            accent={accent}
          />
          <DistancePin
            x={CHAR_X + SELECTED_PIN_DX}
            y={CHAR_Y + SELECTED_PIN_DY}
            toX={convergeX}
            toY={convergeY}
            label={selectedLabel ?? SELECTED_LABEL_DEFAULT}
            state="selected"
            accent={accent}
          />
        </g>

        {/* ── Part B: typography block (bottom 38%) ── */}
        <g fontFamily={BE_VIETNAM_PRO}>
          <text
            x={CANVAS_W / 2}
            y={LINE1_Y}
            textAnchor="middle"
            fontSize={36}
            fontWeight={700}
            letterSpacing="-0.5px"
            fill={`url(#${gradientId})`}
          >
            {line1 ?? LINE1_DEFAULT}
          </text>

          <rect
            x={CANVAS_W / 2 - HIGHLIGHT_RECT_W / 2}
            y={HIGHLIGHT_RECT_Y}
            width={HIGHLIGHT_RECT_W}
            height={HIGHLIGHT_RECT_H}
            rx={8}
            fill={accent}
            fillOpacity={0.13}
            stroke={accent}
            strokeOpacity={0.45}
            strokeWidth={1}
          />
          <text
            x={CANVAS_W / 2}
            y={LINE2_Y}
            textAnchor="middle"
            fontSize={36}
            fontWeight={700}
            letterSpacing="-0.5px"
            fill={LINE2_COLOR}
          >
            {line2 ?? LINE2_DEFAULT}
          </text>

          <text
            x={CANVAS_W / 2}
            y={LINE3_Y}
            textAnchor="middle"
            fontSize={36}
            fontWeight={700}
            letterSpacing="-0.5px"
            fill={`url(#${gradientId})`}
          >
            {line3 ?? LINE3_DEFAULT}
          </text>

          <text
            x={CANVAS_W / 2}
            y={SUBTITLE_Y}
            textAnchor="middle"
            fontSize={13}
            fontWeight={400}
            letterSpacing="0.2px"
            fill={SUBTITLE_COLOR}
            fillOpacity={0.65}
          >
            {subtitle ?? SUBTITLE_DEFAULT}
          </text>

          <rect
            x={CANVAS_W / 2 - SERIES_PILL_W / 2}
            y={SERIES_PILL_Y}
            width={SERIES_PILL_W}
            height={SERIES_PILL_H}
            rx={10}
            fill={accent}
            fillOpacity={0.08}
          />
          <text
            x={CANVAS_W / 2}
            y={SERIES_PILL_TEXT_Y}
            textAnchor="middle"
            fontSize={10}
            fontWeight={400}
            letterSpacing="1px"
            fill={accent}
            fillOpacity={0.6}
          >
            {seriesLabel ?? SERIES_LABEL_DEFAULT}
          </text>
        </g>
      </svg>
    </AbsoluteFill>
  );
};

// Exposed for callers that need to align other elements to the visual/
// typography split (e.g. a future manifest-scene wrapper).
export const CHARACTER_ICON_COVER_VISUAL_ZONE_H = VISUAL_ZONE_H;
