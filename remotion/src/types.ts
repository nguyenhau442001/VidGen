export type ExplanationVisual = {
  headline: string;
  body?: string;
  bullets?: string[];
  accentWord?: string;
};

// HSK-branded variants of the hook/explanation/CTA trio — same shapes as
// ExplanationVisual, only the components' visual styling differs (see
// HSKHookScene/HSKExplanationScene/HSKCTAScene).
export type HSKHookVisual = {
  headline: string;
  accentWord?: string;
  body?: string;
};

export type HSKExplanationVisual = ExplanationVisual;

export type HSKCTAVisual = {
  headline: string;
  accentWord?: string;
  body?: string;
};

// Real product-screenshot proof beat — a browser-chrome frame around an
// actual app screenshot, used to back up feature claims with real UI instead
// of only illustrated bullets. imageSrc is a staticFile()-relative path
// (e.g. "images/hsk_app_screenshot.png").
export type HSKScreenshotVisual = {
  imageSrc: string;
  badgeText?: string;
};

export type TerminalLine = string | { text: string; highlight?: boolean };

export type TerminalVisual = {
  lines: TerminalLine[];
  accentColor?: string; // default "#00ff41"
};

export type CodeVisual = {
  language: string;
  code: string;
  highlightLines?: number[];
};

export type ErrorLogVisual = {
  lines: string[];
  highlightKeywords?: string[];
};

export type PhoneMockupStateRange = [number, number]; // [startFrame, endFrame]

export type PhoneMockupVisual = {
  screenState: "idle" | "loading" | "matched";
  driverName: string;
  driverEta: string;
  accentColor: string;
  buttonLabel?: string;
  phoneYOffset?: number;
  idleRange?: PhoneMockupStateRange;
  loadingRange?: PhoneMockupStateRange;
  matchedRange?: PhoneMockupStateRange;
  // Idle-screen-only: animates a driver dot converging on the user's pin,
  // for scenes whose narration describes a driver already en route.
  showApproachingDriver?: boolean;
  // Idle-screen-only: overlays animated falling rain on the map, for scenes
  // whose narration describes live weather data driving demand.
  weatherEffect?: "rain";
  // App header branding — defaults to the generic "RideApp" label used by
  // ride-hailing scripts. Set both to brand this mockup as Google Maps.
  appName?: string;
  appIcon?: "google_maps";
  // Loading/matched screen copy — defaults to the ride-hailing "tìm tài xế"
  // wording used by Grab dispatch scripts. Override for non-driver contexts
  // (e.g. Google Maps route calculation) so the mockup doesn't drift back
  // to talking about drivers.
  loadingLabel?: string;
  matchedStatusLabel?: string;
  matchedConfirmLabel?: string;
  matchedKind?: "driver" | "route";
};

export type ManifestExtraAudio = { path: string; previewPath?: string; offsetFrames: number };

export type ManifestScene =
  | { type: "explanation"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: ExplanationVisual }
  | { type: "terminal"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: TerminalVisual }
  | { type: "code"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: CodeVisual }
  | { type: "error_log"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: ErrorLogVisual }
  | { type: "phone_mockup"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: PhoneMockupVisual }
  | { type: "map_ping"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: MapPingVisual }
  | { type: "map_dot_to_human"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: MapDotToHumanVisual }
  | { type: "geohash_reveal"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: GeohashRevealVisual }
  | { type: "demand_heatmap"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: DemandHeatmapVisual }
  | { type: "signal_flow"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: SignalFlowVisual }
  | { type: "network_flow"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: NetworkFlowVisual }
  | { type: "ripple_aggregate"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: RippleAggregateVisual }
  | { type: "driver_swarm"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: DriverSwarmVisual }
  | { type: "counter_blast"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: CounterBlastVisual }
  | { type: "score_card"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: ScoreCardVisual }
  | { type: "split_view"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: SplitViewVisual }
  | { type: "split_apartment"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: SplitApartmentVisual }
  | { type: "wall_portal"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: WallPortalVisual }
  | { type: "stadium_goal"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: StadiumGoalVisual }
  | { type: "goal_orb_journey"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: GoalOrbJourneyVisual }
  | { type: "character_icon"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: CharacterIconVisual }
  | { type: "quote_callout"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: QuoteCalloutVisual }
  | { type: "grabfood_screenshot"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: GrabFoodScreenshotVisual }
  | { type: "driver_journey"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: DriverJourneyVisual }
  | { type: "shared_route_reveal"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: SharedRouteRevealVisual }
  | { type: "multi_stop_delivery"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: MultiStopDeliveryVisual }
  | { type: "batch_merge_cinematic"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: BatchMergeCinematicVisual }
  | { type: "route_optimizer"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: RouteOptimizerVisual }
  | { type: "journey_perspective"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: JourneyPerspectiveVisual }
  | { type: "driver_matrix_teaser"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: DriverMatrixTeaserVisual }
  | { type: "zoom_reveal"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: ZoomRevealVisual }
  | { type: "split_reveal"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: SplitRevealVisual }
  | { type: "animated_flow"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: AnimatedFlowVisual }
  | { type: "bubble_comparator"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: BubbleComparatorVisual }
  | { type: "phone_map"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: PhoneMapVisual }
  | { type: "conversation"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: ConversationVisual }
  | { type: "before_after"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: BeforeAfterVisual }
  | { type: "grid_heatmap"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: GridHeatmapVisual }
  | { type: "radar_hook"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: RadarHookVisual }
  | { type: "attack_hook"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: AttackVisual }
  | { type: "event_scan"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: EventScanVisual }
  | { type: "driver_heatmap"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: DriverHeatmapVisual }
  | { type: "stat_comparator"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: StatComparatorVisual }
  | { type: "route_timeline"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: RouteTimelineVisual }
  | { type: "corridor_sweep"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: CorridorSweepVisual }
  | { type: "batch_decision_tree"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: BatchDecisionTreeVisual }
  | { type: "delta_arrow"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: DeltaArrowVisual }
  | { type: "driver_consent"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: DriverConsentVisual }
  | { type: "system_layer"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: SystemLayerVisual }
  | { type: "game_hud"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: GameHUDVisual }
  | { type: "work_to_game_morph"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: WorkToGameMorphVisual }
  | { type: "triple_metric_orbit"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: TripleMetricOrbitVisual }
  | { type: "progress_memory_trail"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: ProgressMemoryTrailVisual }
  | { type: "dual_clock_route"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: DualClockRouteVisual }
  | { type: "weighted_choice_world"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: WeightedChoiceWorldVisual }
  | { type: "false_completion"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: FalseCompletionVisual }
  | { type: "thesis_teaser"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: ThesisTeaserVisual }
  | { type: "hsk_hook"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: HSKHookVisual }
  | { type: "hsk_explanation"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: HSKExplanationVisual }
  | { type: "hsk_cta"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: HSKCTAVisual }
  | { type: "hsk_screenshot"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: HSKScreenshotVisual }
  | { type: "hsk_flashcard"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: HSKFlashCardThumbnailVisual }
  | { type: "icon_threat"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: IconThreatVisual }
  | { type: "story_card"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: StoryCardVisual }
  | { type: "comparison"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: ComparisonVisual }
  | { type: "pipeline_vertical"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: PipelineVerticalVisual }
  | { type: "diagram_flow"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: DiagramFlowVisual }
  | { type: "timeline_stages"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: TimelineStagesVisual }
  | { type: "scan_animation"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: ScanAnimationVisual }
  | { type: "exception_card"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: ExceptionCardVisual }
  | { type: "verdict_list"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: VerdictListVisual }
  | { type: "preview_teaser"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: PreviewTeaserVisual }
  | { type: "google_maps_reveal"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: GoogleMapsRevealVisual }
  | { type: "traffic_cinematic"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: TrafficCinematicVisual }
  | { type: "invoice_discount_hook"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: InvoiceDiscountHookVisual }
  | { type: "payer_reveal"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: PayerRevealVisual }
  | { type: "ledger_entry"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: LedgerEntryVisual }
  | { type: "cost_breakdown"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: CostBreakdownVisual }
  | { type: "sponsor_combo"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: SponsorComboVisual }
  | { type: "payer_matrix"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: PayerMatrixVisual }
  | { type: "tri_phone_reveal"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: TriPhoneRevealVisual }
  | { type: "cost_transfer_outro"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: CostTransferOutroVisual }
  | { type: "revenue_clock_hook"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: RevenueClockHookVisual }
  | { type: "million_dong_layers"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: MillionDongLayersVisual }
  | { type: "conditional_guarantee"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: ConditionalGuaranteeVisual }
  | { type: "trip_count_gap"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: TripCountGapVisual }
  | { type: "battery_timeline"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: BatteryTimelineVisual }
  | { type: "multiplication_trap"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: MultiplicationTrapVisual }
  | { type: "income_scanner_layers"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: IncomeScannerLayersVisual }
  | { type: "parallel_routes_gap"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: ParallelRoutesGapVisual }
  | { type: "debate_conclusion"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: DebateConclusionVisual }
  | { type: "night_typing_hook"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: NightTypingHookVisual }
  | { type: "history_gap"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: HistoryGapVisual }
  | { type: "screen_portal_transition"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: ScreenPortalTransitionVisual }
  | { type: "split_sync_action"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: SplitSyncActionVisual }
  | { type: "login_bind"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: LoginBindVisual }
  | { type: "network_path"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: NetworkPathVisual }
  | { type: "three_layer_recap"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: ThreeLayerRecapVisual }
  | { type: "punchline_hold"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: PunchlineHoldVisual }
  | { type: "marketing_caption_hook"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: MarketingCaptionHookVisual }
  | { type: "marketing_prompt_demo"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: MarketingPromptDemoVisual }
  | { type: "brief_blueprint"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: BriefBlueprintVisual }
  | { type: "task_instruction"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: TaskInstructionVisual }
  | { type: "caption_upgrade"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: CaptionUpgradeVisual }
  | { type: "reuse_system"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: ReuseSystemVisual }
  | { type: "brand_swap_test"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; visual: BrandSwapTestVisual };

