import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { SafeZone } from "../SafeZone";
import { BE_VIETNAM_PRO } from "../styles";
import { JourneyPerspectiveSceneProps } from "../types";

const FOREST = "#177245";
const INK = "#14231b";

export const JourneyPerspectiveScene: React.FC<JourneyPerspectiveSceneProps> = ({
  customerHeadline,
  systemHeadline,
  distanceLabel,
  factors,
  closingLine,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = frame / Math.max(1, durationInFrames - 1);
  const reveal = interpolate(progress, [0.22, 0.5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const mapOpacity = interpolate(progress, [0.3, 0.5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const closingOpacity = interpolate(progress, [0.76, 0.9], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const routeDraw = interpolate(progress, [0.42, 0.78], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: "radial-gradient(circle at 55% 35%, #f7fbf8 0%, #e7f0ea 68%, #dae7df 100%)",
        color: INK,
        fontFamily: BE_VIETNAM_PRO,
        overflow: "hidden",
      }}
    >
      <SafeZone style={{ alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            position: "absolute",
            top: 170,
            left: 0,
            right: 0,
            fontSize: 49,
            lineHeight: 1.12,
            fontWeight: 900,
            textAlign: "center",
          }}
        >
          <span style={{ opacity: 1 - reveal }}>{customerHeadline}</span>
          <span style={{ position: "absolute", inset: 0, color: FOREST, opacity: reveal }}>{systemHeadline}</span>
        </div>

        <div
          style={{
            position: "absolute",
            left: interpolate(reveal, [0, 1], [90, 98]),
            top: interpolate(reveal, [0, 1], [440, 350]),
            width: interpolate(reveal, [0, 1], [840, 310]),
            height: interpolate(reveal, [0, 1], [650, 390]),
            borderRadius: interpolate(reveal, [0, 1], [46, 30]),
            background: "rgba(255,255,255,.92)",
            border: "2px solid rgba(20,35,27,.1)",
            boxShadow: "0 24px 70px rgba(20,35,27,.16)",
            zIndex: 3,
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", top: 28, left: 0, right: 0, textAlign: "center", color: "rgba(20,35,27,.48)", fontSize: interpolate(reveal, [0, 1], [24, 16]), fontWeight: 800, letterSpacing: 1.2 }}>
            GÓC NHÌN CỦA BẠN
          </div>
          <svg width="100%" height="100%" viewBox="0 0 840 650" preserveAspectRatio="none">
            <line x1="160" y1="340" x2="680" y2="340" stroke="#d3ddd6" strokeWidth="30" strokeLinecap="round" />
            <line x1="160" y1="340" x2="680" y2="340" stroke={FOREST} strokeWidth="8" strokeDasharray="18 14" strokeLinecap="round" />
            <circle cx="150" cy="340" r="38" fill="#f59e0b" stroke="white" strokeWidth="10" />
            <circle cx="690" cy="340" r="38" fill={INK} stroke="white" strokeWidth="10" />
            <text x="150" y="420" textAnchor="middle" fill={INK} fontSize="30" fontWeight="850">QUÁN</text>
            <text x="690" y="420" textAnchor="middle" fill={INK} fontSize="30" fontWeight="850">NHÀ</text>
          </svg>
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: interpolate(reveal, [0, 1], [190, 135]),
              textAlign: "center",
              color: FOREST,
              fontSize: interpolate(reveal, [0, 1], [92, 52]),
              fontWeight: 950,
              letterSpacing: "-0.05em",
            }}
          >
            {distanceLabel}
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            left: 440,
            top: 330,
            width: 540,
            height: 770,
            borderRadius: 40,
            background: "rgba(13,31,22,.96)",
            boxShadow: "0 30px 90px rgba(13,31,22,.28)",
            opacity: mapOpacity,
            transform: `translateX(${(1 - reveal) * 100}px)`,
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", inset: 0, opacity: 0.15, backgroundImage: "linear-gradient(rgba(255,255,255,.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.18) 1px, transparent 1px)", backgroundSize: "58px 58px" }} />
          <svg width="540" height="770" viewBox="0 0 540 770" style={{ position: "absolute", inset: 0 }}>
            <defs>
              <filter id="journey-glow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="8" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            <path d="M 70 610 C 130 470 80 300 230 230 C 350 175 390 380 470 140" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="34" strokeLinecap="round" />
            <path d="M 70 610 C 130 470 80 300 230 230 C 350 175 390 380 470 140" fill="none" stroke="#58a77b" strokeWidth="10" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - routeDraw} />
            <path d="M 230 230 C 300 330 400 520 455 650" fill="none" stroke="#61a5c2" strokeWidth="6" strokeDasharray="12 10" opacity={routeDraw} />
            {[
              { x: 70, y: 610, color: "#f59e0b", label: "Tài xế" },
              { x: 145, y: 365, color: "#e879f9", label: "Điểm lấy" },
              { x: 230, y: 230, color: "#61a5c2", label: "Giao 1" },
              { x: 470, y: 140, color: "#58a77b", label: "Nhà bạn" },
              { x: 455, y: 650, color: "#f472b6", label: "Giao 2" },
            ].map((node, index) => {
              const enter = spring({ frame: frame - durationInFrames * 0.3 - index * 12, fps, config: { damping: 15, stiffness: 160 } });
              return (
                <g key={node.label} transform={`translate(${node.x} ${node.y}) scale(${enter})`} opacity={enter}>
                  <circle r="24" fill={node.color} stroke="white" strokeWidth="7" filter="url(#journey-glow)" />
                  <rect x="-55" y="35" width="110" height="34" rx="12" fill="rgba(255,255,255,.94)" />
                  <text x="0" y="58" textAnchor="middle" fill={INK} fontSize="15" fontWeight="850">{node.label}</text>
                </g>
              );
            })}
          </svg>
        </div>

        <div style={{ position: "absolute", left: 96, right: 96, top: 1140, display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap", opacity: mapOpacity }}>
          {factors.map((factor, index) => {
            const enter = spring({ frame: frame - durationInFrames * 0.46 - index * 10, fps, config: { damping: 15, stiffness: 165 } });
            return (
              <div
                key={factor}
                style={{
                  minHeight: 58,
                  boxSizing: "border-box",
                  padding: "14px 22px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,.84)",
                  border: "1px solid rgba(23,114,69,.2)",
                  color: "#315744",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  whiteSpace: "nowrap",
                  fontSize: 24,
                  fontWeight: 750,
                  opacity: enter,
                  transform: `translateY(${(1 - enter) * 20}px)`,
                }}
              >
                {factor}
              </div>
            );
          })}
        </div>

        <div style={{ position: "absolute", bottom: 230, left: 80, right: 80, color: "#244c38", fontSize: 39, lineHeight: 1.28, fontWeight: 900, textAlign: "center", whiteSpace: "pre-line", opacity: closingOpacity }}>
          {closingLine}
        </div>
      </SafeZone>
    </AbsoluteFill>
  );
};
