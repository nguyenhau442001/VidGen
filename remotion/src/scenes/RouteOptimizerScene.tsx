import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { SafeZone } from "../SafeZone";
import { BE_VIETNAM_PRO } from "../styles";
import { RouteOptimizerSceneProps } from "../types";

const CORE = { x: 430, y: 425 };
const SIGNAL_WIDTH = 240;
const SIGNAL_HEIGHT = 84;
const SIGNAL_ORBIT_RADIUS = 280;
const SIGNAL_ANGLES = [-90, -18, 54, 126, 198];
const SIGNAL_POSITIONS = SIGNAL_ANGLES.map((angle) => {
  const radians = (angle * Math.PI) / 180;
  return {
    x: CORE.x + Math.cos(radians) * SIGNAL_ORBIT_RADIUS - SIGNAL_WIDTH / 2,
    y: CORE.y + Math.sin(radians) * SIGNAL_ORBIT_RADIUS - SIGNAL_HEIGHT / 2,
  };
});

const connectorFor = (position: { x: number; y: number }, coreRadius: number) => {
  const centerX = position.x + SIGNAL_WIDTH / 2;
  const centerY = position.y + SIGNAL_HEIGHT / 2;
  const dx = CORE.x - centerX;
  const dy = CORE.y - centerY;
  const distance = Math.hypot(dx, dy);
  const ux = dx / distance;
  const uy = dy / distance;
  const horizontalExit = Math.abs(ux) > 1e-6 ? SIGNAL_WIDTH / 2 / Math.abs(ux) : Number.POSITIVE_INFINITY;
  const verticalExit = Math.abs(uy) > 1e-6 ? SIGNAL_HEIGHT / 2 / Math.abs(uy) : Number.POSITIVE_INFINITY;
  const boxExit = Math.min(horizontalExit, verticalExit);
  return {
    x1: centerX + ux * boxExit,
    y1: centerY + uy * boxExit,
    x2: CORE.x - ux * coreRadius,
    y2: CORE.y - uy * coreRadius,
  };
};

