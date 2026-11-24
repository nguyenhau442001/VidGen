import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

interface TactileCardProps {
  children: React.ReactNode;
  rotationDeg?: number;
  enterFrame?: number;
  accent?: "paperclip" | "pushpin" | "tape" | "none";
  texture?: "paper" | "blueprint" | "dark" | "clean";
  style?: React.CSSProperties;
}

/**
 * TactileCard
 * A physical-feel document card with natural drop shadows, material texture,
 * and tactile accents (paperclip, tape, pushpin) instead of flat digital cards.
 */
export const TactileCard: React.FC<TactileCardProps> = ({
  children,
  rotationDeg = -1.2,
  enterFrame = 0,
  accent = "tape",
  texture = "paper",
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const relFrame = Math.max(0, frame - enterFrame);
  const slideIn = spring({
    frame: relFrame,
    fps,
    config: { damping: 18, mass: 0.8, stiffness: 140 },
  });

  const translateY = interpolate(slideIn, [0, 1], [60, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = interpolate(slideIn, [0, 0.6, 1], [0, 0.8, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const backgrounds = {
    paper: "#fcfbf7",
    blueprint: "#102336",
    dark: "#161b22",
    clean: "#ffffff",
  };

  const textColors = {
    paper: "#1b1e23",
    blueprint: "#e6edf3",
    dark: "#f0f6fc",
    clean: "#111827",
  };

  return (
    <div
      style={{
        position: "relative",
        backgroundColor: backgrounds[texture],
        color: textColors[texture],
        borderRadius: 12,
        padding: "36px 40px",
        boxShadow:
          texture === "paper"
            ? "0 18px 45px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)"
            : "0 22px 60px rgba(0,0,0,0.45)",
        transform: `translateY(${translateY}px) rotate(${rotationDeg}deg)`,
        opacity,
        border: texture === "blueprint" ? "1px solid rgba(88,166,255,0.25)" : "1px solid rgba(0,0,0,0.06)",
        willChange: "transform, opacity",
        ...style,
      }}
    >
      {/* Tape Accent */}
      {accent === "tape" && (
        <div
          style={{
            position: "absolute",
            top: -14,
            left: "50%",
            transform: "translateX(-50%) rotate(1.5deg)",
            width: 110,
            height: 32,
            backgroundColor: "rgba(255, 245, 200, 0.65)",
            border: "1px solid rgba(0,0,0,0.08)",
            boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
            backdropFilter: "blur(1px)",
            borderRadius: 2,
            zIndex: 10,
          }}
        />
      )}

      {/* Pushpin Accent */}
      {accent === "pushpin" && (
        <div
          style={{
            position: "absolute",
            top: 14,
            left: 20,
            width: 18,
            height: 18,
            borderRadius: "50%",
            backgroundColor: "#d90429",
            boxShadow: "0 4px 10px rgba(0,0,0,0.35), inset -2px -2px 4px rgba(0,0,0,0.4)",
            border: "2px solid #ef233c",
            zIndex: 10,
          }}
        />
      )}

      {children}
    </div>
  );
};
