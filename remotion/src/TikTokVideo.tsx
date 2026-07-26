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
import { SplitApartmentScene } from "./scenes/SplitApartmentScene";
import { WallPortalScene } from "./scenes/WallPortalScene";
import { StadiumGoalScene } from "./scenes/StadiumGoalScene";
import { GoalOrbJourneyScene } from "./scenes/GoalOrbJourneyScene";
import { CharacterIconScene } from "./scenes/CharacterIconScene";
import { QuoteCalloutScene } from "./scenes/QuoteCalloutScene";
import { GrabFoodScreenshotScene } from "./scenes/GrabFoodScreenshotScene";
import { DriverJourneyScene } from "./scenes/DriverJourneyScene";
import { SharedRouteRevealScene } from "./scenes/SharedRouteRevealScene";
import { MultiStopDeliveryScene } from "./scenes/MultiStopDeliveryScene";
import { BatchMergeCinematicScene } from "./scenes/BatchMergeCinematicScene";
import { RouteOptimizerScene } from "./scenes/RouteOptimizerScene";
import { JourneyPerspectiveScene } from "./scenes/JourneyPerspectiveScene";
import { DriverMatrixTeaserScene } from "./scenes/DriverMatrixTeaserScene";
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
import { GameHUDScene } from "./scenes/GameHUDScene";
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
import { TrafficCinematicScene } from "./scenes/TrafficCinematicScene";
import { MapDotToHumanShot } from "./scenes/MapDotToHumanShot";
import { WorkToGameMorphShot } from "./scenes/WorkToGameMorphShot";
import { TripleMetricOrbitShot } from "./scenes/TripleMetricOrbitShot";
import { ProgressMemoryTrailShot } from "./scenes/ProgressMemoryTrailShot";
import { DualClockRouteShot } from "./scenes/DualClockRouteShot";
import { WeightedChoiceWorldShot } from "./scenes/WeightedChoiceWorldShot";
import { FalseCompletionShot } from "./scenes/FalseCompletionShot";
import { ThesisTeaserShot } from "./scenes/ThesisTeaserShot";
import { InvoiceDiscountHookShot } from "./scenes/InvoiceDiscountHookShot";
import { PayerRevealShot } from "./scenes/PayerRevealShot";
import { LedgerEntryShot } from "./scenes/LedgerEntryShot";
import { CostBreakdownShot } from "./scenes/CostBreakdownShot";
import { SponsorComboShot } from "./scenes/SponsorComboShot";
import { PayerMatrixShot } from "./scenes/PayerMatrixShot";
import { TriPhoneRevealShot } from "./scenes/TriPhoneRevealShot";
import { CostTransferOutroShot } from "./scenes/CostTransferOutroShot";
import { RevenueClockHookShot } from "./scenes/RevenueClockHookShot";
import { MillionDongLayersShot } from "./scenes/MillionDongLayersShot";
import { ConditionalGuaranteeShot } from "./scenes/ConditionalGuaranteeShot";
import { TripCountGapShot } from "./scenes/TripCountGapShot";
import { BatteryTimelineShot } from "./scenes/BatteryTimelineShot";
import { MultiplicationTrapShot } from "./scenes/MultiplicationTrapShot";
import { IncomeScannerLayersShot } from "./scenes/IncomeScannerLayersShot";
import { ParallelRoutesGapShot } from "./scenes/ParallelRoutesGapShot";
import { DebateConclusionShot } from "./scenes/DebateConclusionShot";
import { NightTypingHookShot } from "./scenes/NightTypingHookShot";
import { HistoryGapShot } from "./scenes/HistoryGapShot";
import { ScreenPortalTransitionShot } from "./scenes/ScreenPortalTransitionShot";
import { SplitSyncActionShot } from "./scenes/SplitSyncActionShot";
import { LoginBindShot } from "./scenes/LoginBindShot";
import { NetworkPathShot } from "./scenes/NetworkPathShot";
import { ThreeLayerRecapShot } from "./scenes/ThreeLayerRecapShot";
import { PunchlineHoldShot } from "./scenes/PunchlineHoldShot";
import { RealFootageScene } from "./scenes/RealFootageScene";
import { ScreenshotScene } from "./scenes/ScreenshotScene";
import {
  BrandSwapTestScene,
  BriefBlueprintScene,
  CaptionUpgradeScene,
  MarketingCaptionHookScene,
  MarketingPromptDemoScene,
  ReuseSystemScene,
  TaskInstructionScene,
} from "./scenes/MarketingPlaybookScenes";
import { SafeZoneGuide } from "./SafeZoneGuide";
import { BeatMapOverlay } from "./BeatMapOverlay";
import { colors, HSK_PALETTE } from "./styles";
import { LayoutAudit } from "./LayoutAudit";

type ManifestShotWithPreviewAudio = ManifestScene & {
  previewAudioPath?: string;
};

