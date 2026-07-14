import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, INTER, JETBRAINS_MONO } from "../styles";

// ---------------------------------------------------------------------------
// Virtual canvas — 750x1080 portrait, "contain" fit inside the real
// composition, matching the other scenes' conventions.
// ---------------------------------------------------------------------------
const VB_W = 750;
const VB_H = 1080;
const BG = colors.bg;

const QUESTION_TOP = 180;
const QUESTION_W = 680;
const QUESTION_H = 120;
const QUESTION_LEFT = (VB_W - QUESTION_W) / 2;
const QUESTION_RADIUS = 16;
const QUESTION_BORDER = "1px solid #00000022";
const QUESTION_BG = "#00000006";
const QUESTION_FONT_BASE = 22;
const QUESTION_FONT_MIN = 18;
const QUESTION_FONT_THRESHOLD = 60; // chars

const OPTIONS_TOP_GAP = 30;
const OPTION_W = 680;
const OPTION_H = 72;
const OPTION_GAP = 16;
const OPTION_LEFT = (VB_W - OPTION_W) / 2;
const OPTION_RADIUS = 12;

const OPTION_BG_BASE = "#00000004";
const OPTION_BG_CORRECT = `${colors.green}18`;
const OPTION_BORDER_BASE = "#00000018";
const OPTION_BORDER_CORRECT = `${colors.green}ff`;
const LABEL_PREFIX_COLOR = "#00000044";
const TEXT_COLOR_BASE = "#000000e6";
const TEXT_COLOR_CORRECT = `${colors.green}ff`;
const INCORRECT_MIN_OPACITY = 0.35;

const QUESTION_BOUNCE_FRAMES = 20;
const OPTION_SLIDE_STAGGER = 12;
const OPTION_SLIDE_DISTANCE = 40;

const REVEAL_TRANSITION_FRAMES = 15;
const CORRECT_BOUNCE_UP_FRAMES = 7;
const CORRECT_BOUNCE_DOWN_FRAMES = REVEAL_TRANSITION_FRAMES - CORRECT_BOUNCE_UP_FRAMES;

const CONFETTI_START_OFFSET = REVEAL_TRANSITION_FRAMES; // burst starts at revealFrame+15
const CONFETTI_DURATION = 30; // burst ends at revealFrame+45
const CONFETTI_COUNT = 20;
const CONFETTI_COLORS = [colors.green, colors.cyan, "#ffd700", colors.errorRed];
const CONFETTI_MIN_DIST = 80;
const CONFETTI_DIST_RANGE = 80; // total travel distance 80-160px
const CONFETTI_MIN_SIZE = 6;
const CONFETTI_SIZE_RANGE = 4; // diameter 6-10px

export type QuizOption = {
  label: string;
  correct: boolean;
};

export type QuizPopSceneProps = {
  question: string;
  options: QuizOption[];
  revealFrame: number;
  durationInFrames: number;
};

