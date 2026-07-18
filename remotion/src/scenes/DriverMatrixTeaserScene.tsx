import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { SafeZone } from "../SafeZone";
import { BE_VIETNAM_PRO } from "../styles";
import { DriverMatrixTeaserSceneProps } from "../types";

const CYAN = "#5ee7f5";
const GREEN = "#20e37d";
const CORE = { x: 430, y: 480 };
const NODE_WIDTH = 250;
const NODE_HEIGHT = 112;
const NODE_ORBIT_RADIUS = 300;
const NODE_ANGLES = [-90, -18, 54, 126, 198];
const NODE_POSITIONS = NODE_ANGLES.map((angle) => {
  const radians = (angle * Math.PI) / 180;
  return {
    x: CORE.x + Math.cos(radians) * NODE_ORBIT_RADIUS - NODE_WIDTH / 2,
    y: CORE.y + Math.sin(radians) * NODE_ORBIT_RADIUS - NODE_HEIGHT / 2,
  };
});

const connectorFor = (position: { x: number; y: number }, coreRadius: number) => {
  const centerX = position.x + NODE_WIDTH / 2;
  const centerY = position.y + NODE_HEIGHT / 2;
  const dx = CORE.x - centerX;
  const dy = CORE.y - centerY;
  const distance = Math.hypot(dx, dy);
  const ux = dx / distance;
  const uy = dy / distance;
  const horizontalExit = Math.abs(ux) > 1e-6 ? NODE_WIDTH / 2 / Math.abs(ux) : Number.POSITIVE_INFINITY;
  const verticalExit = Math.abs(uy) > 1e-6 ? NODE_HEIGHT / 2 / Math.abs(uy) : Number.POSITIVE_INFINITY;
  const boxExit = Math.min(horizontalExit, verticalExit);
  return {
    x1: centerX + ux * boxExit,
    y1: centerY + uy * boxExit,
    x2: CORE.x - ux * coreRadius,
    y2: CORE.y - uy * coreRadius,
  };
};

