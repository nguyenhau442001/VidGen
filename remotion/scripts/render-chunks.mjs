// Renders per-scene video chunks (muted) plus the full-manifest audio track,
// driven by a jobs JSON file written by vidgen/chunked_render.py. Bundles the
// project once and reuses a single headless browser across all renders, so
// per-chunk overhead is bundling-free. Video/quality settings mirror the CLI
// defaults previously used by `npx remotion render` (h264 CRF, jpeg frames,
// 100% concurrency) — chunked output quality matches a monolithic render.
//
// Usage: node scripts/render-chunks.mjs <jobs.json>
//
// jobs.json shape:
// {
//   "entryPoint": "src/index.ts",
//   "compositionId": "TikTokVideo",
//   "chunks": [{ "name": "shot_01a", "outPath": "/abs/x.mp4", "manifest": {...} }],
//   "audio":  { "outPath": "/abs/audio.wav", "manifest": {...} }
// }
import { readFileSync } from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { openBrowser, renderMedia, selectComposition } from "@remotion/renderer";

const jobsFile = process.argv[2];
if (!jobsFile) {
  console.error("usage: node scripts/render-chunks.mjs <jobs.json>");
  process.exit(1);
}
const spec = JSON.parse(readFileSync(jobsFile, "utf8"));

const t0 = Date.now();
const serveUrl = await bundle({ entryPoint: path.resolve(spec.entryPoint) });
console.log(`bundled in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

const browser = await openBrowser("chrome");
try {
  for (const chunk of spec.chunks) {
    const inputProps = { manifest: chunk.manifest };
    const composition = await selectComposition({
      serveUrl,
      id: spec.compositionId,
      inputProps,
      puppeteerInstance: browser,
    });
    const t = Date.now();
    await renderMedia({
      composition,
      serveUrl,
      codec: "h264",
      outputLocation: chunk.outPath,
      inputProps,
      muted: true,
      imageFormat: "jpeg",
      concurrency: "100%",
      puppeteerInstance: browser,
    });
    console.log(
      `chunk ${chunk.name}: ${composition.durationInFrames} frames in ${((Date.now() - t) / 1000).toFixed(1)}s`
    );
  }

  if (spec.audio) {
    const inputProps = { manifest: spec.audio.manifest };
    const composition = await selectComposition({
      serveUrl,
      id: spec.compositionId,
      inputProps,
      puppeteerInstance: browser,
    });
    const t = Date.now();
    await renderMedia({
      composition,
      serveUrl,
      codec: "wav",
      outputLocation: spec.audio.outPath,
      inputProps,
      puppeteerInstance: browser,
    });
    console.log(`audio track in ${((Date.now() - t) / 1000).toFixed(1)}s`);
  }
} finally {
  await browser.close({ silent: true }).catch(() => {});
}
