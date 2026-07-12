import React from "react";
import { ThumbnailSceneProps } from "../types";
import { CharacterIconCoverScene } from "./CharacterIconCoverScene";
import { GenericHookThumbnailScene } from "./GenericHookThumbnailScene";
import { HSKFlashCardThumbnailScene } from "./HSKFlashCardThumbnailScene";

export const ThumbnailScene: React.FC<ThumbnailSceneProps> = (props) => {
  if (props.style === "characterIcon") {
    return <CharacterIconCoverScene {...props} />;
  }
  if (props.style === "hskFlashCard") {
    return <HSKFlashCardThumbnailScene {...props} />;
  }
  return <GenericHookThumbnailScene {...props} />;
};
