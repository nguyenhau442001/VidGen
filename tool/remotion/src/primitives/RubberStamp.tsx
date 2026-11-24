import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

interface RubberStampProps {
  text: string;
  startFrame?: number;
  color?: string; // default red ink "#e63946"
  rotationDeg?: number; // e.g. -12deg
  size?: "sm" | "md" | "lg";
}

/**
 * RubberStamp
 * Slams down an authentic ink-stamp seal onto evidence or document cards.
 * Produces an immediate visual punch and natural sound-design sync beat.
 */
export const RubberStamp: React.FC<RubberStampProps> = ({
  text,
  startFrame = 15,
  color = "#e63946",
  rotationDeg = -11,
  size = "md",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const relFrame = Math.max(0, frame - startFrame);
  if (frame < startFrame) return null;

  const slam = spring({
    frame: relFrame,
    fps,
    config: { damping: 14, mass: 0.9, stiffness: 220 },
  });

  // Scale from huge down to 1 with slight overshoot
  const scale = interpolate(slam, [0, 1], [2.4, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const opacity = interpolate(slam, [0, 0.4, 1], [0, 0.85, 0.92], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const fontSizes = { sm: 26, md: 36, lg: 52 };
  const paddings = { sm: "6px 14px", md: "8px 22px", lg: "14px 34px" };
  const borderSizes = { sm: 3, md: 4, lg: 6 };

  return (
    <div
      style={{
        display: "inline-block",
        transform: `scale(${scale}) rotate(${rotationDeg}deg)`,
        opacity,
        border: `${borderSizes[size]}px solid ${color}`,
        borderRadius: 8,
        padding: paddings[size],
        color,
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: 900,
        fontSize: fontSizes[size],
        textTransform: "uppercase",
        letterSpacing: "0.14em",
        textAlign: "center",
        boxShadow: `inset 0 0 0 2px ${color}33, 0 8px 24px rgba(0,0,0,0.18)`,
        mixBlendMode: "multiply",
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      {text}
    </div>
  );
};
