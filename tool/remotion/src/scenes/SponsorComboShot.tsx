import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { SponsorComboSceneProps } from "../types";
import { SafeZone } from "../SafeZone";
import { AmbientBackground } from "../AmbientBackground";
import { BE_VIETNAM_PRO } from "../styles";
import { p3Colors } from "./shared/grabfoodP3Palette";

// Frame plan: a campaign eyebrow prints first, then three combo cards drop
// in one at a time (best-seller first, discounted 30% and tagged as
// restaurant-funded; the next two tagged as sponsor-funded), and finally
// Grab's own role label settles at the bottom — deliberately last, so it
// reads as "just the display layer" rather than the headline sponsor.
const CARD_START = 30;
const CARD_GAP = 42;

export const SponsorComboShot: React.FC<SponsorComboSceneProps> = ({
  campaignLabel,
  combos,
  grabRoleLabel,
  sourceLabel,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const eyebrowOpacity = interpolate(frame, [0, 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const roleStart = CARD_START + combos.length * CARD_GAP + 20;
  const roleSpring = spring({ frame: frame - roleStart, fps, config: { damping: 15, stiffness: 150 }, durationInFrames: 24 });
  const sourceStart = roleStart + 34; // after the Grab role badge settles
  const sourceOpacity = interpolate(frame, [sourceStart, sourceStart + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitOpacity = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: p3Colors.bg, fontFamily: BE_VIETNAM_PRO, overflow: "hidden" }}>
      <AbsoluteFill style={{ opacity: exitOpacity }}>
        <AmbientBackground accent={p3Colors.sponsor} />
        <SafeZone style={{ justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
          <div
            style={{
              opacity: eyebrowOpacity,
              fontSize: 22,
              fontWeight: 900,
              letterSpacing: 1.5,
              color: p3Colors.textPrimary,
              marginBottom: 34,
              textAlign: "center",
            }}
          >
            {campaignLabel}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 18, width: 660 }}>
            {combos.map((combo, i) => {
              const start = CARD_START + i * CARD_GAP;
              const s = spring({ frame: frame - start, fps, config: { damping: 16, stiffness: 130 }, durationInFrames: 26 });
              const tagColor = combo.highlight ? p3Colors.grab : p3Colors.sponsor;
              const tagDim = combo.highlight ? p3Colors.grabDim : p3Colors.sponsorDim;
              return (
                <div
                  key={i}
                  style={{
                    opacity: Math.min(1, s),
                    transform: `translateY(${(1 - Math.min(1, s)) * 26}px)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "20px 26px",
                    borderRadius: 20,
                    background: "rgba(255,255,255,0.05)",
                    border: `1.5px solid ${combo.highlight ? p3Colors.grab : "rgba(255,255,255,0.14)"}`,
                  }}
                >
                  <span style={{ fontSize: 21, fontWeight: 700, color: p3Colors.textPrimary, maxWidth: 260 }}>{combo.itemLabel}</span>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                    <span style={{ fontSize: 26, fontWeight: 900, color: p3Colors.textPrimary }}>{combo.discountLabel}</span>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 800,
                        letterSpacing: 0.5,
                        color: tagColor,
                        background: tagDim,
                        borderRadius: 999,
                        padding: "4px 12px",
                      }}
                    >
                      {combo.payerLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div
            style={{
              marginTop: 40,
              opacity: Math.min(1, roleSpring),
              transform: `translateY(${(1 - Math.min(1, roleSpring)) * 14}px)`,
              padding: "14px 28px",
              borderRadius: 999,
              background: p3Colors.grabDim,
              border: `1.5px solid ${p3Colors.grab}`,
              fontSize: 18,
              fontWeight: 800,
              color: p3Colors.textPrimary,
              letterSpacing: 0.5,
            }}
          >
            {grabRoleLabel}
          </div>

          {sourceLabel && (
            <div
              style={{
                marginTop: 26,
                fontSize: 14,
                fontWeight: 600,
                color: p3Colors.textDim,
                opacity: sourceOpacity,
              }}
            >
              {sourceLabel}
            </div>
          )}
        </SafeZone>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default SponsorComboShot;
