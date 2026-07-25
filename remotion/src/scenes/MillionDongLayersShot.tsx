import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { MillionDongLayersSceneProps } from "../types";
import { colors, INTER } from "../styles";
import { SafeZone } from "../SafeZone";
import { AmbientBackground } from "../AmbientBackground";
import { xanhSmBlue } from "./shared/greensmBikePalette";

const ENTER_FRAMES = 10;
const EXIT_FRAMES = 8;
const HEADLINE_ENTER = 8;
const LAYERS_START = 26;
const LAYER_STAGGER = 20;

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
      <span style={{ color: accentColor }}>{accentWord}</span>
      {after}
    </>
  );
};

export const MillionDongLayersShot: React.FC<MillionDongLayersSceneProps> = ({
  amountLabel,
  headline,
  accentWord,
  layers,
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

  const headlineOpacity = interpolate(frame, [0, HEADLINE_ENTER], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const amountSpring = spring({ frame, fps, config: { stiffness: 220, damping: 18 }, durationInFrames: 20 });

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg, opacity: sceneOpacity }}>
      <AmbientBackground accent={xanhSmBlue} />
      <SafeZone
        style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", fontFamily: INTER }}
      >
        {headline && (
          <div
            style={{
              fontSize: 46,
              fontWeight: 800,
              lineHeight: 1.2,
              textAlign: "center",
              maxWidth: 780,
              color: colors.textPrimary,
              opacity: headlineOpacity,
              marginBottom: 44,
            }}
          >
            {renderHeadline(headline, accentWord, xanhSmBlue)}
          </div>
        )}

        <div
          style={{
            width: 660,
            maxWidth: "90%",
            padding: "44px 36px",
            borderRadius: 28,
            textAlign: "center",
            backgroundColor: "rgba(14,165,233,0.06)",
            border: `2px dashed ${xanhSmBlue}88`,
            opacity: Math.min(1, amountSpring),
            transform: `scale(${0.92 + Math.min(1, amountSpring) * 0.08})`,
          }}
        >
          <div
            style={{
              fontSize: 60,
              fontWeight: 900,
              color: colors.textPrimary,
              marginBottom: 30,
              letterSpacing: "-0.01em",
            }}
          >
            {amountLabel}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {layers.map((layer, i) => {
              const start = LAYERS_START + i * LAYER_STAGGER;
              const s = spring({ frame: frame - start, fps, config: { stiffness: 260, damping: 20 }, durationInFrames: 18 });
              return (
                <div
                  key={i}
                  style={{
                    padding: "14px 22px",
                    borderRadius: 14,
                    backgroundColor: `rgba(14,165,233,${0.08 + i * 0.06})`,
                    border: `1px solid ${xanhSmBlue}55`,
                    opacity: Math.min(1, s),
                    transform: `translateY(${(1 - Math.min(1, s)) * 16}px)`,
                    fontSize: 23,
                    fontWeight: 700,
                    letterSpacing: "0.02em",
                    color: colors.textPrimary,
                  }}
                >
                  {layer.label}
                </div>
              );
            })}
          </div>
        </div>
      </SafeZone>
    </AbsoluteFill>
  );
};

export default MillionDongLayersShot;
