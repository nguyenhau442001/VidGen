import React from "react";
import { interpolate, useCurrentFrame } from "remotion";

export const Caption: React.FC<{ text: string; durationInFrames: number }> = ({
  text,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const fade = Math.min(8, Math.floor(durationInFrames / 4));

  const opacity = interpolate(
    frame,
    [0, fade, durationInFrames - fade, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <div
      style={{
        position: "absolute",
        bottom: 80,
        left: 40,
        right: 40,
        display: "flex",
        justifyContent: "center",
        opacity,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          padding: "16px 40px",
          borderRadius: 16,
          background: "rgba(0,0,0,0.65)",
          backdropFilter: "blur(12px)",
          maxWidth: 900,
          textAlign: "center",
        }}
      >
        <span
          style={{
            fontSize: 34,
            fontWeight: 500,
            color: "#fff",
            lineHeight: 1.4,
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          {text}
        </span>
      </div>
    </div>
  );
};
