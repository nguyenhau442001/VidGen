import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

interface CameraRig25DProps {
  children: React.ReactNode;
  focusPoint?: { x: number; y: number }; // 0-100 percentage
  zoomStart?: number; // e.g. 1.0
  zoomEnd?: number; // e.g. 1.08
  driftIntensity?: number; // 0 = off, 1 = normal handheld drift
  tiltX?: number; // deg
  tiltY?: number; // deg
  durationInFrames: number;
}

/**
 * CameraRig25D
 * Replaces static flat-canvas presentation with cinematic motion.
 * Applies continuous handheld organic drift, focal pull, and 2.5D perspective depth.
 */
export const CameraRig25D: React.FC<CameraRig25DProps> = ({
  children,
  focusPoint = { x: 50, y: 50 },
  zoomStart = 1.0,
  zoomEnd = 1.05,
  driftIntensity = 0.6,
  tiltX = 0,
  tiltY = 0,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Progress of current scene (0 to 1)
  const progress = interpolate(frame, [0, Math.max(1, durationInFrames)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Smooth cinematic ease-in-out zoom
  const scale = interpolate(progress, [0, 1], [zoomStart, zoomEnd], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Continuous organic drift (two non-commensurate sinusoids for non-repeating feel)
  const time = frame / fps;
  const driftX =
    (Math.sin(time * 0.95) * 8 + Math.cos(time * 1.7) * 4) * driftIntensity;
  const driftY =
    (Math.cos(time * 0.8) * 6 + Math.sin(time * 1.4) * 3) * driftIntensity;
  const driftRotate =
    (Math.sin(time * 0.5) * 0.35 + Math.cos(time * 0.9) * 0.15) * driftIntensity;

  // Perspective tilt
  const currentTiltX = tiltX * (1 - progress * 0.3);
  const currentTiltY = tiltY * (1 - progress * 0.3);

  return (
    <AbsoluteFill
      style={{
        perspective: 1200,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          transformOrigin: `${focusPoint.x}% ${focusPoint.y}%`,
          transform: `
            translate3d(${driftX}px, ${driftY}px, 0px)
            scale(${scale})
            rotate(${driftRotate}deg)
            rotateX(${currentTiltX}deg)
            rotateY(${currentTiltY}deg)
          `,
          transformStyle: "preserve-3d",
          willChange: "transform",
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};
