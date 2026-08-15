import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ProductDiscountStackSceneProps } from "../types";
import { colors, colorsDark, BE_VIETNAM_PRO } from "../styles";
import { SafeZone } from "../SafeZone";
import { AmbientBackground } from "../AmbientBackground";

// A concrete worked example (real product, real ticking price) instead of an
// abstract list of layer names — each step's label pops in beside the price
// as it drops, the old price shows struck-through and shrinking above it.
const STEP_DURATION = 42;
const STEP_GAP_FRAMES = 6;

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

export const ProductDiscountStackShot: React.FC<ProductDiscountStackSceneProps> = ({
  headline,
  accentWord,
  productIcon,
  productName,
  steps,
  freeshipLabel,
  accentColor,
  theme = "dark",
  startSettled,
  durationInFrames,
}) => {
  const palette = theme === "dark" ? colorsDark : colors;
  const accent = accentColor ?? "#EE4D2D";
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headlineOpacity = interpolate(frame, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const exitOpacity = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const cardStart = 20;
  const stepStart = (i: number) => cardStart + 14 + i * (STEP_DURATION + STEP_GAP_FRAMES);
  const activeIndex = startSettled
    ? steps.length - 1
    : Math.max(
        0,
        steps.findIndex((_, i) => frame < stepStart(i + 1) || i === steps.length - 1)
      );
  const current = steps[Math.min(activeIndex, steps.length - 1)];
  const previous = activeIndex > 0 ? steps[activeIndex - 1] : null;
  const stepFrame = startSettled ? 999 : frame - stepStart(activeIndex);
  const priceSpring = startSettled
    ? 1
    : spring({ frame: stepFrame, fps, config: { stiffness: 260, damping: 20 }, durationInFrames: 16 });
  const labelSpring = startSettled
    ? 1
    : spring({ frame: stepFrame - 4, fps, config: { stiffness: 260, damping: 18 }, durationInFrames: 16 });

  const freeshipStart = stepStart(steps.length - 1) + STEP_DURATION;
  const freeshipSpring = startSettled
    ? 1
    : spring({
        frame: frame - freeshipStart,
        fps,
        config: { stiffness: 300, damping: 14 },
        durationInFrames: 18,
      });

  return (
    <AbsoluteFill style={{ backgroundColor: palette.bg, fontFamily: BE_VIETNAM_PRO, overflow: "hidden" }}>
      <AbsoluteFill style={{ opacity: exitOpacity }}>
        <AmbientBackground accent={accent} />
        <SafeZone style={{ justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 40,
              fontWeight: 800,
              lineHeight: 1.2,
              textAlign: "center",
              maxWidth: 820,
              color: palette.textPrimary,
              opacity: headlineOpacity,
              marginBottom: 50,
            }}
          >
            {renderHeadline(headline, accentWord, accent)}
          </div>

          <div
            style={{
              width: 620,
              maxWidth: "90%",
              borderRadius: 28,
              padding: "36px 32px",
              background: "rgba(255,255,255,0.045)",
              border: `1.5px solid ${accent}55`,
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 120,
                height: 120,
                margin: "0 auto 20px",
                borderRadius: 20,
                background: `${accent}1f`,
                border: `1.5px solid ${accent}66`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 60,
              }}
            >
              {productIcon}
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: palette.textDim, marginBottom: 22 }}>{productName}</div>

            {previous && (
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 600,
                  color: palette.textDim,
                  textDecoration: "line-through",
                  marginBottom: 6,
                }}
              >
                {previous.price}
              </div>
            )}

            <div
              style={{
                fontSize: 54,
                fontWeight: 900,
                color: "#fff",
                opacity: Math.min(1, priceSpring),
                transform: `scale(${interpolate(priceSpring, [0, 1], [0.85, 1])})`,
              }}
            >
              {current.price}
            </div>

            <div
              style={{
                marginTop: 18,
                display: "inline-block",
                padding: "10px 24px",
                borderRadius: 999,
                background: accent,
                color: "#fff",
                fontSize: 20,
                fontWeight: 800,
                opacity: Math.min(1, labelSpring),
                transform: `translateY(${(1 - Math.min(1, labelSpring)) * 10}px)`,
                boxShadow: `0 0 24px ${accent}88`,
              }}
            >
              {current.label}
            </div>
          </div>

          {freeshipLabel && (
            <div
              style={{
                marginTop: 28,
                padding: "12px 28px",
                borderRadius: 999,
                background: "rgba(34,197,94,0.16)",
                border: "2px solid #22C55E",
                color: "#22C55E",
                fontSize: 22,
                fontWeight: 900,
                opacity: Math.min(1, freeshipSpring),
                transform: `scale(${interpolate(freeshipSpring, [0, 1], [0.8, 1])})`,
                boxShadow: "0 0 30px rgba(34,197,94,0.5)",
              }}
            >
              {freeshipLabel}
            </div>
          )}
        </SafeZone>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default ProductDiscountStackShot;
