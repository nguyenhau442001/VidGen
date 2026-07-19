import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { TripleMetricOrbitSceneProps } from "../types";
import { SafeZone } from "../SafeZone";
import { AmbientBackground } from "../AmbientBackground";
import { BE_VIETNAM_PRO } from "../styles";
import { p2Colors } from "./grabfoodP2Palette";

const RING_RADIUS = 130;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const MetricRing: React.FC<{
  label: string;
  valueLabel: string;
  ratio: number; // 0-1 fill
  color: string;
  thresholdRatio?: number; // 0-1 position of the pass/fail line the driver must clear
  thresholdTickColor?: string; // defaults to p2Colors.danger; the accept-rate ring uses a neutral tick instead
  enterAt: number;
}> = ({ label, valueLabel, ratio, color, thresholdRatio, thresholdTickColor, enterAt }) => {
  const frame = useCurrentFrame();
  const draw = interpolate(frame, [enterAt, enterAt + 40], [0, ratio], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = interpolate(frame, [enterAt, enterAt + 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const tickAngle = thresholdRatio !== undefined ? thresholdRatio * 360 - 90 : 0;
  const tickColor = thresholdTickColor ?? p2Colors.danger;

  return (
    <div style={{ position: "relative", width: 300, height: 300, opacity }}>
      <svg width="300" height="300" viewBox="0 0 300 300">
        <circle cx="150" cy="150" r={RING_RADIUS} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="14" />
        <circle
          cx="150"
          cy="150"
          r={RING_RADIUS}
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - draw)}
          transform="rotate(-90 150 150)"
        />
        {thresholdRatio !== undefined && (
          <line
            x1={150 + Math.cos((tickAngle * Math.PI) / 180) * (RING_RADIUS - 14)}
            y1={150 + Math.sin((tickAngle * Math.PI) / 180) * (RING_RADIUS - 14)}
            x2={150 + Math.cos((tickAngle * Math.PI) / 180) * (RING_RADIUS + 14)}
            y2={150 + Math.sin((tickAngle * Math.PI) / 180) * (RING_RADIUS + 14)}
            stroke={tickColor}
            strokeWidth="5"
            strokeLinecap="round"
          />
        )}
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 38, fontWeight: 900, color: p2Colors.textPrimary }}>{valueLabel}</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: p2Colors.textDim, marginTop: 6, textAlign: "center", maxWidth: 180 }}>{label}</div>
      </div>
    </div>
  );
};

export const TripleMetricOrbitShot: React.FC<TripleMetricOrbitSceneProps> = ({
  headline,
  trips,
  acceptanceRate,
  cancellationRate,
  footer,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const headlineOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const footerOpacity = interpolate(frame, [durationInFrames - 60, durationInFrames - 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitOpacity = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const dangerRatio = cancellationRate.value / cancellationRate.max;
  const dangerColor = dangerRatio > 0.85 ? p2Colors.danger : dangerRatio > 0.6 ? p2Colors.warmHome : p2Colors.grab;

  return (
    <AbsoluteFill style={{ backgroundColor: p2Colors.bg, fontFamily: BE_VIETNAM_PRO, overflow: "hidden" }}>
      <AbsoluteFill style={{ opacity: exitOpacity }}>
      <AmbientBackground accent={p2Colors.grab} />
      <SafeZone style={{ justifyContent: "center", flexDirection: "column", alignItems: "center" }}>
        <div style={{ fontSize: 38, fontWeight: 800, textAlign: "center", color: p2Colors.textPrimary, opacity: headlineOpacity, marginBottom: 36 }}>
          {headline}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24, alignItems: "center" }}>
          <MetricRing
            label="ĐIỂM CHUYẾN"
            valueLabel={`${trips.current}/${trips.target}`}
            ratio={trips.current / trips.target}
            color={p2Colors.grab}
            enterAt={20}
          />
          <div style={{ display: "flex", gap: 20 }}>
            <MetricRing
              label={`TỶ LỆ NHẬN — NGƯỠNG ${acceptanceRate.min}%`}
              valueLabel={`${acceptanceRate.value}%`}
              ratio={acceptanceRate.value / 100}
              color={p2Colors.grab}
              thresholdRatio={acceptanceRate.min / 100}
              thresholdTickColor={p2Colors.textPrimary}
              enterAt={50}
            />
            <MetricRing
              label={`TỶ LỆ HỦY — NGƯỠNG ${cancellationRate.max}%`}
              valueLabel={`${cancellationRate.value}%`}
              ratio={cancellationRate.value / 100}
              color={dangerColor}
              thresholdRatio={cancellationRate.max / 100}
              enterAt={80}
            />
          </div>
        </div>

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
            fontSize: 17,
            fontWeight: 600,
            color: p2Colors.textPrimary,
            opacity: footerOpacity,
            textAlign: "center",
            boxSizing: "border-box",
          }}
        >
          {footer}
        </div>
      </SafeZone>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default TripleMetricOrbitShot;
