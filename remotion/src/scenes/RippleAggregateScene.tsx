import React, { useMemo } from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  random,
  useCurrentFrame,
} from "remotion";
import { RippleAggregateSceneProps } from "../types";
import { colors, INTER } from "../styles";
import { rgba } from "./colorHelpers";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Authored on this viewBox. The SVG covers the full 1080×1920 canvas with
// preserveAspectRatio="slice", which crops the sides: only x ≈ 71–679 of the
// viewBox is visible. hotspotPosition is given in these coordinates.
const VB_W = 750;
const VB_H = 1080;
const CX = VB_W / 2;
const CY = VB_H / 2;

// Phase boundaries (designed for a ~346-frame scene at 30fps)
const TAP_START = 10;
const TAP_END = 26;
const SINGLE_RIPPLE_START = 18;
const SINGLE_RIPPLE_FRAMES = 45;
const ZOOM_START = 60;
const ZOOM_END = 100;
const FIELD_RIPPLES_START = 100;
const AGG_LABEL_START = 180;
const AGG_LABEL_FADE = 30;
const CONVERGE_START = 240;
const CONVERGE_END = 280;
const EXIT_FRAMES = 30;

const ACCENT_DEFAULT = "#22C55E";
const PHONE_COUNT_DEFAULT = 28;

// The zoomed-out field: everything lives in viewBox coordinates but spans a
// virtual canvas 1/ZOOM_OUT_SCALE larger, so at full zoom-out it exactly
// fills the frame while at scale 1 only the center phone is on screen.
const ZOOM_OUT_SCALE = 0.35;
const FIELD_W = VB_W / ZOOM_OUT_SCALE;
const FIELD_H = VB_H / ZOOM_OUT_SCALE;

const PHONE_W = 48;
const PHONE_H = 84;
const FIELD_RIPPLE_PERIOD = 50;
const FIELD_RIPPLE_RADIUS = 110;

// How far (0–1) edge phones travel toward the hotspot during convergence.
const CONVERGE_FRACTION = 0.65;

