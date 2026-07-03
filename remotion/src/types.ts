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
  | { type: "explanation"; id: number; audioPath: string; durationInFrames: number; caption?: string; visual: ExplanationVisual }
  | { type: "terminal"; id: number; audioPath: string; durationInFrames: number; caption?: string; visual: TerminalVisual }
  | { type: "code"; id: number; audioPath: string; durationInFrames: number; caption?: string; visual: CodeVisual }
  | { type: "error_log"; id: number; audioPath: string; durationInFrames: number; caption?: string; visual: ErrorLogVisual }
  | { type: "phone_mockup"; id: number; audioPath: string; durationInFrames: number; caption?: string; visual: PhoneMockupVisual }
  | { type: "map_ping"; id: number; audioPath: string; durationInFrames: number; caption?: string; visual: MapPingVisual }
  | { type: "score_card"; id: number; audioPath: string; durationInFrames: number; caption?: string; visual: ScoreCardVisual }
  | { type: "split_view"; id: number; audioPath: string; durationInFrames: number; caption?: string; visual: SplitViewVisual };

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
  | { kind: "text"; heading?: string; body: string };

export type SplitViewVisual = {
  leftPanel?: SplitPanelContent;
  rightPanel?: SplitPanelContent;
  leftLabel?: string;
  rightLabel?: string;
  accentColor?: string;
};

export type SplitViewSceneProps = SplitViewVisual & { durationInFrames: number };