export type MarketingCaptionHookVisual = {
  label: string;
  logoLabel?: string;
  revisionLabel?: string;
  feedbackLabel?: string;
  feedbackText?: string;
  caption: string;
  stamp: string;
  partLabel?: string;
  thumbnailHeadline?: string;
  thumbnailAccentWord?: string;
  thumbnailSubtext?: string;
  thumbnailIllustration?: "notebook" | "brandSwap";
};

export type MarketingCaptionHookSceneProps = MarketingCaptionHookVisual & {
  durationInFrames: number;
};

export type MarketingPromptDemoVisual = {
  headline: string;
  promptLabel?: string;
  prompt: string;
  responseLabel?: string;
  response: string;
  highlightedInputs?: string[];
  flaggedPhrases: string[];
  verdict: string;
  footer?: string;
};

export type MarketingPromptDemoSceneProps = MarketingPromptDemoVisual & {
  durationInFrames: number;
};

export type BriefBlueprintField = {
  id?: string;
  icon: string;
  label: string;
  value?: string;
  appearFrame?: number;
};

export type BriefBlueprintVisual = {
  eyebrow?: string;
  headline: string;
  campaignLabel?: string;
  fields: BriefBlueprintField[];
  avoidLabel?: string;
  avoid?: string[];
  footer?: string;
  layout?: "stack" | "grid";
  revealMode?: "sequential" | "together";
};

export type BriefBlueprintSceneProps = BriefBlueprintVisual & {
  durationInFrames: number;
};

export type TaskInstructionVisual = {
  headline: string;
  lockedLabel: string;
  lockedFields?: string[];
  taskLabel?: string;
  task: string;
  constraints: string[];
  footer?: string;
};

export type TaskInstructionSceneProps = TaskInstructionVisual & {
  durationInFrames: number;
};

export type CaptionUpgradeVisual = {
  eyebrow?: string;
  headline: string;
  beforeLabel?: string;
  before: string;
  afterLabel?: string;
  after: string;
  accentPhrases: string[];
  proofPoints?: Array<{ label: string; value: string }>;
  verdict?: string;
  approvalLabel?: string;
  approvalText?: string;
  footer: string;
};

export type CaptionUpgradeSceneProps = CaptionUpgradeVisual & {
  durationInFrames: number;
};

export type ReuseSystemVisual = {
  eyebrow?: string;
  headline: string;
  core: string;
  tasks: Array<{ icon: string; label: string; detail?: string }>;
  promptTemplate?: {
    label: string;
    title: string;
    rows: Array<{ label: string; placeholder: string }>;
    helper?: string;
  };
  testCard?: {
    label: string;
    headline: string;
    question: string;
    failText: string;
  };
  closingLine?: string;
  closingAccent?: string;
  channel?: string;
  footer: string;
};

export type ReuseSystemSceneProps = ReuseSystemVisual & {
  durationInFrames: number;
};

export type BrandSwapTestVisual = {
  label?: string;
  headline: string;
  caption: string;
  question?: string;
  fixes?: string[];
  brands?: Array<{ name: string; category?: string }>;
  swapIntervalFrames?: number;
  feedbackLabel?: string;
  feedbackText?: string;
  feedbackAppearFrame?: number;
  partLabel?: string;
};

export type BrandSwapTestSceneProps = BrandSwapTestVisual & {
  durationInFrames: number;
};

// --- incognito_myth -----------------------------------------------------
// Bespoke shot set for "closing an incognito tab doesn't make you invisible"
// — browser-chrome hook/history/split-sync/login/network beats, the same
// per-video bespoke-shot-set pattern as grabfood_discount_who_pays_p3 and
// greensm_bike_income. Shared BrowserChrome chrome shell lives in
// scenes/incognitoShared.tsx.

export type NightTypingHookVisual = {
  timeLabel?: string;
  // Typed out in two segments with a hesitation pause between them (default
  // 12 frames / 0.4s @30fps) — one continuous cursor, not two separate
  // typing passes — so it reads as the same person pausing mid-sentence.
  typedTextPart1?: string;
  typedTextPart2?: string;
  // Exact substring of typedTextPart2 to render bold + a brief scale-pop the
  // moment it finishes appearing.
  emphasizeWord?: string;
  pauseFrames?: number;
  headline?: string;
  accentWord?: string;
  accentColor?: string;
};

export type NightTypingHookSceneProps = NightTypingHookVisual & { durationInFrames: number };

export type HistoryGapVisual = {
  existingRows?: string[];
  headline?: string;
  accentWord?: string;
  accentColor?: string;
};

export type HistoryGapSceneProps = HistoryGapVisual & { durationInFrames: number };

export type ScreenPortalTransitionVisual = {
  websiteUrlLabel?: string;
  headline?: string;
  accentWord?: string;
  accentColor?: string;
};

export type ScreenPortalTransitionSceneProps = ScreenPortalTransitionVisual & { durationInFrames: number };

// searchFrame/viewFrame are the single source of truth for both panels: the
// left-side typed action and the right-side counter/badge reaction are each
// driven off the same frame number, so they land in perfect sync by
// construction rather than by tuning two separate timelines.
export type SplitSyncActionVisual = {
  leftKeyword?: string;
  leftResultLabel?: string;
  typeStartFrame?: number;
  searchFrame?: number;
  viewFrame?: number;
  counterBefore?: number;
  counterAfter?: number;
  searchLabel?: string;
  viewLabel?: string;
  headline?: string;
  accentWord?: string;
  accentColor?: string;
};

export type SplitSyncActionSceneProps = SplitSyncActionVisual & { durationInFrames: number };

export type LoginBindVisual = {
  email?: string;
  loginFrame?: number;
  tag1?: string;
  tag2?: string;
  headline1?: string;
  headline2?: string;
  accentWord2?: string;
  accentColor?: string;
};

export type LoginBindSceneProps = LoginBindVisual & { durationInFrames: number };

export type NetworkPathVisual = {
  laptopLabel?: string;
  wifiLabel?: string;
  websiteLabel?: string;
  toggleFrame?: number;
  struckLabel?: string;
  continuingLabel?: string;
  accentColor?: string;
};

export type NetworkPathSceneProps = NetworkPathVisual & { durationInFrames: number };

export type ThreeLayerRecapLayer = { label: string; sublabel?: string };

export type ThreeLayerRecapVisual = {
  layers?: ThreeLayerRecapLayer[];
  // All three cards share this one fade-out start (+ fixed duration) so they
  // visibly fade together, never one-by-one, before the punchline hold.
  fadeStartFrame?: number;
  accentColor?: string;
  // Number of leading layers (0..N) to render already-in-place from frame 0
  // instead of replaying their entrance — used when a previous shot already
  // held on those cards and this shot picks up the same visual state after a
  // hard cut (Remotion shots can't carry animation state across a Sequence
  // boundary, so this simulates continuity instead).
  instantCount?: number;
};

export type ThreeLayerRecapSceneProps = ThreeLayerRecapVisual & { durationInFrames: number };

export type PunchlineHoldVisual = {
  line1?: string;
  line2?: string;
  accentColor?: string;
};

export type PunchlineHoldSceneProps = PunchlineHoldVisual & { durationInFrames: number };

// Shot is the canonical public term; ManifestScene remains as a compatibility
// alias for the existing component registry and any older imports.
export type ManifestShot = ManifestScene;

export type RenderManifest = {
  fps: number;
  width: number;
  height: number;
  soundtrack?: { path: string; volume: number };
  shots: ManifestShot[];
};

