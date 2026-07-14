import React from "react";
import {
  AbsoluteFill,
  interpolate,
  random,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { AttackSceneProps } from "../types";
import { colors, INTER, JETBRAINS_MONO, SAFE_ZONE } from "../styles";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const BG = colors.bg;
const ACCENT_DEFAULT = "#ef4444";
const GLITCH_DEFAULT = colors.cyan;

const FLASH_FRAMES = 8; // initial full-screen punch, decays fast
const BADGE_ENTER_FRAME = 4;
const BADGE_JITTER_FRAMES = 10;
const METER_START_FRAME = 8;
const STAGE_STAGGER = 10; // frames between each stage chip locking in
const GLITCH_SETTLE_FRAMES = 8; // RGB-split duration on the headline entrance
const STATS_ENTER_EXTRA = 12; // frames between headline glitch settling and stats starting
const STAT_STAGGER = 4;
const EXIT_FRAMES = 15;

const BREACH_TOP = SAFE_ZONE.top + 90;
const HEADLINE_TOP = BREACH_TOP + 120;

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------
const hexToRgb = (hex: string): [number, number, number] => {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const rgba = (hex: string, alpha: number): string => {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// ---------------------------------------------------------------------------
// Initial flash punch — a hard radial burst that decays in the first few
// frames, replacing the calm fade-ins other scenes use. The hook window is
// the only place viewers decide whether to keep watching, so it opens loud.
// ---------------------------------------------------------------------------
const FlashPunch: React.FC<{ accent: string; frame: number }> = ({ accent, frame }) => {
  const opacity = interpolate(frame, [0, 2, FLASH_FRAMES], [0.9, 0.55, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  if (opacity <= 0) return null;
  return (
    <AbsoluteFill
      style={{
        // Normal blending (not "screen") — screen mode washes out to
        // near-invisible against a light/near-white page background, since
        // screen(lightColor, x) ≈ lightColor regardless of x.
        background: `radial-gradient(circle at 50% 38%, ${rgba(accent, 1)} 0%, ${BG} 72%)`,
        opacity,
        pointerEvents: "none",
      }}
    />
  );
};

// ---------------------------------------------------------------------------
// Scanlines — subtle throughout, gives the whole scene a compromised-feed
// texture without hurting text legibility.
// ---------------------------------------------------------------------------
const Scanlines: React.FC<{ frame: number }> = ({ frame }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      backgroundImage:
        "repeating-linear-gradient(0deg, rgba(0,0,0,0.05) 0px, rgba(0,0,0,0.05) 1px, transparent 1px, transparent 3px)",
      backgroundPositionY: `${(frame * 1.5) % 6}px`,
      opacity: 0.3,
      pointerEvents: "none",
    }}
  />
);

// ---------------------------------------------------------------------------
// Top badge — jitters in over its first frames instead of a plain slide/fade
// ---------------------------------------------------------------------------
const TopBadge: React.FC<{ text: string; accent: string; frame: number; fps: number }> = ({
  text,
  accent,
  frame,
  fps,
}) => {
  const entrance = spring({
    frame: frame - BADGE_ENTER_FRAME,
    fps,
    from: 0,
    to: 1,
    config: { stiffness: 260, damping: 18 },
    durationInFrames: 12,
  });
  const sinceEnter = frame - BADGE_ENTER_FRAME;
  const jittering = sinceEnter >= 0 && sinceEnter < BADGE_JITTER_FRAMES;
  const jitterX = jittering ? (random(`attack-badge-${frame}`) - 0.5) * 6 : 0;

  return (
    <div
      style={{
        position: "absolute",
        top: SAFE_ZONE.top + 8,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        opacity: entrance,
        transform: `translate(${jitterX}px, ${interpolate(entrance, [0, 1], [-10, 0])}px)`,
      }}
    >
      <div
        style={{
          padding: "10px 26px",
          borderRadius: 6,
          border: `1px solid ${rgba(accent, 0.6)}`,
          background: rgba(accent, 0.08),
        }}
      >
        <span
          style={{
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: "0.22em",
            color: accent,
            fontFamily: JETBRAINS_MONO,
          }}
        >
          {text}
        </span>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Breach meter — a fast-filling progress track with kill-chain stage chips
// locking in one after another, each with a flash pulse. Replaces the slow
// rotating radar sweep with something that reads as actively happening.
// ---------------------------------------------------------------------------
const BreachMeter: React.FC<{
  stages: string[];
  accent: string;
  lockFrames: number[];
  frame: number;
  fps: number;
}> = ({ stages, accent, lockFrames, frame, fps }) => {
  const lastLock = lockFrames[lockFrames.length - 1] ?? METER_START_FRAME;
  const fillProgress = interpolate(frame, [METER_START_FRAME, lastLock + 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ position: "absolute", top: BREACH_TOP, left: 80, right: 80 }}>
      <div style={{ position: "relative", height: 4, borderRadius: 2, background: "rgba(0,0,0,0.08)" }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: `${fillProgress * 100}%`,
            background: accent,
            boxShadow: `0 0 12px ${accent}`,
            borderRadius: 2,
          }}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18 }}>
        {stages.map((label, i) => {
          const lockFrame = lockFrames[i];
          const active = frame >= lockFrame;
          const pop = spring({
            frame: frame - lockFrame,
            fps,
            from: 0,
            to: 1,
            config: { stiffness: 260, damping: 14 },
            durationInFrames: 12,
          });
          const flash = interpolate(frame, [lockFrame, lockFrame + 6, lockFrame + 16], [1, 1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const align = i === 0 ? "flex-start" : i === stages.length - 1 ? "flex-end" : "center";
          return (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: align,
                opacity: active ? 1 : 0.3,
                transform: `scale(${active ? 0.9 + 0.1 * pop : 0.9})`,
              }}
            >
              <div
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  background: active ? accent : "rgba(0,0,0,0.25)",
                  boxShadow: active ? `0 0 ${6 + flash * 10}px ${accent}` : "none",
                  marginBottom: 8,
                }}
              />
              <span
                style={{
                  fontSize: 19,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  fontFamily: JETBRAINS_MONO,
                  color: active ? accent : "rgba(0,0,0,0.35)",
                }}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Headline — slams in with a brief RGB-split glitch instead of a gentle
// fade/slide, then settles clean.
// ---------------------------------------------------------------------------
const HeadlineBlock: React.FC<{
  eyebrow: string;
  headline: string;
  accent: string;
  glitchColor: string;
  enterFrame: number;
  frame: number;
  fps: number;
}> = ({ eyebrow, headline, accent, glitchColor, enterFrame, frame, fps }) => {
  const entrance = spring({
    frame: frame - enterFrame,
    fps,
    from: 0,
    to: 1,
    config: { stiffness: 200, damping: 16 },
    durationInFrames: 16,
  });
  const opacity = interpolate(frame, [enterFrame, enterFrame + 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scale = interpolate(entrance, [0, 1], [1.12, 1]);

  const sinceEnter = frame - enterFrame;
  const inGlitch = sinceEnter >= 0 && sinceEnter < GLITCH_SETTLE_FRAMES;
  const glitchMag = inGlitch ? (1 - sinceEnter / GLITCH_SETTLE_FRAMES) * 6 : 0;
  const glitchSign = random(`attack-headline-${frame}`) > 0.5 ? 1 : -1;

  const lines = headline.split("\n");
  const textStack = (color: string | null) => (
    <div>
      {lines.map((line, i) => (
        <div
          key={i}
          style={{
            fontSize: 58,
            fontWeight: i === 0 ? 800 : 400,
            lineHeight: 1.25,
            color: color ?? (i === 0 ? accent : "rgba(0,0,0,0.6)"),
            fontFamily: INTER,
          }}
        >
          {line}
        </div>
      ))}
    </div>
  );

  return (
    <div
      style={{
        position: "absolute",
        top: HEADLINE_TOP,
        left: 0,
        right: 0,
        textAlign: "center",
        padding: "0 76px",
        opacity,
      }}
    >
      <div
        style={{
          fontSize: 24,
          letterSpacing: "0.22em",
          color: "rgba(0,0,0,0.4)",
          fontFamily: INTER,
          marginBottom: 14,
        }}
      >
        {eyebrow}
      </div>
      <div style={{ position: "relative", transform: `scale(${scale})` }}>
        {inGlitch && (
          <>
            {/* "multiply" (not "screen") — screen mode washes color ghosts
                out to near-invisible against a light/near-white page. */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                transform: `translateX(${glitchMag * glitchSign}px)`,
                mixBlendMode: "multiply",
                opacity: 0.7,
              }}
            >
              {textStack(glitchColor)}
            </div>
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                transform: `translateX(${-glitchMag * glitchSign}px)`,
                mixBlendMode: "multiply",
                opacity: 0.7,
              }}
            >
              {textStack(accent)}
            </div>
          </>
        )}
        {textStack(null)}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Stats row — same bottom-anchored convention as RadarHookScene's StatsRow
// (hook captions are gated to ≤14 words, so this fixed offset stays clear of
// Caption.tsx's pill), but with a punchier staggered pop instead of one
// shared spring entrance.
// ---------------------------------------------------------------------------
const StatsRow: React.FC<{
  stats: AttackSceneProps["stats"];
  accent: string;
  glitchColor: string;
  bottom: number;
  enterFrame: number;
  frame: number;
  fps: number;
}> = ({ stats, accent, glitchColor, bottom, enterFrame, frame, fps }) => {
  return (
    <div
      style={{
        position: "absolute",
        bottom,
        left: 80,
        right: 80,
        display: "flex",
        borderRadius: 12,
        background: rgba(accent, 0.04),
        border: `1px solid ${rgba(accent, 0.15)}`,
      }}
    >
      {stats.map((stat, i) => {
        const statEnter = enterFrame + i * STAT_STAGGER;
        const pop = spring({
          frame: frame - statEnter,
          fps,
          from: 0,
          to: 1,
          config: { stiffness: 260, damping: 14 },
          durationInFrames: 14,
        });
        const opacity = interpolate(frame, [statEnter, statEnter + 6], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <div
            key={i}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              padding: "24px 12px",
              borderLeft: i > 0 ? `1px solid ${rgba(accent, 0.15)}` : "none",
              opacity,
              transform: `scale(${0.7 + 0.3 * pop})`,
            }}
          >
            <span
              style={{
                fontSize: 42,
                fontWeight: 800,
                fontFamily: INTER,
                color: stat.highlight ? glitchColor : accent,
              }}
            >
              {stat.value}
            </span>
            <span
              style={{
                fontSize: 19,
                fontFamily: INTER,
                color: "rgba(0,0,0,0.5)",
                textAlign: "center",
              }}
            >
              {stat.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export const AttackScene: React.FC<AttackSceneProps> = ({
  topicLabel,
  eyebrow,
  headline,
  stageLabels,
  stats,
  accentColor = ACCENT_DEFAULT,
  glitchColor = GLITCH_DEFAULT,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const hasExitRoom = durationInFrames > EXIT_FRAMES + 20;
  const sceneOpacity = hasExitRoom
    ? interpolate(frame, [durationInFrames - EXIT_FRAMES, durationInFrames], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 1;

  const lockFrames = stageLabels.map((_, i) => METER_START_FRAME + i * STAGE_STAGGER);
  const lastLock = lockFrames[lockFrames.length - 1] ?? METER_START_FRAME;

  // Timings flow from the meter's completion, but clamp against short
  // durations (fast TTS-driven pacing) so the headline/stats always have
  // room to land before the exit fade starts — the same defensive pattern
  // other scenes use for narration-length-driven durationInFrames.
  const headlineEnterFrame = Math.min(
    lastLock + 8,
    Math.max(METER_START_FRAME + 10, durationInFrames - 55)
  );
  const statsEnterFrame = Math.min(
    headlineEnterFrame + GLITCH_SETTLE_FRAMES + STATS_ENTER_EXTRA,
    Math.max(headlineEnterFrame + 15, durationInFrames - EXIT_FRAMES - 25)
  );

  return (
    <AbsoluteFill style={{ backgroundColor: BG, opacity: sceneOpacity, overflow: "hidden" }}>
      <Scanlines frame={frame} />
      <FlashPunch accent={accentColor} frame={frame} />

      <TopBadge text={topicLabel} accent={accentColor} frame={frame} fps={fps} />
      <BreachMeter stages={stageLabels} accent={accentColor} lockFrames={lockFrames} frame={frame} fps={fps} />
      <HeadlineBlock
        eyebrow={eyebrow}
        headline={headline}
        accent={accentColor}
        glitchColor={glitchColor}
        enterFrame={headlineEnterFrame}
        frame={frame}
        fps={fps}
      />
      <StatsRow
        stats={stats}
        accent={accentColor}
        glitchColor={glitchColor}
        bottom={SAFE_ZONE.bottom + 206}
        enterFrame={statsEnterFrame}
        frame={frame}
        fps={fps}
      />
    </AbsoluteFill>
  );
};
