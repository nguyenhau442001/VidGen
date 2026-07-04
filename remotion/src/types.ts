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

export type ManifestScene =
  | { type: "explanation"; id: number; label?: string; audioPath: string; audioOffsetFrames?: number; durationInFrames: number; caption?: string; visual: ExplanationVisual }
  | { type: "terminal"; id: number; label?: string; audioPath: string; audioOffsetFrames?: number; durationInFrames: number; caption?: string; visual: TerminalVisual }
  | { type: "code"; id: number; label?: string; audioPath: string; audioOffsetFrames?: number; durationInFrames: number; caption?: string; visual: CodeVisual }
  | { type: "error_log"; id: number; label?: string; audioPath: string; audioOffsetFrames?: number; durationInFrames: number; caption?: string; visual: ErrorLogVisual }
  | { type: "phone_mockup"; id: number; label?: string; audioPath: string; audioOffsetFrames?: number; durationInFrames: number; caption?: string; visual: PhoneMockupVisual }
  | { type: "map_ping"; id: number; label?: string; audioPath: string; audioOffsetFrames?: number; durationInFrames: number; caption?: string; visual: MapPingVisual }
  | { type: "score_card"; id: number; label?: string; audioPath: string; audioOffsetFrames?: number; durationInFrames: number; caption?: string; visual: ScoreCardVisual }
  | { type: "split_view"; id: number; label?: string; audioPath: string; audioOffsetFrames?: number; durationInFrames: number; caption?: string; visual: SplitViewVisual }
  | { type: "character_icon"; id: number; label?: string; audioPath: string; audioOffsetFrames?: number; durationInFrames: number; caption?: string; visual: CharacterIconVisual }
  | { type: "quote_callout"; id: number; label?: string; audioPath: string; audioOffsetFrames?: number; durationInFrames: number; caption?: string; visual: QuoteCalloutVisual }
  | { type: "zoom_reveal"; id: number; label?: string; audioPath: string; audioOffsetFrames?: number; durationInFrames: number; caption?: string; visual: ZoomRevealVisual }
  | { type: "split_reveal"; id: number; label?: string; audioPath: string; audioOffsetFrames?: number; durationInFrames: number; caption?: string; visual: SplitRevealVisual };

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

export type MapPingVisual = {
  drivers: MapPingDriver[];
  highlightedDriverIndex?: number;
  nearestDriverIndex?: number;
  selectedDriverIndex?: number;
  phase1End?: number;
  phase2Start?: number;
  accentColor?: string;
};

export type MapPingSceneProps = MapPingVisual & { durationInFrames: number };

export type ScoreCriteria = { label: string; score: number; maxScore: number };

export type ScoreCardVisual = {
  criteria: ScoreCriteria[];
  staggerFrames?: number;
  accentColor?: string;
  title?: string;
};

export type ScoreCardSceneProps = ScoreCardVisual & { durationInFrames: number };

export type SplitPanelContent =
  | { kind: "loading"; text?: string }
  | { kind: "text"; heading?: string; body: string }
  | { kind: "dots"; count?: number };

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