export type ExplanationSceneProps = ExplanationVisual & { durationInFrames: number };
export type HSKHookSceneProps = HSKHookVisual & { durationInFrames: number };
export type HSKExplanationSceneProps = HSKExplanationVisual & { durationInFrames: number };
export type HSKCTASceneProps = HSKCTAVisual & { durationInFrames: number };
export type HSKScreenshotSceneProps = HSKScreenshotVisual & { durationInFrames: number };
export type TerminalSceneProps = TerminalVisual & { durationInFrames: number };
export type CodeSceneProps = CodeVisual & { durationInFrames: number };
export type ErrorLogSceneProps = ErrorLogVisual & { durationInFrames: number };
export type PhoneMockupSceneProps = PhoneMockupVisual & { durationInFrames: number };

export type MapPingDriver = { x: number; y: number; label: string };

// One driver's vector relative to the rider→destination "ground truth" axis:
// "toward" means aligned with the trip direction (approaches the rider from
// behind, along the same line as the destination); "away" means it points
// off-axis, in the wrong direction.
export type MapPingAxisDriver = {
  label: string;
  distanceMeters: number;
  direction: "toward" | "away";
  // Real-world reason distance alone is misleading, e.g. a median forcing a
  // detour to the next U-turn — shown as a small annotation near this driver.
  constraintNote?: string | null;
  etaSeconds?: number;
  etaLabel?: string;
};

export type MapPingAxis = {
  destinationLabel?: string;
  drivers: MapPingAxisDriver[];
};

// Overhead demand-heatmap mode: a named zone (district) whose demand
// multiplier steps from demandBefore to demandAfter at triggerFrame (e.g. a
// weather event landing). id looks up a fixed on-canvas position; unknown
// ids fall back to an auto-spread layout so authors don't have to hand-place
// coordinates.
export type MapPingZone = {
  id: string;
  label: string;
  demandBefore: number;
  demandAfter: number;
  triggerFrame: number;
};

export type MapPingVisual = {
  drivers?: MapPingDriver[];
  highlightedDriverIndex?: number;
  nearestDriverIndex?: number;
  selectedDriverIndex?: number;
  phase1End?: number;
  phase2Start?: number;
  accentColor?: string;
  // When "median", a physical divider is drawn across the "away" driver's
  // vector — the visual reason their route can't go straight to the rider.
  roadConstraint?: "median";
  axis?: MapPingAxis;
  // Presence of `zones` switches the scene into the demand-heatmap mode
  // (mutually exclusive with drivers/axis).
  zones?: MapPingZone[];
  weatherOverlay?: "rain";
  // Extra city-wide radar-sweep ring drawn once across this frame range, on
  // top of each zone's own trigger-frame ping.
  animatePingFrames?: [number, number];
};

export type MapPingSceneProps = MapPingVisual & { durationInFrames: number };

export type MapDotToHumanVisual = {
  headline: string;
  subheadline?: string; // optional second question line under headline, e.g. the hook's payoff question
  seriesLabel: string; // e.g. "GRABFOOD · PHẦN 2" — series marker visible from frame 0
  illustrativeLabel: string; // "Tình huống minh họa" badge on the 9/10 notification
  batteryPercent: number; // e.g. 5
  timeLabel?: string; // e.g. "23:47" — shown next to the battery readout
  targetCurrent: number; // e.g. 9
  targetTotal: number; // e.g. 10
  // Optional small text-message bubble seeded early in the shot (e.g. "Cơm để
  // trên bàn nhé.") — plants a home-side detail paid off later without adding
  // a new spoken line. Fades in/out before the notification badge arrives.
  sideNoteText?: string;
};

export type MapDotToHumanSceneProps = MapDotToHumanVisual & { durationInFrames: number };

// x/y are grid cell indices (column, row) into the gridCols×gridRows lattice,
// not canvas fractions — the scene resolves them to pixel centers itself.
export type GeohashDistrict = {
  x: number;
  y: number;
  label: string;
  demandLevel: number; // 0–1, controls cell brightness
};

export type GeohashRevealVisual = {
  districts: GeohashDistrict[];
  accentColor?: string; // default "#22C55E"
  gridRows?: number; // default 7
  gridCols?: number; // default 9
};

export type GeohashRevealSceneProps = GeohashRevealVisual & { durationInFrames: number };

// x/y are viewBox coordinates on the scene's 750×1080 canvas. The SVG covers
// the 1080×1920 frame with "slice" scaling, so only x ≈ 71–679 stays visible —
// keep hotspots inside that band.
export type DemandHotspot = {
  x: number;
  y: number;
  radius: number; // base radius in px (viewBox units)
  intensity: number; // 0–1, maps to color saturation
  label?: string;
};

export type DemandHeatmapVisual = {
  hotspots: DemandHotspot[];
  accentColor?: string; // default "#22C55E"; intensity ≥ 0.55 burns "#ff4444"
};

export type DemandHeatmapSceneProps = DemandHeatmapVisual & { durationInFrames: number };

// Node-graph scene: input signal nodes on the left stream particles into a
// "brain" node on the right. Layout is fixed on the 750×1080 viewBox (same
// slice-crop caveat as demand_heatmap: only x ≈ 71–679 is visible).
export type SignalFlowSignal = {
  icon: string; // emoji, e.g. "📊", "🌧️", "📅"
  label: string; // Vietnamese label
  color: string; // particle + node accent color
};

export type SignalFlowVisual = {
  signals: SignalFlowSignal[];
  outputLabel: string; // label next to brain node
  accentColor?: string; // default "#22C55E"
};

export type SignalFlowSceneProps = SignalFlowVisual & { durationInFrames: number };

// Merge scene: N input nodes converge into a single output node via cubic
// Bezier connectors (e.g. two same-direction trips merged into one route).
// Same 750×1080 viewBox slice-crop convention as signal_flow (only
// x ≈ 71–679 is visible). NetworkFlowSceneProps itself is declared in
// scenes/NetworkFlowScene.tsx.
export type NetworkFlowSignal = {
  icon: string; // emoji or text label, e.g. "🅰️"
  label: string; // e.g. "Cuốc A"
  color: string; // border/accent color for this input node
};

export type NetworkFlowVisual = {
  signals: NetworkFlowSignal[];
  outputLabel: string; // label on the merged output node
  accentColor?: string; // default "#00ff41"
};

export type NetworkFlowSceneProps = NetworkFlowVisual & { durationInFrames: number };

// One phone taps → camera zooms out to a field of rippling phones that
// converge on a hotspot. hotspotPosition is in the scene's 750×1080 viewBox
// coordinates (same slice-crop caveat as demand_heatmap: x ≈ 71–679 visible).
export type RippleAggregateVisual = {
  singleLabel: string; // label shown phase 1, e.g. "Bạn thấy"
  aggregateLabel: string; // label shown phase 2, e.g. "Hàng nghìn người cùng lúc"
  phoneCount?: number; // default 28
  accentColor?: string; // default "#22C55E"
  hotspotPosition?: { x: number; y: number }; // default center
};

export type RippleAggregateSceneProps = RippleAggregateVisual & { durationInFrames: number };

// Drivers converge on a pulsing demand zone. All coordinates are in the
// scene's 750×1080 viewBox (same slice-crop caveat as demand_heatmap:
// only x ≈ 71–679 is visible).
export type DriverSwarmDriver = {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  label?: string; // e.g. "800m", "1.2km"
};

export type DriverSwarmVisual = {
  drivers: DriverSwarmDriver[];
  hotspot: { x: number; y: number; label?: string };
  accentColor?: string; // default "#22C55E"
};

export type DriverSwarmSceneProps = DriverSwarmVisual & { durationInFrames: number };

// Big count-up reveal: 0 → finalValue with a flash, type-scale blast and a
// lock-in pulse when the number lands. Pure HTML/CSS, centered.
export type CounterBlastVisual = {
  finalValue: number; // e.g. 8431
  unit?: string; // e.g. "lượt mở app", "×2", "tài xế"
  subLabel?: string; // smaller text below counter
  prefix?: string; // e.g. "+" or "×" before number
  accentColor?: string; // default "#22C55E"
  countDuration?: number; // frames to count up, default 80
};

export type CounterBlastSceneProps = CounterBlastVisual & { durationInFrames: number };

export type ScoreCriteria = { label: string; score: number; maxScore: number };

export type ScoreCardVisual = {
  criteria: ScoreCriteria[];
  staggerFrames?: number;
  // Explicit per-row reveal frame, overriding the uniform staggerFrames
  // spacing — needed when narration_per_criterion lines run for uneven
  // durations and each row must sync to its own line instead of a fixed gap.
  rowEnterFrames?: number[];
  accentColor?: string;
  title?: string;
};

export type ScoreCardSceneProps = ScoreCardVisual & { durationInFrames: number };

export type SplitPanelContent =
  | { kind: "loading"; text?: string }
  | { kind: "text"; heading?: string; body: string }
  | { kind: "list"; items: string[]; highlightLast?: boolean }
  | { kind: "dots"; count?: number }
  | { kind: "road_diagram"; axis: MapPingAxis; roadConstraint?: "median" }
  | { kind: "eta_comparison"; axis: MapPingAxis };

