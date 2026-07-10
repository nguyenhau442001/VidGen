import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { StatComparatorSceneProps } from "../types";
import { colors, INTER, JETBRAINS_MONO, SAFE_ZONE } from "../styles";
import { AmbientBackground } from "../AmbientBackground";

// ---------------------------------------------------------------------------
// The brief's frame plan (0-330 @ 30fps) is a design ratio, not literal frame
// numbers: every checkpoint below is expressed as a fraction of this 330-frame
// reference and scaled by the real `durationInFrames` prop. Narration-driven
// scenes in this codebase (see EventScanScene) get their duration tightened to
// the actual TTS audio length, so a scene that assumed a fixed 330 frames
// would clip its own ending on shorter narration.
// ---------------------------------------------------------------------------
const DESIGN_TOTAL = 330;

const BEFORE_COLOR_DEFAULT = "#ff4d4d";
const AFTER_COLOR_DEFAULT = colors.green;

const PANEL_GAP = 64;
const PANEL_TOP = SAFE_ZONE.top + 170;
const PANEL_H = 860;

function decimalsOf(n: number): number {
  const s = String(n);
  const i = s.indexOf(".");
  return i === -1 ? 0 : s.length - i - 1;
}

function formatCount(value: number, decimals: number): string {
  if (decimals > 0) return value.toFixed(decimals);
  return Math.round(value).toLocaleString("vi-VN");
}

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

// ---------------------------------------------------------------------------
// A single before/after stat panel: label -> big counter -> unit -> subtext.
// ---------------------------------------------------------------------------
interface PanelProps {
  isAfter: boolean;
  panelW: number;
  label: string;
  statNumber: number;
  unit: string;
  subtext: string;
  color: string;
  frame: number;
  fps: number;
  slideStartFrame: number;
  countStartFrame: number;
  countEndFrame: number;
  subtextStartFrame: number;
  subtextEndFrame: number;
  pulseGlow: number; // 0-1, only meaningful on the after panel
  pulseScale: number; // 1-ish, only meaningful on the after panel
}

