import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { TripleMetricOrbitSceneProps } from "../types";
import { SafeZone } from "../SafeZone";
import { AmbientBackground } from "../AmbientBackground";
import { BE_VIETNAM_PRO } from "../styles";
import { p2Colors } from "./grabfoodP2Palette";

const RING_RADIUS = 130;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

// Each of the three published rules is a slowly-orbiting dashed ring around
// its own label/value pair — not a fill gauge (only one of the three rules
// is even numeric), so "orbit" reads as "the system keeps tracking this",
// not "progress toward a target".
const MetricRing: React.FC<{
  label: string;
  valueLabel: string;
  enterAt: number;
}> = ({ label, valueLabel, enterAt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - enterAt, fps, config: { damping: 15, stiffness: 150 }, durationInFrames: 26 });
  const opacity = Math.min(1, enter);
  const spin = interpolate(frame, [enterAt, enterAt + 600], [0, 60], { extrapolateRight: "clamp" });

  return (
    <div style={{ position: "relative", width: 280, height: 280, opacity, transform: `scale(${opacity})` }}>
      <svg width="280" height="280" viewBox="0 0 280 280" style={{ transform: `rotate(${spin}deg)`, transformOrigin: "140px 140px" }}>
        <circle
          cx="140"
          cy="140"
          r={RING_RADIUS}
          fill="none"
          stroke={p2Colors.grab}
          strokeWidth="3"
          strokeDasharray="10 14"
          opacity={0.55}
        />
      </svg>
      <svg width="280" height="280" viewBox="0 0 280 280" style={{ position: "absolute", inset: 0 }}>
        <circle cx="140" cy="140" r={RING_RADIUS - 22} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 30, fontWeight: 900, color: p2Colors.textPrimary, textAlign: "center", maxWidth: 190 }}>{valueLabel}</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: p2Colors.textDim, marginTop: 8, textAlign: "center", maxWidth: 170, letterSpacing: 0.4 }}>{label}</div>
      </div>
    </div>
  );
};

export const TripleMetricOrbitShot: React.FC<TripleMetricOrbitSceneProps> = ({
  headline,
  metrics,
  sourceLabel,
  showHelmetVisorFrame,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const headlineOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const visorOpacity = interpolate(frame, [0, 25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const sourceOpacity = interpolate(frame, [durationInFrames - 60, durationInFrames - 30], [0, 1], {
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
      {showHelmetVisorFrame && (
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 1080 1920"
          style={{ position: "absolute", inset: 0, opacity: visorOpacity, pointerEvents: "none" }}
        >
          {/* Helmet-visor arc — a curved dark band across the top with a
              faint glass-sheen highlight, framing the metrics as a
              reflection the driver sees while riding rather than a
              free-floating dashboard. */}
          <path d="M -40 260 Q 540 40 1120 260 L 1120 -40 L -40 -40 Z" fill={p2Colors.bgDeep} opacity={0.9} />
          <path d="M -40 260 Q 540 40 1120 260" stroke={p2Colors.textDim} strokeWidth="4" fill="none" opacity={0.5} />
          <path d="M 120 190 Q 540 60 960 190" stroke="rgba(255,255,255,0.25)" strokeWidth="10" fill="none" strokeLinecap="round" />
        </svg>
      )}
      <SafeZone style={{ justifyContent: "center", flexDirection: "column", alignItems: "center" }}>
        <div style={{ fontSize: 38, fontWeight: 800, textAlign: "center", color: p2Colors.textPrimary, opacity: headlineOpacity, marginBottom: 36 }}>
          {headline}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
          {metrics[0] && <MetricRing label={metrics[0].label} valueLabel={metrics[0].value} enterAt={20} />}
          <div style={{ display: "flex", gap: 12 }}>
            {metrics[1] && <MetricRing label={metrics[1].label} valueLabel={metrics[1].value} enterAt={55} />}
            {metrics[2] && <MetricRing label={metrics[2].label} valueLabel={metrics[2].value} enterAt={90} />}
          </div>
        </div>

        {sourceLabel && (
          <div
            style={{
              position: "absolute",
              bottom: 56,
              left: 60,
              right: 60,
              padding: "10px 18px",
              borderRadius: 12,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.14)",
              fontSize: 15,
              fontWeight: 600,
              color: p2Colors.textDim,
              opacity: sourceOpacity,
              textAlign: "center",
              boxSizing: "border-box",
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

export default TripleMetricOrbitShot;
