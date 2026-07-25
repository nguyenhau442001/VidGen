import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { TriPhoneRevealSceneProps } from "../types";
import { SafeZone } from "../SafeZone";
import { AmbientBackground } from "../AmbientBackground";
import { BE_VIETNAM_PRO } from "../styles";
import { p3Colors } from "./shared/grabfoodP3Palette";

// Frame plan: three identical phones (all showing the same discount amount)
// settle in together, then each flips on its Y axis in turn — a card-flip
// reveals the funding source printed on its "back" — visualizing that one
// visible number can hide three different sources of money.
const FLIP_START = 46;
const FLIP_GAP = 24;
const FLIP_DURATION = 26;

const Phone: React.FC<{ amountLabel: string; source: string; flipProgress: number }> = ({ amountLabel, source, flipProgress }) => {
  const rotateY = flipProgress * 180;
  const showBack = flipProgress > 0.5;
  return (
    <div style={{ perspective: 900 }}>
      <div
        style={{
          width: 190,
          height: 340,
          borderRadius: 26,
          border: "6px solid rgba(255,255,255,0.14)",
          background: showBack ? p3Colors.bgDeep : p3Colors.paper,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `rotateY(${rotateY}deg)`,
          transformStyle: "preserve-3d",
          boxShadow: "0 20px 50px rgba(0,0,0,0.4)",
        }}
      >
        {!showBack ? (
          <div style={{ textAlign: "center", padding: "0 14px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(20,30,24,0.5)", marginBottom: 8 }}>ƯU ĐÃI</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: "#0e3b20", lineHeight: 1.15 }}>{amountLabel}</div>
          </div>
        ) : (
          <div
            style={{
              textAlign: "center",
              padding: "0 14px",
              transform: "rotateY(180deg)",
              color: "#fff",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.6)", marginBottom: 8 }}>NGUỒN TIỀN</div>
            <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.3 }}>{source}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export const TriPhoneRevealShot: React.FC<TriPhoneRevealSceneProps> = ({ amountLabel, sources, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const introSpring = spring({ frame, fps, config: { damping: 16, stiffness: 120 }, durationInFrames: 26 });
  const exitOpacity = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: p3Colors.bg, fontFamily: BE_VIETNAM_PRO, overflow: "hidden" }}>
      <AbsoluteFill style={{ opacity: exitOpacity }}>
        <AmbientBackground accent={p3Colors.grab} />
        <SafeZone style={{ justifyContent: "center", alignItems: "center" }}>
          <div
            style={{
              opacity: Math.min(1, introSpring),
              transform: `translateY(${(1 - Math.min(1, introSpring)) * 24}px)`,
              display: "flex",
              gap: 24,
            }}
          >
            {sources.map((source, i) => {
              const flipStart = FLIP_START + i * FLIP_GAP;
              const flipProgress = interpolate(frame, [flipStart, flipStart + FLIP_DURATION], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              return <Phone key={i} amountLabel={amountLabel} source={source} flipProgress={flipProgress} />;
            })}
          </div>
        </SafeZone>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default TriPhoneRevealShot;
