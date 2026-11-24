import fallbackBeatmap from "./fallbackBeatmap.json";

type BeatMapScene = {
  id: string;
  index: number;
  score: number;
  reasons: string[];
  hot: boolean;
};

export type BeatMapData = {
  video_title: string;
  scenes: BeatMapScene[];
};

let rawBeatmap: BeatMapData;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  rawBeatmap = require("../../../output/build/pipeline/beatmap.json");
} catch {
  rawBeatmap = fallbackBeatmap as BeatMapData;
}

export const activeBeatmap: BeatMapData = rawBeatmap;
