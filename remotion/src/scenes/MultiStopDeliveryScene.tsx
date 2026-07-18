import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { SafeZone } from "../SafeZone";
import { BE_VIETNAM_PRO } from "../styles";
import { MultiStopDeliverySceneProps } from "../types";

const POINTS = [
  { x: 135, y: 150 },
  { x: 670, y: 330 },
  { x: 220, y: 570 },
  { x: 650, y: 820 },
];

const ROUTE_PATH = "M 135 150 C 300 150 470 330 670 330 C 530 330 390 570 220 570 C 370 570 490 820 650 820";

const positionOnRoute = (progress: number) => {
  const segmentCount = POINTS.length - 1;
  const scaled = Math.min(segmentCount - 0.0001, Math.max(0, progress * segmentCount));
  const index = Math.floor(scaled);
  const local = scaled - index;
  const start = POINTS[index];
  const end = POINTS[index + 1];
  const bend = index % 2 === 0 ? Math.sin(local * Math.PI) * 85 : -Math.sin(local * Math.PI) * 85;
  return {
    x: start.x + (end.x - start.x) * local,
    y: start.y + (end.y - start.y) * local + bend,
  };
};

export const MultiStopDeliveryScene: React.FC<MultiStopDeliverySceneProps> = ({
  stops,
  headline,
  footer,
  accentColor = "#00b14f",
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = interpolate(frame, [18, durationInFrames - 42], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const driver = positionOnRoute(progress);
  const activeIndex = Math.min(stops.length - 1, Math.floor(progress * stops.length));
  const taskSpring = spring({
    frame: frame - activeIndex * Math.max(1, durationInFrames / stops.length),
    fps,
    config: { damping: 16, stiffness: 150 },
  });
  const footerOpacity = interpolate(progress, [0.72, 0.9], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(150deg, #f7fbf8 0%, #e4f4ea 100%)",
        fontFamily: BE_VIETNAM_PRO,
        color: "#102019",
      }}
    >
      <SafeZone style={{ alignItems: "center", justifyContent: "center", gap: 28 }}>
        <div style={{ fontSize: 51, fontWeight: 900, textAlign: "center", lineHeight: 1.16 }}>
          {headline}
        </div>

        <div
          style={{
            position: "relative",
            width: 840,
            height: 1010,
            overflow: "hidden",
            borderRadius: 46,
            background: "#edf2ee",
            border: "2px solid rgba(16,32,25,0.1)",
            boxShadow: "0 28px 80px rgba(16,32,25,0.18)",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: "linear-gradient(35deg, transparent 46%, rgba(255,255,255,0.9) 47%, rgba(255,255,255,0.9) 53%, transparent 54%), linear-gradient(145deg, transparent 46%, rgba(255,255,255,0.7) 47%, rgba(255,255,255,0.7) 53%, transparent 54%)",
              backgroundSize: "190px 190px",
              opacity: 0.75,
            }}
          />

          <div
            key={activeIndex}
            style={{
              position: "absolute",
              zIndex: 4,
              top: 28,
              left: 30,
              right: 30,
              borderRadius: 24,
              padding: "20px 24px",
              display: "flex",
              alignItems: "center",
              gap: 18,
              background: "rgba(16,32,25,0.94)",
              color: "white",
              boxShadow: "0 16px 46px rgba(0,0,0,0.24)",
              opacity: taskSpring,
              transform: `translateY(${(1 - taskSpring) * -34}px)`,
            }}
          >
            <div
              style={{
                width: 58,
                height: 58,
                borderRadius: 18,
                display: "grid",
                placeItems: "center",
                background: accentColor,
                fontSize: 25,
                fontWeight: 900,
              }}
            >
              {activeIndex + 1}
            </div>
            <div>
              <div style={{ color: "#8cebb7", fontSize: 18, fontWeight: 800, letterSpacing: 1.3 }}>
                NHIỆM VỤ HIỆN TẠI
              </div>
              <div style={{ fontSize: 30, fontWeight: 850 }}>{stops[activeIndex]?.label}</div>
            </div>
            <div style={{ marginLeft: "auto", color: "#8cebb7", fontSize: 22, fontWeight: 800 }}>
              {activeIndex + 1}/{stops.length}
            </div>
          </div>

          <svg width="840" height="1010" viewBox="0 0 840 1010" style={{ position: "absolute", inset: 0 }}>
            <defs>
              <filter id="route-shadow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="9" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            <path d={ROUTE_PATH} fill="none" stroke="white" strokeWidth="38" strokeLinecap="round" />
            <path d={ROUTE_PATH} fill="none" stroke="#b8c5bc" strokeWidth="8" strokeLinecap="round" strokeDasharray="16 14" />
            <path
              d={ROUTE_PATH}
              fill="none"
              stroke={accentColor}
              strokeWidth="13"
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - progress}
              filter="url(#route-shadow)"
            />

            {POINTS.map((point, index) => {
              const threshold = index / Math.max(1, POINTS.length - 1);
              const completed = progress > threshold + 0.04;
              const active = index === activeIndex;
              const pulse = active ? 1 + Math.sin(frame / 5) * 0.08 : 1;
              return (
                <g key={stops[index]?.label ?? index} transform={`translate(${point.x} ${point.y}) scale(${pulse})`}>
                  {active && <circle r="53" fill="none" stroke={accentColor} strokeWidth="4" opacity="0.28" />}
                  <circle r="38" fill={completed ? accentColor : "white"} stroke={active || completed ? accentColor : "#9eaaa2"} strokeWidth="7" />
                  <text x="0" y="10" textAnchor="middle" fontSize="29" fontWeight="900" fill={completed ? "white" : "#173023"}>
                    {completed ? "✓" : index + 1}
                  </text>
                  <rect x={index % 2 === 0 ? 52 : -250} y="-36" width="198" height="72" rx="20" fill="rgba(255,255,255,0.96)" stroke="#d3ddd6" />
                  <text x={index % 2 === 0 ? 151 : -151} y="8" textAnchor="middle" fontSize="23" fontWeight="800" fill="#14261c">
                    {stops[index]?.label}
                  </text>
                </g>
              );
            })}

            <g transform={`translate(${driver.x} ${driver.y})`} filter="url(#route-shadow)">
              <circle r="36" fill={accentColor} stroke="white" strokeWidth="8" />
              <text x="0" y="11" textAnchor="middle" fontSize="31">🛵</text>
            </g>
          </svg>
        </div>

        <div
          style={{
            minHeight: 95,
            maxWidth: 860,
            fontSize: 39,
            lineHeight: 1.2,
            fontWeight: 900,
            textAlign: "center",
            opacity: footerOpacity,
          }}
        >
          {footer}
        </div>
      </SafeZone>
    </AbsoluteFill>
  );
};
