import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { ScoreCardSceneProps } from "../types";
import { colors, INTER, type as t } from "../styles";
import { SafeZone } from "../SafeZone";
import { AmbientBackground } from "../AmbientBackground";

// ---------------------------------------------------------------------------
// Timing constants (frames)
// ---------------------------------------------------------------------------
const ENTER_FRAMES = 12;
const EXIT_FRAMES = 10;
const LABEL_IN = 10;    // label slides in from left
const COUNT_UP = 24;    // score counts up (simultaneous with bar fill)
const DIVIDER_DRAW = 18;
const HOLD_AFTER = 30;

// ---------------------------------------------------------------------------
// Duration helper — use with calculateMetadata or as a fixed durationInFrames
// ---------------------------------------------------------------------------
export function calculateScoreCardDuration(
  criteriaCount: number,
  staggerFrames: number
): number {
  const lastRowDone =
    ENTER_FRAMES + (criteriaCount - 1) * staggerFrames + LABEL_IN + COUNT_UP;
  return (
    lastRowDone +
    6 + DIVIDER_DRAW +
    8 + COUNT_UP + 6 +
    HOLD_AFTER + EXIT_FRAMES
  );
}

// ---------------------------------------------------------------------------
// Single criteria row
// ---------------------------------------------------------------------------
const CriteriaRow: React.FC<{
  label: string;
  score: number;
  maxScore: number;
  rowFrame: number;
  accentColor: string;
  isLast: boolean;
}> = ({ label, score, maxScore, rowFrame, accentColor, isLast }) => {
  // Label slides in from left
  const labelP = interpolate(rowFrame, [0, LABEL_IN], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Count-up starts after label finishes sliding in
  const countFrame = Math.max(0, rowFrame - LABEL_IN);
  const displayScore = Math.round(
    interpolate(countFrame, [0, COUNT_UP], [0, score], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );

  // Bar fill: 0 → score/maxScore ratio, simultaneous with count-up
  const barFill =
    maxScore > 0
      ? interpolate(countFrame, [0, COUNT_UP], [0, score / maxScore], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 0;

  return (
    <div
      style={{
        opacity: labelP,
        transform: `translateX(${interpolate(labelP, [0, 1], [-24, 0])}px)`,
        paddingTop: 22,
        paddingBottom: isLast ? 0 : 22,
        borderBottom: isLast ? "none" : `1px solid ${colors.terminalBorder}`,
      }}
    >
      {/* Label + score/maxScore */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 10,
        }}
      >
        <span
          style={{
            fontSize: 28,
            fontWeight: 500,
            color: colors.textPrimary,
            fontFamily: INTER,
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: accentColor,
            fontFamily: INTER,
            letterSpacing: "-0.02em",
          }}
        >
          {displayScore}
          <span
            style={{ fontSize: 18, fontWeight: 400, color: colors.textDim }}
          >
            /{maxScore}
          </span>
        </span>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: 6,
          backgroundColor: "rgba(255,255,255,0.08)",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${barFill * 100}%`,
            backgroundColor: accentColor,
            borderRadius: 3,
          }}
        />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Divider line that draws in from left
// ---------------------------------------------------------------------------
const DividerLine: React.FC<{ frame: number; drawStart: number }> = ({
  frame,
  drawStart,
}) => {
  const progress = interpolate(
    frame,
    [drawStart, drawStart + DIVIDER_DRAW],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <div
      style={{
        height: 2,
        backgroundColor: "rgba(255,255,255,0.14)",
        marginTop: 28,
        marginBottom: 24,
        transformOrigin: "0% 50%",
        transform: `scaleX(${progress})`,
      }}
    />
  );
};

// ---------------------------------------------------------------------------
// Total row
// ---------------------------------------------------------------------------
const TotalRow: React.FC<{
  totalScore: number;
  maxTotal: number;
  frame: number;
  countStart: number;
  accentColor: string;
}> = ({ totalScore, maxTotal, frame, countStart, accentColor }) => {
  const slideIn = interpolate(frame, [countStart - 6, countStart + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const countFrame = Math.max(0, frame - countStart);
  const displayed = Math.round(
    interpolate(countFrame, [0, COUNT_UP + 6], [0, totalScore], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        opacity: slideIn,
        transform: `translateY(${interpolate(slideIn, [0, 1], [12, 0])}px)`,
      }}
    >
      <span
        style={{
          fontSize: 32,
          fontWeight: 700,
          color: colors.textPrimary,
          fontFamily: INTER,
          letterSpacing: "-0.02em",
        }}
      >
        Tổng điểm
      </span>
      <span
        style={{
          fontSize: 42,
          fontWeight: 800,
          color: accentColor,
          fontFamily: INTER,
          letterSpacing: "-0.03em",
        }}
      >
        {displayed}
        <span style={{ fontSize: 22, fontWeight: 500, color: colors.textDim }}>
          /{maxTotal}
        </span>
      </span>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export const ScoreCardScene: React.FC<ScoreCardSceneProps> = ({
  criteria,
  staggerFrames = 30,
  rowEnterFrames: rowEnterFramesProp,
  accentColor,
  title,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const accent = accentColor ?? colors.cyan;

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

  // Per-row enter frames — explicit rowEnterFrames wins when the reveal needs
  // to sync to unevenly-timed per-row narration (see narration_per_criterion);
  // otherwise falls back to the uniform staggerFrames spacing.
  const rowEnterFrames =
    rowEnterFramesProp ?? criteria.map((_, i) => ENTER_FRAMES + i * staggerFrames);
  const lastRowDone =
    rowEnterFrames[criteria.length - 1] + LABEL_IN + COUNT_UP;

  const dividerStart = lastRowDone + 6;
  const totalCountStart = dividerStart + DIVIDER_DRAW + 8;

  const totalScore = criteria.reduce((s, c) => s + c.score, 0);
  const maxTotal = criteria.reduce((s, c) => s + c.maxScore, 0);

  // Card entrance spring
  const cardScale = spring({
    frame: frame - 4,
    fps,
    from: 0.97,
    to: 1,
    config: { stiffness: 200, damping: 22 },
    durationInFrames: 20,
  });
  const cardOpacity = interpolate(frame, [4, ENTER_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={
        {
          backgroundColor: colors.bg,
          opacity: sceneOpacity,
          "--bar-color": accent,
        } as React.CSSProperties
      }
    >
      <AmbientBackground accent={accent} />

      <SafeZone
        style={{
          justifyContent: "center",
          flexDirection: "column",
          fontFamily: INTER,
        }}
      >
        {/* Optional section title */}
        {title && (
          <div
            style={{
              ...t.label,
              color: accent,
              marginBottom: 24,
              opacity: interpolate(frame, [4, ENTER_FRAMES], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            {title}
          </div>
        )}

        {/* Score card container */}
        <div
          style={{
            backgroundColor: colors.terminalBg,
            border: `1px solid ${colors.terminalBorder}`,
            borderRadius: 20,
            padding: "8px 36px 32px",
            transform: `scale(${cardScale})`,
            opacity: cardOpacity,
          }}
        >
          {/* Criteria rows */}
          {criteria.map((c, i) => {
            const rowFrame = Math.max(0, frame - rowEnterFrames[i]);
            return (
              <CriteriaRow
                key={i}
                label={c.label}
                score={c.score}
                maxScore={c.maxScore}
                rowFrame={rowFrame}
                accentColor={accent}
                isLast={i === criteria.length - 1}
              />
            );
          })}

          {/* Divider */}
          <DividerLine frame={frame} drawStart={dividerStart} />

          {/* Total */}
          <TotalRow
            totalScore={totalScore}
            maxTotal={maxTotal}
            frame={frame}
            countStart={totalCountStart}
            accentColor={accent}
          />
        </div>
      </SafeZone>
    </AbsoluteFill>
  );
};
