import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { PayerRevealSceneProps } from "../types";
import { SafeZone } from "../SafeZone";
import { AmbientBackground } from "../AmbientBackground";
import { BE_VIETNAM_PRO } from "../styles";
import { p3Colors, GrabMark } from "./grabfoodP3Palette";

// Frame plan: the −40.000đ pill (carried over from the hook shot) flies up
// toward a centered Grab mark and stops just short of touching it (0-55) —
// per the script it must NOT land on Grab, since the point of this scene is
// that Grab is only one of three possible destinations. The mark then dims
// and three payer chips fan out below (60-110), followed by the headline.
const FLY_END = 55;
const FAN_START = 62;

export const PayerRevealShot: React.FC<PayerRevealSceneProps> = ({
  headline,
  accentWord,
  amount,
  payers,
  illustrativeLabel,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const flySpring = spring({ frame, fps, config: { damping: 15, stiffness: 70 }, durationInFrames: FLY_END });
  const flyY = interpolate(Math.min(1, flySpring), [0, 1], [420, 0]);
  const flyScale = interpolate(Math.min(1, flySpring), [0, 1], [0.7, 1]);
  const markDim = interpolate(frame, [FLY_END, FLY_END + 20], [1, 0.4], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const badgeOpacity = interpolate(frame, [8, 24], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const headlineOpacity = interpolate(frame, [durationInFrames - 110, durationInFrames - 82], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitOpacity = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const accentIndex = accentWord ? headline.indexOf(accentWord) : -1;
  const before = accentIndex >= 0 ? headline.slice(0, accentIndex) : headline;
  const after = accentIndex >= 0 ? headline.slice(accentIndex + (accentWord?.length ?? 0)) : "";

  return (
    <AbsoluteFill style={{ backgroundColor: p3Colors.bg, fontFamily: BE_VIETNAM_PRO, overflow: "hidden" }}>
      <AbsoluteFill style={{ opacity: exitOpacity }}>
        <AmbientBackground accent={p3Colors.grab} />
        <SafeZone style={{ justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
          {illustrativeLabel && (
            <div
              style={{
                position: "absolute",
                top: 0,
                opacity: badgeOpacity,
                padding: "8px 18px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.16)",
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: 0.5,
                color: p3Colors.textDim,
              }}
            >
              {illustrativeLabel}
            </div>
          )}

          <div style={{ opacity: markDim, transform: `scale(${0.85 + markDim * 0.15})` }}>
            <GrabMark size={110} />
          </div>

          <div
            style={{
              marginTop: -60,
              transform: `translateY(${flyY}px) scale(${flyScale})`,
              padding: "18px 34px",
              borderRadius: 999,
              background: p3Colors.cost,
              color: "#fff",
              fontSize: 34,
              fontWeight: 900,
              boxShadow: "0 20px 50px rgba(239,68,68,0.4)",
              zIndex: 2,
            }}
          >
            −{amount}
          </div>

          <div style={{ display: "flex", gap: 22, marginTop: 64 }}>
            {payers.map((payer, i) => {
              const start = FAN_START + i * 12;
              const s = spring({ frame: frame - start, fps, config: { damping: 14, stiffness: 160 }, durationInFrames: 22 });
              return (
                <div
                  key={i}
                  style={{
                    opacity: Math.min(1, s),
                    transform: `translateY(${(1 - Math.min(1, s)) * 22}px)`,
                    padding: "16px 26px",
                    borderRadius: 18,
                    background: "rgba(255,255,255,0.06)",
                    border: `1.5px solid ${i === 1 ? p3Colors.grab : "rgba(255,255,255,0.22)"}`,
                    fontSize: 20,
                    fontWeight: 800,
                    color: p3Colors.textPrimary,
                    textAlign: "center",
                    minWidth: 150,
                  }}
                >
                  {payer}
                </div>
              );
            })}
          </div>

          <div
            style={{
              marginTop: 56,
              fontSize: 32,
              fontWeight: 900,
              color: p3Colors.textPrimary,
              textAlign: "center",
              maxWidth: 780,
              lineHeight: 1.3,
              opacity: headlineOpacity,
            }}
          >
            {accentIndex >= 0 ? (
              <>
                {before}
                <span style={{ color: p3Colors.grab }}>{accentWord}</span>
                {after}
              </>
            ) : (
              headline
            )}
          </div>
        </SafeZone>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default PayerRevealShot;
