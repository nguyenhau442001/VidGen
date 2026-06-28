import React from "react";
import { AbsoluteFill, Audio, Series, staticFile } from "remotion";
import { ManifestScene, RenderManifest } from "./types";
import { ExplanationScene } from "./scenes/ExplanationScene";
import { TerminalScene } from "./scenes/TerminalScene";
import { CodeScene } from "./scenes/CodeScene";
import { ErrorLogScene } from "./scenes/ErrorLogScene";
import { Caption } from "./Caption";

export const TikTokVideo: React.FC<{ manifest: RenderManifest }> = ({ manifest }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0f" }}>
      <Series>
        {manifest.scenes.map((scene) => (
          <Series.Sequence key={scene.id} durationInFrames={scene.durationInFrames}>
            {scene.audioPath && <Audio src={staticFile(scene.audioPath)} />}
            <SceneRenderer scene={scene} />
            {scene.caption && (
              <Caption text={scene.caption} durationInFrames={scene.durationInFrames} />
            )}
          </Series.Sequence>
        ))}
      </Series>
    </AbsoluteFill>
  );
};

const SceneRenderer: React.FC<{ scene: ManifestScene }> = ({ scene }) => {
  switch (scene.type) {
    case "explanation":
      return <ExplanationScene {...scene.visual} durationInFrames={scene.durationInFrames} />;
    case "terminal":
      return <TerminalScene {...scene.visual} durationInFrames={scene.durationInFrames} />;
    case "code":
      return <CodeScene {...scene.visual} durationInFrames={scene.durationInFrames} />;
    case "error_log":
      return <ErrorLogScene {...scene.visual} durationInFrames={scene.durationInFrames} />;
  }
};