// ---------------------------------------------------------------------------
// Simple phone glyph, centered on (0,0)
// ---------------------------------------------------------------------------
const PhoneIcon: React.FC<{ accent: string; scale?: number }> = ({ accent, scale = 1 }) => (
  <g transform={`scale(${scale})`}>
    <rect
      x={-PHONE_W / 2}
      y={-PHONE_H / 2}
      width={PHONE_W}
      height={PHONE_H}
      rx={10}
      fill={rgba(accent, 0.1)}
      stroke={accent}
      strokeWidth={2}
    />
    {/* Screen glow */}
    <rect
      x={-PHONE_W / 2 + 6}
      y={-PHONE_H / 2 + 10}
      width={PHONE_W - 12}
      height={PHONE_H - 26}
      rx={4}
      fill={rgba(accent, 0.14)}
    />
    {/* Home indicator */}
    <line
      x1={-8}
      y1={PHONE_H / 2 - 8}
      x2={8}
      y2={PHONE_H / 2 - 8}
      stroke={rgba(accent, 0.6)}
      strokeWidth={2.5}
      strokeLinecap="round"
    />
  </g>
);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export const RippleAggregateScene: React.FC<RippleAggregateSceneProps> = ({
  singleLabel,
  aggregateLabel,
  phoneCount = PHONE_COUNT_DEFAULT,
  accentColor = ACCENT_DEFAULT,
  hotspotPosition,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();

  const hotspot = hotspotPosition ?? { x: CX, y: CY };
  // Convergence target in field coordinates: the field is scaled by
  // ZOOM_OUT_SCALE around the viewport center, so invert that mapping.
  const fieldHotspot = {
    x: CX + (hotspot.x - CX) / ZOOM_OUT_SCALE,
    y: CY + (hotspot.y - CY) / ZOOM_OUT_SCALE,
  };

  // Deterministic scatter: jittered grid cells over the virtual field, so
  // phones spread evenly without Math.random() flicker. Index 0 is the
  // phase-1 phone, pinned to the exact center.
  const phones = useMemo(() => {
    const cols = 5;
    const rows = Math.ceil((phoneCount + 1) / cols);
    const cellW = FIELD_W / cols;
    const cellH = FIELD_H / rows;
    const left = CX - FIELD_W / 2;
    const top = CY - FIELD_H / 2;

    const cells: Array<{ x: number; y: number }> = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = left + (c + 0.5) * cellW;
        const y = top + (r + 0.5) * cellH;
        // Reserve the center for the phase-1 phone
        if (Math.abs(x - CX) < cellW / 2 && Math.abs(y - CY) < cellH / 2) continue;
        cells.push({ x, y });
      }
    }

    const positions = [{ x: CX, y: CY }];
    for (let i = 0; i < Math.min(phoneCount - 1, cells.length); i++) {
      // Pick cells in a seeded shuffle order, then jitter inside the cell
      const pick = i + Math.floor(random(`ripple-cell-${i}`) * (cells.length - i));
      [cells[i], cells[pick]] = [cells[pick], cells[i]];
      positions.push({
        x: cells[i].x + (random(`ripple-jx-${i}`) - 0.5) * cellW * 0.7,
        y: cells[i].y + (random(`ripple-jy-${i}`) - 0.5) * cellH * 0.7,
      });
    }
    return positions;
  }, [phoneCount]);

  // Phase 1: tap (scale dip) + one expanding ripple
  const tapScale = interpolate(
    frame,
    [TAP_START, (TAP_START + TAP_END) / 2, TAP_END],
    [1, 0.9, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const singleRippleT = interpolate(
    frame,
    [SINGLE_RIPPLE_START, SINGLE_RIPPLE_START + SINGLE_RIPPLE_FRAMES],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Phase 2: camera pulls back
  const zoom = interpolate(frame, [ZOOM_START, ZOOM_END], [1, ZOOM_OUT_SCALE], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

  // Convergence: phones drift toward the hotspot, farther ones moving more
  // visibly because everyone covers the same fraction of their distance.
  const convergeT = interpolate(frame, [CONVERGE_START, CONVERGE_END], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.quad),
  });

  // Labels live in screen space, outside the zoomed group
  const singleLabelOpacity = interpolate(
    frame,
    [0, 12, ZOOM_START, ZOOM_START + 15],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const aggLabelStart = Math.max(
    ZOOM_END + 20,
    Math.min(AGG_LABEL_START, durationInFrames - EXIT_FRAMES - AGG_LABEL_FADE - 20)
  );
  const aggLabelOpacity = interpolate(
    frame,
    [aggLabelStart, aggLabelStart + AGG_LABEL_FADE],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const aggLabelRise = interpolate(
    frame,
    [aggLabelStart, aggLabelStart + AGG_LABEL_FADE],
    [12, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Hold + fade at the end, anchored to the pipeline-provided duration
  const hasExitRoom = durationInFrames > ZOOM_END + EXIT_FRAMES;
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
        {/* Zoomed field: scale 1 shows only the center phone; pulling back to
            ZOOM_OUT_SCALE reveals the whole scattered field. */}
        <g transform={`translate(${CX}, ${CY}) scale(${zoom}) translate(${-CX}, ${-CY})`}>
          {phones.map((p, i) => {
            const isCenter = i === 0;
            const x = p.x + (fieldHotspot.x - p.x) * CONVERGE_FRACTION * convergeT;
            const y = p.y + (fieldHotspot.y - p.y) * CONVERGE_FRACTION * convergeT;

            // Field phones pop in as the camera pulls back
            const fieldIn = isCenter
              ? 1
              : interpolate(frame, [ZOOM_START + 5, ZOOM_END], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                });
            if (fieldIn <= 0) return null;

            // Repeating ripple, staggered per phone: startFrame = 100 + i·3
            const rippleStart = FIELD_RIPPLES_START + i * 3;
            const rippleAge = frame - rippleStart;
            const rippleT =
              rippleAge >= 0 ? (rippleAge % FIELD_RIPPLE_PERIOD) / FIELD_RIPPLE_PERIOD : -1;

            return (
              <g key={i} opacity={fieldIn}>
                {rippleT >= 0 && (
                  <circle
                    cx={x}
                    cy={y}
                    r={rippleT * FIELD_RIPPLE_RADIUS}
                    fill="none"
                    stroke={rgba(accentColor, 0.6 * (1 - rippleT))}
                    strokeWidth={4}
                  />
                )}
                <g transform={`translate(${x}, ${y})`}>
                  <PhoneIcon accent={accentColor} scale={isCenter ? tapScale : 1} />
                </g>
              </g>
            );
          })}

          {/* Phase-1 ripple from the center phone: radius 0→120, opacity 1→0 */}
          {singleRippleT > 0 && singleRippleT < 1 && (
            <circle
              cx={CX}
              cy={CY}
              r={singleRippleT * 120}
              fill="none"
              stroke={rgba(accentColor, 1 - singleRippleT)}
              strokeWidth={3}
            />
          )}
        </g>

        {/* Phase-1 label under the centered phone */}
        {singleLabel && singleLabelOpacity > 0 && (
          <text
            x={CX}
            y={CY + PHONE_H / 2 + 48}
            textAnchor="middle"
            fontSize={26}
            fontWeight={600}
            opacity={singleLabelOpacity}
            style={{ fill: colors.textPrimary, fontFamily: INTER }}
          >
            {singleLabel}
          </text>
        )}

        {/* Phase-2 aggregate label at the bottom */}
        {aggregateLabel && aggLabelOpacity > 0 && (
          <text
            x={CX}
            y={VB_H - 150 + aggLabelRise}
            textAnchor="middle"
            fontSize={30}
            fontWeight={700}
            paintOrder="stroke"
            stroke={colors.bg}
            strokeWidth={8}
            strokeLinejoin="round"
            opacity={aggLabelOpacity}
            style={{ fill: colors.textPrimary, fontFamily: INTER }}
          >
            {aggregateLabel}
          </text>
        )}
      </svg>
    </AbsoluteFill>
  );
};