export const RouteOptimizerScene: React.FC<RouteOptimizerSceneProps> = ({
  headline,
  signals,
  candidates,
  outputLabel,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = frame / Math.max(1, durationInFrames - 1);
  const corePulse = 1 + Math.sin(frame / 7) * 0.045;
  const scanAngle = frame * 2.4;
  const candidatesOpacity = interpolate(progress, [0.38, 0.5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const winnerIndex = candidates.findIndex((candidate) => candidate.selected);
  const winnerReveal = interpolate(progress, [0.72, 0.86], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: "radial-gradient(circle at 50% 38%, #123428 0%, #06120d 55%, #020705 100%)",
        color: "white",
        fontFamily: BE_VIETNAM_PRO,
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", inset: 0, opacity: 0.15, backgroundImage: "radial-gradient(circle, #61dafb 1.4px, transparent 1.4px)", backgroundSize: "34px 34px" }} />
      <SafeZone style={{ alignItems: "center", justifyContent: "center", gap: 28 }}>
        <div style={{ fontSize: 42, fontWeight: 900, lineHeight: 1.15, textAlign: "center", whiteSpace: "nowrap", letterSpacing: "-0.025em" }}>{headline}</div>

        <div style={{ position: "relative", width: 860, height: 800 }}>
          <svg width="860" height="800" viewBox="0 0 860 800" style={{ position: "absolute", inset: 0 }}>
            <defs>
              <filter id="optimizer-glow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="12" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <radialGradient id="core-fill">
                <stop offset="0%" stopColor="#164e3a" />
                <stop offset="100%" stopColor="#071a12" />
              </radialGradient>
            </defs>

            {signals.map((signal, index) => {
              const position = SIGNAL_POSITIONS[index % SIGNAL_POSITIONS.length];
              const start = index * 12;
              const beam = interpolate(frame, [start + 18, start + 52], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              const particleT = ((frame - start) % 55) / 55;
              const connector = connectorFor(position, 128 * corePulse);
              const px = connector.x1 + (connector.x2 - connector.x1) * particleT;
              const py = connector.y1 + (connector.y2 - connector.y1) * particleT;
              return (
                <g key={signal.label} opacity={beam}>
                  <line x1={connector.x1} y1={connector.y1} x2={connector.x2} y2={connector.y2} stroke={signal.color} strokeWidth="3" strokeOpacity="0.24" strokeDasharray="10 12" />
                  <circle cx={px} cy={py} r="7" fill={signal.color} filter="url(#optimizer-glow)" />
                </g>
              );
            })}

            <g transform={`translate(${CORE.x} ${CORE.y}) scale(${corePulse})`} filter="url(#optimizer-glow)">
              <circle r="128" fill="none" stroke="#00d967" strokeWidth="3" strokeDasharray="14 12" transform={`rotate(${scanAngle})`} opacity="0.5" />
              <circle r="102" fill="url(#core-fill)" stroke="#00d967" strokeWidth="5" />
              <path d={`M 0 0 L 0 -96 A 96 96 0 0 1 ${Math.sin(scanAngle * Math.PI / 180) * 96} ${-Math.cos(scanAngle * Math.PI / 180) * 96} Z`} fill="rgba(0,217,103,.13)" />
              <text x="0" y="8" textAnchor="middle" fill="white" fontSize="20" fontWeight="900">TỐI ƯU TUYẾN</text>
            </g>
          </svg>

          {signals.map((signal, index) => {
            const position = SIGNAL_POSITIONS[index % SIGNAL_POSITIONS.length];
            const enter = spring({ frame: frame - index * 12, fps, config: { damping: 15, stiffness: 160 } });
            return (
              <div
                key={signal.label}
                data-layout-audit={`optimizer-signal-${index}`}
                style={{
                  position: "absolute",
                  left: position.x,
                  top: position.y,
                  width: SIGNAL_WIDTH,
                  height: SIGNAL_HEIGHT,
                  boxSizing: "border-box",
                  borderRadius: 22,
                  padding: "12px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  background: "rgba(255,255,255,.08)",
                  border: `2px solid ${signal.color}66`,
                  boxShadow: `0 0 28px ${signal.color}24`,
                  opacity: enter,
                  transform: `scale(${enter})`,
                }}
              >
                <span style={{ flexShrink: 0, fontSize: 30, lineHeight: 1 }}>{signal.icon}</span>
                <span style={{ fontSize: signal.label.length > 16 ? 15 : 18, lineHeight: 1, fontWeight: 750, whiteSpace: "nowrap", textAlign: "center" }}>{signal.label}</span>
              </div>
            );
          })}
        </div>

        <div style={{ width: 860, opacity: candidatesOpacity }}>
          <div style={{ marginBottom: 16, fontSize: 21, color: "rgba(255,255,255,.62)", fontWeight: 800, letterSpacing: 1.5, textAlign: "center", whiteSpace: "nowrap" }}>
            BA CÁCH GHÉP TUYẾN
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {candidates.map((candidate, index) => {
              const scoreProgress = interpolate(progress, [0.44 + index * 0.05, 0.7 + index * 0.03], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              const selected = index === winnerIndex;
              const selectedGlow = selected ? winnerReveal : 0;
              return (
                <div
                  key={candidate.label}
                  data-layout-audit={`optimizer-candidate-${index}`}
                  style={{
                    position: "relative",
                    minHeight: 205,
                    borderRadius: 26,
                    padding: "20px",
                    overflow: "hidden",
                    background: selected ? `rgba(0,217,103,${0.08 + selectedGlow * 0.12})` : "rgba(255,255,255,.06)",
                    border: `${selected ? 3 : 1}px solid ${selected ? "#00d967" : "rgba(255,255,255,.15)"}`,
                    boxShadow: selected ? `0 0 ${45 * selectedGlow}px rgba(0,217,103,.45)` : undefined,
                  }}
                >
                  <div style={{ fontSize: 21, fontWeight: 850, whiteSpace: "nowrap" }}>{candidate.label}</div>
                  <svg width="100%" height="72" viewBox="0 0 220 72" style={{ marginTop: 10 }}>
                    <path d={candidate.path} fill="none" stroke={selected ? "#00d967" : "#61dafb"} strokeWidth="7" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - scoreProgress} />
                    <circle cx="15" cy="52" r="8" fill="#f59e0b" />
                    <circle cx="205" cy="18" r="8" fill="#00d967" />
                  </svg>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ color: "rgba(255,255,255,.55)", fontSize: 18 }}>SCORE</span>
                    <span style={{ color: selected ? "#8cebb7" : "white", fontSize: 34, fontWeight: 950 }}>{Math.round(candidate.score * scoreProgress)}</span>
                  </div>
                  {selected && winnerReveal > 0.5 && (
                    <div style={{ position: "absolute", top: 12, right: 12, padding: "6px 10px", borderRadius: 999, background: "#00d967", color: "#041009", fontSize: 15, fontWeight: 950 }}>CHỌN</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ minHeight: 58, color: "#8cebb7", fontSize: 31, fontWeight: 900, opacity: winnerReveal, textAlign: "center", whiteSpace: "nowrap" }}>
          {outputLabel}
        </div>
      </SafeZone>
    </AbsoluteFill>
  );
};