export type SplitViewVisual = {
  leftPanel?: SplitPanelContent;
  rightPanel?: SplitPanelContent;
  leftLabel?: string;
  rightLabel?: string;
  accentColor?: string;
  // Panels default to a dark "terminal chrome" look (right for code/diff
  // comparisons). Set "light" for non-code comparisons on the light channel
  // theme, where a dark panel would otherwise read as a jarring dark patch.
  panelTheme?: "dark" | "light";
};

export type SplitViewSceneProps = SplitViewVisual & { durationInFrames: number };

export type SplitApartmentReaction = "calm" | "watching" | "startled" | "cheering" | "frozen";
export type SplitApartmentTvState = "live" | "buffering" | "goal" | "delay" | "replay" | "freeze";
export type SplitApartmentCameraMode = "static" | "pan";
export type SplitApartmentPreset =
  | "shockwave_hook"
  | "neighbor_celebration"
  | "delayed_goal"
  | "cross_wall_pan"
  | "neighbor_alert_callback";

export type SplitApartmentSide = {
  label: string;
  reaction?: SplitApartmentReaction;
  tvState?: SplitApartmentTvState;
  hasRemote?: boolean;
  hasDrink?: boolean;
  hasSnack?: boolean;
  accentColor?: string;
  couchColor?: string;
  screenLabel?: string;
};

export type SplitApartmentTimelineEvent = {
  frame: number;
  label: string;
  side?: "left" | "right" | "both";
  emphasis?: "calm" | "warning" | "impact";
};

export type SplitApartmentChecklistItem = {
  text: string;
  reveal_frame?: number;
  style?: "default" | "warning";
};

export type SplitApartmentVisual = {
  preset?: SplitApartmentPreset;
  headline?: string;
  accentWord?: string;
  subtext?: string;
  accentColor?: string;
  cameraMode?: SplitApartmentCameraMode;
  shoutSide?: "left" | "right";
  leftApartment?: SplitApartmentSide;
  rightApartment?: SplitApartmentSide;
  timeline?: SplitApartmentTimelineEvent[];
  checklist?: Array<string | SplitApartmentChecklistItem>;
  wallLabel?: string;
};

export type SplitApartmentSceneProps = SplitApartmentVisual & { durationInFrames: number };

export type WallPortalDialogue = {
  frame?: number;
  start_frame?: number;
  side?: "left" | "right";
  speaker?: "host" | "guest";
  text: string;
};

export type WallPortalPreset = "commentary_booth";
export type WallPortalMode = "static" | "push-through";
export type WallPortalStyle = "crack" | "door" | "circle" | "energy";

export type WallPortalVisual = {
  preset?: WallPortalPreset;
  headline?: string;
  accentWord?: string;
  subtext?: string;
  accentColor?: string;
  secondaryColor?: string;
  cameraMode?: WallPortalMode;
  portalStyle?: WallPortalStyle;
  leftLabel?: string;
  rightLabel?: string;
  portalLabel?: string;
  dialogue?: WallPortalDialogue[];
  boilerplate?: string;
};

export type WallPortalSceneProps = WallPortalVisual & { durationInFrames: number };

export type StadiumGoalCameraMode = "low_pitch" | "behind_striker" | "ball_follow" | "behind_goal" | "crowd_push";
export type StadiumGoalPhaseHint = "build_up" | "striker_run" | "shot" | "ball_flight" | "goal_impact" | "net_shake" | "crowd_explosion" | "freeze_goal";

export type StadiumGoalScoreboard = {
  homeLabel?: string;
  awayLabel?: string;
  homeScore?: number;
  awayScore?: number;
  minute?: string;
};

export type StadiumGoalVisual = {
  phaseHint?: StadiumGoalPhaseHint;
  cameraMode?: StadiumGoalCameraMode;
  headline?: string;
  accentWord?: string;
  subtext?: string;
  accentColor?: string;
  secondaryColor?: string;
  scoreboard?: StadiumGoalScoreboard;
  strikerLabel?: string;
  keeperLabel?: string;
  crowdLabel?: string;
  confetti?: boolean;
  freezeLabel?: string;
  ballLabel?: string;
};

export type StadiumGoalSceneProps = StadiumGoalVisual & { durationInFrames: number };

export type GoalOrbJourneyMode =
  | "birth_from_goal"
  | "split_into_fragments"
  | "relay_passes"
  | "city_flight"
  | "counterattack"
  | "branch_to_targets"
  | "arrival_impact";

export type GoalOrbJourneyNode = {
  x: number;
  y: number;
  label: string;
  kind?: "stadium" | "relay" | "house" | "target";
};

export type GoalOrbJourneyTarget = {
  x: number;
  y: number;
  label: string;
  kind?: "house" | "tv";
  arriveOffsetFrames?: number;
};

export type GoalOrbJourneyVisual = {
  mode?: GoalOrbJourneyMode;
  headline?: string;
  accentWord?: string;
  subtext?: string;
  accentColor?: string;
  secondaryColor?: string;
  trailColor?: string;
  cameraFollow?: "ball" | "lag";
  routeNodes?: GoalOrbJourneyNode[];
  targets?: GoalOrbJourneyTarget[];
  statusText?: string;
  branchLabels?: [string, string];
};

export type GoalOrbJourneySceneProps = GoalOrbJourneyVisual & { durationInFrames: number };

export type CharacterIconDistancePin = { label: string };

export type CharacterIconVisual = {
  pose: "idle" | "holding-phone" | "pointing";
  accompanyingIcon?: "car" | "phone" | "map-pin";
  accentColor?: string;
  silhouetteColor?: string;
  // Scene-1 "hook" framing — all optional so every other CharacterIconScene
  // usage renders unchanged. topicLabel/partLabel are freeform (already
  // human-composed, e.g. "Phần 1/4") so no series-numbering logic lives here.
  topicLabel?: string;
  partLabel?: string;
  rejectedPin?: CharacterIconDistancePin;
  selectedPin?: CharacterIconDistancePin;
};

export type CharacterIconSceneProps = CharacterIconVisual & { durationInFrames: number };

export type CharacterIconCoverVisual = {
  accentColor?: string;
  line1?: string;
  line2?: string;
  line3?: string;
  subtitle?: string;
  eyebrowText?: string;
  seriesLabel?: string;
  rejectedLabel?: string;
  selectedLabel?: string;
};

export type CharacterIconCoverSceneProps = CharacterIconCoverVisual;

export type QuoteCalloutVisual = {
  text: string;
  accentWord?: string;
  backgroundStyle?: "dark" | "gradient-subtle";
  accentColor?: string;
  screenshotPath?: string;
};

export type QuoteCalloutSceneProps = QuoteCalloutVisual & { durationInFrames: number };

export type GrabFoodScreenshotVisual = {
  screenshotPath: string;
  mode: "hook" | "evidence";
  headline: string;
  accentWord?: string;
  disclaimer?: string;
  restaurantLabel?: string;
};

export type GrabFoodScreenshotSceneProps = GrabFoodScreenshotVisual & { durationInFrames: number };

export type DriverJourneyTradeoff = {
  label: string;
  value: string;
};

export type DriverJourneyVisual = {
  headline: string;
  customerTradeoff: DriverJourneyTradeoff;
  driverTradeoff: DriverJourneyTradeoff;
  tasks: string[];
  closingLine: string;
};

export type DriverJourneySceneProps = DriverJourneyVisual & { durationInFrames: number };

export type SharedRouteRevealVisual = {
  headline: string;
  detourLabel: string;
  revealText: string;
  restaurantLabel?: string;
};

export type SharedRouteRevealSceneProps = SharedRouteRevealVisual & { durationInFrames: number };

export type MultiStopDeliveryVisual = {
  stops: RouteTimelineStop[];
  headline: string;
  footer: string;
  accentColor?: string;
};

export type MultiStopDeliverySceneProps = MultiStopDeliveryVisual & { durationInFrames: number };

export type BatchMergeCinematicVisual = {
  headline: string;
  beforeLabel: string;
  afterLabel: string;
  stats: Array<{ value: string; label: string }>;
};

export type BatchMergeCinematicSceneProps = BatchMergeCinematicVisual & { durationInFrames: number };

export type RouteOptimizerVisual = {
  headline: string;
  signals: SignalFlowSignal[];
  candidates: Array<{
    label: string;
    score: number;
    path: string;
    selected?: boolean;
  }>;
  outputLabel: string;
};

export type RouteOptimizerSceneProps = RouteOptimizerVisual & { durationInFrames: number };

export type JourneyPerspectiveVisual = {
  customerHeadline: string;
  systemHeadline: string;
  distanceLabel: string;
  factors: string[];
  closingLine: string;
};

export type JourneyPerspectiveSceneProps = JourneyPerspectiveVisual & { durationInFrames: number };

export type DriverMatrixTeaserVisual = {
  eyebrow: string;
  title: string;
  notificationText: string;
  nodes: Array<{ icon: string; label: string }>;
  pulseText: string;
  question: string;
};

export type DriverMatrixTeaserSceneProps = DriverMatrixTeaserVisual & { durationInFrames: number };

