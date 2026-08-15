import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ScanAnimationSceneProps } from "../types";
import { colors, colorsDark, INTER, JETBRAINS_MONO } from "../styles";
import { SafeZone } from "../SafeZone";
import { AmbientBackground } from "../AmbientBackground";

const ENTER_FRAMES = 10;
const EXIT_FRAMES = 8;
const SCAN_START = 20;
const SCAN_DURATION = 60;
const TARGET_STAGGER = 14;

const MONTH_LABELS = [
  "", "T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12",
];

const daysInMonth = (month: number) => {
  if (month === 2) return 28;
  if ([4, 6, 9, 11].includes(month)) return 30;
  return 31;
};

const parseTarget = (target: string): { month: number; day: number } => {
  const [monthPart, dayPart] = target.split(".").map((v) => parseInt(v, 10));
  return { month: monthPart || 1, day: dayPart || monthPart || 1 };
};

const CalendarCard: React.FC<{
  target: string;
  index: number;
  frame: number;
  fps: number;
  startFrame: number;
  accentColor: string;
  emoji?: string;
}> = ({ target, index, frame, fps, startFrame, accentColor, emoji }) => {
  const { month, day } = parseTarget(target);
  const total = daysInMonth(month);
  const cols = 7;
  const rows = Math.ceil(total / cols);

  const enter = spring({ frame: frame - startFrame, fps, config: { stiffness: 220, damping: 20 }, durationInFrames: 20 });
  const highlightStart = startFrame + 14;
  const highlightPop = spring({
    frame: frame - highlightStart,
    fps,
    config: { stiffness: 300, damping: 12 },
    durationInFrames: 18,
  });

  return (
    <div
      style={{
        position: "relative",
        opacity: Math.min(1, enter),
        transform: `translateY(${(1 - Math.min(1, enter)) * 20}px) scale(${interpolate(enter, [0, 1], [0.9, 1])})`,
        width: 170,
        borderRadius: 16,
        padding: "14px 12px",
        background: "rgba(255,255,255,0.045)",
        border: `1px solid ${accentColor}44`,
      }}
    >
      {emoji && (
        <div
          style={{
            position: "absolute",
            top: -14,
            right: -10,
            fontSize: 26,
            transform: `scale(${Math.min(1, highlightPop)}) rotate(${interpolate(highlightPop, [0, 1], [-20, 0])}deg)`,
            filter: `drop-shadow(0 0 8px ${accentColor}aa)`,
          }}
        >
          {emoji}
        </div>
      )}
      <div
        style={{
          fontSize: 13,
          fontWeight: 800,
          letterSpacing: 1,
          color: accentColor,
          textAlign: "center",
          marginBottom: 8,
        }}
      >
        THÁNG {month}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 3 }}>
        {Array.from({ length: rows * cols }, (_, i) => {
          const dayNum = i + 1;
          const isTarget = dayNum === day;
          const inMonth = dayNum <= total;
          const pop = isTarget ? Math.min(1, highlightPop) : 0;
          return (
            <div
              key={i}
              style={{
                aspectRatio: "1",
                borderRadius: 4,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 9,
                fontWeight: isTarget ? 900 : 500,
                color: isTarget ? "#fff" : "rgba(255,255,255,0.35)",
                backgroundColor: isTarget ? accentColor : "rgba(255,255,255,0.04)",
                boxShadow: isTarget ? `0 0 ${8 + pop * 10}px ${accentColor}` : "none",
                transform: isTarget ? `scale(${1 + pop * 0.35})` : "scale(1)",
                visibility: inMonth ? "visible" : "hidden",
              }}
            >
              {inMonth ? dayNum : ""}
            </div>
          );
        })}
      </div>
      <div
        style={{
          marginTop: 10,
          textAlign: "center",
          fontSize: 20,
          fontWeight: 900,
          color: accentColor,
          opacity: Math.min(1, highlightPop),
        }}
      >
        {target}
      </div>
    </div>
  );
};

