import React from "react";
import { Composition, continueRender, delayRender } from "remotion";
import { TikTokVideo } from "./TikTokVideo";
import { RenderManifest } from "./types";
import { waitForInter, waitForJetBrainsMono } from "./styles";

// Load fonts before any frame is captured
const fontHandle = delayRender("Loading fonts");
Promise.all([waitForInter(), waitForJetBrainsMono()]).then(() => {
  continueRender(fontHandle);
});

const EMPTY_MANIFEST: RenderManifest = { fps: 30, width: 1080, height: 1920, scenes: [] };

export const Root: React.FC = () => {
  return (
    <Composition
      id="TikTokVideo"
      component={TikTokVideo}
      durationInFrames={1}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{ manifest: EMPTY_MANIFEST }}
      calculateMetadata={async ({ props }) => {
        const manifest = props.manifest as RenderManifest;
        return {
          durationInFrames: Math.max(1, manifest.scenes.reduce((s, sc) => s + sc.durationInFrames, 0)),
        };
      }}
    />
  );
};
