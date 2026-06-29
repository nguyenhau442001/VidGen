import React from "react";
import { useCurrentFrame } from "remotion";

export const AmbientBackground: React.FC<{ accent: string }> = ({ accent }) => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  const driftX = Math.sin(t * 0.3) * 60;
  const driftY = Math.cos(t * 0.22) * 80;
  const pulse = 0.12 + Math.sin(t * 0.5) * 0.04;

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          width: 900,
          height: 900,
          left: `calc(50% - 450px + ${driftX}px)`,
          top: `calc(35% - 450px + ${driftY}px)`,
          background: `radial-gradient(circle, ${accent} 0%, transparent 70%)`,
          opacity: pulse,
          filter: "blur(40px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          backgroundPosition: `${driftX * 0.3}px ${driftY * 0.3}px`,
        }}
      />
    </div>
  );
};
