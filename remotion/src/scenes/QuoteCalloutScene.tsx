import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { QuoteCalloutSceneProps } from "../types";
import { colors, colorsDark, BE_VIETNAM_PRO } from "../styles";
import { SafeZone } from "../SafeZone";

// ---------------------------------------------------------------------------
// Timing constants (frames)
// ---------------------------------------------------------------------------
const ENTER_FRAMES = 18;
const EXIT_FRAMES = 12;
const ACCENT_DELAY = 6; // accent word entrance lags the rest of the line

const ACCENT_DEFAULT = "#61dafb";
const MAX_TEXT_WIDTH = 820;

// ---------------------------------------------------------------------------
// Duration helper — pass to calculateMetadata or use as a fixed durationInFrames.
// Longer lines get more reading time on top of a fixed enter/exit + hold floor.
// ---------------------------------------------------------------------------
export function calculateQuoteCalloutDuration(text: string, fps = 30): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const readingFrames = Math.round((words / 2.6) * fps); // ~2.6 words/sec, slow for emphasis
  const hold = Math.max(fps * 1.6, readingFrames);
  return ENTER_FRAMES + hold + EXIT_FRAMES;
}

// ---------------------------------------------------------------------------
// Font-size scaling — longer lines shrink to keep wrap tidy within MAX_TEXT_WIDTH
// ---------------------------------------------------------------------------
function getFontSizeForLength(charCount: number): number {
  if (charCount <= 18) return 76;
  if (charCount <= 34) return 64;
  if (charCount <= 60) return 52;
  if (charCount <= 90) return 44;
  if (charCount <= 130) return 38;
  return 32;
}

// ---------------------------------------------------------------------------
// Slowly drifting blurred glows — subtle background motion, interpolate()-driven
// position (no CSS animation). Kept understated so it never competes with text.
// ---------------------------------------------------------------------------
const BackgroundMotion: React.FC<{
  frame: number;
  accent: string;
  backgroundStyle: "dark" | "gradient-subtle";
}> = ({ frame, accent, backgroundStyle }) => {
  // Long, slow drift cycles (30-40s) so motion reads as "alive" but never distracting
  const cycleA = interpolate(frame % 900, [0, 450, 900], [0, 1, 0]);
  const cycleB = interpolate(frame % 1180, [0, 590, 1180], [0, 1, 0]);

  const dot1X = interpolate(cycleA, [0, 1], [-50, 50]);
  const dot1Y = interpolate(cycleA, [0, 1], [-30, 30]);
  const dot2X = interpolate(cycleB, [0, 1], [40, -40]);
  const dot2Y = interpolate(cycleB, [0, 1], [50, -50]);

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {backgroundStyle === "gradient-subtle" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(circle at ${50 + cycleA * 6}% ${38 - cycleA * 4}%, ${accent}1f 0%, transparent 60%)`,
          }}
        />
      )}
      <div
        style={{
          position: "absolute",
          width: 520,
          height: 520,
          left: `calc(30% + ${dot1X}px)`,
          top: `calc(26% + ${dot1Y}px)`,
          background: `radial-gradient(circle, ${accent} 0%, transparent 70%)`,
          opacity: 0.07,
          filter: "blur(60px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 460,
          height: 460,
          left: `calc(66% + ${dot2X}px)`,
          top: `calc(70% + ${dot2Y}px)`,
          background: `radial-gradient(circle, ${accent} 0%, transparent 70%)`,
          opacity: 0.06,
          filter: "blur(70px)",
        }}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Splits text on the first accentWord match, giving that substring its own
// delayed, spring-driven "pop" in the accent color.
// ---------------------------------------------------------------------------
const QuoteText: React.FC<{
  text: string;
  accentWord?: string;
  frame: number;
  fps: number;
}> = ({ text, accentWord, frame, fps }) => {
  if (!accentWord || !text.includes(accentWord)) {
    return <>{text}</>;
  }

  const idx = text.indexOf(accentWord);
  const before = text.slice(0, idx);
  const after = text.slice(idx + accentWord.length);

  const accentScale = spring({
    frame: frame - ACCENT_DELAY,
    fps,
    from: 0.9,
    to: 1,
    config: { stiffness: 300, damping: 15 },
    durationInFrames: 18,
  });
  const accentOpacity = interpolate(
    frame,
    [ACCENT_DELAY, ACCENT_DELAY + 10],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <>
      {before}
      <span
        style={{
          color: "var(--accent-color)",
          display: "inline-block",
          opacity: accentOpacity,
          transform: `scale(${accentScale})`,
        }}
      >
        {accentWord}
      </span>
      {after}
    </>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export const QuoteCalloutScene: React.FC<QuoteCalloutSceneProps> = ({
  text,
  accentWord,
  backgroundStyle = "dark",
  accentColor,
  screenshotPath,
  icon,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const accent = accentColor ?? ACCENT_DEFAULT;

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

  // Text entrance: scale 0.85 -> 1 with a slight overshoot, opacity fades in
  const textScale = spring({
    frame,
    fps,
    from: 0.85,
    to: 1,
    config: { stiffness: 300, damping: 15 },
    durationInFrames: 24,
  });
  const textOpacity = interpolate(frame, [0, ENTER_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const fontSize = getFontSizeForLength(text.length);
  const hasScreenshot = Boolean(screenshotPath);

  const contextOpacity = interpolate(frame, [8, 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const quoteOpacity = interpolate(frame, [70, 88], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={
        {
          background:
            backgroundStyle === "gradient-subtle"
              ? `radial-gradient(circle at 50% 42%, #E8F2FF 0%, #F8FBFF 52%, ${colors.bg} 100%)`
              : colorsDark.bg,
          opacity: sceneOpacity,
          "--text-color": backgroundStyle === "dark" ? colorsDark.textPrimary : colors.textPrimary,
          "--accent-color": accent,
          "--bg-color": backgroundStyle === "dark" ? colorsDark.bg : colors.bg,
        } as React.CSSProperties
      }
    >
      <BackgroundMotion frame={frame} accent={accent} backgroundStyle={backgroundStyle} />

      <SafeZone
        style={{
          justifyContent: "center",
          alignItems: "center",
          gap: hasScreenshot ? 46 : 0,
        }}
      >
        {screenshotPath && (
          <div
            style={{
              width: 850,
              height: 720,
              overflow: "hidden",
              borderRadius: 34,
              opacity: contextOpacity,
              background: "#fff",
              border: "2px solid rgba(15, 23, 42, 0.1)",
              boxShadow: "0 24px 70px rgba(15, 23, 42, 0.16)",
            }}
          >
            <Img
              src={staticFile(screenshotPath)}
              style={{ width: "100%", height: "auto", display: "block" }}
            />
          </div>
        )}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 22,
            opacity: hasScreenshot ? quoteOpacity : textOpacity,
            transform: `scale(${textScale})`,
          }}
        >
          {icon && <div style={{ fontSize: 72 }}>{icon}</div>}
          <div
            style={{
              maxWidth: MAX_TEXT_WIDTH,
              textAlign: "center",
              textWrap: "balance",
              whiteSpace: "pre-line",
              fontFamily: BE_VIETNAM_PRO,
              fontWeight: 700,
              fontSize: hasScreenshot ? 43 : fontSize,
              lineHeight: 1.32,
              letterSpacing: "-0.01em",
              color: "var(--text-color)",
            }}
          >
            <QuoteText text={text} accentWord={accentWord} frame={frame} fps={fps} />
          </div>
        </div>
      </SafeZone>
    </AbsoluteFill>
  );
};
