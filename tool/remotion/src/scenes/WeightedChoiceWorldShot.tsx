import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { WeightedChoiceWorldSceneProps } from "../types";
import { SafeZone } from "../SafeZone";
import { BE_VIETNAM_PRO } from "../styles";
import { p2Colors, P2Icons } from "./shared/grabfoodP2Palette";

const BEAM_HALF_WIDTH = 220;
const MAX_TILT_DEG = 14;

export const WeightedChoiceWorldShot: React.FC<WeightedChoiceWorldSceneProps> = ({
  headline,
  subheadline,
  homeLabel,
  progressLabel,
  homeDetails,
  progressDetails,
  illustrativeLabel,
  scaleTiltRatio,
  showRouteVignettes,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const vignetteOpacity = interpolate(frame, [20, 45], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const labelOpacity = interpolate(frame, [10, 35], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const splitProgress = interpolate(frame, [0, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const tiltSpring = spring({ frame: frame - 50, fps, config: { damping: 10, stiffness: 60 }, durationInFrames: 60 });
  const tiltDeg = interpolate(tiltSpring, [0, 1], [0, MAX_TILT_DEG * (scaleTiltRatio * 2 - 1)]);
  const headlineOpacity = interpolate(frame, [durationInFrames - 130, durationInFrames - 100], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitOpacity = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const leftPanX = -Math.sin((tiltDeg * Math.PI) / 180) * BEAM_HALF_WIDTH;
  const leftPanY = Math.cos((tiltDeg * Math.PI) / 180) * BEAM_HALF_WIDTH - BEAM_HALF_WIDTH + Math.sin((tiltDeg * Math.PI) / 180) * -BEAM_HALF_WIDTH * 0;
  const rightPanX = Math.sin((tiltDeg * Math.PI) / 180) * BEAM_HALF_WIDTH;

  return (
    <AbsoluteFill style={{ backgroundColor: p2Colors.bg, fontFamily: BE_VIETNAM_PRO, overflow: "hidden" }}>
      <AbsoluteFill style={{ opacity: exitOpacity }}>
      {/* Diagonal world split */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(135deg, rgba(249,115,22,0.16) 0%, transparent 55%)`,
          clipPath: `polygon(0 0, ${50 * splitProgress + 50}% 0, ${50 - 50 * splitProgress}% 100%, 0 100%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(315deg, rgba(0,177,79,0.14) 0%, transparent 55%)`,
          clipPath: `polygon(100% 0, ${50 * splitProgress + 50}% 0, ${50 - 50 * splitProgress}% 100%, 100% 100%)`,
        }}
      />

      <SafeZone style={{ justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
        {illustrativeLabel && (
          <div
            style={{
              position: "absolute",
              top: 0,
              opacity: labelOpacity,
              padding: "8px 18px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.16)",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 0.5,
              color: p2Colors.textDim,
              textAlign: "center",
              maxWidth: 700,
            }}
          >
            {illustrativeLabel}
          </div>
        )}
        {/* Scale */}
        <svg width="600" height="380" viewBox="0 0 600 380">
          <g transform={`rotate(${tiltDeg} 300 90)`}>
            <line x1="300" y1="90" x2="300" y2="40" stroke={p2Colors.textDim} strokeWidth="4" />
            <line x1="80" y1="90" x2="520" y2="90" stroke={p2Colors.textDim} strokeWidth="6" strokeLinecap="round" />
            <line x1="80" y1="90" x2="80" y2="170" stroke={p2Colors.textDim} strokeWidth="3" />
            <line x1="520" y1="90" x2="520" y2="170" stroke={p2Colors.textDim} strokeWidth="3" />
            <rect x="20" y="170" width="120" height="16" rx="8" fill={p2Colors.warmHome} opacity="0.85" />
            <rect x="460" y="170" width="120" height="16" rx="8" fill={p2Colors.grab} opacity="0.85" />
          </g>
          <polygon points="290,20 310,20 300,5" fill={p2Colors.textDim} />
          <line x1="300" y1="20" x2="300" y2="370" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
        </svg>

        <div style={{ display: "flex", justifyContent: "space-between", width: 640, marginTop: -20 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, width: 260 }}>
            <P2Icons.Home size={30} />
            <div style={{ fontSize: 18, fontWeight: 700, color: p2Colors.textPrimary, textAlign: "center" }}>{homeLabel}</div>
            {homeDetails && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4, alignItems: "center" }}>
                {homeDetails.map((d, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: p2Colors.textDim,
                      padding: "3px 10px",
                      borderRadius: 999,
                      background: "rgba(255,255,255,0.06)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {d}
                  </div>
                ))}
              </div>
            )}
            {showRouteVignettes && (
              <svg width="140" height="70" viewBox="0 0 140 70" style={{ marginTop: 10, opacity: vignetteOpacity }}>
                {/* Warm dashed path curving toward a home glyph — the road
                    already-headed-home, in contrast to the rain pickup. */}
                <path d="M 10 55 Q 60 60 70 30 T 130 12" stroke={p2Colors.warmHome} strokeWidth="3" strokeDasharray="6 6" fill="none" opacity="0.8" />
                <path d="M 118 5 L 130 12 L 122 22" stroke={p2Colors.warmHome} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, width: 260 }}>
            <P2Icons.Scale size={30} color={p2Colors.grab} />
            <div style={{ fontSize: 18, fontWeight: 700, color: p2Colors.textPrimary, textAlign: "center" }}>{progressLabel}</div>
            {progressDetails && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4, alignItems: "center" }}>
                {progressDetails.map((d, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: p2Colors.grab,
                      padding: "3px 10px",
                      borderRadius: 999,
                      background: p2Colors.grabDim,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {d}
                  </div>
                ))}
              </div>
            )}
            {showRouteVignettes && (
              <svg width="140" height="70" viewBox="0 0 140 70" style={{ marginTop: 10, opacity: vignetteOpacity }}>
                {/* New pickup pin in the rain — a fresh destination pulling
                    the driver the opposite way from home. */}
                <line x1="20" y1="8" x2="16" y2="20" stroke={p2Colors.grab} strokeWidth="2" opacity="0.55" />
                <line x1="34" y1="6" x2="30" y2="18" stroke={p2Colors.grab} strokeWidth="2" opacity="0.55" />
                <line x1="48" y1="10" x2="44" y2="22" stroke={p2Colors.grab} strokeWidth="2" opacity="0.55" />
                <circle cx="105" cy="40" r="9" fill={p2Colors.grab} opacity="0.9" />
                <path d="M 105 49 L 105 62" stroke={p2Colors.grab} strokeWidth="3" strokeLinecap="round" />
              </svg>
            )}
          </div>
        </div>

        <div
          style={{
            marginTop: 56,
            fontSize: 30,
            fontWeight: 800,
            lineHeight: 1.3,
            textAlign: "center",
            color: p2Colors.textPrimary,
            opacity: headlineOpacity,
            maxWidth: 800,
          }}
        >
          {headline}
          {subheadline && (
            <div style={{ fontSize: 20, fontWeight: 600, color: p2Colors.textDim, marginTop: 12 }}>{subheadline}</div>
          )}
        </div>
      </SafeZone>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default WeightedChoiceWorldShot;
