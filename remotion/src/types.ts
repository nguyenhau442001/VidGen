export type ExplanationVisual = {
  headline: string;
  body?: string;
  bullets?: string[];
  accentWord?: string;
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
  idleRange?: PhoneMockupStateRange;
  loadingRange?: PhoneMockupStateRange;
  matchedRange?: PhoneMockupStateRange;
  // Idle-screen-only: animates a driver dot converging on the user's pin,
  // for scenes whose narration describes a driver already en route.
  showApproachingDriver?: boolean;
  // Idle-screen-only: overlays animated falling rain on the map, for scenes
  // whose narration describes live weather data driving demand.
  weatherEffect?: "rain";
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
  | { type: "network_flow"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; caption?: string; captionStyle?: string; visual: NetworkFlowVisual }
  | { type: "ripple_aggregate"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; caption?: string; captionStyle?: string; visual: RippleAggregateVisual }
  | { type: "driver_swarm"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; caption?: string; captionStyle?: string; visual: DriverSwarmVisual }
  | { type: "counter_blast"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; caption?: string; captionStyle?: string; visual: CounterBlastVisual }
  | { type: "score_card"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; caption?: string; captionStyle?: string; visual: ScoreCardVisual }
  | { type: "split_view"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; caption?: string; captionStyle?: string; visual: SplitViewVisual }
  | { type: "character_icon"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; caption?: string; captionStyle?: string; visual: CharacterIconVisual }
  | { type: "quote_callout"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; caption?: string; captionStyle?: string; visual: QuoteCalloutVisual }
  | { type: "zoom_reveal"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; caption?: string; captionStyle?: string; visual: ZoomRevealVisual }
  | { type: "split_reveal"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; caption?: string; captionStyle?: string; visual: SplitRevealVisual }
  | { type: "animated_flow"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; caption?: string; captionStyle?: string; visual: AnimatedFlowVisual }
  | { type: "bubble_comparator"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; caption?: string; captionStyle?: string; visual: BubbleComparatorVisual }
  | { type: "phone_map"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; caption?: string; captionStyle?: string; visual: PhoneMapVisual }
  | { type: "conversation"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; caption?: string; captionStyle?: string; visual: ConversationVisual }
  | { type: "before_after"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; caption?: string; captionStyle?: string; visual: BeforeAfterVisual }
  | { type: "grid_heatmap"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; caption?: string; captionStyle?: string; visual: GridHeatmapVisual }
  | { type: "radar_hook"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; caption?: string; captionStyle?: string; visual: RadarHookVisual }
  | { type: "attack_hook"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; caption?: string; captionStyle?: string; visual: AttackVisual }
  | { type: "event_scan"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; caption?: string; captionStyle?: string; visual: EventScanVisual }
  | { type: "driver_heatmap"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; caption?: string; captionStyle?: string; visual: DriverHeatmapVisual }
  | { type: "stat_comparator"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; caption?: string; captionStyle?: string; visual: StatComparatorVisual }
  | { type: "route_timeline"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; caption?: string; captionStyle?: string; visual: RouteTimelineVisual }
  | { type: "corridor_sweep"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; caption?: string; captionStyle?: string; visual: CorridorSweepVisual }
  | { type: "batch_decision_tree"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; caption?: string; captionStyle?: string; visual: BatchDecisionTreeVisual }
  | { type: "delta_arrow"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; caption?: string; captionStyle?: string; visual: DeltaArrowVisual }
  | { type: "driver_consent"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; caption?: string; captionStyle?: string; visual: DriverConsentVisual }
  | { type: "system_layer"; id: number; label?: string; sceneName?: string; audioPath: string; audioOffsetFrames?: number; extraAudio?: ManifestExtraAudio[]; durationInFrames: number; caption?: string; captionStyle?: string; visual: SystemLayerVisual };

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

export type GenericHookThumbnailVisual = {
  headline: string;
  accentWord?: string;
  subtext?: string;
  partLabel?: string;
  channelName?: string;
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
