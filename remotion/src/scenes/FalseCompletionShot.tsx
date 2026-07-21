import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { FalseCompletionSceneProps } from "../types";
import { SafeZone } from "../SafeZone";
import { AmbientBackground } from "../AmbientBackground";
import { BE_VIETNAM_PRO } from "../styles";
import { p2Colors } from "./grabfoodP2Palette";

// Frame plan: a large "4%" prints first (frame ~15), then "LÊN TỚI" fades in
// above it so the two read together as "up to 4%", never "4%" alone. The fee
///tax deductions then peel in one at a time as dimmed chips stacking below
// the number — no flying money, no confetti, no jackpot framing. In the
// final third the trip-completed badge and wallet-credit line settle in,
// and the headline lands at the very bottom.
export const FalseCompletionShot: React.FC<FalseCompletionSceneProps> = ({
  headline,
  completedLabel,
  driverStatusLabel,
  calculationLabels,
  sourceLabel,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const percentSpring = spring({ frame: frame - 12, fps, config: { damping: 13, stiffness: 130 }, durationInFrames: 26 });
  const upToOpacity = interpolate(frame, [45, 68], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const badgeOpacity = interpolate(frame, [durationInFrames - 170, durationInFrames - 140], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const statusOpacity = interpolate(frame, [durationInFrames - 120, durationInFrames - 90], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const headlineOpacity = interpolate(frame, [durationInFrames - 70, durationInFrames - 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const percentShrink = interpolate(frame, [durationInFrames - 170, durationInFrames - 130], [1, 0.55], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitOpacity = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: p2Colors.bg, fontFamily: BE_VIETNAM_PRO, overflow: "hidden" }}>
      <AbsoluteFill style={{ opacity: exitOpacity }}>
        <AmbientBackground accent={p2Colors.grab} />

        <SafeZone style={{ justifyContent: "flex-start", alignItems: "center", flexDirection: "column", paddingTop: 200 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              transform: `scale(${percentShrink})`,
              transformOrigin: "top center",
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 4, color: p2Colors.grab, opacity: upToOpacity, marginBottom: 8 }}>
              LÊN TỚI
            </div>
            <div
              style={{
                fontSize: 130,
                fontWeight: 900,
                color: p2Colors.textPrimary,
                opacity: Math.min(1, percentSpring),
                transform: `scale(${Math.min(1, percentSpring)})`,
                lineHeight: 1,
              }}
            >
              4%
            </div>
          </div>

          {calculationLabels && calculationLabels.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center", marginTop: 32 }}>
              {calculationLabels.map((label, i) => {
                const start = 90 + i * 22;
                const rowSpring = spring({ frame: frame - start, fps, config: { damping: 15, stiffness: 170 }, durationInFrames: 20 });
                return (
                  <div
                    key={i}
                    style={{
                      opacity: Math.min(1, rowSpring),
                      transform: `translateY(${(1 - Math.min(1, rowSpring)) * 10}px)`,
                      padding: "8px 18px",
                      borderRadius: 999,
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.14)",
                      fontSize: 15,
                      fontWeight: 700,
                      color: p2Colors.textDim,
                      letterSpacing: 0.4,
                    }}
                  >
                    {label}
                  </div>
                );
              })}
            </div>
          )}

          <div
            style={{
              opacity: badgeOpacity,
              marginTop: 56,
              padding: "16px 30px",
              borderRadius: 18,
              background: p2Colors.grabDim,
              border: `2px solid ${p2Colors.grab}`,
              fontSize: 22,
              fontWeight: 900,
              color: p2Colors.textPrimary,
              textAlign: "center",
            }}
          >
            {completedLabel}
          </div>
          <div
            style={{
              opacity: statusOpacity,
              marginTop: 16,
              fontSize: 17,
              fontWeight: 700,
              color: p2Colors.grab,
              textAlign: "center",
              maxWidth: 560,
            }}
          >
            {driverStatusLabel}
          </div>
        </SafeZone>

        <div
          style={{
            position: "absolute",
            left: 60,
            right: 60,
            bottom: sourceLabel ? 130 : 70,
            textAlign: "center",
            fontSize: 26,
            fontWeight: 800,
            lineHeight: 1.3,
            color: p2Colors.textPrimary,
            opacity: headlineOpacity,
          }}
        >
          {headline}
        </div>
        {sourceLabel && (
          <div
            style={{
              position: "absolute",
              left: 60,
              right: 60,
              bottom: 56,
              textAlign: "center",
              fontSize: 14,
              fontWeight: 600,
              color: p2Colors.textDim,
              opacity: headlineOpacity,
            }}
          >
            {sourceLabel}
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default FalseCompletionShot;
