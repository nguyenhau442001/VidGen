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
  | { type: "phone_mockup"; id: number; audioPath: string; durationInFrames: number; caption?: string; visual: PhoneMockupVisual };

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
