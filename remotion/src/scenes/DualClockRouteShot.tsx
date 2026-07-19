import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { DualClockRouteSceneProps } from "../types";
import { SafeZone } from "../SafeZone";
import { AmbientBackground } from "../AmbientBackground";
import { BE_VIETNAM_PRO } from "../styles";
import { p2Colors, P2Icons } from "./grabfoodP2Palette";

export const DualClockRouteShot: React.FC<DualClockRouteSceneProps> = ({
  headline,
  customerLabel,
  driverLabel,
  stopCount,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const split = interpolate(frame, [50, 90], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const headlineOpacity = interpolate(frame, [durationInFrames - 110, durationInFrames - 80], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitOpacity = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const minutesElapsed = Math.floor(interpolate(frame, [90, durationInFrames - 60], [0, 42], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));

  return (
    <AbsoluteFill style={{ backgroundColor: p2Colors.bg, fontFamily: BE_VIETNAM_PRO, overflow: "hidden" }}>
      <AbsoluteFill style={{ opacity: exitOpacity }}>
      <AmbientBackground accent={p2Colors.grab} />

      {/* Single route line before split */}
      <svg width="1080" height="1920" style={{ position: "absolute", inset: 0, opacity: interpolate(split, [0, 1], [1, 0.3]) }}>
        <path d="M 540 400 Q 620 900 500 1500" stroke={p2Colors.grabDim} strokeWidth="6" fill="none" />
      </svg>

      <SafeZone style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
        {/* Customer layer */}
        <div
          style={{
            flex: 1,
            transform: `translateX(${-split * 40}px)`,
            opacity: split,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
          }}
        >
          <P2Icons.Clock size={40} color={p2Colors.textDim} />
          <div style={{ fontSize: 34, fontWeight: 900, color: p2Colors.textPrimary }}>{minutesElapsed} phút</div>
          <div style={{ fontSize: 15, color: p2Colors.textDim, textAlign: "center", maxWidth: 200 }}>{customerLabel}</div>
        </div>

        <div style={{ width: 2, height: 320, background: "rgba(255,255,255,0.1)" }} />

        {/* Driver layer */}
        <div
          style={{
            flex: 1,
            transform: `translateX(${split * 40}px)`,
            opacity: split,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", gap: 8 }}>
            {Array.from({ length: stopCount }).map((_, i) => {
              const chipSpring = spring({ frame: frame - (100 + i * 20), fps, config: { damping: 14, stiffness: 200 } });
              return (
                <div
                  key={i}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 999,
                    background: p2Colors.grabDim,
                    border: `1px solid ${p2Colors.grab}`,
                    color: p2Colors.grab,
                    fontWeight: 900,
                    fontSize: 20,
                    opacity: Math.min(1, chipSpring),
                    transform: `scale(${Math.min(1, chipSpring)})`,
                  }}
                >
                  +1
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: 15, color: p2Colors.textDim, textAlign: "center", maxWidth: 200 }}>{driverLabel}</div>
        </div>
      </SafeZone>

      <div
        style={{
          position: "absolute",
          bottom: 140,
          left: 70,
          right: 70,
          textAlign: "center",
          fontSize: 32,
          fontWeight: 800,
          lineHeight: 1.3,
          color: p2Colors.textPrimary,
          opacity: headlineOpacity,
        }}
      >
        {headline}
      </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default DualClockRouteShot;
