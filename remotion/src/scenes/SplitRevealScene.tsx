import React, { useEffect, useRef } from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { colors, BE_VIETNAM_PRO } from "../styles";

// ---------------------------------------------------------------------------
// Layout / timing constants
// ---------------------------------------------------------------------------
const VH = 1920;

const DEFAULT_SPLIT_RATIO = 0.5;
const DEFAULT_REVEAL_FRAMES = 35;
const CAPTION_DELAY = 6; // frames after the split settles before captions start fading in
const CAPTION_FADE_FRAMES = 14;
const DIVIDER_STROKE = 2;

const RIGHT_PANEL_BG_DEFAULT = "#07101e";
const DIVIDER_COLOR_DEFAULT = "rgba(255,255,255,0.16)";
const CAPTION_COLOR_DEFAULT = "rgba(255,255,255,0.55)";

// ---------------------------------------------------------------------------
// Duration helper — pass to calculateMetadata or use as a fixed durationInFrames.
// The split itself only needs revealDurationFrames; captions (if present) add a
// short delay-then-fade tail on top of that.
// ---------------------------------------------------------------------------
export function calculateSplitRevealDuration(
  revealDurationFrames: number = DEFAULT_REVEAL_FRAMES,
  hasCaptions: boolean = false
): number {
  if (!hasCaptions) return revealDurationFrames;
  return revealDurationFrames + CAPTION_DELAY + CAPTION_FADE_FRAMES;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export type SplitRevealSceneProps = {
  // leftContent may be a plain node (the common case — an already-mounted,
  // simplified MapPingScene) or a render-prop function that reacts to the
  // live splitProgress (0 → 1). Either form is rendered in the exact same
  // JSX position every frame — see the continuity contract comment below.
  leftContent: React.ReactNode | ((splitProgress: number) => React.ReactNode);
  // Empty by default — populated by ScoreCardScene layered on top once
  // onSplitComplete fires. This component only provides the spatial container.
  rightContent?: React.ReactNode;
  // Fixed-value props: this component only supports map-on-left / score-on-right.
  // Kept as explicit props (rather than hardcoded) to document that contract at
  // call sites and leave room for a mirrored layout later without a prop rename.
  mapSide?: "left";
  scoreSide?: "right";
  splitRatio?: number;
  revealDurationFrames?: number;
  accentColor?: string;
  leftCaption?: string;
  rightCaption?: string;
  showDivider?: boolean;
  onSplitComplete?: () => void;
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export const SplitRevealScene: React.FC<SplitRevealSceneProps> = ({
  leftContent,
  rightContent,
  splitRatio = DEFAULT_SPLIT_RATIO,
  revealDurationFrames = DEFAULT_REVEAL_FRAMES,
  accentColor,
  leftCaption,
  rightCaption,
  showDivider = true,
  onSplitComplete,
}) => {
  const frame = useCurrentFrame();
  const accent = accentColor ?? colors.cyan;

  // Core split curve: fast open, settles at splitRatio (ease-out-cubic).
  // Frame 0 = 0 (map full-bleed), 1 = fully split. No CSS transitions —
  // every visual below is derived from this single interpolate() value.
  const splitProgress = interpolate(frame, [0, revealDurationFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Left/right widths always sum to 100 — driven purely by splitProgress.
  const leftWidthPct = interpolate(splitProgress, [0, 1], [100, splitRatio * 100]);
  const rightWidthPct = 100 - leftWidthPct;

  // Right panel gets an additional clip-path wipe, revealing left-to-right
  // (from the divider outward) inside its own growing box. Combined with the
  // width grow above, this reads as the frame being "peeled open" rather than
  // a plain resize.
  const rightRevealInsetPct = interpolate(splitProgress, [0, 1], [100, 0]);

  // Divider draws in top-to-bottom via stroke-dasharray, in lockstep with the split.
  const dividerDraw = splitProgress;

  const captionsStart = revealDurationFrames + CAPTION_DELAY;
  const captionOpacity = interpolate(
    frame,
    [captionsStart, captionsStart + CAPTION_FADE_FRAMES],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Fire onSplitComplete once, the frame the split animation finishes, so the
  // parent sequence can cue ScoreCardScene to start building in rightContent.
  const firedRef = useRef(false);
  useEffect(() => {
    if (frame >= revealDurationFrames && !firedRef.current) {
      firedRef.current = true;
      onSplitComplete?.();
    }
  }, [frame, revealDurationFrames, onSplitComplete]);

  const resolvedLeftContent =
    typeof leftContent === "function" ? leftContent(splitProgress) : leftContent;

  return (
    <AbsoluteFill
      style={
        {
          backgroundColor: colors.bg,
          overflow: "hidden",
          "--divider-color": DIVIDER_COLOR_DEFAULT,
          "--right-panel-bg": RIGHT_PANEL_BG_DEFAULT,
          "--caption-color": CAPTION_COLOR_DEFAULT,
          "--accent": accent,
        } as React.CSSProperties
      }
    >
      {/*
        CONTINUITY CONTRACT: leftContent (the map) must stay mounted at this
        exact JSX position on every frame. It is a live, already-animating
        scene whose internal spring()/interpolate() state is keyed to its own
        mount time — React only remounts a child when its type or `key`
        changes, so as long as this render is never gated behind splitProgress
        or frame (no conditional swap to a different element/type), the child
        keeps its identity and its animation state survives the resize. Only
        the *container* below is animated (width); the child itself is passed
        through untouched and simply gets resized by its parent.
      */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: `${leftWidthPct}%`,
          height: "100%",
          overflow: "hidden",
        }}
      >
        {resolvedLeftContent}
      </div>

      {/* Right panel — dark, minimal container. ScoreCardScene renders on top of it. */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: `${leftWidthPct}%`,
          width: `${rightWidthPct}%`,
          height: "100%",
          backgroundColor: "var(--right-panel-bg)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            clipPath: `inset(0 ${rightRevealInsetPct}% 0 0)`,
          }}
        >
          {rightContent}
        </div>

        {rightCaption && (
          <div
            style={{
              position: "absolute",
              bottom: 60,
              left: 0,
              right: 0,
              textAlign: "center",
              opacity: captionOpacity,
              padding: "0 24px",
              pointerEvents: "none",
            }}
          >
            <span
              style={{
                fontSize: 20,
                fontWeight: 500,
                color: "var(--caption-color)",
                fontFamily: BE_VIETNAM_PRO,
              }}
            >
              {rightCaption}
            </span>
          </div>
        )}
      </div>

      {/* Left caption — settles at its final width once the split completes */}
      {leftCaption && (
        <div
          style={{
            position: "absolute",
            bottom: 60,
            left: 0,
            width: `${leftWidthPct}%`,
            textAlign: "center",
            opacity: captionOpacity,
            padding: "0 24px",
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              fontSize: 20,
              fontWeight: 500,
              color: "var(--caption-color)",
              fontFamily: BE_VIETNAM_PRO,
            }}
          >
            {leftCaption}
          </span>
        </div>
      )}

      {/* Split divider — thin vertical line that draws in as the frame opens,
          with a soft accent-colored glow to sell the "cut" */}
      {showDivider && (
        <svg
          width={DIVIDER_STROKE * 10}
          height={VH}
          style={{
            position: "absolute",
            top: 0,
            left: `calc(${leftWidthPct}% - ${DIVIDER_STROKE * 5}px)`,
            pointerEvents: "none",
          }}
        >
          <line
            x1={DIVIDER_STROKE * 5}
            y1={0}
            x2={DIVIDER_STROKE * 5}
            y2={VH}
            stroke={accent}
            strokeWidth={DIVIDER_STROKE * 6}
            strokeDasharray={VH}
            strokeDashoffset={VH * (1 - dividerDraw)}
            opacity={0.16}
          />
          <line
            x1={DIVIDER_STROKE * 5}
            y1={0}
            x2={DIVIDER_STROKE * 5}
            y2={VH}
            stroke="var(--divider-color)"
            strokeWidth={DIVIDER_STROKE}
            strokeDasharray={VH}
            strokeDashoffset={VH * (1 - dividerDraw)}
          />
        </svg>
      )}
    </AbsoluteFill>
  );
};
