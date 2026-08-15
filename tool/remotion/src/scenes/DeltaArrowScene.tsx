import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { DeltaArrowSceneProps } from "../types";
import { colors, INTER, JETBRAINS_MONO, SAFE_ZONE } from "../styles";
import { AmbientBackground } from "../AmbientBackground";

export type { DeltaArrowSceneProps };

// ---------------------------------------------------------------------------
// The brief's frame plan (0-220 @ 30fps) is a design ratio, not literal frame
// numbers: every checkpoint below is expressed as a fraction of this 220-frame
// reference and scaled by the real `durationInFrames` prop (see
// StatComparatorScene for the same pattern).
// ---------------------------------------------------------------------------
const DESIGN_TOTAL = 220;

const ACCENT_DEFAULT = colors.green;
const BEFORE_COLOR_DEFAULT = "rgba(255,68,68,0.7)";

const BAR_H = 52;
const BAR_GAP = 60; // gap between the two bars themselves
const LABEL_H = 24;
const LABEL_GAP = 10;
const SUBTEXT_GAP = 8;

const BARS_TOP = SAFE_ZONE.top + 170;

const renderHeadline = (headline: string, accentWord: string, accentColor: string): React.ReactNode => {
  const index = headline.indexOf(accentWord);
  if (index === -1) return <span>{headline}</span>;
  const before = headline.substring(0, index);
  const after = headline.substring(index + accentWord.length);
  return (
    <>
      {before}
      <span style={{ color: accentColor, textShadow: `0 0 12px ${accentColor}` }}>{accentWord}</span>
      {after}
    </>
  );
};

interface BarRowProps {
  label: string;
  value: number;
  unit: string;
  subtext?: string;
  color: string;
  barLeft: number;
  barTop: number;
  targetWidth: number;
  countStart: number;
  countEnd: number;
  frame: number;
  brightness?: number; // 1 = normal, >1 = pulsed
}