// leftMapPing is rendered as a live MapPingScene in SplitRevealScene's left
// panel (manifest visuals must stay JSON-serializable, so it's data here,
// not a ReactNode — resolved to the actual component by the scene renderer).
export type SplitRevealVisual = {
  leftMapPing: MapPingVisual;
  splitRatio?: number;
  revealDurationFrames?: number;
  accentColor?: string;
  leftCaption?: string;
  rightCaption?: string;
};

// focusElement/revealContent are preset keys (resolved to the built-in FocalDot /
// DotField components by the scene renderer) since manifest visuals must stay
// JSON-serializable and can't carry actual ReactNode content.
export type ZoomRevealVisual = {
  focusElement?: string;
  revealContent?: string;
  zoomStartScale?: number;
  zoomEndScale?: number;
  accentColor?: string;
  dotColor?: string;
};

export type AnimatedFlowVisual = {
  nodes: Array<{ id: string; label: string; sublabel?: string; color?: "green" | "cyan" | "neutral" }>;
  edges: Array<{ from: string; to: string; label?: string }>;
  headline: string;
};

export type AnimatedFlowSceneProps = AnimatedFlowVisual & { durationInFrames: number };

export type BubbleComparatorItem = {
  label: string;
  value: number;
  unit?: string;
  color?: "green" | "cyan" | "red";
};

export type BubbleComparatorVisual = {
  items: BubbleComparatorItem[];
  headline: string;
  accentWord: string;
};

export type BubbleComparatorSceneProps = BubbleComparatorVisual & { durationInFrames: number };

export type PhoneMapPin = {
  id: string;
  x: number;
  y: number;
  label?: string;
  type?: "driver" | "user" | "zone";
};

export type PhoneMapVisual = {
  pins: PhoneMapPin[];
  headline: string;
  showRadius?: boolean;
};

export type PhoneMapSceneProps = PhoneMapVisual & { durationInFrames: number };

export type ConversationMessage = {
  side: "left" | "right";
  text: string;
  sender?: string;
  delay?: number;
};

export type ConversationVisual = {
  messages: ConversationMessage[];
  headline?: string;
};

export type ConversationSceneProps = ConversationVisual & { durationInFrames: number };

export type BeforeAfterPanel = {
  label: string;
  points: string[];
  color?: string;
};

export type BeforeAfterVisual = {
  before: BeforeAfterPanel;
  after: BeforeAfterPanel;
  headline: string;
  accentWord: string;
  revealFrame?: number;
};

export type BeforeAfterSceneProps = BeforeAfterVisual & { durationInFrames: number };

export type StatComparatorVisual = {
  headline: string;
  accentWord: string;

  beforeLabel: string;
  beforeStat: string;
  beforeStatNumber: number;
  beforeStatUnit: string;
  beforeSubtext: string;
  beforeColor?: string;

  afterLabel: string;
  afterStat: string;
  afterStatNumber: number;
  afterStatUnit: string;
  afterSubtext: string;
  afterColor?: string;

  deltaLabel?: string;
};

export type StatComparatorSceneProps = StatComparatorVisual & { durationInFrames: number };

// Personal-stakes beat: a short row of icon+label items the viewer
// recognizes as their own ("old photos", "deleted messages"), followed by
// a one-line verdict. Used right after a cold-open hook to make the threat
// feel personal before the mechanism is explained.
export type IconThreatItem = { icon: string; label: string };

export type IconThreatVisual = {
  headline: string;
  accentWord?: string;
  headlineSingleLine?: boolean;
  layout?: "row" | "column";
  items: IconThreatItem[];
  verdict?: string;
  accentColor?: string; // default colors.cyan
};

export type IconThreatSceneProps = IconThreatVisual & { durationInFrames: number };

// Real-world case card: year/flag/location framing a concrete incident,
// its outcome, and a closing verdict line — used to back a claim with a
// documented event instead of only theory.
export type StoryCardVisual = {
  headline: string;
  accentWord?: string;
  year: string;
  flag: string;
  location: string;
  event: string;
  outcome: string;
  verdict?: string;
  accentColor?: string; // default colors.green
};

export type StoryCardSceneProps = StoryCardVisual & { durationInFrames: number };

// Cold-open face-off: two icon+label sides connected by a connector glyph,
// with a brief glitch flicker on the losing side — "you did X, but Y is
// still true" in one glance, before any explanation.
export type ComparisonVisual = {
  headline: string;
  accentWord?: string;
  subtext?: string;
  visualEffect?: "glitch";
  leftIcon: string;
  leftLabel: string;
  rightIcon: string;
  rightLabel: string;
  connector?: string; // default "→"
};

export type ComparisonSceneProps = ComparisonVisual & { durationInFrames: number };

// Vertical step-by-step flow (e.g. file -> delete -> data block), each step
// tagged with a status that drives its color treatment.
export type PipelineStep = {
  label: string;
  icon: string;
  status: "exists" | "deleted" | "still_here" | "neutral";
  note?: string;
};

export type PipelineVerticalVisual = {
  headline: string;
  accentWord?: string;
  steps: PipelineStep[];
  accentColor?: string;
};

export type PipelineVerticalSceneProps = PipelineVerticalVisual & { durationInFrames: number };

// Horizontal node diagram (e.g. filename -> inode -> data block), each node
// with an icon/sublabel and a deleted/intact status, joined by an arrow,
// with an optional footer punchline.
export type DiagramFlowNode = {
  label: string;
  sublabel?: string;
  icon: string;
  status: "deleted" | "intact" | "neutral";
};

export type DiagramFlowVisual = {
  headline: string;
  accentWord?: string;
  nodes: DiagramFlowNode[];
  arrow?: string; // default "→"
  footer?: string;
};

export type DiagramFlowSceneProps = DiagramFlowVisual & { durationInFrames: number };

// Horizontal timeline of stages (e.g. delete -> available -> overwritten new
// file -> gone for real), each stage tagged danger/warning/safe.
export type TimelineStage = {
  label: string;
  icon: string;
  state: "danger" | "warning" | "safe";
};

export type TimelineStagesVisual = {
  headline: string;
  accentWord?: string;
  stages: TimelineStage[];
  note?: string;
};

export type TimelineStagesSceneProps = TimelineStagesVisual & { durationInFrames: number };

// Scanning-beam reveal: a sweep line passes over a raw-sector grid while
// target file-signatures light up as "found", ending on a result + note.
export type ScanAnimationVisual = {
  headline: string;
  accentWord?: string;
  scanLabel: string;
  targets: string[];
  result: string;
  note?: string;
  accentColor?: string;
};

export type ScanAnimationSceneProps = ScanAnimationVisual & { durationInFrames: number };

// Two-column recovery-odds comparator (e.g. HDD vs SSD+TRIM), each column a
// labeled bar at a fixed height/percentage, with a caveat line pinned below
// — the "but here's the exception" beat.
export type ExceptionCardItem = {
  label: string;
  icon: string;
  recovery: string;
  bar: number; // 0-100
};

export type ExceptionCardVisual = {
  headline: string;
  accentWord?: string;
  comparison: ExceptionCardItem[];
  caveat?: string;
};

export type ExceptionCardSceneProps = ExceptionCardVisual & { durationInFrames: number };

// Stacked checklist of actions vs verdicts (e.g. Empty Trash -> still
// recoverable, Secure Erase -> gone for real), ending on a standard/citation
// badge — the "here's the actual takeaway" beat.
export type VerdictItem = {
  action: string;
  icon: string;
  result: string;
  color: "danger" | "safe";
};

export type VerdictListVisual = {
  headline: string;
  accentWord?: string;
  verdicts: VerdictItem[];
  standard?: string;
};

export type VerdictListSceneProps = VerdictListVisual & { durationInFrames: number };

// Closing CTA teaser: headline + subtext, a short list of "next video"
// preview items with a leading icon, and a channel tag.
// Cold-open "someone using Google Maps" hook: a small person-holding-phone
// illustration whose phone scales up to fill the frame, revealing a Google
// Maps-style route screen with a shorter rejected route (dashed grey) next
// to the longer selected route (solid blue) that Maps actually picked.
export type GoogleMapsRoute = { distance: string; duration: string };

export type GoogleMapsRevealVisual = {
  rejectedRoute: GoogleMapsRoute;
  selectedRoute: GoogleMapsRoute;
  headlineText: string;
  accentColor?: string; // default "#1A73E8"
};

export type GoogleMapsRevealSceneProps = GoogleMapsRevealVisual & { durationInFrames: number };

// Night-city cinematic used by the Google Maps Part 3 finale. One visual
// language carries the camera from street-level trails into the city-brain
// metaphor, then reverses the flow back toward updated routes.
export type TrafficCinematicPhase =
  | "flythrough"
  | "tracking"
  | "swarm"
  | "network"
  | "brain"
  | "converge"
  | "broadcast"
  | "recalculate"
  | "finale"
  | "route_estimates"
  | "route_ranking"
  | "endcard";

export type TrafficScenario = {
  label: string;
  metric: string;
  highlight?: boolean;
};

