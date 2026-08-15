import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { GameHUDSceneProps } from "../types";
import { colors, INTER, type as t } from "../styles";
import { SafeZone } from "../SafeZone";
import { AmbientBackground } from "../AmbientBackground";

const LockIcon: React.FC<{ locked: boolean; color: string }> = ({ locked, color }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <rect x="5" y="11" width="14" height="9" rx="2" stroke={color} strokeWidth="2" />
    {locked ? (
      <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke={color} strokeWidth="2" fill="none" />
    ) : (
      <path d="M8 11V7a4 4 0 0 1 7.5-1.8" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
    )}
  </svg>
);

// ---------------------------------------------------------------------------
// GameHUDScene — renders the driver's job as a literal RPG-style HUD: a rank
// badge, a chunky XP/quest bar, and a row of perk nodes that light up as
// "unlocked" or stay dimmed as "locked". This is the visual home for the
// "job becomes a game" thesis — concrete game furniture instead of an
// abstract stacked-layers diagram.
//
// Frame plan:
//   0–14        badge + headline fade/scale in
//   14–44       XP bar fills from 0 → progress ratio
//   44 + i*16   perk node i pops in (spring), left to right
//   after last  verdict caption fades in
// ---------------------------------------------------------------------------
const ENTER_FRAMES = 14;
const EXIT_FRAMES = 10;
const BAR_FILL_START = 14;
const BAR_FILL_DURATION = 30;
const PERK_START = 48;
const PERK_STAGGER = 16;

export const GameHUDScene: React.FC<GameHUDSceneProps> = ({
  headline,
  accentWord,
  rankLabel,
  rankTier,
  progressLabel,
  progressCurrent,
  progressTarget,
  perks,
  verdict,
  accentColor = colors.green,
  durationInFrames,
}) => {
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

  const badgeSpring = spring({
    frame,
    fps,
    config: { stiffness: 260, damping: 20 },
    durationInFrames: ENTER_FRAMES,
  });

  const headlineOpacity = interpolate(frame, [0, ENTER_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const ratio = progressTarget > 0 ? Math.min(1, progressCurrent / progressTarget) : 0;
  const barFill = interpolate(frame, [BAR_FILL_START, BAR_FILL_START + BAR_FILL_DURATION], [0, ratio], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const displayCurrent = Math.round(
    interpolate(frame, [BAR_FILL_START, BAR_FILL_START + BAR_FILL_DURATION], [0, progressCurrent], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );

  const perksDoneAt = PERK_START + perks.length * PERK_STAGGER;
  const verdictSpring = spring({
    frame: frame - (perksDoneAt + 10),
    fps,
    config: { stiffness: 260, damping: 20 },
    durationInFrames: 18,
  });

  const renderHeadline = (): React.ReactNode => {
    if (!accentWord) return <>{headline}</>;
    const index = headline.indexOf(accentWord);
    if (index === -1) return <>{headline}</>;
    return (
      <>
        {headline.slice(0, index)}
        <span style={{ color: accentColor, textShadow: `0 0 12px ${accentColor}` }}>{accentWord}</span>
        {headline.slice(index + accentWord.length)}
      </>
    );
  };

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg, opacity: sceneOpacity }}>
      <AmbientBackground accent={accentColor} />
      <SafeZone style={{ justifyContent: "center", flexDirection: "column", fontFamily: INTER }}>
        {/* Rank badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            opacity: badgeSpring,
            transform: `scale(${interpolate(badgeSpring, [0, 1], [0.85, 1])})`,
            marginBottom: 28,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: `${accentColor}22`,
              border: `2px solid ${accentColor}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 0 18px ${accentColor}55`,
            }}
          >
            <span style={{ fontSize: 28, fontWeight: 800, color: accentColor }}>{rankTier}</span>
          </div>
          <span
            style={{
              ...t.label,
              color: accentColor,
            }}
          >
            {rankLabel}
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            lineHeight: 1.2,
            letterSpacing: "-0.02em",
            color: colors.textPrimary,
            opacity: headlineOpacity,
            marginBottom: 44,
          }}
        >
          {renderHeadline()}
        </div>

        {/* XP / quest bar */}
        <div style={{ marginBottom: 48 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 10,
              fontSize: 22,
              fontWeight: 600,
              color: colors.textPrimary,
            }}
          >
            <span>{progressLabel}</span>
            <span style={{ color: accentColor, fontWeight: 800 }}>
              {displayCurrent}/{progressTarget}
            </span>
          </div>
          <div
            style={{
              height: 22,
              borderRadius: 11,
              backgroundColor: "rgba(0,0,0,0.08)",
              border: "1px solid rgba(0,0,0,0.12)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${barFill * 100}%`,
                background: `linear-gradient(90deg, ${accentColor}aa, ${accentColor})`,
                borderRadius: 11,
              }}
            />
          </div>
        </div>

        {/* Perk nodes */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {perks.map((perk, i) => {
            const start = PERK_START + i * PERK_STAGGER;
            const s = spring({
              frame: frame - start,
              fps,
              config: { stiffness: 280, damping: 20 },
              durationInFrames: 16,
            });
            const unlocked = perk.unlocked;
            return (
              <div
                key={i}
                style={{
                  flexBasis: "calc(50% - 8px)",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "16px 18px",
                  borderRadius: 14,
                  backgroundColor: unlocked ? `${accentColor}14` : "rgba(0,0,0,0.04)",
                  border: unlocked ? `1px solid ${accentColor}66` : "1px solid rgba(0,0,0,0.1)",
                  opacity: Math.min(s, 1) * (unlocked ? 1 : 0.55),
                  transform: `scale(${interpolate(s, [0, 1], [0.9, 1])})`,
                }}
              >
                <LockIcon locked={!unlocked} color={unlocked ? accentColor : colors.textDim} />
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    color: unlocked ? colors.textPrimary : colors.textDim,
                  }}
                >
                  {perk.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Verdict */}
        {verdict && (
          <div
            style={{
              marginTop: 40,
              padding: "18px 26px",
              borderRadius: 16,
              backgroundColor: `${accentColor}1a`,
              border: `1px solid ${accentColor}55`,
              alignSelf: "flex-start",
              opacity: Math.min(verdictSpring, 1),
              transform: `scale(${interpolate(verdictSpring, [0, 1], [0.92, 1])})`,
            }}
          >
            <span style={{ fontSize: 26, fontWeight: 700, color: accentColor }}>{verdict}</span>
          </div>
        )}
      </SafeZone>
    </AbsoluteFill>
  );
};

export default GameHUDScene;
