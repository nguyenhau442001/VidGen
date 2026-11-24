import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

interface FilmGrainOverlayProps {
  opacity?: number;
  vignette?: boolean;
  warmth?: boolean;
}

/**
 * Procedural Film Grain & Analog Vignette
 * Gives the video a tactile, organic, human-shot documentary feel
 * instead of the sterile digital vector look typical of AI videos.
 */
export const FilmGrainOverlay: React.FC<FilmGrainOverlayProps> = ({
  opacity = 0.045,
  vignette = true,
  warmth = false,
}) => {
  const frame = useCurrentFrame();
  // Frame-dependent seed for organic noise flicker
  const seed = (frame % 8) * 13.37;

  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 9999 }}>
      {/* SVG Procedural Noise */}
      <svg
        style={{
          width: "100%",
          height: "100%",
          opacity,
          mixBlendMode: "overlay",
        }}
      >
        <filter id={`editorial-grain-${seed}`}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.8"
            numOctaves={3}
            seed={seed}
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect
          width="100%"
          height="100%"
          filter={`url(#editorial-grain-${seed})`}
        />
      </svg>

      {/* Subtle Analog Vignette */}
      {vignette && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.48) 100%)",
            mixBlendMode: "multiply",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Subtle Warmth Tint */}
      {warmth && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(255, 240, 220, 0.02)",
            mixBlendMode: "screen",
            pointerEvents: "none",
          }}
        />
      )}
    </AbsoluteFill>
  );
};