export type TrafficCinematicVisual = {
  phase: TrafficCinematicPhase;
  eyebrow?: string;
  headline: string;
  subtext?: string;
  metrics?: RadarHookStat[];
  scenarios?: TrafficScenario[];
  accentColor?: string;
  secondaryColor?: string;
  vehicleCount?: number;
};

export type TrafficCinematicSceneProps = TrafficCinematicVisual & { durationInFrames: number };

export type PreviewTeaserVisual = {
  headline: string;
  accentWord?: string;
  subtext?: string;
  preview: { items: string[]; icon?: string };
  channel?: string;
};

export type PreviewTeaserSceneProps = PreviewTeaserVisual & { durationInFrames: number };

// grid values are intensity 0–1; cells reveal top-left to bottom-right on
// the scene's 750×1080 canvas (contain-fit into the 1080×1920 frame).
export type GridHeatmapVisual = {
  grid: number[][];
  headline: string;
  cellLabel?: string;
  colorScheme?: "green" | "cyan";
};

export type GridHeatmapSceneProps = GridHeatmapVisual & { durationInFrames: number };

// Radar-style hook scene: 3 driver blips connect to a central "you" dot on a
// rotating sweep radar, followed by an eyebrow/headline copy block and a
// 3-cell stats row. Used as an alternative to CharacterIconScene's hook
// framing for "hidden system tracks/predicts you" series (e.g. Grab dispatch).
export type RadarHookStat = {
  value: string;
  label: string;
  highlight?: boolean; // true → rendered in userColor instead of accentColor
};

export type RadarHookVisual = {
  topicLabel: string;
  eyebrow: string;
  headline: string; // "\n"-separated into two lines
  driverLabels?: string[]; // exactly 3, default ["TX-4821", "TX-3302", "TX-0917"]
  stats: RadarHookStat[]; // exactly 3 cells
  accentColor?: string; // default "#00ff41"
  userColor?: string; // default "#ff6b35"
};

export type RadarHookSceneProps = RadarHookVisual & { durationInFrames: number };

// Attack/breach hook scene: an alternative opener to RadarHookScene for
// "something bad just happened, automatically" stories — an initial flash +
// scanline punch, a fast-filling kill-chain stage meter (recon → exploit →
// impact), then a glitch-slam headline and stats row. Built for jadepuffer
// because RadarHookScene's slow rotating-sweep radar read as too calm for a
// breaking-hack story; use it for any hook whose narration is about an
// attack/incident rather than a hidden-tracking reveal.
export type AttackStage = { value: string; label: string; highlight?: boolean };

export type AttackVisual = {
  topicLabel: string;
  eyebrow: string;
  headline: string; // "\n"-separated into two lines
  stageLabels: string[]; // kill-chain stage chips, e.g. ["CVE-scan", "Cred-steal", "Encrypt"] — any length
  stats: AttackStage[]; // exactly 3 cells
  accentColor?: string; // default "#ef4444" — drives the stage meter, headline accent line, and stats
  glitchColor?: string; // default "#61dafb" — the RGB-split color on the headline's glitch entrance and highlighted stats
};

export type AttackSceneProps = AttackVisual & { durationInFrames: number };

// City-calendar "event scan" scene: a scanning beam sweeps a timeline panel,
// each authored event pops in as a "found" card once the beam passes it, then
// a demand-multiplier badge and a dispatch action line reveal in sequence.
// Replaces a raw bash/code block for narration that describes the system
// scanning for events (concerts, matches, fairs) rather than executing code.
export type EventScanFound = {
  icon?: "concert" | "sports" | "festival" | "generic"; // default "generic"
  label: string; // e.g. "Concert · Quận 1"
  meta: string; // e.g. "tối nay 20:00 · ~8.000 người"
};

export type EventScanVisual = {
  eyebrow: string; // e.g. "TÍN HIỆU 3 · SỰ KIỆN"
  scanLabel: string; // e.g. "Quét lịch thành phố · 48h tới"
  events: EventScanFound[];
  multiplierValue: string; // e.g. "2.3x"
  multiplierLabel: string; // e.g. "Hệ số nhu cầu · Q1 20:00–22:00"
  actionText: string; // e.g. "Điều 34 tài xế đến Q1 trước 21:00"
  accentColor?: string; // default "#f59e0b" — matches the "Sự kiện" signal color used elsewhere
};

export type EventScanSceneProps = EventScanVisual & { durationInFrames: number };

// Full-canvas field of driver pings spawning staggered across a faint
// geohash grid while a clock ticks forward — "the dispatch system was
// already running before you opened the app". Positions are seeded
// deterministically (not authored per-driver) so the field looks organic
// but renders identically frame to frame.
export type DriverHeatmapTimestampMark = { frame: number; label: string };

export type DriverHeatmapVisual = {
  gridCellSize?: number; // px, default 105
  gridOpacity?: number; // default 0.06
  driverCount?: number; // default 140
  spawnDuration?: number; // frames over which pings finish staggering in; default scales with durationInFrames
  timestampSequence?: DriverHeatmapTimestampMark[]; // evenly spaced {frame, label} clock marks; default 6 marks 05:00:00 → 08:02:44
  headlineRevealFrame?: number; // default scales with durationInFrames (~180/244)
  captionRevealFrame?: number; // default scales with durationInFrames (~210/244)
  accentColor?: string; // default "#00ff41"
  topicLabel?: string; // default "THUẬT TOÁN ẨN"
};

export type DriverHeatmapSceneProps = DriverHeatmapVisual & { durationInFrames: number };

// Sequential route-stop timeline: N stops (pickups/dropoffs) laid out on one
// horizontal row, connected left-to-right by a drawn-in line — e.g. a single
// driver serving an ordered pickup A → pickup B → dropoff A → dropoff B
// route. Replaces map_ping for shots describing an ordered multi-stop route
// rather than a driver-selection comparison.
export type RouteTimelineStop = {
  label: string;
  sublabel?: string;
  highlight?: boolean; // true → node uses accentColor + glow instead of lineColor
};

export type RouteTimelineVisual = {
  stops: RouteTimelineStop[];
  accentColor?: string; // default "#00ff41"
  lineColor?: string; // default "rgba(255,255,255,0.15)"
  onScreenText?: string; // small caption near the bottom, optional
};

export type RouteTimelineSceneProps = RouteTimelineVisual & { durationInFrames: number };

// Diagonal "corridor" sweep: a rotated band sweeps across the canvas, then
// ride dots pop in inside it (merge-eligible) vs. outside it (dim, not
// merged) — e.g. "only rides on the same travel corridor get bundled".
// CorridorSweepSceneProps itself is declared in scenes/CorridorSweepScene.tsx.
export type CorridorSweepVisual = {
  corridorAngleDeg?: number; // default 20 (tilts right going down)
  corridorWidthPx?: number; // default 280
  rideCount?: number; // dots inside the corridor, default 8
  outsideRideCount?: number; // dots outside the corridor, default 5
  accentColor?: string; // default "#00ff41"
  onScreenText?: string; // small caption near the bottom, optional
};

export type CorridorSweepSceneProps = CorridorSweepVisual & { durationInFrames: number };

// AND-logic decision tree: N question nodes chained top→bottom by a "Có"
// branch, each with a "Không" branch to its own reject terminal on the right
// — e.g. the 4 conditions that must all hold for a ride to be batched.
// DecisionNode/BatchDecisionTreeSceneProps themselves are declared in
// scenes/BatchDecisionTreeScene.tsx.
export type DecisionNode = {
  question: string;
  yesLabel?: string; // default "Có"
  noLabel?: string; // default "Không"
  noResult?: string; // per-node override for this node's reject terminal text
};

export type BatchDecisionTreeVisual = {
  nodes: DecisionNode[];
  finalYesLabel: string;
  rejectLabel?: string; // default "❌ Tách cuốc"
  accentColor?: string; // default "#00ff41"
  rejectColor?: string; // default "#ff4444"
  staggerFrames?: number; // default 40
};

export type BatchDecisionTreeSceneProps = BatchDecisionTreeVisual & { durationInFrames: number };

// Two horizontal bars (before/after) stacked vertically, growing from 0 to
// their normalized target width with a live counter, followed by a delta
// arrow drawn from the "before" bar's right tip down to the "after" bar's
// right tip — e.g. 9.4km vs 7.2km for the same two-rider batch.
export type DeltaArrowVisual = {
  headline: string;
  accentWord: string;

  beforeLabel: string;
  beforeValue: number;
  beforeUnit: string;
  beforeSubtext?: string;

  afterLabel: string;
  afterValue: number;
  afterUnit: string;
  afterSubtext?: string;

  deltaLabel: string;
  accentColor?: string; // default "#00ff41"
  beforeColor?: string; // default "rgba(255,68,68,0.7)"
};

export type DeltaArrowSceneProps = DeltaArrowVisual & { durationInFrames: number };

