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
  headlineSingleLine = false,
  layout = "column",
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
            fontSize: headlineSingleLine ? 46 : 52,
            fontWeight: 700,
            lineHeight: 1.2,
            letterSpacing: "-0.02em",
            whiteSpace: headlineSingleLine ? "pre" : "normal",
            color: colors.textPrimary,
            opacity: headlineOpacity,
            transform: `translateY(${headlineY}px)`,
            marginBottom: 56,
          }}
        >
          {renderHeadline(headline, accentWord, accentColor)}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: layout === "row" ? "row" : "column",
            gap: layout === "row" ? 14 : 26,
          }}
        >
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
                  flex: layout === "row" ? 1 : undefined,
                  minWidth: 0,
                  minHeight: layout === "row" ? 226 : undefined,
                  flexDirection: layout === "row" ? "column" : "row",
                  alignItems: "center",
                  justifyContent: layout === "row" ? "center" : undefined,
                  gap: layout === "row" ? 18 : 24,
                  padding: layout === "row" ? "28px 16px" : "22px 28px",
                  borderRadius: 24,
                  background:
                    layout === "row"
                      ? "linear-gradient(160deg, rgba(255,255,255,0.98), rgba(2,132,199,0.08))"
                      : "rgba(0,0,0,0.04)",
                  border:
                    layout === "row"
                      ? `1.5px solid ${accentColor}44`
                      : "1px solid rgba(0,0,0,0.08)",
                  boxShadow: layout === "row" ? "0 18px 48px rgba(15,23,42,0.09)" : undefined,
                  opacity: s,
                  transform:
                    layout === "row"
                      ? `translateY(${interpolate(s, [0, 1], [30, 0])}px)`
                      : `translateX(${interpolate(s, [0, 1], [-30, 0])}px)`,
                }}
              >
                <span style={{ fontSize: layout === "row" ? 54 : 44 }}>{item.icon}</span>
                <span
                  style={{
                    fontSize: layout === "row" ? 25 : 30,
                    lineHeight: 1.25,
                    fontWeight: layout === "row" ? 750 : 500,
                    color: colors.textPrimary,
                    textAlign: layout === "row" ? "center" : "left",
                  }}
                >
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>

        {verdict && (
          <div
            style={{
              marginTop: 52,
              padding: layout === "row" ? "26px 30px" : "18px 26px",
              borderRadius: 20,
              background: `linear-gradient(90deg, ${accentColor}10, ${accentColor}22)`,
              border: `1.5px solid ${accentColor}66`,
              alignSelf: layout === "row" ? "stretch" : "flex-start",
              opacity: Math.min(verdictSpring, 1),
              transform: `scale(${interpolate(verdictSpring, [0, 1], [0.92, 1])})`,
            }}
          >
            <div
              style={{
                marginBottom: layout === "row" ? 8 : 0,
                fontSize: 15,
                fontWeight: 800,
                letterSpacing: "0.12em",
                color: colors.textDim,
                textAlign: layout === "row" ? "center" : "left",
              }}
            >
              CHẨN ĐOÁN
            </div>
            <span
              style={{
                display: "block",
                fontSize: layout === "row" ? 30 : 28,
                lineHeight: 1.25,
                fontWeight: 800,
                color: accentColor,
                textAlign: layout === "row" ? "center" : "left",
              }}
            >
              {verdict}
            </span>
          </div>
        )}
      </SafeZone>
    </AbsoluteFill>
  );
};

export default IconThreatScene;
