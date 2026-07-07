import React from "react";
import { AbsoluteFill, Audio, Sequence, Series, staticFile } from "remotion";
import { ManifestScene, RenderManifest, ZoomRevealVisual } from "./types";
import { ExplanationScene } from "./scenes/ExplanationScene";
import { TerminalScene } from "./scenes/TerminalScene";
import { CodeScene } from "./scenes/CodeScene";
import { ErrorLogScene } from "./scenes/ErrorLogScene";
import { PhoneMockupScene } from "./scenes/PhoneMockupScene";
import { MapPingScene } from "./scenes/MapPingScene";
import { GeohashRevealScene } from "./scenes/GeohashRevealScene";
import { DemandHeatmapScene } from "./scenes/DemandHeatmapScene";
import { SignalFlowScene } from "./scenes/SignalFlowScene";
import { RippleAggregateScene } from "./scenes/RippleAggregateScene";
import { DriverSwarmScene } from "./scenes/DriverSwarmScene";
import { CounterBlastScene } from "./scenes/CounterBlastScene";
import { ScoreCardScene } from "./scenes/ScoreCardScene";
import { SplitViewScene } from "./scenes/SplitViewScene";
import { CharacterIconScene } from "./scenes/CharacterIconScene";
import { QuoteCalloutScene } from "./scenes/QuoteCalloutScene";
import { ZoomRevealScene, FocalDot, DotField } from "./scenes/ZoomRevealScene";
import { SplitRevealScene } from "./scenes/SplitRevealScene";
import AnimatedFlowScene from "./scenes/AnimatedFlowScene";
import BubbleComparatorScene from "./scenes/BubbleComparatorScene";
import { Caption } from "./Caption";
import { SafeZoneGuide } from "./SafeZoneGuide";

export const TikTokVideo: React.FC<{ manifest: RenderManifest }> = ({ manifest }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0f" }}>
      <Series>
        {manifest.scenes.map((scene) => (
          <Series.Sequence
            key={scene.id}
            name={[String(scene.id), scene.sceneName, scene.label].filter(Boolean).join(" · ")}
            durationInFrames={scene.durationInFrames}
          >
            {scene.audioPath && (
              <Sequence from={scene.audioOffsetFrames ?? 0}>
                <Audio src={staticFile(scene.audioPath)} />
              </Sequence>
            )}
            {scene.extraAudio?.map((seg, i) => (
              <Sequence key={i} from={seg.offsetFrames}>
                <Audio src={staticFile(seg.path)} />
              </Sequence>
            ))}
            <SceneRenderer scene={scene} />
            {scene.caption && (
              <Caption
                text={scene.caption}
                durationInFrames={scene.durationInFrames}
                style={scene.captionStyle}
              />
            )}
          </Series.Sequence>
        ))}
      </Series>
      <SafeZoneGuide />
    </AbsoluteFill>
  );
};

// focusElement/revealContent arrive as preset keys (manifest visuals must stay
// JSON-serializable) — resolve them to the actual built-in ReactNode content.
function resolveFocusElement(key: string | undefined, accentColor?: string): React.ReactNode {
  switch (key) {
    case "selected_driver_dot":
    default:
      return <FocalDot color={accentColor} />;
  }
}

function resolveRevealContent(
  key: string | undefined,
  visual: ZoomRevealVisual,
  durationInFrames: number
): React.ReactNode {
  const zoomStartScale = visual.zoomStartScale ?? 8;
  const zoomEndScale = visual.zoomEndScale ?? 1;
  switch (key) {
    case "city_dot_field":
    default:
      return (
        <DotField
          durationInFrames={durationInFrames}
          zoomStartScale={zoomStartScale}
          zoomEndScale={zoomEndScale}
          color={visual.dotColor}
        />
      );
  }
}

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
    case "phone_mockup":
      return <PhoneMockupScene {...scene.visual} durationInFrames={scene.durationInFrames} />;
    case "map_ping":
      return <MapPingScene {...scene.visual} durationInFrames={scene.durationInFrames} />;
    case "geohash_reveal":
      return <GeohashRevealScene {...scene.visual} durationInFrames={scene.durationInFrames} />;
    case "demand_heatmap":
      return <DemandHeatmapScene {...scene.visual} durationInFrames={scene.durationInFrames} />;
    case "signal_flow":
      return <SignalFlowScene {...scene.visual} durationInFrames={scene.durationInFrames} />;
    case "ripple_aggregate":
      return <RippleAggregateScene {...scene.visual} durationInFrames={scene.durationInFrames} />;
    case "driver_swarm":
      return <DriverSwarmScene {...scene.visual} durationInFrames={scene.durationInFrames} />;
    case "counter_blast":
      return <CounterBlastScene {...scene.visual} durationInFrames={scene.durationInFrames} />;
    case "score_card":
      return <ScoreCardScene {...scene.visual} durationInFrames={scene.durationInFrames} />;
    case "split_view":
      return <SplitViewScene {...scene.visual} durationInFrames={scene.durationInFrames} />;
    case "character_icon":
      return <CharacterIconScene {...scene.visual} durationInFrames={scene.durationInFrames} />;
    case "quote_callout":
      return <QuoteCalloutScene {...scene.visual} durationInFrames={scene.durationInFrames} />;
    case "zoom_reveal":
      return (
        <ZoomRevealScene
          focusElement={resolveFocusElement(scene.visual.focusElement, scene.visual.accentColor)}
          revealContent={resolveRevealContent(scene.visual.revealContent, scene.visual, scene.durationInFrames)}
          zoomStartScale={scene.visual.zoomStartScale}
          zoomEndScale={scene.visual.zoomEndScale}
          accentColor={scene.visual.accentColor}
          dotColor={scene.visual.dotColor}
          durationInFrames={scene.durationInFrames}
        />
      );
    case "split_reveal":
      return (
        <SplitRevealScene
          leftContent={
            <MapPingScene {...scene.visual.leftMapPing} durationInFrames={scene.durationInFrames} />
          }
          splitRatio={scene.visual.splitRatio}
          revealDurationFrames={scene.visual.revealDurationFrames}
          accentColor={scene.visual.accentColor}
          leftCaption={scene.visual.leftCaption}
          rightCaption={scene.visual.rightCaption}
        />
      );
    case "animated_flow":
      return <AnimatedFlowScene {...scene.visual} durationInFrames={scene.durationInFrames} />;
    case "bubble_comparator":
      return <BubbleComparatorScene {...scene.visual} durationInFrames={scene.durationInFrames} />;
  }
};
