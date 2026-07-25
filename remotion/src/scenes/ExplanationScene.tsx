import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ExplanationSceneProps } from "../types";
import { colors, INTER, type as t } from "../styles";
import { SafeZone } from "../SafeZone";
import { AmbientBackground } from "../AmbientBackground";

const ENTER_FRAMES = 10;
const EXIT_FRAMES = 8;

// Parse "**foo bar** baz" into highlighted/plain segments, then flatten to words.
function parseWords(text: string): { word: string; highlighted: boolean }[] {
  const segments: { text: string; highlighted: boolean }[] = [];
  const re = /\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) segments.push({ text: text.slice(last, m.index), highlighted: false });
    segments.push({ text: m[1], highlighted: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) segments.push({ text: text.slice(last), highlighted: false });
  return segments.flatMap(seg =>
    seg.text.split(/\s+/).filter(Boolean).map(word => ({ word, highlighted: seg.highlighted }))
  );
}

// Splits body text into sentences so each sentence renders in its own
// flex-wrap row — a wrap can never merge the tail of one sentence with the
// start of the next. A sentence that's long enough still wraps within
// itself; only cross-sentence merging is what this prevents.
function splitSentences(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const matches = trimmed.match(/[^.!?]+[.!?]+/g);
  if (!matches) return [trimmed];
  return matches.map(s => s.trim()).filter(Boolean);
}

export const ExplanationScene: React.FC<ExplanationSceneProps> = ({
  headline,
  body,
  bullets,
  accentWord,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const hasExitRoom = durationInFrames > ENTER_FRAMES + EXIT_FRAMES;
  const sceneOpacity = interpolate(
    frame,
    hasExitRoom ? [0, ENTER_FRAMES, durationInFrames - EXIT_FRAMES, durationInFrames] : [0, durationInFrames],
    hasExitRoom ? [0, 1, 1, 0] : [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const sceneY = interpolate(frame, [0, ENTER_FRAMES], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // accentWord highlights a headline substring the same way other scenes'
  // renderHeadline helpers do — folded into the existing **bold** markdown
  // so it rides the same per-word spring stagger as the rest of the headline.
  const effectiveHeadline =
    accentWord && headline.includes(accentWord) ? headline.replace(accentWord, `**${accentWord}**`) : headline;
  const headlineWords = parseWords(effectiveHeadline);
  const bodySentences = splitSentences(body ?? "").map(parseWords);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.bg,
        opacity: sceneOpacity,
        transform: `translateY(${sceneY}px)`,
      }}
    >
      <AmbientBackground accent={colors.cyan} />
      <SafeZone style={{ justifyContent: "center", alignItems: "flex-start", flexDirection: "column", fontFamily: INTER }}>
      {/* Cyan accent bar */}
      <div
        style={{
          width: 6,
          height: 64,
          backgroundColor: colors.cyan,
          borderRadius: 3,
          marginBottom: 36,
          opacity: interpolate(frame, [ENTER_FRAMES, ENTER_FRAMES + 6], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      />

      {/* Headline — staggered spring per word */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0 14px", marginBottom: 36 }}>
        {headlineWords.map(({ word, highlighted }, i) => {
          const s = spring({
            frame: frame - ENTER_FRAMES - i * 3,
            fps,
            config: { stiffness: 300, damping: 20 },
            durationInFrames: 20,
          });
          return (
            <span
              key={i}
              style={{
                ...t.headline,
                color: highlighted ? colors.cyan : colors.textPrimary,
                opacity: s,
                transform: `translateY(${interpolate(s, [0, 1], [16, 0])}px)`,
                display: "inline-block",
              }}
            >
              {word}
            </span>
          );
        })}
      </div>

      {bullets && bullets.length > 0 ? (
        /* Bullet list — one row ticks in at a time, delayed after headline */
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {bullets.map((line, i) => {
            const delay = ENTER_FRAMES + headlineWords.length * 3 + i * 8;
            const s = spring({
              frame: frame - delay,
              fps,
              config: { stiffness: 260, damping: 24 },
              durationInFrames: 18,
            });
            const isLast = i === bullets.length - 1;
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 16,
                  opacity: s,
                  transform: `translateX(${interpolate(s, [0, 1], [-14, 0])}px)`,
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: isLast ? colors.cyan : colors.textDim,
                    flexShrink: 0,
                  }}
                />
                <span style={{ ...t.body, fontSize: 28, color: isLast ? colors.textPrimary : colors.textDim }}>
                  {line}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        /* Body — one flex-wrap row per sentence, so a line break never
           merges the tail of one sentence with the start of the next.
           Word stagger index stays cumulative across sentences. */
        (() => {
          let flatIndex = 0;
          return (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {bodySentences.map((words, si) => {
                const row = (
                  <div key={si} style={{ display: "flex", flexWrap: "wrap", gap: "0 8px" }}>
                    {words.map(({ word, highlighted }, wi) => {
                      const i = flatIndex + wi;
                      const delay = ENTER_FRAMES + headlineWords.length * 3 + i * 2;
                      const s = spring({
                        frame: frame - delay,
                        fps,
                        config: { stiffness: 200, damping: 22 },
                        durationInFrames: 20,
                      });
                      return (
                        <span
                          key={wi}
                          style={{
                            ...t.body,
                            color: highlighted ? colors.cyan : colors.textDim,
                            opacity: s,
                            transform: `translateY(${interpolate(s, [0, 1], [10, 0])}px)`,
                            display: "inline-block",
                          }}
                        >
                          {word}
                        </span>
                      );
                    })}
                  </div>
                );
                flatIndex += words.length;
                return row;
              })}
            </div>
          );
        })()
      )}
      </SafeZone>
    </AbsoluteFill>
  );
};