// Phone notification card: a batch-consent prompt (accept/decline) the driver
// receives, followed by a driver reply bubble if accepted — e.g. "the driver
// can always decline a batched pickup". Replaces phone_mockup for shots about
// driver-side consent rather than the rider-side matching flow.
// DriverConsentSceneProps itself is declared in scenes/DriverConsentScene.tsx.
export type DriverConsentVisual = {
  notificationTitle: string;
  detailLines: string[];
  acceptLabel?: string; // default "Chấp nhận"
  declineLabel?: string; // default "Từ chối"
  driverReply?: string; // reply bubble text, only rendered when chosenAction === "accept"
  chosenAction: "accept" | "decline";
  accentColor?: string; // default "#00ff41"
  onScreenText?: string; // small caption near the bottom, optional
};

export type DriverConsentSceneProps = DriverConsentVisual & { durationInFrames: number };

// Recap scene: N horizontal layers stacked bottom→top representing the
// stack of a system (e.g. the 3-part dispatch logic recap), one of which is
// the current topic (isActive — rendered brighter, larger, glowing).
// SystemLayerSceneProps itself is declared in scenes/SystemLayerScene.tsx.
export type SystemLayer = {
  label: string;
  sublabel?: string;
  isActive?: boolean; // true = current topic, rendered brightest/largest
  color?: string; // override accent color for this layer when active
};

export type SystemLayerVisual = {
  headline?: string;
  layers: SystemLayer[]; // bottom → top (index 0 = bottom, rendered/enters first)
  accentColor?: string; // default "#00ff41"
  bodyText?: string; // optional caption below the stack
  staggerFrames?: number; // frames between each layer's slide-in, default 35
};

export type SystemLayerSceneProps = SystemLayerVisual & { durationInFrames: number };

// RPG-style HUD: rank badge + XP/quest progress bar + locked/unlocked perk
// nodes. The concrete "job becomes a game" visual — built for scenes where
// the narration literally frames trips/ratings/tiers as game mechanics.
export type GameHUDPerk = {
  label: string;
  unlocked: boolean;
};

export type GameHUDVisual = {
  headline: string;
  accentWord?: string;
  rankLabel: string; // e.g. "HẠNG VÀNG"
  rankTier: string; // short badge glyph, e.g. "V" or "9"
  progressLabel: string; // e.g. "Tiến độ tháng này"
  progressCurrent: number;
  progressTarget: number;
  perks: GameHUDPerk[];
  verdict?: string;
  accentColor?: string; // default colors.green
};

export type GameHUDSceneProps = GameHUDVisual & { durationInFrames: number };

// Cinematic transition beat: a phone silhouette shrinks to make room for a
// stack of "work vocabulary → game vocabulary" relabeling rows (e.g. "CHUYẾN
// XE" -> "TIẾN ĐỘ"), each row flying in with a morphing arrow — the visual
// payoff of the "job becomes a game" thesis. Built for
// grabcar_optimization_mode_p2 (uses that video's p2Colors palette).
export type WorkToGameMorphVisual = {
  headline: string;
  officialNameLabel?: string; // "TÊN CHÍNH THỨC: CHẾ ĐỘ TỐI ƯU HÓA – TURBO" — shown once, small
  transformations: Array<{ from: string; to: string }>; // e.g. [{from:"CHUYẾN XE", to:"TIẾN ĐỘ"}, {from:"THỨ HẠNG", to:"CẤP ĐỘ"}]
  sourceLabel?: string; // small readable source citation
  // Optional driver silhouette standing among the transformation rows —
  // visually literalizes "công việc của họ" (their job) as the thing being
  // relabeled, rather than only showing abstract word-swap rows.
  showDriverSilhouette?: boolean;
};

export type WorkToGameMorphSceneProps = WorkToGameMorphVisual & { durationInFrames: number };

export type TripleMetricOrbitVisual = {
  headline: string;
  // Three published rules, each an orbiting ring: a plain label + value pair
  // (not all numeric — "TÍNH LẠI MỖI NGÀY" has no ratio to fill).
  metrics: Array<{ label: string; value: string }>;
  sourceLabel?: string; // small readable source citation
  // Frames the three metric rings inside a helmet-visor silhouette, so the
  // numbers read as something the driver sees reflected while riding, not a
  // floating dashboard disconnected from them.
  showHelmetVisorFrame?: boolean;
};

export type TripleMetricOrbitSceneProps = TripleMetricOrbitVisual & { durationInFrames: number };

export type ProgressMemoryTrailVisual = {
  headline: string;
  subheadline?: string; // optional second line under headline
  totalCells: number; // e.g. 10
  filledCells: number; // e.g. 9
  illustrativeLabel?: string; // small badge clarifying this is an analytical illustration, not an official claim
  memoryFragments?: string[]; // short words shown drifting out of a few early filled cells (chờ khách, kẹt xe, mưa...)
  // When true, the filled cells morph into short road-segment marks (rounder,
  // elongated, road-line dashes) in the shot's closing beat — literalizes
  // "những giờ đã chạy" as distance covered, not just a filled tally.
  morphCellsToRoad?: boolean;
};

export type ProgressMemoryTrailSceneProps = ProgressMemoryTrailVisual & { durationInFrames: number };

export type DualClockRouteVisual = {
  headline: string;
  leftColumn: { label: string; items: string[] }; // published benefits list
  rightColumn: { label: string; items: string[] }; // state of the app while the mode is on
  sourceLabel?: string; // small readable source citation
  footnote?: string; // small qualifier line, e.g. region availability caveat
};

export type DualClockRouteSceneProps = DualClockRouteVisual & { durationInFrames: number };

export type WeightedChoiceWorldVisual = {
  headline: string;
  subheadline?: string; // optional second line under headline, e.g. contrast statement
  homeLabel: string; // "Tắt ứng dụng — về nhà"
  progressLabel: string; // "Nhận đơn — giữ tiến độ & quyền lợi"
  homeDetails?: string[]; // short chips listed under the home side, e.g. ["BỮA CƠM NGUỘI", "5% PIN"]
  progressDetails?: string[]; // short chips listed under the progress side
  illustrativeLabel?: string; // "TÌNH HUỐNG MINH HỌA — KHÔNG PHẢI BẰNG CHỨNG..." badge
  scaleTiltRatio: number; // 0-1, final tilt toward the progress side
  // When true, renders a small dashed route-line vignette under each side —
  // a warm home-bound path under homeDetails, a rain-streaked new pickup pin
  // under progressDetails — so the two options read as two concrete physical
  // destinations, not only abstract labels.
  showRouteVignettes?: boolean;
};

export type WeightedChoiceWorldSceneProps = WeightedChoiceWorldVisual & { durationInFrames: number };

export type FalseCompletionVisual = {
  headline: string; // '"LÊN TỚI 4%" KHÔNG CÓ NGHĨA LUÔN LÀ 4%.'
  completedLabel: string; // "CUỐC XE HOÀN THÀNH"
  driverStatusLabel: string; // "KHOẢN THƯỞNG ĐƯỢC HIỂN THỊ VÀ CHUYỂN VÀO VÍ"
  calculationLabels: string[]; // fee/tax deductions shown peeling off the headline percent
  sourceLabel?: string; // small readable source citation
};

export type FalseCompletionSceneProps = FalseCompletionVisual & { durationInFrames: number };

export type ThesisTeaserVisual = {
  // "THESIS" renders only thesisLines, "TEASER" renders only the eyebrow/question,
  // omitted renders both in one sequence (original combined-scene behavior).
  mode?: "THESIS" | "TEASER";
  thesisLines?: string[]; // each line shown as its own beat
  teaserEyebrow?: string; // "PHẦN 3"
  teaserQuestion?: string; // "AI THỰC SỰ TRẢ TIỀN CHO MÃ GIẢM GIÁ?"
};

export type ThesisTeaserSceneProps = ThesisTeaserVisual & { durationInFrames: number };

export type GenericHookThumbnailVisual = {
  headline: string;
  accentWord?: string;
  subtext?: string;
  partLabel?: string;
  channelName?: string;
  illustration?: "map" | "notebook" | "brandSwap";
};

export type GenericHookThumbnailSceneProps = GenericHookThumbnailVisual;

export type HSKFlashCardThumbnailVisual = {
  titleTop?: string;
  range?: string;
  badgeText?: string;
  count?: string;
  countSub?: string;
  hanzi?: string;
  pinyin?: string;
  meaning?: string;
  exampleZh?: string;
  exampleVi?: string;
  accentHanzi?: string;
};

export type HSKFlashCardThumbnailSceneProps = HSKFlashCardThumbnailVisual;

export type ThumbnailSceneProps =
  | ({ style: "characterIcon" } & CharacterIconCoverSceneProps)
  | ({ style: "generic" } & GenericHookThumbnailSceneProps)
  | ({ style: "hskFlashCard" } & HSKFlashCardThumbnailSceneProps);