export const DriverMatrixTeaserScene: React.FC<DriverMatrixTeaserSceneProps> = ({
  eyebrow,
  title,
  notificationText,
  nodes,
  pulseText,
  question,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = frame / Math.max(1, durationInFrames - 1);
  const wake = interpolate(progress, [0.05, 0.13], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const notification = spring({ frame: frame - durationInFrames * 0.09, fps, config: { damping: 13, stiffness: 190 } });
  const shake = progress > 0.09 && progress < 0.2 ? Math.sin(frame * 1.8) * 7 * (1 - notification) : 0;
  const networkOpacity = interpolate(progress, [0.2, 0.38], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const finalOpacity = interpolate(progress, [0.72, 0.86], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scanY = interpolate((frame % 90) / 90, [0, 1], [240, 1160]);
  const glitch = Math.sin(frame * 2.7) > 0.86 ? 7 : 0;

  return (
    <AbsoluteFill
      style={{
        background: "radial-gradient(circle at 50% 46%, #0b2930 0%, #041116 52%, #010608 100%)",
        color: "white",
        fontFamily: BE_VIETNAM_PRO,
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", inset: 0, opacity: 0.2 * wake, backgroundImage: "linear-gradient(rgba(94,231,245,.16) 1px, transparent 1px), linear-gradient(90deg, rgba(94,231,245,.16) 1px, transparent 1px)", backgroundSize: "54px 54px" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: scanY, height: 3, background: `linear-gradient(90deg, transparent, ${CYAN}, transparent)`, boxShadow: `0 0 28px ${CYAN}`, opacity: 0.5 * networkOpacity }} />

      <SafeZone style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "absolute", top: 170, left: 0, right: 0, textAlign: "center", opacity: wake }}>
          <div style={{ color: CYAN, fontSize: 20, fontWeight: 850, letterSpacing: 3.5 }}>{eyebrow}</div>
          <div style={{ position: "relative", marginTop: 15, fontSize: 44, lineHeight: 1.12, fontWeight: 950 }}>
            <span style={{ position: "absolute", left: glitch, right: -glitch, color: "#ff3b8d", opacity: glitch ? 0.5 : 0 }}>{title}</span>
            <span style={{ position: "relative", textShadow: `0 0 24px rgba(94,231,245,.35)` }}>{title}</span>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            zIndex: 5,
            top: 330,
            width: 700,
            borderRadius: 28,
            padding: "22px 28px",
            display: "flex",
            alignItems: "center",
            gap: 20,
            background: "rgba(8,30,36,.96)",
            border: `2px solid ${GREEN}`,
            boxShadow: `0 0 45px rgba(32,227,125,.3)`,
            opacity: notification,
            transform: `translateY(${(1 - notification) * -70}px) translateX(${shake}px) scale(${notification})`,
          }}
        >
          <div style={{ width: 60, height: 60, borderRadius: 20, display: "grid", placeItems: "center", background: GREEN, color: "#03110a", fontSize: 30 }}>⚡</div>
          <div>
            <div style={{ color: "rgba(255,255,255,.55)", fontSize: 17, fontWeight: 750, letterSpacing: 1.3 }}>THÔNG BÁO MỚI</div>
            <div style={{ marginTop: 3, fontSize: 29, fontWeight: 900 }}>{notificationText}</div>
          </div>
          <div style={{ marginLeft: "auto", width: 13, height: 13, borderRadius: 99, background: GREEN, boxShadow: `0 0 18px ${GREEN}` }} />
        </div>

        <div style={{ position: "absolute", top: 450, width: 860, height: 900, opacity: networkOpacity }}>
          <svg width="860" height="900" viewBox="0 0 860 900" style={{ position: "absolute", inset: 0 }}>
            <defs>
              <filter id="matrix-glow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="8" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            {NODE_POSITIONS.slice(0, nodes.length).map((position, index) => {
              const connector = connectorFor(position, 112);
              const draw = interpolate(frame, [durationInFrames * 0.22 + index * 12, durationInFrames * 0.36 + index * 12], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              return (
                <line
                  key={index}
                  x1={connector.x1}
                  y1={connector.y1}
                  x2={connector.x2}
                  y2={connector.y2}
                  stroke={index === 3 ? GREEN : CYAN}
                  strokeWidth="3"
                  strokeOpacity="0.38"
                  pathLength={1}
                  strokeDasharray="0.04 0.04"
                  strokeDashoffset={1 - draw}
                />
              );
            })}
            <circle cx={CORE.x} cy={CORE.y} r={105 + Math.sin(frame / 8) * 8} fill="rgba(32,227,125,.08)" stroke={GREEN} strokeWidth="4" filter="url(#matrix-glow)" />
            <circle cx={CORE.x} cy={CORE.y} r="70" fill="rgba(3,15,11,.94)" stroke="rgba(255,255,255,.2)" strokeWidth="2" />
            <text x={CORE.x} y="472" textAnchor="middle" fill="white" fontSize="42">🛵</text>
            <text x={CORE.x} y="520" textAnchor="middle" fill={GREEN} fontSize="17" fontWeight="900">TÀI XẾ</text>
          </svg>

          {nodes.map((node, index) => {
            const position = NODE_POSITIONS[index % NODE_POSITIONS.length];
            const enter = spring({ frame: frame - durationInFrames * 0.2 - index * 14, fps, config: { damping: 14, stiffness: 170 } });
            const active = index === 3;
            return (
              <div
                key={node.label}
                style={{
                  position: "absolute",
                  left: position.x,
                  top: position.y,
                  width: NODE_WIDTH,
                  height: NODE_HEIGHT,
                  borderRadius: 23,
                  boxSizing: "border-box",
                  padding: "15px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 13,
                  background: active ? "rgba(32,227,125,.13)" : "rgba(94,231,245,.07)",
                  border: `2px solid ${active ? GREEN : "rgba(94,231,245,.38)"}`,
                  boxShadow: active ? `0 0 36px rgba(32,227,125,.3)` : undefined,
                  opacity: enter,
                  transform: `scale(${enter})`,
                }}
              >
                <span style={{ fontSize: 29 }}>{node.icon}</span>
                <span style={{ fontSize: node.label.length > 19 ? 15 : 18, lineHeight: 1, fontWeight: 800, textAlign: "center", whiteSpace: "nowrap" }}>{node.label}</span>
              </div>
            );
          })}
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 330,
            padding: "16px 28px",
            borderRadius: 999,
            background: "rgba(32,227,125,.12)",
            border: `2px solid ${GREEN}`,
            color: GREEN,
            fontSize: 28,
            fontWeight: 950,
            opacity: finalOpacity,
            transform: `scale(${1 + Math.sin(frame / 5) * 0.04})`,
            boxShadow: `0 0 35px rgba(32,227,125,.25)`,
          }}
        >
          {pulseText}
        </div>
        <div style={{ position: "absolute", bottom: 220, left: 70, right: 70, fontSize: 34, lineHeight: 1.2, fontWeight: 900, textAlign: "center", opacity: finalOpacity }}>
          {question}
        </div>
      </SafeZone>
    </AbsoluteFill>
  );
};
