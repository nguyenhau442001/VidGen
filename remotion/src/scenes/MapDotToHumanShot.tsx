import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { MapDotToHumanSceneProps } from "../types";
import { SafeZone } from "../SafeZone";
import { AmbientBackground } from "../AmbientBackground";
import { BE_VIETNAM_PRO } from "../styles";
import { p2Colors, P2Icons } from "./grabfoodP2Palette";

// Frame plan: 0-40 map dot glows and zooms; 40-90 dot morphs into a phone
// silhouette (camera-push feel via scale+blur); 90-130 phone UI fades in
// with battery/route; 130+ notification badge springs in over it.
export const MapDotToHumanShot: React.FC<MapDotToHumanSceneProps> = ({
  headline,
  illustrativeLabel,
  batteryPercent,
  targetCurrent,
  targetTotal,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const dotToPhone = interpolate(frame, [0, 40, 90], [0, 0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const dotScale = interpolate(frame, [0, 40], [1, 6], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const dotBlur = interpolate(frame, [20, 40], [0, 18], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const phoneOpacity = interpolate(frame, [60, 95], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const notifSpring = spring({ frame: frame - 130, fps, config: { damping: 14, stiffness: 170 } });
  const headlineOpacity = interpolate(frame, [durationInFrames - 110, durationInFrames - 80], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitOpacity = interpolate(
    frame,
    [durationInFrames - 12, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ backgroundColor: p2Colors.bg, opacity: exitOpacity, fontFamily: BE_VIETNAM_PRO, overflow: "hidden" }}>
      <AmbientBackground accent={p2Colors.grab} />

      {/* Map dot -> camera push */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "38%",
          width: 18,
          height: 18,
          marginLeft: -9,
          marginTop: -9,
          borderRadius: "50%",
          background: p2Colors.grab,
          boxShadow: `0 0 ${20 + dotScale * 4}px ${p2Colors.grab}`,
          transform: `scale(${dotScale})`,
          filter: `blur(${dotBlur}px)`,
          opacity: interpolate(dotToPhone, [0, 1], [1, 0]),
        }}
      />

      {/* Phone mockup revealed by the push-in */}
      <div style={{ position: "absolute", inset: 0, opacity: phoneOpacity, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            width: 420,
            height: 860,
            borderRadius: 44,
            border: `3px solid ${p2Colors.grabDim}`,
            background: `linear-gradient(180deg, ${p2Colors.bgDeep} 0%, #0d1420 100%)`,
            boxShadow: `0 0 60px rgba(0,177,79,0.15)`,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", top: 24, left: 24, right: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <P2Icons.Phone size={20} color={p2Colors.textDim} />
            <span style={{ fontSize: 15, color: batteryPercent <= 10 ? p2Colors.danger : p2Colors.textDim, fontWeight: 700 }}>
              PIN {batteryPercent}%
            </span>
          </div>

          {/* Route line home */}
          <svg width="420" height="860" style={{ position: "absolute", inset: 0 }}>
            <path
              d="M 120 300 Q 220 480 160 700"
              stroke={p2Colors.warmHome}
              strokeWidth="5"
              fill="none"
              strokeDasharray="10 8"
              opacity={0.7}
            />
          </svg>

          {/* Notification badge */}
          <div
            style={{
              position: "absolute",
              left: 28,
              right: 28,
              top: 380,
              borderRadius: 20,
              padding: "20px 22px",
              background: "rgba(0,177,79,0.14)",
              border: `2px solid ${p2Colors.grab}`,
              opacity: Math.min(1, notifSpring),
              transform: `translateY(${(1 - Math.min(1, notifSpring)) * 30}px) scale(${Math.min(1, notifSpring)})`,
              textAlign: "center",
              boxSizing: "border-box",
            }}
          >
            <div style={{ fontSize: 16, color: p2Colors.textDim, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>
              MỤC TIÊU HÔM NAY
            </div>
            <div style={{ fontSize: 40, fontWeight: 900, color: p2Colors.textPrimary }}>
              {targetCurrent}/{targetTotal}
            </div>
            <div
              style={{
                marginTop: 10,
                display: "inline-block",
                padding: "4px 10px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.08)",
                fontSize: 12,
                color: p2Colors.textDim,
                fontWeight: 600,
              }}
            >
              {illustrativeLabel}
            </div>
          </div>
        </div>
      </div>

      <SafeZone style={{ justifyContent: "flex-end" }}>
        <div
          style={{
            fontSize: 40,
            fontWeight: 800,
            lineHeight: 1.25,
            color: p2Colors.textPrimary,
            textAlign: "center",
            opacity: headlineOpacity,
          }}
        >
          {headline}
        </div>
      </SafeZone>
    </AbsoluteFill>
  );
};

export default MapDotToHumanShot;