const Panel: React.FC<PanelProps> = ({
  isAfter,
  panelW,
  label,
  statNumber,
  unit,
  subtext,
  color,
  frame,
  fps,
  slideStartFrame,
  countStartFrame,
  countEndFrame,
  subtextStartFrame,
  subtextEndFrame,
  pulseGlow,
  pulseScale,
}) => {
  const slideSpring = spring({
    frame: frame - slideStartFrame,
    fps,
    config: { damping: 16 },
  });
  const translateX = interpolate(slideSpring, [0, 1], [isAfter ? 60 : -60, 0]);
  const panelOpacity = Math.min(slideSpring, 1);

  const countT = interpolate(frame, [countStartFrame, countEndFrame], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const decimals = decimalsOf(statNumber);
  const displayValue = formatCount(statNumber * countT, decimals);

  const subtextOpacity = interpolate(frame, [subtextStartFrame, subtextEndFrame], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        top: PANEL_TOP,
        left: isAfter ? panelW + PANEL_GAP : 0,
        width: panelW,
        height: PANEL_H,
        borderRadius: 20,
        backgroundColor: `${color}0f`,
        border: `1px solid ${color}55`,
        boxShadow: pulseGlow > 0 ? `0 0 ${40 * pulseGlow}px ${color}66` : "none",
        opacity: panelOpacity,
        transform: `translateX(${translateX}px) scale(${pulseScale})`,
        boxSizing: "border-box",
        padding: "34px 26px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          fontFamily: `${JETBRAINS_MONO}, monospace`,
          fontSize: 15,
          fontWeight: 600,
          color,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span>{isAfter ? "✓" : "✗"}</span>
        <span>{label}</span>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
        }}
      >
        <span
          style={{
            fontFamily: `${JETBRAINS_MONO}, monospace`,
            fontSize: 74,
            fontWeight: 800,
            color,
            textShadow: `0 0 24px ${color}66`,
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1,
          }}
        >
          {displayValue}
        </span>
        <span
          style={{
            fontFamily: `${INTER}, sans-serif`,
            fontSize: 19,
            fontWeight: 500,
            color: "rgba(255,255,255,0.5)",
          }}
        >
          {unit}
        </span>
      </div>

      <div
        style={{
          fontFamily: `${INTER}, sans-serif`,
          fontSize: 16,
          fontWeight: 400,
          color: "rgba(255,255,255,0.7)",
          textAlign: "center",
          lineHeight: 1.4,
          minHeight: 44,
          opacity: subtextOpacity,
        }}
      >
        {subtext}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
const StatComparatorScene: React.FC<StatComparatorSceneProps> = ({
  headline,
  accentWord,
  beforeLabel,
  beforeStatNumber,
  beforeStatUnit,
  beforeSubtext,
  beforeColor = BEFORE_COLOR_DEFAULT,
  afterLabel,
  afterStatNumber,
  afterStatUnit,
  afterSubtext,
  afterColor = AFTER_COLOR_DEFAULT,
  deltaLabel,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  // Scale the brief's 0-330 frame plan by the scene's real duration.
  const ck = (f: number) => Math.round((f / DESIGN_TOTAL) * durationInFrames);
  const pairEnd = (start: number, end: number) => Math.max(end, start + 1);

  const headlineEnd = ck(20);
  const beforeSlideStart = ck(20);
  const beforeCountStart = ck(60);
  const beforeCountEnd = pairEnd(beforeCountStart, ck(120));
  const beforeSubtextStart = ck(80);
  const beforeSubtextEnd = pairEnd(beforeSubtextStart, ck(100));
  const afterSlideStart = ck(120);
  const afterCountStart = ck(160);
  const afterCountEnd = pairEnd(afterCountStart, ck(220));
  const afterSubtextStart = ck(200);
  const afterSubtextEnd = pairEnd(afterSubtextStart, ck(230));
  const deltaStart = ck(230);
  const deltaEnd = pairEnd(deltaStart, ck(280));
  const pulseStart = ck(280);
  const pulseMid = pairEnd(pulseStart, ck(305));
  const pulseEnd = pairEnd(pulseMid, ck(330));

  // Frame 0-headlineEnd: headline fade + slide up
  const headlineSpring = spring({ frame, fps, config: { damping: 15 }, durationInFrames: headlineEnd || 1 });
  const headlineOpacity = Math.min(headlineSpring, 1);
  const headlineTranslateY = interpolate(headlineSpring, [0, 1], [24, 0]);

  // deltaStart-deltaEnd: badge scale-in
  const deltaSpring = spring({
    frame: frame - deltaStart,
    fps,
    config: { damping: 14 },
    durationInFrames: pairEnd(0, deltaEnd - deltaStart),
  });
  const deltaOpacity = Math.min(deltaSpring, 1);
  const deltaScale = interpolate(deltaSpring, [0, 1], [0.8, 1]);

  // pulseStart-pulseEnd: gentle glow pulse on the AFTER panel only
  const pulseGlow = interpolate(frame, [pulseStart, pulseMid, pulseEnd], [0, 1, 0.35], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const pulseScale = interpolate(frame, [pulseStart, pulseMid, pulseEnd], [1, 1.02, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const contentW = width - SAFE_ZONE.left - SAFE_ZONE.right;
  const panelW = (contentW - PANEL_GAP) / 2;

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      <AmbientBackground accent={afterColor} />

      {/* Headline */}
      <div
        style={{
          position: "absolute",
          top: SAFE_ZONE.top,
          left: SAFE_ZONE.left,
          right: SAFE_ZONE.right,
          textAlign: "center",
          color: colors.textPrimary,
          fontFamily: `${INTER}, sans-serif`,
          fontSize: 42,
          fontWeight: 700,
          lineHeight: 1.25,
          opacity: headlineOpacity,
          transform: `translateY(${headlineTranslateY}px)`,
        }}
      >
        {renderHeadline(headline, accentWord, afterColor)}
      </div>

      {/* Panels */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: SAFE_ZONE.left,
          width: contentW,
          height: "100%",
        }}
      >
        <Panel
          isAfter={false}
          panelW={panelW}
          label={beforeLabel}
          statNumber={beforeStatNumber}
          unit={beforeStatUnit}
          subtext={beforeSubtext}
          color={beforeColor}
          frame={frame}
          fps={fps}
          slideStartFrame={beforeSlideStart}
          countStartFrame={beforeCountStart}
          countEndFrame={beforeCountEnd}
          subtextStartFrame={beforeSubtextStart}
          subtextEndFrame={beforeSubtextEnd}
          pulseGlow={0}
          pulseScale={1}
        />
        <Panel
          isAfter
          panelW={panelW}
          label={afterLabel}
          statNumber={afterStatNumber}
          unit={afterStatUnit}
          subtext={afterSubtext}
          color={afterColor}
          frame={frame}
          fps={fps}
          slideStartFrame={afterSlideStart}
          countStartFrame={afterCountStart}
          countEndFrame={afterCountEnd}
          subtextStartFrame={afterSubtextStart}
          subtextEndFrame={afterSubtextEnd}
          pulseGlow={pulseGlow}
          pulseScale={pulseScale}
        />
      </div>

      {/* Delta badge */}
      {deltaLabel && (
        <div
          style={{
            position: "absolute",
            top: PANEL_TOP + PANEL_H + 48,
            left: SAFE_ZONE.left,
            right: SAFE_ZONE.right,
            display: "flex",
            justifyContent: "center",
            opacity: deltaOpacity,
            transform: `scale(${deltaScale})`,
          }}
        >
          <div
            style={{
              padding: "16px 28px",
              borderRadius: 999,
              backgroundColor: `${afterColor}1a`,
              border: `1px solid ${afterColor}66`,
              fontFamily: `${INTER}, sans-serif`,
              fontSize: 20,
              fontWeight: 700,
              color: afterColor,
              textAlign: "center",
            }}
          >
            {deltaLabel}
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

export default StatComparatorScene;
