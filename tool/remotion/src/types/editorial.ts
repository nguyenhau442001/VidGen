/**
 * Editorial & Documentarian Visual Types
 * Designed for human-crafted, tactile, investigative storytelling (non-AI look).
 */

export type SFXCue = {
  type:
    | "paper_slide"
    | "paper_rustle"
    | "marker_stroke"
    | "stamp_impact"
    | "camera_click"
    | "camera_shutter"
    | "typewriter_key"
    | "mechanical_click"
    | "bass_drop"
    | "whoosh_subtle"
    | "analog_static";
  frameOffset: number; // relative to scene start
  volume?: number; // 0.0 - 1.0 (default 0.7)
};

export type EvidenceItem = {
  id: string;
  type: "photo" | "document" | "stat" | "quote" | "code_snippet";
  title: string;
  subtitle?: string;
  content: string;
  highlightWords?: string[];
  rotationDeg?: number; // tactile angle (-6 to +6 deg)
  pinnedPosition?: { x: number; y: number }; // 0-100 percentage
  verifiedBadge?: boolean;
};

export type InvestigationBoardVisual = {
  headline: string;
  subheadline?: string;
  caseFileNumber?: string;
  evidence: EvidenceItem[];
  connections?: Array<{ fromId: string; toId: string; label?: string; dashed?: boolean }>;
  stampText?: string; // e.g. "CONFIRMED", "UNVERIFIED", "EXPOSED"
  stampFrame?: number;
  texture?: "corkboard" | "blueprint" | "dark_desk" | "ruled_paper";
  accentColor?: string;
};

export type HighlightSegment = {
  text: string;
  highlighted?: boolean;
  color?: string; // e.g. yellow marker "#ffe600", red warning "#ff4444"
};

export type DeepDiveDocumentVisual = {
  documentTitle: string;
  sourceAuthority?: string; // e.g. "Grab Algorithm Patent US1029384", "Apple Whitepaper"
  dateLabel?: string;
  paragraphs: Array<{
    segments: HighlightSegment[];
  }>;
  marginNote?: {
    text: string;
    handwritten?: boolean;
    arrowToLineIndex?: number;
  };
  magnifyFocus?: {
    x: number; // percentage
    y: number;
    scale: number;
  };
  accentColor?: string;
};

export type EditorialComparisonSide = {
  label: string;
  sublabel?: string;
  metric: string;
  highlight: boolean;
  notes: string[];
  verdict: string;
  stamp?: string; // "MYTH", "FACT", "EXPENSIVE", "OPTIMAL"
};

export type DataComparisonEditorialVisual = {
  headline: string;
  question: string;
  leftSide: EditorialComparisonSide;
  rightSide: EditorialComparisonSide;
  insightCallout?: string;
  accentColor?: string;
};

export type PunchlineRevealVisual = {
  eyebrow?: string;
  primaryStatement: string;
  secondaryStatement?: string;
  accentWord?: string;
  disclaimerNote?: string;
  dramaticPauseFrames?: number;
  invertedTheme?: boolean; // high contrast black-on-white or white-on-black punch
};
