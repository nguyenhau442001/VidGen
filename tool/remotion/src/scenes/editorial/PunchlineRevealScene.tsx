import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { PunchlineRevealVisual } from "../../types/editorial";
import { CameraRig25D } from "../../primitives";

export const PunchlineRevealScene: React.FC<
  PunchlineRevealVisual & { durationInFrames: number }
> = ({
  eyebrow = "KẾT LUẬN",
  primaryStatement,
  secondaryStatement,
  disclaimerNote,
  invertedTheme = false,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Dramatic slam animation
  const slam = spring({
    frame,
    fps,
    config: { damping: 12, mass: 1.1, stiffness: 180 },
  });

  const scale = interpolate(slam, [0, 1], [1.35, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const opacity = interpolate(slam, [0, 0.4, 1], [0, 0.9, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const bg = invertedTheme ? "#ffffff" : "#0a0c10";
  const fg = invertedTheme ? "#0a0c10" : "#ffffff";
  const accent = invertedTheme ? "#dc2626" : "#f59e0b";

  return (
    <CameraRig25D
      durationInFrames={durationInFrames}
      zoomStart={1.0}
      zoomEnd={1.08}
      driftIntensity={0.4}
    >
      <AbsoluteFill
        style={{
          backgroundColor: bg,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "80px 56px",
          textAlign: "center",
          boxSizing: "border-box",
        }}
      >
        <div style={{ transform: `scale(${scale})`, opacity, willChange: "transform, opacity" }}>
          {eyebrow && (
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 24,
                fontWeight: 900,
                color: accent,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                marginBottom: 28,
              }}
            >
              — {eyebrow} —
            </div>
          )}

          <h1
            style={{
              margin: 0,
              fontFamily: "'Be Vietnam Pro', sans-serif",
              fontSize: 64,
              fontWeight: 900,
              color: fg,
              lineHeight: 1.25,
              textTransform: "uppercase",
              letterSpacing: "-0.02em",
              maxWidth: 960,
            }}
          >
            {primaryStatement}
          </h1>

          {secondaryStatement && (
            <p
              style={{
                margin: "36px auto 0 auto",
                fontFamily: "'Be Vietnam Pro', sans-serif",
                fontSize: 34,
                fontWeight: 600,
                color: invertedTheme ? "#475569" : "rgba(255,255,255,0.75)",
                lineHeight: 1.5,
                maxWidth: 880,
              }}
            >
              {secondaryStatement}
            </p>
          )}

          {disclaimerNote && (
            <div
              style={{
                marginTop: 48,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 20,
                color: invertedTheme ? "#94a3b8" : "rgba(255,255,255,0.4)",
              }}
            >
              * {disclaimerNote}
            </div>
          )}
        </div>
      </AbsoluteFill>
    </CameraRig25D>
  );
};
