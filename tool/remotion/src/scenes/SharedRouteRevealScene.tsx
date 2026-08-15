import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { SafeZone } from "../SafeZone";
import { BE_VIETNAM_PRO } from "../styles";
import { SharedRouteRevealSceneProps } from "../types";

const MAP_W = 820;
const MAP_H = 940;

const lerpPoint = (
  start: { x: number; y: number },
  end: { x: number; y: number },
  progress: number
) => ({
  x: start.x + (end.x - start.x) * progress,
  y: start.y + (end.y - start.y) * progress,
});

export const SharedRouteRevealScene: React.FC<SharedRouteRevealSceneProps> = ({
  headline,
  detourLabel,
  revealText,
  restaurantLabel = "Cơm gà",
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = frame / Math.max(1, durationInFrames - 1);
  const restaurant = { x: 135, y: 150 };
  const junction = { x: 390, y: 430 };
  const extraPickup = { x: 680, y: 330 };
  const home = { x: 620, y: 800 };

  const driver =
    progress < 0.34
      ? lerpPoint(restaurant, junction, progress / 0.34)
      : progress < 0.62
        ? lerpPoint(junction, extraPickup, (progress - 0.34) / 0.28)
        : lerpPoint(extraPickup, home, (progress - 0.62) / 0.38);

  const detourProgress = interpolate(progress, [0.31, 0.62], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const finalProgress = interpolate(progress, [0.58, 0.96], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const notification = spring({
    frame: frame - durationInFrames * 0.3,
    fps,
    config: { damping: 16, stiffness: 170 },
  });
  const revealOpacity = interpolate(progress, [0.7, 0.82], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(155deg, #f8fbf9 0%, #e7f5ed 100%)",
        fontFamily: BE_VIETNAM_PRO,
        color: "#102019",
      }}
    >
      <SafeZone style={{ alignItems: "center", justifyContent: "center", gap: 34 }}>
        <div style={{ fontSize: 50, lineHeight: 1.15, fontWeight: 900, textAlign: "center" }}>
          {headline}
        </div>

        <div
          style={{
            position: "relative",
            width: MAP_W,
            height: MAP_H,
            overflow: "hidden",
            borderRadius: 46,
            background: "#eef3ef",
            border: "10px solid #13231b",
            boxShadow: "0 30px 80px rgba(16,32,25,0.2)",
          }}
        >
          <svg width={MAP_W} height={MAP_H} viewBox={`0 0 ${MAP_W} ${MAP_H}`}>
            <defs>
              <pattern id="map-grid" width="80" height="80" patternUnits="userSpaceOnUse">
                <path d="M 80 0 L 0 0 0 80" fill="none" stroke="#d8e0da" strokeWidth="2" />
              </pattern>
              <filter id="driver-glow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="10" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            <rect width={MAP_W} height={MAP_H} fill="url(#map-grid)" />
            <path d="M 80 80 C 210 260, 280 330, 390 430 C 470 560, 540 690, 620 800" fill="none" stroke="#c7d1ca" strokeWidth="44" strokeLinecap="round" />
            <path d="M 390 430 C 500 390, 590 350, 680 330 C 700 520, 660 680, 620 800" fill="none" stroke="#c7d1ca" strokeWidth="44" strokeLinecap="round" />
            <path d="M 135 150 L 390 430" fill="none" stroke="#00b14f" strokeWidth="13" strokeLinecap="round" />
            <path
              d="M 390 430 Q 550 350 680 330"
              fill="none"
              stroke="#00b14f"
              strokeWidth="13"
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - detourProgress}
            />
            <path
              d="M 680 330 Q 700 600 620 800"
              fill="none"
              stroke="#00b14f"
              strokeWidth="13"
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - finalProgress}
            />

            {[
              { ...restaurant, label: restaurantLabel, color: "#f59e0b" },
              { ...extraPickup, label: "Lấy thêm đơn", color: "#61dafb" },
              { ...home, label: "Nhà bạn", color: "#111827" },
            ].map((pin) => (
              <g key={pin.label}>
                <circle cx={pin.x} cy={pin.y} r="25" fill={pin.color} stroke="white" strokeWidth="8" />
                <rect x={pin.x - 92} y={pin.y + 34} width="184" height="48" rx="18" fill="white" stroke="#d7dfda" />
                <text x={pin.x} y={pin.y + 66} textAnchor="middle" fontSize="20" fontWeight="800" fill="#15231b">
                  {pin.label}
                </text>
              </g>
            ))}

            <g transform={`translate(${driver.x} ${driver.y})`} filter="url(#driver-glow)">
              <circle r="34" fill="#00b14f" stroke="white" strokeWidth="8" />
              <text x="0" y="10" textAnchor="middle" fontSize="29">🛵</text>
            </g>
          </svg>

          <div
            style={{
              position: "absolute",
              top: 70,
              left: 70,
              right: 70,
              padding: "22px 26px",
              borderRadius: 24,
              background: "#102019",
              color: "white",
              fontSize: 27,
              fontWeight: 800,
              boxShadow: "0 18px 50px rgba(0,0,0,0.25)",
              opacity: notification,
              transform: `translateY(${(1 - notification) * -55}px) scale(${notification})`,
            }}
          >
            <span style={{ color: "#61dafb" }}>+1 đơn phù hợp</span>
            <span style={{ float: "right" }}>{detourLabel}</span>
          </div>
        </div>

        <div
          style={{
            minHeight: 120,
            fontSize: 43,
            lineHeight: 1.2,
            fontWeight: 900,
            textAlign: "center",
            opacity: revealOpacity,
          }}
        >
          Không đi sai đường.
          <br />
          <span style={{ color: "#00a648" }}>{revealText}</span>
        </div>
      </SafeZone>
    </AbsoluteFill>
  );
};