export const TikTokVideo: React.FC<{ manifest: RenderManifest }> = ({ manifest }) => {
  const shots = manifest.shots as ManifestShotWithPreviewAudio[];
  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      <LayoutAudit />
      {manifest.soundtrack && (
        <Audio src={staticFile(manifest.soundtrack.path)} volume={manifest.soundtrack.volume} />
      )}
      <Series>
        {shots.map((shot) => (
          <Series.Sequence
            key={shot.id}
            name={[String(shot.id), shot.sceneName, shot.label].filter(Boolean).join(" · ")}
            durationInFrames={shot.durationInFrames}
          >
            {(shot.previewAudioPath ?? shot.audioPath) && (
              <Sequence from={shot.audioOffsetFrames ?? 0}>
                <Audio src={staticFile(shot.previewAudioPath ?? shot.audioPath)} />
              </Sequence>
            )}
            {shot.extraAudio?.map((seg, i) => (
              <Sequence key={i} from={seg.offsetFrames}>
                <Audio src={staticFile(seg.previewPath ?? seg.path)} />
              </Sequence>
            ))}
            <SceneRenderer shot={shot} />
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
    case "split_apartment":
      return <SplitApartmentScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "wall_portal":
      return <WallPortalScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "stadium_goal":
      return <StadiumGoalScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "goal_orb_journey":
      return <GoalOrbJourneyScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "character_icon":
      return <CharacterIconScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "quote_callout":
      return <QuoteCalloutScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "grabfood_screenshot":
      return <GrabFoodScreenshotScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "driver_journey":
      return <DriverJourneyScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "shared_route_reveal":
      return <SharedRouteRevealScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "multi_stop_delivery":
      return <MultiStopDeliveryScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "batch_merge_cinematic":
      return <BatchMergeCinematicScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "route_optimizer":
      return <RouteOptimizerScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "journey_perspective":
      return <JourneyPerspectiveScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "driver_matrix_teaser":
      return <DriverMatrixTeaserScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
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
    case "game_hud":
      return <GameHUDScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "hsk_hook":
      return (
        <ExplanationScene
          align="center"
          palette={HSK_PALETTE}
          {...shot.visual}
          durationInFrames={shot.durationInFrames}
        />
      );
    case "hsk_explanation":
      return (
        <ExplanationScene
          palette={HSK_PALETTE}
          {...shot.visual}
          durationInFrames={shot.durationInFrames}
        />
      );
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
    case "marketing_caption_hook":
      return <MarketingCaptionHookScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "marketing_prompt_demo":
      return <MarketingPromptDemoScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "brief_blueprint":
      return <BriefBlueprintScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "task_instruction":
      return <TaskInstructionScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "caption_upgrade":
      return <CaptionUpgradeScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "reuse_system":
      return <ReuseSystemScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "brand_swap_test":
      return <BrandSwapTestScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "google_maps_reveal":
      return <GoogleMapsRevealScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "traffic_cinematic":
      return <TrafficCinematicScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "map_dot_to_human":
      return <MapDotToHumanShot {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "work_to_game_morph":
      return <WorkToGameMorphShot {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "triple_metric_orbit":
      return <TripleMetricOrbitShot {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "progress_memory_trail":
      return <ProgressMemoryTrailShot {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "dual_clock_route":
      return <DualClockRouteShot {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "weighted_choice_world":
      return <WeightedChoiceWorldShot {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "false_completion":
      return <FalseCompletionShot {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "thesis_teaser":
      return <ThesisTeaserShot {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "invoice_discount_hook":
      return <InvoiceDiscountHookShot {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "payer_reveal":
      return <PayerRevealShot {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "ledger_entry":
      return <LedgerEntryShot {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "cost_breakdown":
      return <CostBreakdownShot {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "sponsor_combo":
      return <SponsorComboShot {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "payer_matrix":
      return <PayerMatrixShot {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "tri_phone_reveal":
      return <TriPhoneRevealShot {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "cost_transfer_outro":
      return <CostTransferOutroShot {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "revenue_clock_hook":
      return <RevenueClockHookShot {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "million_dong_layers":
      return <MillionDongLayersShot {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "conditional_guarantee":
      return <ConditionalGuaranteeShot {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "trip_count_gap":
      return <TripCountGapShot {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "battery_timeline":
      return <BatteryTimelineShot {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "multiplication_trap":
      return <MultiplicationTrapShot {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "income_scanner_layers":
      return <IncomeScannerLayersShot {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "parallel_routes_gap":
      return <ParallelRoutesGapShot {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "debate_conclusion":
      return <DebateConclusionShot {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "night_typing_hook":
      return <NightTypingHookShot {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "history_gap":
      return <HistoryGapShot {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "screen_portal_transition":
      return <ScreenPortalTransitionShot {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "split_sync_action":
      return <SplitSyncActionShot {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "login_bind":
      return <LoginBindShot {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "network_path":
      return <NetworkPathShot {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "three_layer_recap":
      return <ThreeLayerRecapShot {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "punchline_hold":
      return <PunchlineHoldShot {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "real_footage":
      return <RealFootageScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    case "screenshot":
      return <ScreenshotScene {...shot.visual} durationInFrames={shot.durationInFrames} />;
    default:
      throw new Error(`Unknown shot type: ${(shot as { type: string }).type}`);
  }
};
