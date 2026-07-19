import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { ThesisTeaserSceneProps } from "../types";
import { SafeZone } from "../SafeZone";
import { BE_VIETNAM_PRO } from "../styles";
import { p2Colors } from "./grabfoodP2Palette";

const BLACK_HOLD_FRAMES = 10;

export const ThesisTeaserShot: React.FC<ThesisTeaserSceneProps> = ({
  thesisLines,
  teaserEyebrow,
  teaserQuestion,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();

  const thesisEnd = Math.round(durationInFrames * 0.55);
  const blackStart = thesisEnd;
  const blackEnd = blackStart + BLACK_HOLD_FRAMES;
  const teaserStart = blackEnd;

  const thesisOpacity = interpolate(frame, [thesisEnd - 20, thesisEnd - 6], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const blackOverlay = interpolate(
    frame,
    [thesisEnd - 6, blackStart, blackEnd, teaserStart + 10],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const teaserOpacity = interpolate(frame, [teaserStart, teaserStart + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitOpacity = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const perLineWindow = thesisEnd / thesisLines.length;

  return (
    <AbsoluteFill style={{ backgroundColor: p2Colors.bg, fontFamily: BE_VIETNAM_PRO, overflow: "hidden" }}>
      <AbsoluteFill style={{ opacity: exitOpacity }}>
      <SafeZone style={{ justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
        <div style={{ opacity: thesisOpacity, display: "flex", flexDirection: "column", gap: 18, alignItems: "center" }}>
          {thesisLines.map((line, i) => {
            const start = i * perLineWindow;
            const lineOpacity = interpolate(frame, [start, start + 20], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            return (
              <div
                key={i}
                style={{
                  fontSize: 34,
                  fontWeight: 800,
                  color: p2Colors.textPrimary,
                  textAlign: "center",
                  maxWidth: 820,
                  lineHeight: 1.3,
                  opacity: lineOpacity,
                }}
              >
                {line}
              </div>
            );
          })}
        </div>
      </SafeZone>

      <AbsoluteFill style={{ backgroundColor: "#000000", opacity: blackOverlay, pointerEvents: "none" }} />

      <SafeZone style={{ justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
        <div style={{ opacity: teaserOpacity, textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 3, color: p2Colors.grab, marginBottom: 20 }}>
            {teaserEyebrow}
          </div>
          <div style={{ fontSize: 34, fontWeight: 800, color: p2Colors.textPrimary, maxWidth: 780, lineHeight: 1.3 }}>
            {teaserQuestion}
          </div>
        </div>
      </SafeZone>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default ThesisTeaserShot;