// --- grabfood_discount_who_pays_p3 ------------------------------------------
// Bespoke shot set for "who pays for a GrabFood discount code" — invoice,
// money-flow, reconciliation-ledger and app-UI motion graphics. Built for
// this video the same way grabcar_optimization_mode_p2 got its own shot set
// (see grabfoodP3Palette.tsx for the local dark/fintech palette).

// Cold-open receipt: a finger taps a discount chip and the discount amount
// splits off the invoice total.
export type InvoiceDiscountHookVisual = {
  headline?: string; // hook line shown above the receipt card; use "\n" for an explicit two-line break
  accentWord?: string; // exact substring of headline to render in accent color
  items?: Array<{ label: string; price: string }>;
  subtotalLabel?: string; // default "TẠM TÍNH"
  subtotal: string; // e.g. "150.000Đ"
  codeLabel?: string; // default "MÃ GIẢM GIÁ"
  discountAmount: string; // e.g. "-40.000Đ"
  totalLabel?: string; // default "TỔNG"
  total: string; // e.g. "110.000Đ"
  illustrativeLabel?: string; // "TÌNH HUỐNG MINH HỌA" badge
};

export type InvoiceDiscountHookSceneProps = InvoiceDiscountHookVisual & { durationInFrames: number };

// The discount pill flies toward a centered Grab mark, stops short of it,
// then three payer chips fan out below — establishing Grab is only one of
// three possible payers.
export type PayerRevealVisual = {
  headline: string;
  accentWord?: string;
  amount: string; // e.g. "40.000Đ"
  payers: string[]; // e.g. ["Nhà hàng", "Grab", "Nhãn hàng"]
  illustrativeLabel?: string;
};

export type PayerRevealSceneProps = PayerRevealVisual & { durationInFrames: number };

// A "tạo ưu đãi" toggle switches on, then a reconciliation-ledger card's rows
// fade in one at a time, with the debited row rendered in red.
export type LedgerEntryVisual = {
  eyebrow?: string;
  toggleLabel?: string; // default "Tạo ưu đãi"
  lineItems: Array<{ label: string; value: string; emphasis?: boolean }>;
  sourceLabel?: string;
  illustrativeLabel?: string;
};

export type LedgerEntrySceneProps = LedgerEntryVisual & { durationInFrames: number };

// A merchant-side ledger panel with two cost rows, connected by a dashed line
// down to a small customer-facing screen that only ever shows the first row.
export type CostBreakdownVisual = {
  merchantLabel?: string; // default "PHÍA NHÀ HÀNG"
  merchantLines: Array<{ label: string; value: string }>;
  customerLabel?: string; // default "PHÍA KHÁCH HÀNG"
  customerValue: string;
  sourceLabel?: string;
};

export type CostBreakdownSceneProps = CostBreakdownVisual & { durationInFrames: number };

// Three combo cards (e.g. GrabFood x Pepsi) drop in one at a time, each
// tagged with who funds its discount, followed by Grab's own role label.
export type SponsorComboVisual = {
  campaignLabel: string;
  combos: Array<{ itemLabel: string; discountLabel: string; payerLabel: string; highlight?: boolean }>;
  grabRoleLabel: string;
  sourceLabel?: string;
};

export type SponsorComboSceneProps = SponsorComboVisual & { durationInFrames: number };

// Three rows (e.g. QUÁN TRẢ / GRAB TRẢ / CÙNG TRẢ) light up top-to-bottom,
// each a funding-arrangement label plus a short description.
export type PayerMatrixVisual = {
  headline?: string;
  rows: Array<{ label: string; description: string }>;
  sourceLabel?: string;
};

export type PayerMatrixSceneProps = PayerMatrixVisual & { durationInFrames: number };

// Three identical phones showing the same discount amount each flip in turn
// to reveal a different funding source printed on their "back".
export type TriPhoneRevealVisual = {
  amountLabel: string; // e.g. "GIẢM 40.000Đ"
  sources: string[]; // exactly 3, e.g. ["Doanh thu quán", "Ngân sách Grab", "Ngân sách tiếp thị nhãn hàng"]
};

export type TriPhoneRevealSceneProps = TriPhoneRevealVisual & { durationInFrames: number };

// Closing beat: the discount pill cycles across three destination
// silhouettes, then the scene cuts to black and holds on two closing lines
// with no further narration — a silent card at the very end of the video.
export type CostTransferOutroVisual = {
  amount: string; // e.g. "40.000Đ"
  destinations: string[]; // exactly 3
  closingLines: string[]; // e.g. ["MÃ GIẢM GIÁ KHÔNG XÓA CHI PHÍ.", "NÓ CHỈ ĐỔI NGƯỜI TRẢ."]
};

export type CostTransferOutroSceneProps = CostTransferOutroVisual & { durationInFrames: number };

// --- greensm_bike_income -----------------------------------------------------
// Bespoke shot set for "does a Xanh SM Bike driver really earn 1 triệu/ngày" —
// a revenue-counter hook, conditional-guarantee/evidence beats, and a debate
// close. Built for this video the same way grabfood_discount_who_pays_p3 got
// its own shot set.

// Cold-open: a revenue counter climbs through counterSteps and freezes on the
// last one, then the hook headline settles in below.
export type RevenueClockHookVisual = {
  cityLabel: string; // e.g. "SÀI GÒN · 5:00 SÁNG"
  counterSteps: string[]; // e.g. ["200K", "500K", "800K", "1.000.000Đ"]
  headline: string;
  illustrativeLabel?: string;
};

export type RevenueClockHookSceneProps = RevenueClockHookVisual & { durationInFrames: number };

// A translucent banknote card reveals three stacked concept layers (revenue /
// driver take / after-cost) beneath a headline asking what "1 triệu" means.
export type MillionDongLayersVisual = {
  amountLabel: string; // e.g. "1.000.000Đ"
  headline: string;
  accentWord?: string;
  layers: Array<{ label: string }>;
};

export type MillionDongLayersSceneProps = MillionDongLayersVisual & { durationInFrames: number };

// A finish-line-style target number that fans out into its qualifying
// conditions, stamped with a conditional-guarantee seal.
export type ConditionalGuaranteeVisual = {
  targetLabel: string; // e.g. "600.000Đ"
  conditions: string[];
  stampLabel: string; // e.g. "BẢO ĐẢM CÓ ĐIỀU KIỆN"
  sourceLabel?: string;
};

export type ConditionalGuaranteeSceneProps = ConditionalGuaranteeVisual & { durationInFrames: number };

// A row of allocatedTrips icons, the last (allocatedTrips - completedTrips) of
// them rendered dashed, with the two counts labeled underneath — deliberately
// not shown as an equality.
export type TripCountGapVisual = {
  allocatedTrips: number;
  completedTrips: number;
  allocatedLabel?: string;
  completedLabel?: string;
};

export type TripCountGapSceneProps = TripCountGapVisual & { durationInFrames: number };

// A horizontal timeline of battery segments (e.g. two shifts split by a
// lunch/charging break) filling in turn, ending on a counter + attribution
// badge.
export type BatteryTimelineVisual = {
  startLabel: string; // e.g. "5:00 SÁNG"
  batteries: Array<{ label: string }>;
  counterLabel: string; // e.g. "800.000Đ+"
  badgeLabel?: string;
  sourceLabel?: string;
};

export type BatteryTimelineSceneProps = BatteryTimelineVisual & { durationInFrames: number };

// An equation whose operator wobbles then morphs into transformTo (e.g. "="
// shaking into "?") — the "tempting but unproven" extrapolation beat.
export type MultiplicationTrapVisual = {
  leftLabel: string; // e.g. "800K + VÀI GIỜ"
  operatorLabel: string; // e.g. "="
  rightLabel: string; // e.g. "1 TRIỆU?"
  transformTo: string; // e.g. "?"
};

export type MultiplicationTrapSceneProps = MultiplicationTrapVisual & { durationInFrames: number };

// A sweeping scan line passes down a stack of concept layers (e.g. revenue /
// driver-take+bonus / after-cost), each lighting up as the beam reaches it.
export type IncomeScannerLayersVisual = {
  amountLabel: string; // e.g. "1.000.000Đ"
  layers: string[];
  footnote?: string;
};

export type IncomeScannerLayersSceneProps = IncomeScannerLayersVisual & { durationInFrames: number };

// Two parallel horizontal timelines (same total duration) whose segments fill
// in at different rates — driverA carries more unpaid wait/deadhead segments,
// driverB more paid-trip segments.
export type ParallelRoutesGapVisual = {
  durationLabel: string; // e.g. "10 GIỜ"
  driverA: { label: string; segments: string[] };
  driverB: { label: string; segments: string[] };
};

export type ParallelRoutesGapSceneProps = ParallelRoutesGapVisual & { durationInFrames: number };

// Closing beat: headline + three open-ended option chips, followed by a
// comment-prompt card inviting viewers to fill in their own numbers.
export type DebateConclusionVisual = {
  headline: string;
  accentWord?: string;
  options: string[];
  promptLabel?: string;
};

export type DebateConclusionSceneProps = DebateConclusionVisual & { durationInFrames: number };
