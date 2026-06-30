import React from "react";
import { Composition, continueRender, delayRender } from "remotion";
import { TikTokVideo } from "./TikTokVideo";
import { CoverScene } from "./scenes/CoverScene";
import { ManifestScene, RenderManifest } from "./types";
import { waitForInter, waitForJetBrainsMono } from "./styles";
import defaultManifest from "../../output/render_manifest.json";

// Load fonts before any frame is captured
const fontHandle = delayRender("Loading fonts");
Promise.all([waitForInter(), waitForJetBrainsMono()]).then(() => {
  continueRender(fontHandle);
});

// Derive cover props from the manifest: hook text from scene 1, terminal lines from first terminal scene
const manifestScenes = (defaultManifest as unknown as RenderManifest).scenes;
const hookScene = manifestScenes[0];
const firstTerminal = manifestScenes.find(
  (s): s is Extract<ManifestScene, { type: "terminal" }> => s.type === "terminal"
);
const coverDefaultProps = {
  headline: hookScene.type === "explanation" ? hookScene.visual.headline : "",
  body: hookScene.type === "explanation" ? hookScene.visual.body : "",
  terminalLines: firstTerminal ? firstTerminal.visual.lines.filter((l) => l.trim()) : [],
};

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="TikTokVideo"
        component={TikTokVideo}
        durationInFrames={1}
        fps={defaultManifest.fps}
        width={defaultManifest.width}
        height={defaultManifest.height}
        defaultProps={{ manifest: defaultManifest as RenderManifest }}
        calculateMetadata={async ({ props }) => {
          const manifest = props.manifest as RenderManifest;
          return {
            fps: manifest.fps,
            width: manifest.width,
            height: manifest.height,
            durationInFrames: Math.max(1, manifest.scenes.reduce((s, sc) => s + sc.durationInFrames, 0)),
          };
        }}
      />
      <Composition
        id="Cover"
        component={CoverScene}
        durationInFrames={1}
        fps={defaultManifest.fps}
        width={defaultManifest.width}
        height={defaultManifest.height}
        defaultProps={coverDefaultProps}
      />
    </>
  );
};
