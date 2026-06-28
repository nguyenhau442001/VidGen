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

export type ManifestScene =
  | { type: "explanation"; id: number; audioPath: string; durationInFrames: number; caption?: string; visual: ExplanationVisual }
  | { type: "terminal"; id: number; audioPath: string; durationInFrames: number; caption?: string; visual: TerminalVisual }
  | { type: "code"; id: number; audioPath: string; durationInFrames: number; caption?: string; visual: CodeVisual }
  | { type: "error_log"; id: number; audioPath: string; durationInFrames: number; caption?: string; visual: ErrorLogVisual };

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
