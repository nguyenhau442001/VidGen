import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, INTER } from "../styles";

// ---------------------------------------------------------------------------
// Virtual canvas — 750x1080 portrait, "contain" fit inside the real
// composition, matching GridHeatmapScene/PacketFlowScene conventions.
// ---------------------------------------------------------------------------
const VB_W = 750;
const VB_H = 1080;

const BG = colors.bg;
const GLOW_COLOR = colors.green;
const GLOW_THICKNESS = 2;
const GLOW_BOX_SHADOW = `0 0 12px ${GLOW_COLOR}, 0 0 24px ${GLOW_COLOR}66`;

const HEADLINE_CENTER_Y = VB_H * 0.42;
const HEADLINE_BOX_HEIGHT = 200;
const HEADLINE_PADDING_X = 50;

const BASE_FONT_SIZE = 72;
const MIN_FONT_SIZE = 34;
const FONT_SHRINK_THRESHOLD = 12; // chars

const SPLIT_DISTANCE = 60; // px each half travels away from center
const SPLIT_SPRING_CONFIG = { damping: 16, stiffness: 100 };

const GLOW_FADE_START = 25;
const GLOW_FADE_FRAMES = 8;

const SUBTITLE_START = 40;
const SUBTITLE_FADE_FRAMES = 15;
const SUBTITLE_TRANSLATE_Y = 10;
const SUBTITLE_TOP_OFFSET = 90; // below the split gap

export type SplitRevealTitleSceneProps = {
  headline: string;
  accentWord: string;
  subtitle?: string;
  splitDirection?: "vertical" | "horizontal";
  durationInFrames: number;
};

const headlineFontSize = (headline: string): number => {
  if (headline.length <= FONT_SHRINK_THRESHOLD) return BASE_FONT_SIZE;
  return Math.max(
    MIN_FONT_SIZE,
    Math.round(BASE_FONT_SIZE * (FONT_SHRINK_THRESHOLD / headline.length))
  );
};

const SplitRevealTitleScene: React.FC<SplitRevealTitleSceneProps> = ({
  headline,
  accentWord,
  subtitle,
  splitDirection = "vertical",
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const scale = Math.min(width / VB_W, height / VB_H);
  const scaledWidth = VB_W * scale;
  const scaledHeight = VB_H * scale;
  const leftOffset = (width - scaledWidth) / 2;
  const topOffset = (height - scaledHeight) / 2;

  const fontSize = headlineFontSize(headline);

  // Split each half away from center on the same spring — top/left move
  // negative, bottom/right move positive, both starting fully overlapped.
  const negativeTranslate = spring({
    frame,
    fps,
    from: 0,
    to: -SPLIT_DISTANCE,
    config: SPLIT_SPRING_CONFIG,
  });
  const positiveTranslate = spring({
    frame,
    fps,
    from: 0,
    to: SPLIT_DISTANCE,
    config: SPLIT_SPRING_CONFIG,
  });

  const glowOpacity = interpolate(
    frame,
    [GLOW_FADE_START, GLOW_FADE_START + GLOW_FADE_FRAMES],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const subtitleOpacity = interpolate(
    frame,
    [SUBTITLE_START, SUBTITLE_START + SUBTITLE_FADE_FRAMES],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const subtitleTranslateY = interpolate(
    frame,
    [SUBTITLE_START, SUBTITLE_START + SUBTITLE_FADE_FRAMES],
    [SUBTITLE_TRANSLATE_Y, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const accentIndex = headline.indexOf(accentWord);
  const before = accentIndex >= 0 ? headline.slice(0, accentIndex) : headline;
  const after = accentIndex >= 0 ? headline.slice(accentIndex + accentWord.length) : "";

  const headlineTextStyle: React.CSSProperties = {
    fontFamily: `${INTER}, sans-serif`,
    fontWeight: 800,
    fontSize,
    color: colors.textPrimary,
    whiteSpace: "nowrap",
    lineHeight: 1.15,
  };

  const renderHeadlineText = () => (
    <>
      {before}
      {accentIndex >= 0 && (
        <span style={{ color: GLOW_COLOR, textShadow: `0 0 20px ${GLOW_COLOR}` }}>
          {accentWord}
        </span>
      )}
      {after}
    </>
  );

  const isVertical = splitDirection === "vertical";

  // Both halves share the exact same box (position, size, text) so at
  // translate=0 they tile back into one seamless headline. Only the
  // clip-path (which half is visible) and the transform (how far it has
  // moved) differ between the two copies.
  const halfBoxStyle: React.CSSProperties = {
    position: "absolute",
    top: HEADLINE_CENTER_Y - HEADLINE_BOX_HEIGHT / 2,
    left: 0,
    width: VB_W,
    height: HEADLINE_BOX_HEIGHT,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: `0 ${HEADLINE_PADDING_X}px`,
    boxSizing: "border-box",
    overflow: "hidden",
  };

  const firstHalfStyle: React.CSSProperties = isVertical
    ? {
        ...halfBoxStyle,
        clipPath: "inset(0 0 50% 0)",
        transform: `translateY(${negativeTranslate}px)`,
      }
    : {
        ...halfBoxStyle,
        clipPath: "inset(0 50% 0 0)",
        transform: `translateX(${negativeTranslate}px)`,
      };

  const secondHalfStyle: React.CSSProperties = isVertical
    ? {
        ...halfBoxStyle,
        clipPath: "inset(50% 0 0 0)",
        transform: `translateY(${positiveTranslate}px)`,
      }
    : {
        ...halfBoxStyle,
        clipPath: "inset(0 0 0 50%)",
        transform: `translateX(${positiveTranslate}px)`,
      };

  const glowStyle: React.CSSProperties = isVertical
    ? {
        position: "absolute",
        top: HEADLINE_CENTER_Y - GLOW_THICKNESS / 2,
        left: 0,
        width: VB_W,
        height: GLOW_THICKNESS,
        backgroundColor: GLOW_COLOR,
        boxShadow: GLOW_BOX_SHADOW,
        opacity: glowOpacity,
      }
    : {
        position: "absolute",
        top: 0,
        left: VB_W / 2 - GLOW_THICKNESS / 2,
        width: GLOW_THICKNESS,
        height: VB_H,
        backgroundColor: GLOW_COLOR,
        boxShadow: GLOW_BOX_SHADOW,
        opacity: glowOpacity,
      };

  void durationInFrames;

  return (
    <AbsoluteFill style={{ backgroundColor: BG, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          top: topOffset,
          left: leftOffset,
          width: VB_W,
          height: VB_H,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        <div style={firstHalfStyle}>
          <span style={headlineTextStyle}>{renderHeadlineText()}</span>
        </div>
        <div style={secondHalfStyle}>
          <span style={headlineTextStyle}>{renderHeadlineText()}</span>
        </div>

        <div style={glowStyle} />

        {subtitle && (
          <div
            style={{
              position: "absolute",
              top: HEADLINE_CENTER_Y + SUBTITLE_TOP_OFFSET,
              left: 0,
              width: VB_W,
              textAlign: "center",
              padding: `0 ${HEADLINE_PADDING_X}px`,
              boxSizing: "border-box",
              opacity: subtitleOpacity,
              transform: `translateY(${subtitleTranslateY}px)`,
            }}
          >
            <span
              style={{
                fontFamily: `${INTER}, sans-serif`,
                fontWeight: 400,
                fontSize: 20,
                color: "#00000088",
              }}
            >
              {subtitle}
            </span>
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

export default SplitRevealTitleScene;
