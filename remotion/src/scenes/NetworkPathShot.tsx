import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { NetworkPathVisual } from "../types";
import { colors, INTER } from "../styles";
import { SafeZone } from "../SafeZone";
import { AmbientBackground } from "../AmbientBackground";
import { phaseProgress } from "./cinematicPrimitives";

export type NetworkPathSceneProps = NetworkPathVisual & { durationInFrames: number };

const NODE_W = 320;
const NODE_H = 76;
const GAP = 150;
const PULSE_PERIOD = 46;

const Node: React.FC<{ label: string; icon: string; opacity: number; accentColor: string }> = ({
  label,
  icon,
  opacity,
  accentColor,
}) => (
  <div
    style={{
      width: NODE_W,
      height: NODE_H,
      borderRadius: NODE_H / 2,
      border: `1.5px solid ${accentColor}`,
      background: `${accentColor}14`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      opacity,
    }}
  >
    <span style={{ fontSize: 30 }}>{icon}</span>
    <span style={{ fontFamily: INTER, fontWeight: 800, fontSize: 22, color: colors.textPrimary, letterSpacing: "0.04em" }}>
      {label}
    </span>
  </div>
);

// A dot travels continuously along the edge from `active` frame onward,
// looping every PULSE_PERIOD frames — this animation never depends on the
// toggle state, so it visibly keeps running (unbroken) across the moment
// the incognito toggle strikes out the on-device history label.
const EdgePulse: React.FC<{ frame: number; startFrame: number; height: number; accentColor: string }> = ({
  frame,
  startFrame,
  height,
  accentColor,
}) => {
  const running = frame >= startFrame;
  const t = running ? ((frame - startFrame) % PULSE_PERIOD) / PULSE_PERIOD : 0;
  const lineOpacity = phaseProgress(frame, startFrame, 10);
  return (
    <div style={{ position: "relative", width: 4, height, opacity: lineOpacity }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.12)" }} />
      {running && (
        <div
          style={{
            position: "absolute",
            left: -4,
            top: t * (height - 12),
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: accentColor,
            boxShadow: `0 0 12px ${accentColor}`,
          }}
        />
      )}
    </div>
  );
};

export const NetworkPathShot: React.FC<NetworkPathSceneProps> = ({
  laptopLabel = "LAPTOP",
  wifiLabel = "WIFI TRƯỜNG",
  websiteLabel = "WEBSITE",
  toggleFrame = 40,
  struckLabel = "ẨN LỊCH SỬ TRÊN MÁY",
  continuingLabel = "KHÔNG NGẮT KHỎI MẠNG",
  accentColor = colors.green,
}) => {
  const frame = useCurrentFrame();

  const nodesOpacity = phaseProgress(frame, 6, 16);
  const pulseStart = 30;

  const toggleOn = phaseProgress(frame, toggleFrame, 10);
  const struckLabelOpacity = phaseProgress(frame, toggleFrame - 6, 10);
  const strikeWidth = interpolate(frame, [toggleFrame + 6, toggleFrame + 22], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const continuingStart = toggleFrame + 34;
  const continuingOpacity = phaseProgress(frame, continuingStart, 16);

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      <AmbientBackground accent={accentColor} />
      <SafeZone style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <Node label={laptopLabel} icon={"\u{1F4BB}"} opacity={nodesOpacity} accentColor={accentColor} />

          <div
            style={{
              opacity: struckLabelOpacity,
              marginTop: 14,
              marginBottom: 8,
              position: "relative",
              padding: "6px 14px",
              borderRadius: 8,
              background: "rgba(0,0,0,0.05)",
            }}
          >
            <span style={{ fontFamily: INTER, fontSize: 18, fontWeight: 700, color: "rgba(0,0,0,0.6)" }}>
              {struckLabel}
            </span>
            <div
              style={{
                position: "absolute",
                left: "8%",
                top: "50%",
                height: 2.5,
                width: `${strikeWidth * 0.84}%`,
                background: colors.errorRed,
              }}
            />
            <div
              style={{
                position: "absolute",
                right: -18,
                top: 2,
                opacity: toggleOn,
                fontSize: 20,
              }}
            >
              {"\u{1F576}️"}
            </div>
          </div>

          <EdgePulse frame={frame} startFrame={pulseStart} height={GAP} accentColor={accentColor} />

          <Node label={wifiLabel} icon={"\u{1F4F6}"} opacity={nodesOpacity} accentColor={accentColor} />

          <EdgePulse frame={frame} startFrame={pulseStart} height={GAP} accentColor={accentColor} />

          <Node label={websiteLabel} icon={"\u{1F310}"} opacity={nodesOpacity} accentColor={accentColor} />

          <div
            style={{
              opacity: continuingOpacity,
              marginTop: 26,
              padding: "12px 22px",
              borderRadius: 999,
              background: `${colors.cyan}18`,
              border: `1px solid ${colors.cyan}66`,
            }}
          >
            <span style={{ fontFamily: INTER, fontWeight: 800, fontSize: 22, color: colors.cyan }}>
              {continuingLabel}
            </span>
          </div>
        </div>
      </SafeZone>
    </AbsoluteFill>
  );
};

export default NetworkPathShot;
