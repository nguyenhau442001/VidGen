import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { IconThreatSceneProps } from "../types";
import { colors, INTER } from "../styles";
import { SafeZone } from "../SafeZone";
import { AmbientBackground } from "../AmbientBackground";

const ENTER_FRAMES = 10;
const EXIT_FRAMES = 8;
const ITEMS_START = 22;
const ITEM_STAGGER = 10;

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

export const IconThreatScene: React.FC<IconThreatSceneProps> = ({
  headline,
  accentWord,
  items,
  verdict,
  accentColor = colors.cyan,
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

  const headlineOpacity = interpolate(frame, [0, ENTER_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const headlineY = interpolate(frame, [0, ENTER_FRAMES], [16, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const verdictStart = ITEMS_START + items.length * ITEM_STAGGER + 14;
  const verdictSpring = spring({
    frame: frame - verdictStart,
    fps,
    config: { stiffness: 260, damping: 20 },
    durationInFrames: 20,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg, opacity: sceneOpacity }}>
      <AmbientBackground accent={accentColor} />
      <SafeZone
        style={{ justifyContent: "center", alignItems: "stretch", flexDirection: "column", fontFamily: INTER }}
      >
        <div
          style={{
            fontSize: 52,
            fontWeight: 700,
            lineHeight: 1.2,
            letterSpacing: "-0.02em",
            color: colors.textPrimary,
            opacity: headlineOpacity,
            transform: `translateY(${headlineY}px)`,
            marginBottom: 56,
          }}
        >
          {renderHeadline(headline, accentWord, accentColor)}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          {items.map((item, i) => {
            const start = ITEMS_START + i * ITEM_STAGGER;
            const s = spring({
              frame: frame - start,
              fps,
              config: { stiffness: 280, damping: 20 },
              durationInFrames: 18,
            });
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 24,
                  padding: "22px 28px",
                  borderRadius: 20,
                  backgroundColor: "rgba(0,0,0,0.04)",
                  border: "1px solid rgba(0,0,0,0.08)",
                  opacity: s,
                  transform: `translateX(${interpolate(s, [0, 1], [-30, 0])}px)`,
                }}
              >
                <span style={{ fontSize: 44 }}>{item.icon}</span>
                <span style={{ fontSize: 30, fontWeight: 500, color: colors.textPrimary }}>{item.label}</span>
              </div>
            );
          })}
        </div>

        {verdict && (
          <div
            style={{
              marginTop: 52,
              padding: "18px 26px",
              borderRadius: 16,
              backgroundColor: `${accentColor}1a`,
              border: `1px solid ${accentColor}55`,
              alignSelf: "flex-start",
              opacity: Math.min(verdictSpring, 1),
              transform: `scale(${interpolate(verdictSpring, [0, 1], [0.92, 1])})`,
            }}
          >
            <span style={{ fontSize: 28, fontWeight: 700, color: accentColor }}>{verdict}</span>
          </div>
        )}
      </SafeZone>
    </AbsoluteFill>
  );
};

export default IconThreatScene;
