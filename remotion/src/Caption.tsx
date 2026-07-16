import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { SAFE_ZONE } from "./styles";
import { ManifestCaptionWord } from "./types";

// Caption "style" arrives as a semantic preset key authored on the script's
// on_screen_text_style (manifest visuals must stay JSON-serializable) —
// resolve unrecognized/absent keys to "default" rather than guessing.
const CAPTION_PRESETS = {
  default: { fontSize: 28, fontWeight: 500, maxWidth: 840 },
  // Hook-frame emphasis: the opening seconds decide whether a viewer keeps
  // watching, so this caption reads noticeably louder than the rest.
  headline_bold: { fontSize: 44, fontWeight: 800, maxWidth: 920 },
} as const;

const KARAOKE_POP_FRAMES = 6;

// Karaoke-style word highlight: each word pops in scale + color the instant
// forced-alignment (word.startFrame) says it's spoken, then settles to a
// read/spoken state — rather than the whole caption fading in as one block.
const KaraokeWord: React.FC<{ frame: number; word: ManifestCaptionWord; fontSize: number }> = ({
  frame,
  word,
  fontSize,
}) => {
  const isSpoken = frame >= word.startFrame;
  const pop = interpolate(frame, [word.startFrame, word.startFrame + KARAOKE_POP_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scale = isSpoken ? 1 + (1 - pop) * 0.16 : 1;
  const color = isSpoken ? "#1a73e8" : "#12315f";
  const opacity = isSpoken ? 1 : 0.42;

  return (
    <span
      style={{
        display: "inline-block",
        color,
        opacity,
        transform: `scale(${scale})`,
        transformOrigin: "bottom center",
        transition: "none",
      }}
    >
      {word.text}
    </span>
  );
};

export const Caption: React.FC<{
  text: string;
  durationInFrames: number;
  style?: string;
  words?: ManifestCaptionWord[];
}> = ({ text, durationInFrames, style, words }) => {
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

  const hasWordTimings = words && words.length > 0;

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
          background: "rgba(232, 242, 255, 0.94)",
          border: "2px solid rgba(26, 115, 232, 0.28)",
          backdropFilter: "blur(12px)",
          boxShadow: "0 18px 50px rgba(26, 115, 232, 0.16)",
          maxWidth,
          textAlign: "center",
        }}
      >
        <span
          style={{
            fontSize,
            fontWeight,
            lineHeight: 1.35,
            fontFamily: "Inter, system-ui, sans-serif",
            ...(hasWordTimings ? {} : { color: "#12315f" }),
          }}
        >
          {hasWordTimings
            ? words.map((word, i) => (
                <React.Fragment key={i}>
                  <KaraokeWord frame={frame} word={word} fontSize={fontSize} />
                  {i < words.length - 1 ? " " : ""}
                </React.Fragment>
              ))
            : text}
        </span>
      </div>
    </AbsoluteFill>
  );
};