// Deterministic per-index pseudo-random in [0, 1) — keeps confetti particle
// identity (angle/speed/size/color) stable across every frame, since only
// `seed` (particle index) varies it, never `frame`.
const seededRandom = (seed: number): number => {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

type Rgba = { r: number; g: number; b: number; a: number };

const parseHex = (hex: string): Rgba => {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const a = clean.length >= 8 ? parseInt(clean.slice(6, 8), 16) / 255 : 1;
  return { r, g, b, a };
};

const mixHex = (hexA: string, hexB: string, t: number): string => {
  const a = parseHex(hexA);
  const b = parseHex(hexB);
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bl = Math.round(a.b + (b.b - a.b) * t);
  const al = a.a + (b.a - a.a) * t;
  return `rgba(${r}, ${g}, ${bl}, ${al})`;
};

const optionTop = (index: number): number =>
  QUESTION_TOP + QUESTION_H + OPTIONS_TOP_GAP + index * (OPTION_H + OPTION_GAP);

const questionFontSize = (question: string): number => {
  if (question.length <= QUESTION_FONT_THRESHOLD) return QUESTION_FONT_BASE;
  return Math.max(
    QUESTION_FONT_MIN,
    Math.round(QUESTION_FONT_BASE * (QUESTION_FONT_THRESHOLD / question.length))
  );
};

type ConfettiParticle = {
  angle: number;
  distance: number;
  size: number;
  color: string;
};

const buildConfettiParticles = (): ConfettiParticle[] =>
  Array.from({ length: CONFETTI_COUNT }, (_, i) => {
    const angle = seededRandom(i * 4 + 1) * Math.PI * 2;
    const distance = CONFETTI_MIN_DIST + seededRandom(i * 4 + 2) * CONFETTI_DIST_RANGE;
    const size = CONFETTI_MIN_SIZE + seededRandom(i * 4 + 3) * CONFETTI_SIZE_RANGE;
    const color = CONFETTI_COLORS[Math.floor(seededRandom(i * 4 + 4) * CONFETTI_COLORS.length) % CONFETTI_COLORS.length];
    return { angle, distance, size, color };
  });

const CONFETTI_PARTICLES = buildConfettiParticles();

const QuizPopScene: React.FC<QuizPopSceneProps> = ({
  question,
  options,
  revealFrame,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  void durationInFrames;

  const scale = Math.min(width / VB_W, height / VB_H);
  const scaledWidth = VB_W * scale;
  const scaledHeight = VB_H * scale;
  const leftOffset = (width - scaledWidth) / 2;
  const topOffset = (height - scaledHeight) / 2;

  const questionScale = spring({
    frame,
    fps,
    from: 0.85,
    to: 1,
    durationInFrames: QUESTION_BOUNCE_FRAMES,
    config: { damping: 10 },
  });

  const revealProgress = interpolate(
    frame,
    [revealFrame, revealFrame + REVEAL_TRANSITION_FRAMES],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const correctIndex = options.findIndex((o) => o.correct);
  const confettiOriginX = OPTION_LEFT + OPTION_W / 2;
  const confettiOriginY =
    correctIndex >= 0 ? optionTop(correctIndex) + OPTION_H / 2 : 0;

  const burstStart = revealFrame + CONFETTI_START_OFFSET;
  const burstEnd = burstStart + CONFETTI_DURATION;
  const showConfetti = correctIndex >= 0 && frame >= burstStart;
  const confettiT = interpolate(frame, [burstStart, burstEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

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
        <div
          style={{
            position: "absolute",
            top: QUESTION_TOP,
            left: QUESTION_LEFT,
            width: QUESTION_W,
            height: QUESTION_H,
            borderRadius: QUESTION_RADIUS,
            border: QUESTION_BORDER,
            background: QUESTION_BG,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            boxSizing: "border-box",
            transform: `scale(${questionScale})`,
            transformOrigin: "center center",
          }}
        >
          <span
            style={{
              fontFamily: `${INTER}, sans-serif`,
              fontWeight: 600,
              fontSize: questionFontSize(question),
              color: colors.textPrimary,
              textAlign: "center",
              lineHeight: 1.3,
            }}
          >
            {question}
          </span>
        </div>

        {options.map((option, i) => {
          const letter = String.fromCharCode(65 + i);
          const slideStart = QUESTION_BOUNCE_FRAMES + i * OPTION_SLIDE_STAGGER;
          const slideLocal = Math.max(0, frame - slideStart);
          const translateX = spring({
            frame: slideLocal,
            fps,
            from: OPTION_SLIDE_DISTANCE,
            to: 0,
            config: { damping: 14 },
          });

          let cardScale = 1;
          let bg: string = OPTION_BG_BASE;
          let borderColor: string = OPTION_BORDER_BASE;
          let borderWidth = 1;
          let textColor: string = TEXT_COLOR_BASE;
          let cardOpacity = 1;

          if (option.correct) {
            bg = mixHex(OPTION_BG_BASE, OPTION_BG_CORRECT, revealProgress);
            borderColor = mixHex(OPTION_BORDER_BASE, OPTION_BORDER_CORRECT, revealProgress);
            borderWidth = interpolate(revealProgress, [0, 1], [1, 2]);
            textColor = mixHex(TEXT_COLOR_BASE, TEXT_COLOR_CORRECT, revealProgress);

            const revealLocal = Math.max(0, frame - revealFrame);
            const bounceUp = spring({
              frame: revealLocal,
              fps,
              from: 1,
              to: 1.03,
              durationInFrames: CORRECT_BOUNCE_UP_FRAMES,
              config: { damping: 10 },
            });
            const bounceDown = spring({
              frame: Math.max(0, revealLocal - CORRECT_BOUNCE_UP_FRAMES),
              fps,
              from: 1.03,
              to: 1,
              durationInFrames: CORRECT_BOUNCE_DOWN_FRAMES,
              config: { damping: 10 },
            });
            cardScale = revealLocal < CORRECT_BOUNCE_UP_FRAMES ? bounceUp : bounceDown;
          } else if (frame >= revealFrame) {
            cardOpacity = interpolate(
              frame,
              [revealFrame, revealFrame + REVEAL_TRANSITION_FRAMES],
              [1, INCORRECT_MIN_OPACITY],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            );
          }

          return (
            <div
              key={i}
              style={{
                position: "absolute",
                top: optionTop(i),
                left: OPTION_LEFT,
                width: OPTION_W,
                height: OPTION_H,
                borderRadius: OPTION_RADIUS,
                border: `${borderWidth}px solid ${borderColor}`,
                background: bg,
                opacity: cardOpacity,
                transform: `translateX(${translateX}px) scale(${cardScale})`,
                transformOrigin: "center center",
                display: "flex",
                alignItems: "center",
                padding: "0 24px",
                boxSizing: "border-box",
              }}
            >
              <span
                style={{
                  fontFamily: `${JETBRAINS_MONO}, monospace`,
                  fontWeight: 500,
                  fontSize: 18,
                  color: LABEL_PREFIX_COLOR,
                  marginRight: 12,
                }}
              >
                {letter}.
              </span>
              <span
                style={{
                  fontFamily: `${INTER}, sans-serif`,
                  fontWeight: 500,
                  fontSize: 18,
                  color: textColor,
                }}
              >
                {option.label}
              </span>
            </div>
          );
        })}

        {showConfetti && (
          <svg
            width={VB_W}
            height={VB_H}
            style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
          >
            {CONFETTI_PARTICLES.map((p, i) => {
              const dx = Math.cos(p.angle) * p.distance * confettiT;
              const dy = Math.sin(p.angle) * p.distance * confettiT;
              const opacity = 1 - confettiT;
              return (
                <circle
                  key={i}
                  cx={confettiOriginX + dx}
                  cy={confettiOriginY + dy}
                  r={p.size / 2}
                  fill={p.color}
                  opacity={opacity}
                />
              );
            })}
          </svg>
        )}
      </div>
    </AbsoluteFill>
  );
};

export default QuizPopScene;
