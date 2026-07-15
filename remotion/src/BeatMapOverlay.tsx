import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { RenderManifest } from "./types";
import { colors } from "./styles";
import beatmapData from "../../output/beatmap.json";

type BeatMapScene = {
  id: string;
  index: number;
  score: number;
  reasons: string[];
  hot: boolean;
};

type BeatMapData = {
  video_title: string;
  scenes: BeatMapScene[];
};

const beatmap = beatmapData as BeatMapData;

const STRIP_HEIGHT = 14;

function scoreColor(score: number): string {
  // Dim green -> bright accent green as predicted replay score rises.
  const alpha = 0.25 + 0.75 * Math.min(1, score / 100);
  return `rgba(0, 255, 65, ${alpha.toFixed(2)})`;
}

// Predicted-replay beat map — a heuristic, offline scoring of which scenes
// are likeliest to get rewound/rewatched (there's no real viewer data before
// publish). Toggle via REMOTION_BEAT_MAP=1 env var, never rendered in
// production output. Follows the same self-gating pattern as SafeZoneGuide.
export const BeatMapOverlay: React.FC<{ manifest: RenderManifest }> = ({ manifest }) => {
  const frame = useCurrentFrame();
  const shots = manifest.shots;

  if (process.env.REMOTION_BEAT_MAP !== "1") return null;
  if (!beatmap.scenes.length || beatmap.scenes.length !== shots.length) return null;

  const totalFrames = shots.reduce((sum, s) => sum + s.durationInFrames, 0);
  if (totalFrames <= 0) return null;

  let cursor = 0;
  const segments = shots.map((mscene, i) => {
    const bm = beatmap.scenes[i];
    const startFrame = cursor;
    cursor += mscene.durationInFrames;
    return {
      ...bm,
      startFrame,
      durationInFrames: mscene.durationInFrames,
      widthPct: (mscene.durationInFrames / totalFrames) * 100,
    };
  });

  const current = segments.find(
    (s) => frame >= s.startFrame && frame < s.startFrame + s.durationInFrames
  );

  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 998 }}>
      {current?.hot && (
        <div
          style={{
            position: "absolute",
            top: 24,
            right: 24,
            maxWidth: 320,
            padding: "10px 14px",
            borderRadius: 10,
            background: "rgba(10,10,15,0.85)",
            border: `1px solid ${colors.green}`,
            color: colors.textPrimary,
            fontFamily: "Inter, sans-serif",
            fontSize: 18,
            lineHeight: 1.4,
          }}
        >
          <div style={{ fontWeight: 700, color: colors.green }}>
            🔥 {current.score}/100 predicted replay
          </div>
          <div style={{ fontSize: 14, color: colors.textDim, marginTop: 2 }}>
            {current.reasons.join(", ")}
          </div>
        </div>
      )}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: STRIP_HEIGHT,
          display: "flex",
        }}
      >
        {segments.map((s) => (
          <div
            key={s.index}
            style={{
              width: `${s.widthPct}%`,
              height: "100%",
              backgroundColor: scoreColor(s.score),
              borderRight: "1px solid rgba(0,0,0,0.4)",
              boxSizing: "border-box",
            }}
          />
        ))}
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${(frame / totalFrames) * 100}%`,
            width: 2,
            backgroundColor: "#ffffff",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
