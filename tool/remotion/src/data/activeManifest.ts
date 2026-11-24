import fallbackManifest from "./fallbackManifest.json";
import type { RenderManifest } from "../types";

let manifestData: RenderManifest;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  manifestData = require("../../../output/build/pipeline/render_manifest.json");
} catch {
  manifestData = fallbackManifest as unknown as RenderManifest;
}

export const defaultManifest: RenderManifest = manifestData;
