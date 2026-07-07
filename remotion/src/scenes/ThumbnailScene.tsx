import React from "react";
import { ThumbnailSceneProps } from "../types";
import { CharacterIconCoverScene } from "./CharacterIconCoverScene";
import { GenericHookThumbnailScene } from "./GenericHookThumbnailScene";

export const ThumbnailScene: React.FC<ThumbnailSceneProps> = (props) => {
  if (props.style === "characterIcon") {
    return <CharacterIconCoverScene {...props} />;
  }
  return <GenericHookThumbnailScene {...props} />;
};
