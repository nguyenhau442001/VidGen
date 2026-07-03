import React from "react";
import { Composition, continueRender, delayRender } from "remotion";
import { TikTokVideo } from "./TikTokVideo";
import { CoverScene } from "./scenes/CoverScene";
import { PhoneMockupScene } from "./scenes/PhoneMockupScene";
import { MapPingScene } from "./scenes/MapPingScene";
import { ManifestScene, RenderManifest } from "./types";
import { waitForInter, waitForJetBrainsMono, waitForBeVietnamPro } from "./styles";
import defaultManifest from "../../output/render_manifest.json";

// Load fonts before any frame is captured
const fontHandle = delayRender("Loading fonts");
Promise.all([waitForInter(), waitForJetBrainsMono(), waitForBeVietnamPro()]).then(() => {
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
      <Composition
        id="MapPing"
        component={MapPingScene}
        durationInFrames={210}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          drivers: [
            { x: 0.28, y: 0.28, label: "350m" },
            { x: 0.72, y: 0.35, label: "480m" },
            { x: 0.35, y: 0.65, label: "610m" },
            { x: 0.68, y: 0.62, label: "290m" },
          ],
          nearestDriverIndex: 3,
          selectedDriverIndex: 0,
          phase1End: 100,
          phase2Start: 115,
          accentColor: "#00c896",
          durationInFrames: 210,
        }}
      />
      <Composition
        id="PhoneMockup"
        component={PhoneMockupScene}
        durationInFrames={150}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          screenState: "idle" as const,
          driverName: "Nguyễn Văn An",
          driverEta: "3",
          accentColor: "#00c896",
          buttonLabel: "Đặt xe",
          idleRange: [0, 44] as [number, number],
          loadingRange: [45, 89] as [number, number],
          matchedRange: [90, 149] as [number, number],
          durationInFrames: 150,
        }}
      />
    </>
  );
};
