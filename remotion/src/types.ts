export type ExplanationVisual = {
  headline: string;
  body: string;
};

export type TerminalVisual = {
  lines: string[];
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
  idleRange?: PhoneMockupStateRange;
  loadingRange?: PhoneMockupStateRange;
  matchedRange?: PhoneMockupStateRange;
};

export type ManifestExtraAudio = { path: string; offsetFrames: number };

export type ManifestScene =
  | { type: "explanation"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; caption?: string; captionStyle?: string; visual: ExplanationVisual }
  | { type: "terminal"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; caption?: string; captionStyle?: string; visual: TerminalVisual }
  | { type: "code"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; caption?: string; captionStyle?: string; visual: CodeVisual }
  | { type: "error_log"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; caption?: string; captionStyle?: string; visual: ErrorLogVisual }
  | { type: "phone_mockup"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; caption?: string; captionStyle?: string; visual: PhoneMockupVisual }
  | { type: "map_ping"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; caption?: string; captionStyle?: string; visual: MapPingVisual }
  | { type: "geohash_reveal"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; caption?: string; captionStyle?: string; visual: GeohashRevealVisual }
  | { type: "demand_heatmap"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; caption?: string; captionStyle?: string; visual: DemandHeatmapVisual }
  | { type: "signal_flow"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; caption?: string; captionStyle?: string; visual: SignalFlowVisual }
  | { type: "ripple_aggregate"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; caption?: string; captionStyle?: string; visual: RippleAggregateVisual }
  | { type: "score_card"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; caption?: string; captionStyle?: string; visual: ScoreCardVisual }
  | { type: "split_view"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; caption?: string; captionStyle?: string; visual: SplitViewVisual }
  | { type: "character_icon"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; caption?: string; captionStyle?: string; visual: CharacterIconVisual }
  | { type: "quote_callout"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; caption?: string; captionStyle?: string; visual: QuoteCalloutVisual }
  | { type: "zoom_reveal"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; caption?: string; captionStyle?: string; visual: ZoomRevealVisual }
  | { type: "split_reveal"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; caption?: string; captionStyle?: string; visual: SplitRevealVisual };

export type RenderManifest = {
  fps: number;
  width: number;
  height: number;
  scenes: ManifestScene[];
};

export type ExplanationSceneProps = ExplanationVisual & { durationInFrames: number };
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
};

export type MapPingSceneProps = MapPingVisual & { durationInFrames: number };

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
  | { kind: "dots"; count?: number }
  | { kind: "road_diagram"; axis: MapPingAxis; roadConstraint?: "median" }
  | { kind: "eta_comparison"; axis: MapPingAxis };

export type SplitViewVisual = {
  leftPanel?: SplitPanelContent;
  rightPanel?: SplitPanelContent;
  leftLabel?: string;
  rightLabel?: string;
  accentColor?: string;
};

export type SplitViewSceneProps = SplitViewVisual & { durationInFrames: number };

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
};

export type QuoteCalloutSceneProps = QuoteCalloutVisual & { durationInFrames: number };

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