const SpecialCard: React.FC<{
  icon: string;
  title: string;
  subtitle?: string;
  frame: number;
  fps: number;
  startFrame: number;
  accentColor: string;
}> = ({ icon, title, subtitle, frame, fps, startFrame, accentColor }) => {
  const enter = spring({ frame: frame - startFrame, fps, config: { stiffness: 220, damping: 18 }, durationInFrames: 20 });
  const pop = spring({ frame: frame - startFrame - 10, fps, config: { stiffness: 300, damping: 12 }, durationInFrames: 18 });
  return (
    <div
      style={{
        opacity: Math.min(1, enter),
        transform: `translateY(${(1 - Math.min(1, enter)) * 20}px) scale(${interpolate(enter, [0, 1], [0.9, 1])})`,
        width: 170,
        borderRadius: 16,
        padding: "18px 12px",
        background: `${accentColor}1a`,
        border: `1.5px solid ${accentColor}88`,
        textAlign: "center",
        boxShadow: `0 0 ${20 + Math.min(1, pop) * 20}px ${accentColor}55`,
      }}
    >
      <div style={{ fontSize: 40, transform: `scale(${1 + Math.min(1, pop) * 0.25})` }}>{icon}</div>
      <div style={{ marginTop: 8, fontSize: 15, fontWeight: 900, color: accentColor, lineHeight: 1.25 }}>{title}</div>
      {subtitle && (
        <div style={{ marginTop: 4, fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.55)" }}>{subtitle}</div>
      )}
    </div>
  );
};

const renderHeadline = (
  headline: string,
  accentWord: string | undefined,
  accentColor: string
): React.ReactNode => {
  if (!accentWord) return <>{headline}</>;
  const index = headline.indexOf(accentWord);
  if (index === -1) return <>{headline}</>;
  const before = headline.slice(0, index);
  const after = headline.slice(index + accentWord.length);
  return (
    <>
      {before}
      <span style={{ color: accentColor, textShadow: `0 0 12px ${accentColor}` }}>{accentWord}</span>
      {after}
    </>
  );
};

export const ScanAnimationScene: React.FC<ScanAnimationSceneProps> = ({
  headline,
  accentWord,
  scanLabel,
  targets,
  result,
  note,
  accentColor: rawAccentColor,
  calendarMode,
  cardEmojis,
  extraCards,
  emojiRow,
  cardStagger,
  theme = "light",
  durationInFrames,
}) => {
  const stagger = cardStagger ?? TARGET_STAGGER;
  const palette = theme === "dark" ? colorsDark : colors;
  const accentColor = rawAccentColor ?? palette.cyan;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const hasExitRoom = durationInFrames > ENTER_FRAMES + EXIT_FRAMES;
  const sceneOpacity = interpolate(
    frame,
    hasExitRoom
      ? [0, ENTER_FRAMES, durationInFrames - EXIT_FRAMES, durationInFrames]
      : [0, durationInFrames],
    hasExitRoom ? [0, 1, 1, 0] : [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const headlineOpacity = interpolate(frame, [0, ENTER_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const GRID_H = 420;
  const scanY = interpolate(frame, [SCAN_START, SCAN_START + SCAN_DURATION], [0, GRID_H], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scanOpacity = interpolate(
    frame,
    [SCAN_START, SCAN_START + 6, SCAN_START + SCAN_DURATION - 6, SCAN_START + SCAN_DURATION],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const targetsStart = calendarMode ? 10 : (SCAN_START + SCAN_DURATION - 20);
  const totalCards = targets.length + (extraCards?.length ?? 0);
  const resultStart = targetsStart + totalCards * stagger + 10;
  const resultSpring = spring({
    frame: frame - resultStart,
    fps,
    config: { stiffness: 260, damping: 20 },
    durationInFrames: 20,
  });
  const noteOpacity = interpolate(frame, [resultStart + 20, resultStart + 34], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: palette.bg, opacity: sceneOpacity }}>
      <AmbientBackground accent={accentColor} />
      <SafeZone
        style={{ justifyContent: "center", alignItems: "stretch", flexDirection: "column", fontFamily: INTER }}
      >
        {emojiRow && (
          <div style={{ fontSize: 34, opacity: headlineOpacity, marginBottom: 10, letterSpacing: "0.1em" }}>
            {emojiRow}
          </div>
        )}

        <div
          style={{
            fontSize: 44,
            fontWeight: 700,
            lineHeight: 1.2,
            letterSpacing: "-0.02em",
            color: palette.textPrimary,
            opacity: headlineOpacity,
            marginBottom: 40,
          }}
        >
          {renderHeadline(headline, accentWord, accentColor)}
        </div>

        <div
          style={{
            fontFamily: `${JETBRAINS_MONO}, monospace`,
            fontSize: 16,
            fontWeight: 600,
            color: accentColor,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: 18,
          }}
        >
          {scanLabel}
        </div>

        {calendarMode ? (
          <div style={{ display: "flex", gap: 18, justifyContent: "center", flexWrap: "wrap" }}>
            {targets.map((target, i) => (
              <CalendarCard
                key={target}
                target={target}
                index={i}
                frame={frame}
                fps={fps}
                startFrame={targetsStart + i * stagger}
                accentColor={accentColor}
                emoji={cardEmojis?.[i]}
              />
            ))}
            {extraCards?.map((card, i) => (
              <SpecialCard
                key={card.title}
                icon={card.icon}
                title={card.title}
                subtitle={card.subtitle}
                frame={frame}
                fps={fps}
                startFrame={targetsStart + (targets.length + i) * stagger}
                accentColor={accentColor}
              />
            ))}
          </div>
        ) : (
          <>
            <div
              style={{
                position: "relative",
                height: GRID_H,
                borderRadius: 16,
                overflow: "hidden",
                border: `1px solid ${accentColor}33`,
                backgroundImage:
                  "linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)",
                backgroundSize: "36px 36px",
                backgroundColor: "rgba(0,0,0,0.02)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: scanY,
                  left: 0,
                  right: 0,
                  height: 3,
                  backgroundColor: accentColor,
                  boxShadow: `0 0 20px 4px ${accentColor}aa`,
                  opacity: scanOpacity,
                }}
              />
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 26 }}>
              {targets.map((target, i) => {
                const start = targetsStart + i * stagger;
                const s = spring({ frame: frame - start, fps, config: { stiffness: 300, damping: 20 }, durationInFrames: 14 });
                return (
                  <div
                    key={i}
                    style={{
                      padding: "10px 20px",
                      borderRadius: 999,
                      backgroundColor: `${accentColor}1a`,
                      border: `1px solid ${accentColor}55`,
                      opacity: s,
                      transform: `scale(${interpolate(s, [0, 1], [0.8, 1])})`,
                    }}
                  >
                    <span style={{ fontSize: 18, fontWeight: 600, color: accentColor }}>{target}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div
          style={{
            marginTop: 34,
            fontSize: 28,
            fontWeight: 700,
            color: palette.textPrimary,
            opacity: Math.min(resultSpring, 1),
            transform: `translateY(${interpolate(resultSpring, [0, 1], [12, 0])}px)`,
          }}
        >
          {result}
        </div>

        {note && (
          <div style={{ marginTop: 14, fontSize: 20, fontWeight: 400, color: palette.textDim, opacity: noteOpacity }}>
            {note}
          </div>
        )}
      </SafeZone>
    </AbsoluteFill>
  );
};

export default ScanAnimationScene;
