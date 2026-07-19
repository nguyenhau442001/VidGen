import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { FalseCompletionSceneProps } from "../types";
import { SafeZone } from "../SafeZone";
import { BE_VIETNAM_PRO } from "../styles";
import { p2Colors, P2Icons } from "./grabfoodP2Palette";

const CONFETTI_POSITIONS = [
  { x: 200, y: 300, delay: 0 }, { x: 800, y: 260, delay: 4 }, { x: 500, y: 200, delay: 8 },
  { x: 350, y: 420, delay: 2 }, { x: 700, y: 400, delay: 10 }, { x: 900, y: 340, delay: 6 },
];

export const FalseCompletionShot: React.FC<FalseCompletionSceneProps> = ({
  completedLabel,
  driverStatusLabel,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const cutFrame = Math.round(durationInFrames * 0.45);

  const celebrationOpacity = interpolate(frame, [cutFrame - 10, cutFrame], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const revealOpacity = interpolate(frame, [cutFrame, cutFrame + 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const routeStretch = interpolate(frame, [cutFrame + 15, durationInFrames - 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitOpacity = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: p2Colors.bg, opacity: exitOpacity, fontFamily: BE_VIETNAM_PRO, overflow: "hidden" }}>
      {/* Celebration phase */}
      <div style={{ position: "absolute", inset: 0, opacity: celebrationOpacity }}>
        {CONFETTI_POSITIONS.map((c, i) => {
          const fall = interpolate(frame, [c.delay, c.delay + 40], [0, 140], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const fadeIn = interpolate(frame, [c.delay, c.delay + 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div key={i} style={{ position: "absolute", left: c.x, top: c.y + fall, opacity: fadeIn }}>
              <P2Icons.Confetti size={26} />
            </div>
          );
        })}
        <SafeZone style={{ justifyContent: "center", alignItems: "center" }}>
          <div
            style={{
              padding: "26px 40px",
              borderRadius: 22,
              background: p2Colors.grabDim,
              border: `2px solid ${p2Colors.grab}`,
              fontSize: 32,
              fontWeight: 900,
              color: p2Colors.textPrimary,
              textAlign: "center",
            }}
          >
            {completedLabel}
          </div>
        </SafeZone>
      </div>

      {/* Cold reveal phase */}
      <div style={{ position: "absolute", inset: 0, opacity: revealOpacity }}>
        <svg width="1080" height="1920" style={{ position: "absolute", inset: 0 }}>
          <path
            d="M 540 600 Q 460 1000 620 1400 Q 700 1650 540 1850"
            stroke={p2Colors.warmHome}
            strokeWidth="5"
            fill="none"
            strokeDasharray="1000"
            strokeDashoffset={1000 * (1 - routeStretch)}
            opacity={0.75}
          />
        </svg>
        <SafeZone style={{ justifyContent: "flex-end", alignItems: "center" }}>
          <div
            style={{
              padding: "20px 32px",
              borderRadius: 18,
              background: "rgba(239,68,68,0.12)",
              border: `2px solid ${p2Colors.danger}`,
              fontSize: 26,
              fontWeight: 800,
              color: p2Colors.textPrimary,
              textAlign: "center",
            }}
          >
            {driverStatusLabel}
          </div>
        </SafeZone>
      </div>
    </AbsoluteFill>
  );
};

export default FalseCompletionShot;
