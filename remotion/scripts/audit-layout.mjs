import { mkdirSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { openBrowser, renderStill, selectComposition } from "@remotion/renderer";

const manifestPath = path.resolve(process.argv[2] ?? "../output/render_manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const inputProps = { manifest };
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const browser = await openBrowser("chrome");
const outputDir = path.join(os.tmpdir(), "vidgen-layout-audit");
mkdirSync(outputDir, { recursive: true });

try {
  const composition = await selectComposition({
    serveUrl,
    id: "ShortFormVideo",
    inputProps,
    puppeteerInstance: browser,
  });

  let shotStart = 0;
  const frames = [];
  for (const shot of manifest.shots) {
    const duration = shot.durationInFrames;
    for (const localFrame of [1, Math.floor(duration / 2), Math.max(1, duration - 2)]) {
      frames.push({ shot: shot.sceneName ?? shot.label ?? shot.id, frame: shotStart + localFrame });
    }
    shotStart += duration;
  }

  for (const sample of frames) {
    await renderStill({
      composition,
      serveUrl,
      frame: sample.frame,
      output: path.join(outputDir, "frame.png"),
      inputProps,
      envVariables: { REMOTION_LAYOUT_AUDIT: "1" },
      overwrite: true,
      puppeteerInstance: browser,
      logLevel: "error",
    });
    console.log(`layout ok: ${sample.shot} frame=${sample.frame}`);
  }

  console.log(`layout audit passed: ${frames.length} representative frames`);
} finally {
  await browser.close({ silent: true }).catch(() => {});
}
