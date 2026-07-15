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
import { NetworkFlowScene } from "./scenes/NetworkFlowScene";
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
import PhoneMapScene from "./scenes/PhoneMapScene";
import ConversationScene from "./scenes/ConversationScene";
import BeforeAfterScene from "./scenes/BeforeAfterScene";
import GridHeatmapScene from "./scenes/GridHeatmapScene";
import { RadarHookScene } from "./scenes/RadarHookScene";
import { AttackScene } from "./scenes/AttackScene";
import { EventScanScene } from "./scenes/EventScanScene";
import { DriverHeatmapScene } from "./scenes/DriverHeatmapScene";
import StatComparatorScene from "./scenes/StatComparatorScene";
import { RouteTimelineScene } from "./scenes/RouteTimelineScene";
import { CorridorSweepScene } from "./scenes/CorridorSweepScene";
import { BatchDecisionTreeScene } from "./scenes/BatchDecisionTreeScene";
import DeltaArrowScene from "./scenes/DeltaArrowScene";
import { DriverConsentScene } from "./scenes/DriverConsentScene";
import { SystemLayerScene } from "./scenes/SystemLayerScene";
import { HSKHookScene } from "./scenes/HSKHookScene";
import { HSKExplanationScene } from "./scenes/HSKExplanationScene";
import { HSKCTAScene } from "./scenes/HSKCTAScene";
import { HSKScreenshotScene } from "./scenes/HSKScreenshotScene";
import { HSKFlashCardThumbnailScene } from "./scenes/HSKFlashCardThumbnailScene";
import { IconThreatScene } from "./scenes/IconThreatScene";
import { StoryCardScene } from "./scenes/StoryCardScene";
import { ComparisonScene } from "./scenes/ComparisonScene";
import { PipelineVerticalScene } from "./scenes/PipelineVerticalScene";
import { DiagramFlowScene } from "./scenes/DiagramFlowScene";
import { TimelineStagesScene } from "./scenes/TimelineStagesScene";
import { ScanAnimationScene } from "./scenes/ScanAnimationScene";
import { ExceptionCardScene } from "./scenes/ExceptionCardScene";
import { VerdictListScene } from "./scenes/VerdictListScene";
import { PreviewTeaserScene } from "./scenes/PreviewTeaserScene";
import { GoogleMapsRevealScene } from "./scenes/GoogleMapsRevealScene";
import { Caption } from "./Caption";
import { SafeZoneGuide } from "./SafeZoneGuide";
import { BeatMapOverlay } from "./BeatMapOverlay";
import { colors } from "./styles";

export const TikTokVideo: React.FC<{ manifest: RenderManifest }> = ({ manifest }) => {
  const shots = manifest.shots ?? manifest.scenes ?? [];
  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      <Series>
        {shots.map((shot) => (
          <Series.Sequence
            key={shot.id}
            name={[String(shot.id), shot.sceneName, shot.label].filter(Boolean).join(" · ")}
            durationInFrames={shot.durationInFrames}
          >
            {shot.audioPath && (
              <Sequence from={shot.audioOffsetFrames ?? 0}>
                <Audio src={staticFile(shot.audioPath)} />
              </Sequence>
            )}
            {shot.extraAudio?.map((seg, i) => (
              <Sequence key={i} from={seg.offsetFrames}>
                <Audio src={staticFile(seg.path)} />
              </Sequence>
            ))}
            <SceneRenderer shot={shot} />
            {shot.caption && (
              <Caption
                text={shot.caption}
                durationInFrames={shot.durationInFrames}
                style={shot.captionStyle}
              />
            )}
          </Series.Sequence>
        ))}
      </Series>
      <SafeZoneGuide />
      <BeatMapOverlay manifest={manifest} />
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

const SceneRenderer: React.FC<{ shot: ManifestScene }> = ({ shot }) => {
  switch (shot.type) {
    case "explanation":
      return <ExplanationScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "terminal":
      return <TerminalScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "code":
      return <CodeScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "error_log":
      return <ErrorLogScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "phone_mockup":
      return <PhoneMockupScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "map_ping":
      return <MapPingScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "geohash_reveal":
      return <GeohashRevealScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "demand_heatmap":
      return <DemandHeatmapScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "signal_flow":
      return <SignalFlowScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "network_flow":
      return <NetworkFlowScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "ripple_aggregate":
      return <RippleAggregateScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "driver_swarm":
      return <DriverSwarmScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "counter_blast":
      return <CounterBlastScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "score_card":
      return <ScoreCardScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "split_view":
      return <SplitViewScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "character_icon":
      return <CharacterIconScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "quote_callout":
      return <QuoteCalloutScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "zoom_reveal":
      return (
        <ZoomRevealScene
          focusElement={resolveFocusElement(shot.visual.focusElement, shot.visual.accentColor)}
          revealContent={resolveRevealContent(shot.visual.revealContent, shot.visual, shot.durationInFrames)}
          zoomStartScale={shot.visual.zoomStartScale}
          zoomEndScale={shot.visual.zoomEndScale}
          accentColor={shot.visual.accentColor}
          dotColor={shot.visual.dotColor}
          durationInFrames={shot.durationInFrames}
        />
      );
    case "split_reveal":
      return (
        <SplitRevealScene
          leftContent={
            <MapPingScene {...shot.visual.leftMapPing} durationInFrames={shot.durationInFrames} />
          }
          splitRatio={shot.visual.splitRatio}
          revealDurationFrames={shot.visual.revealDurationFrames}
          accentColor={shot.visual.accentColor}
          leftCaption={shot.visual.leftCaption}
          rightCaption={shot.visual.rightCaption}
        />
      );
    case "animated_flow":
      return <AnimatedFlowScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "bubble_comparator":
      return <BubbleComparatorScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "phone_map":
      return <PhoneMapScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "conversation":
      return <ConversationScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "before_after":
      return <BeforeAfterScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "grid_heatmap":
      return <GridHeatmapScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "radar_hook":
      return <RadarHookScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "attack_hook":
      return <AttackScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "event_scan":
      return <EventScanScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "driver_heatmap":
      return <DriverHeatmapScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "stat_comparator":
      return <StatComparatorScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "route_timeline":
      return <RouteTimelineScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "corridor_sweep":
      return <CorridorSweepScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "batch_decision_tree":
      return <BatchDecisionTreeScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "delta_arrow":
      return <DeltaArrowScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "driver_consent":
      return <DriverConsentScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "system_layer":
      return <SystemLayerScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "hsk_hook":
      return <HSKHookScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "hsk_explanation":
      return <HSKExplanationScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "hsk_cta":
      return <HSKCTAScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "hsk_screenshot":
      return <HSKScreenshotScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "hsk_flashcard":
      return <HSKFlashCardThumbnailScene {...shot.visual} />;
    case "icon_threat":
      return <IconThreatScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "story_card":
      return <StoryCardScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "comparison":
      return <ComparisonScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "pipeline_vertical":
      return <PipelineVerticalScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "diagram_flow":
      return <DiagramFlowScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "timeline_stages":
      return <TimelineStagesScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "scan_animation":
      return <ScanAnimationScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "exception_card":
      return <ExceptionCardScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "verdict_list":
      return <VerdictListScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "preview_teaser":
      return <PreviewTeaserScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "google_maps_reveal":
      return <GoogleMapsRevealScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
  }
};
