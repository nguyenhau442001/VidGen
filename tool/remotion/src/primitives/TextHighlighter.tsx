import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

interface TextHighlighterProps {
  children: React.ReactNode;
  active?: boolean;
  startFrame?: number;
  color?: string; // default fluorescent yellow
  heightRatio?: number; // 0.4 to 1.0
  rotationDeg?: number;
}

/**
 * TextHighlighter
 * Renders a tactile, animated marker stroke behind key text words.
 * Feels authentic and investigative, like marking an official document with a highlighter pen.
 */
export const TextHighlighter: React.FC<TextHighlighterProps> = ({
  children,
  active = true,
  startFrame = 10,
  color = "rgba(255, 230, 0, 0.55)",
  heightRatio = 0.58,
  rotationDeg = -0.75,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = active
    ? spring({
        frame: Math.max(0, frame - startFrame),
        fps,
        config: { damping: 16, mass: 0.6, stiffness: 120 },
      })
    : 0;

  const widthPercent = interpolate(progress, [0, 1], [0, 102], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <span
      style={{
        position: "relative",
        display: "inline-block",
        whiteSpace: "pre-wrap",
      }}
    >
      {/* Marker Stroke */}
      <span
        style={{
          position: "absolute",
          left: "-2%",
          bottom: "10%",
          width: `${widthPercent}%`,
          height: `${heightRatio * 100}%`,
          backgroundColor: color,
          borderRadius: "3px 7px 4px 6px",
          transform: `rotate(${rotationDeg}deg)`,
          transformOrigin: "left center",
          zIndex: 0,
          pointerEvents: "none",
          mixBlendMode: "multiply",
          filter: "blur(0.4px)",
        }}
      />
      {/* Actual Text */}
      <span style={{ position: "relative", zIndex: 1 }}>{children}</span>
    </span>
  );
};