const BarRow: React.FC<BarRowProps> = ({
  label,
  value,
  unit,
  subtext,
  color,
  barLeft,
  barTop,
  targetWidth,
  countStart,
  countEnd,
  frame,
  brightness = 1,
}) => {
  // Bar width = interpolate(frame, [start, end], [0, targetWidth], { extrapolateRight: 'clamp' })
  const barWidth = interpolate(frame, [countStart, countEnd], [0, targetWidth], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const countT = interpolate(frame, [countStart, countEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const displayValue = (Math.round(value * countT * 10) / 10).toFixed(1);

  return (
    <>
      <div
        style={{
          position: "absolute",
          top: barTop - LABEL_H - LABEL_GAP,
          left: barLeft,
          height: LABEL_H,
          fontFamily: `${INTER}, sans-serif`,
          fontSize: 16,
          fontWeight: 500,
          color: "rgba(0,0,0,0.7)",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </div>

      <div
        style={{
          position: "absolute",
          top: barTop,
          left: barLeft,
          width: barWidth,
          height: BAR_H,
          backgroundColor: color,
          borderRadius: "0 8px 8px 0",
          filter: `brightness(${brightness})`,
        }}
      />

      <div
        style={{
          position: "absolute",
          top: barTop + BAR_H / 2,
          left: barLeft + barWidth + 14,
          transform: "translateY(-50%)",
          fontFamily: `${JETBRAINS_MONO}, monospace`,
          fontSize: 24,
          fontWeight: 700,
          color: colors.textPrimary,
          whiteSpace: "nowrap",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {displayValue}
        <span style={{ fontSize: 16, fontWeight: 500, color: "rgba(0,0,0,0.6)", marginLeft: 4 }}>
          {unit}
        </span>
      </div>

      {subtext && (
        <div
          style={{
            position: "absolute",
            top: barTop + BAR_H + SUBTEXT_GAP,
            left: barLeft,
            fontFamily: `${INTER}, sans-serif`,
            fontSize: 14,
            fontWeight: 400,
            color: "rgba(0,0,0,0.45)",
            whiteSpace: "nowrap",
          }}
        >
          {subtext}
        </div>
      )}
    </>
  );
};

const DeltaArrowScene: React.FC<DeltaArrowSceneProps> = ({
  headline,
  accentWord,
  beforeLabel,
  beforeValue,
  beforeUnit,
  beforeSubtext,
  afterLabel,
  afterValue,
  afterUnit,
  afterSubtext,
  deltaLabel,
  accentColor = ACCENT_DEFAULT,
  beforeColor = BEFORE_COLOR_DEFAULT,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();

  // Scale the brief's 0-220 frame plan by the scene's real duration.
  const ck = (f: number) => Math.round((f / DESIGN_TOTAL) * durationInFrames);
  const pairEnd = (start: number, end: number) => Math.max(end, start + 1);

  const headlineEnd = ck(20);
  const beforeStart = ck(20);
  const beforeEnd = pairEnd(beforeStart, ck(80));
  const pulseStart = ck(80);
  const pulseMid = pairEnd(pulseStart, ck(90));
  const pulseEnd = pairEnd(pulseMid, ck(100));
  const afterStart = ck(100);
  const afterEnd = pairEnd(afterStart, ck(160));
  const arrowStart = ck(160);
  const arrowEnd = pairEnd(arrowStart, ck(200));
  const deltaFadeStart = ck(200);
  const deltaFadeEnd = pairEnd(deltaFadeStart, ck(210));
  const deltaPulseMid = pairEnd(deltaFadeEnd, ck(215));
  const deltaPulseEnd = pairEnd(deltaPulseMid, ck(220));

  // Frame 0-headlineEnd: headline fade in
  const headlineOpacity = interpolate(frame, [0, headlineEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // pulseStart-pulseEnd: before bar brightness pulse
  const beforeBrightness = interpolate(frame, [pulseStart, pulseMid, pulseEnd], [1, 1.3, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const contentW = width - SAFE_ZONE.left - SAFE_ZONE.right;
  const barMaxW = Math.min(width * 0.75, contentW);
  const maxValue = Math.max(beforeValue, afterValue, 1e-6);
  const beforeTargetW = (beforeValue / maxValue) * barMaxW;
  const afterTargetW = (afterValue / maxValue) * barMaxW;

  const barLeft = SAFE_ZONE.left;
  const beforeBarTop = BARS_TOP + LABEL_H + LABEL_GAP;
  const beforeBarBottom = beforeBarTop + BAR_H;
  const afterBarTop = beforeBarBottom + BAR_GAP;

  // Delta arrow: right tip of "before" bar -> right tip of "after" bar,
  // strokeDashoffset drawn top -> bottom.
  const arrowX1 = barLeft + beforeTargetW;
  const arrowY1 = beforeBarTop + BAR_H / 2;
  const arrowX2 = barLeft + afterTargetW;
  const arrowY2 = afterBarTop + BAR_H / 2;
  const arrowPathLength = Math.hypot(arrowX2 - arrowX1, arrowY2 - arrowY1);
  const arrowDraw = interpolate(frame, [arrowStart, arrowEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const arrowAngleDeg = (Math.atan2(arrowY2 - arrowY1, arrowX2 - arrowX1) * 180) / Math.PI;
  const arrowHeadOpacity = interpolate(arrowDraw, [0.85, 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const deltaOpacity = interpolate(frame, [deltaFadeStart, deltaFadeEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const deltaScale = interpolate(frame, [deltaFadeEnd, deltaPulseMid, deltaPulseEnd], [1, 1.15, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      <AmbientBackground accent={accentColor} />

      {/* Headline */}
      <div
        style={{
          position: "absolute",
          top: SAFE_ZONE.top,
          left: SAFE_ZONE.left,
          right: SAFE_ZONE.right,
          fontFamily: `${INTER}, sans-serif`,
          fontSize: 28,
          fontWeight: 700,
          lineHeight: 1.3,
          color: colors.textPrimary,
          opacity: headlineOpacity,
        }}
      >
        {renderHeadline(headline, accentWord, accentColor)}
      </div>

      {/* Before bar */}
      <BarRow
        label={beforeLabel}
        value={beforeValue}
        unit={beforeUnit}
        subtext={beforeSubtext}
        color={beforeColor}
        barLeft={barLeft}
        barTop={beforeBarTop}
        targetWidth={beforeTargetW}
        countStart={beforeStart}
        countEnd={beforeEnd}
        frame={frame}
        brightness={beforeBrightness}
      />

      {/* After bar */}
      <BarRow
        label={afterLabel}
        value={afterValue}
        unit={afterUnit}
        subtext={afterSubtext}
        color={accentColor}
        barLeft={barLeft}
        barTop={afterBarTop}
        targetWidth={afterTargetW}
        countStart={afterStart}
        countEnd={afterEnd}
        frame={frame}
      />

      {/* Delta arrow */}
      <svg
        width={width}
        height="100%"
        viewBox={`0 0 ${width} ${afterBarTop + BAR_H + 200}`}
        style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
      >
        <line
          x1={arrowX1}
          y1={arrowY1}
          x2={arrowX2}
          y2={arrowY2}
          stroke={accentColor}
          strokeWidth={2}
          strokeDasharray={arrowPathLength}
          strokeDashoffset={arrowPathLength * (1 - arrowDraw)}
        />
        <polygon
          points="0,0 -10,-6 -10,6"
          fill={accentColor}
          opacity={arrowHeadOpacity}
          transform={`translate(${arrowX2}, ${arrowY2}) rotate(${arrowAngleDeg})`}
        />
      </svg>

      {/* Delta label */}
      <div
        style={{
          position: "absolute",
          top: (arrowY1 + arrowY2) / 2,
          right: SAFE_ZONE.right,
          transform: `translateY(-50%) scale(${deltaScale})`,
          opacity: deltaOpacity,
          fontFamily: `${INTER}, sans-serif`,
          fontSize: 16,
          fontWeight: 700,
          color: accentColor,
          textAlign: "right",
          maxWidth: 240,
        }}
      >
        {deltaLabel}
      </div>
    </AbsoluteFill>
  );
};

export default DeltaArrowScene;
