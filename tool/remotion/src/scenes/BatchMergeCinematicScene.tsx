import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { SafeZone } from "../SafeZone";
import { BE_VIETNAM_PRO } from "../styles";
import { BatchMergeCinematicSceneProps } from "../types";

const RED = "#ef4444";
const GREEN = "#00d967";
const CYAN = "#61dafb";

export const BatchMergeCinematicScene: React.FC<BatchMergeCinematicSceneProps> = ({
  headline,
  beforeLabel,
  afterLabel,
  stats,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = frame / Math.max(1, durationInFrames - 1);
  const mergeProgress = interpolate(progress, [0.3, 0.52], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const beforeOpacity = interpolate(progress, [0, 0.34, 0.5], [1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const afterOpacity = interpolate(progress, [0.43, 0.58], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const routeProgress = interpolate(progress, [0.5, 0.88], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const driverX = interpolate(routeProgress, [0, 1], [150, 690]);
  const driverY = 440 + Math.sin(routeProgress * Math.PI * 2) * 120;
  const ringScale = 1 + (frame % 45) / 45;
  const ringOpacity = 1 - (frame % 45) / 45;

  return (
    <AbsoluteFill
      style={{
        background: "radial-gradient(circle at 50% 42%, #172b24 0%, #07110d 55%, #020604 100%)",
        color: "white",
        fontFamily: BE_VIETNAM_PRO,
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", inset: 0, opacity: 0.12, backgroundImage: "linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)", backgroundSize: "70px 70px" }} />
      <SafeZone style={{ alignItems: "center", justifyContent: "center", gap: 34 }}>
        <div style={{ fontSize: 52, fontWeight: 900, lineHeight: 1.12, textAlign: "center", whiteSpace: "pre-line" }}>{headline}</div>

        <div style={{ position: "relative", width: 860, height: 920 }}>
          <div
            style={{
              position: "absolute",
              top: 16,
              left: 0,
              right: 0,
              textAlign: "center",
              fontSize: 24,
              fontWeight: 850,
              letterSpacing: 2,
              color: progress < 0.48 ? RED : GREEN,
            }}
          >
            {progress < 0.48 ? beforeLabel : afterLabel}
          </div>

          <svg width="860" height="720" viewBox="0 0 860 720" style={{ position: "absolute", top: 70 }}>
            <defs>
              <filter id="batch-glow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="11" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            <g opacity={beforeOpacity}>
              <path d="M 110 170 C 310 90 520 210 750 160" fill="none" stroke="rgba(239,68,68,.24)" strokeWidth="36" strokeLinecap="round" />
              <path d="M 110 170 C 310 90 520 210 750 160" fill="none" stroke={RED} strokeWidth="9" strokeDasharray="18 14" />
              <path d="M 110 470 C 330 360 500 520 750 450" fill="none" stroke="rgba(239,68,68,.24)" strokeWidth="36" strokeLinecap="round" />
              <path d="M 110 470 C 330 360 500 520 750 450" fill="none" stroke={RED} strokeWidth="9" strokeDasharray="18 14" />
              <g transform={`translate(${interpolate(progress, [0, 0.42], [120, 640], { extrapolateRight: "clamp" })} ${170 - mergeProgress * 80})`}>
                <circle r="38" fill={RED} stroke="white" strokeWidth="7" />
                <text y="11" textAnchor="middle" fontSize="31">🛵</text>
              </g>
              <g transform={`translate(${interpolate(progress, [0, 0.42], [120, 640], { extrapolateRight: "clamp" })} ${470 - mergeProgress * 220})`}>
                <circle r="38" fill={RED} stroke="white" strokeWidth="7" />
                <text y="11" textAnchor="middle" fontSize="31">🛵</text>
              </g>
              <text x="430" y="620" textAnchor="middle" fill="rgba(255,255,255,.68)" fontSize="30" fontWeight="750">
                Hai xe — hai quãng đường gần giống nhau
              </text>
            </g>

            <g opacity={interpolate(progress, [0.3, 0.4, 0.56], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}>
              <circle cx="650" cy="250" r={90 * ringScale} fill="none" stroke={CYAN} strokeWidth="5" opacity={ringOpacity} />
              <circle cx="650" cy="250" r="90" fill="rgba(97,218,251,.13)" stroke={CYAN} strokeWidth="4" filter="url(#batch-glow)" />
              <text x="650" y="242" textAnchor="middle" fill={CYAN} fontSize="24" fontWeight="900">BATCHING</text>
              <text x="650" y="275" textAnchor="middle" fill="white" fontSize="18" fontWeight="700">GỘP TUYẾN</text>
            </g>

            <g opacity={afterOpacity}>
              <path d="M 110 440 C 270 300 430 560 750 330" fill="none" stroke="rgba(0,217,103,.2)" strokeWidth="52" strokeLinecap="round" filter="url(#batch-glow)" />
              <path
                d="M 110 440 C 270 300 430 560 750 330"
                fill="none"
                stroke={GREEN}
                strokeWidth="14"
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1 - routeProgress}
              />
              {[{ x: 110, y: 440, t: "Lấy A" }, { x: 365, y: 425, t: "Lấy B" }, { x: 560, y: 430, t: "Giao A" }, { x: 750, y: 330, t: "Giao B" }].map((stop) => (
                <g key={stop.t}>
                  <circle cx={stop.x} cy={stop.y} r="23" fill="#07110d" stroke={GREEN} strokeWidth="7" />
                  <text x={stop.x} y={stop.y + 57} textAnchor="middle" fill="white" fontSize="18" fontWeight="750">{stop.t}</text>
                </g>
              ))}
              <g transform={`translate(${driverX} ${driverY})`} filter="url(#batch-glow)">
                <circle r="40" fill={GREEN} stroke="white" strokeWidth="8" />
                <text y="12" textAnchor="middle" fontSize="33">🛵</text>
              </g>
            </g>
          </svg>

          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {stats.map((stat, index) => {
              const start = durationInFrames * 0.58 + index * 20;
              const pop = spring({ frame: frame - start, fps, config: { damping: 14, stiffness: 170 } });
              return (
                <div
                  key={stat.label}
                  style={{
                    minHeight: 150,
                    borderRadius: 26,
                    padding: "22px 14px",
                    background: "rgba(255,255,255,.08)",
                    border: "1px solid rgba(255,255,255,.14)",
                    textAlign: "center",
                    opacity: pop,
                    transform: `scale(${pop})`,
                  }}
                >
                  <div style={{ fontSize: 40, color: index === 0 ? CYAN : GREEN, fontWeight: 950 }}>{stat.value}</div>
                  <div style={{ marginTop: 10, fontSize: 21, color: "rgba(255,255,255,.7)", fontWeight: 700 }}>{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </SafeZone>
    </AbsoluteFill>
  );
};
