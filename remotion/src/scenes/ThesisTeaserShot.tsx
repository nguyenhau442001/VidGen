import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { ThesisTeaserSceneProps } from "../types";
import { SafeZone } from "../SafeZone";
import { BE_VIETNAM_PRO } from "../styles";
import { p2Colors } from "./grabfoodP2Palette";

const BLACK_HOLD_FRAMES = 10;

export const ThesisTeaserShot: React.FC<ThesisTeaserSceneProps> = ({
  mode,
  thesisLines,
  teaserEyebrow,
  teaserQuestion,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const showThesis = mode !== "TEASER" && !!thesisLines;
  const showTeaser = mode !== "THESIS" && !!(teaserEyebrow || teaserQuestion);

  // Combined-scene timing (both halves present, no mode) keeps a mid-scene
  // black hold to separate them; single-mode scenes just fade the whole scene.
  const thesisEnd = showThesis && showTeaser ? Math.round(durationInFrames * 0.55) : durationInFrames;
  const blackStart = thesisEnd;
  const blackEnd = blackStart + BLACK_HOLD_FRAMES;
  const teaserStart = showThesis && showTeaser ? blackEnd : 0;

  const thesisOpacity = showThesis && showTeaser
    ? interpolate(frame, [thesisEnd - 20, thesisEnd - 6], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : 1;
  const blackOverlay = showThesis && showTeaser
    ? interpolate(frame, [thesisEnd - 6, blackStart, blackEnd, teaserStart + 10], [0, 1, 1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;
  const teaserOpacity = showTeaser
    ? interpolate(frame, [teaserStart, teaserStart + 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : 0;
  const exitOpacity = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const perLineWindow = thesisLines && thesisLines.length ? thesisEnd / thesisLines.length : thesisEnd;

  return (
    <AbsoluteFill style={{ backgroundColor: p2Colors.bg, fontFamily: BE_VIETNAM_PRO, overflow: "hidden" }}>
      <AbsoluteFill style={{ opacity: exitOpacity }}>
      {showThesis && (
        <SafeZone style={{ justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
          <div style={{ opacity: thesisOpacity, display: "flex", flexDirection: "column", gap: 18, alignItems: "center" }}>
            {thesisLines!.map((line, i) => {
              const isLast = i === thesisLines!.length - 1;
              const start = i * perLineWindow;
              const lineOpacity = interpolate(frame, [start, start + 20], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              return (
                <div
                  key={i}
                  style={{
                    // Final line is the thesis's payoff/climax — printed at
                    // 2x the size of the setup lines so it visibly lands.
                    fontSize: isLast ? 64 : 34,
                    fontWeight: isLast ? 900 : 800,
                    color: p2Colors.textPrimary,
                    textAlign: "center",
                    maxWidth: 820,
                    lineHeight: 1.2,
                    marginTop: isLast ? 12 : 0,
                    opacity: lineOpacity,
                  }}
                >
                  {line}
                </div>
              );
            })}
          </div>
        </SafeZone>
      )}

      {showThesis && showTeaser && (
        <AbsoluteFill style={{ backgroundColor: "#000000", opacity: blackOverlay, pointerEvents: "none" }} />
      )}

      {showTeaser && (
        <SafeZone style={{ justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
          <div style={{ opacity: teaserOpacity, textAlign: "center" }}>
            {teaserEyebrow && (
              <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 3, color: p2Colors.grab, marginBottom: 20 }}>
                {teaserEyebrow}
              </div>
            )}
            {teaserQuestion && (
              <div style={{ fontSize: 34, fontWeight: 800, color: p2Colors.textPrimary, maxWidth: 780, lineHeight: 1.3 }}>
                {teaserQuestion}
              </div>
            )}
          </div>
        </SafeZone>
      )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default ThesisTeaserShot;
