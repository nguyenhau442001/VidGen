// remotion/src/scenes/RealFootageScene.tsx
import React from "react";
import { AbsoluteFill, OffthreadVideo, staticFile, useVideoConfig } from "remotion";
import { RealFootageSceneProps } from "../types";

export const RealFootageScene: React.FC<RealFootageSceneProps> = ({
  mediaPath,
  useOriginalAudio = false,
  trimStartSeconds = 0,
  trimEndSeconds,
  objectPosition = "center",
}) => {
  const { fps } = useVideoConfig();
  const startFrom = Math.round(trimStartSeconds * fps);
  const endAt = trimEndSeconds !== undefined ? Math.round(trimEndSeconds * fps) : undefined;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000000" }}>
      <OffthreadVideo
        src={staticFile(mediaPath)}
        startFrom={startFrom}
        endAt={endAt}
        muted={!useOriginalAudio}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition,
        }}
      />
    </AbsoluteFill>
  );
};

export default RealFootageScene;
