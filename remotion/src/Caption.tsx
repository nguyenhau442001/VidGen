import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { SAFE_ZONE } from "./styles";

// Caption "style" arrives as a semantic preset key authored on the script's
// on_screen_text_style (manifest visuals must stay JSON-serializable) —
// resolve unrecognized/absent keys to "default" rather than guessing.
const CAPTION_PRESETS = {
  default: { fontSize: 28, fontWeight: 500, maxWidth: 840 },
  // Hook-frame emphasis: the opening seconds decide whether a viewer keeps
  // watching, so this caption reads noticeably louder than the rest.
  headline_bold: { fontSize: 44, fontWeight: 800, maxWidth: 920 },
} as const;

export const Caption: React.FC<{ text: string; durationInFrames: number; style?: string }> = ({
  text,
  durationInFrames,
  style,
}) => {
  const frame = useCurrentFrame();
  const fade = Math.min(8, Math.floor(durationInFrames / 4));

  const opacity = interpolate(
    frame,
    [0, fade, durationInFrames - fade, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const { fontSize, fontWeight, maxWidth } =
    CAPTION_PRESETS[style as keyof typeof CAPTION_PRESETS] ?? CAPTION_PRESETS.default;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: SAFE_ZONE.bottom,
        paddingLeft: SAFE_ZONE.left,
        paddingRight: SAFE_ZONE.right,
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
          maxWidth,
          textAlign: "center",
        }}
      >
        <span
          style={{
            fontSize,
            fontWeight,
            color: "#fff",
            lineHeight: 1.35,
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          {text}
        </span>
      </div>
    </AbsoluteFill>
  );
};
