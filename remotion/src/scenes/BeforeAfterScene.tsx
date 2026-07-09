import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { INTER, JETBRAINS_MONO } from "../styles";

// ---------------------------------------------------------------------------
// Virtual canvas — scaled to fit inside the real composition (see the
// scale/leftOffset math below), mirroring BubbleComparatorScene's approach.
// ---------------------------------------------------------------------------
const VB_W = 750;
const VB_H = 1080;

const PANEL_W = 340;
const LEFT_X = 35;
const RIGHT_X = 375;
const DIVIDER_X = 375;
const PANEL_TOP = 190;
const PANEL_HEIGHT = 760;

const BG = "#0a0a0f";
const BEFORE_BG = "#ff444408";
const AFTER_BG = "#00ff4108";
const BEFORE_ACCENT = "#ff6666";
const AFTER_ACCENT = "#00ff41";
const DIVIDER_COLOR = "#ffffff22";

export interface BeforeAfterPanelData {
  label: string;
  points: string[];
  color?: string;
}

export interface BeforeAfterSceneProps {
  before: BeforeAfterPanelData;
  after: BeforeAfterPanelData;
  headline: string;
  accentWord: string;
  revealFrame?: number;
  durationInFrames: number;
}

const renderHeadline = (headline: string, accentWord: string): React.ReactNode => {
  const index = headline.indexOf(accentWord);
  if (index === -1) {
    return <span>{headline}</span>;
  }
  const before = headline.substring(0, index);
  const after = headline.substring(index + accentWord.length);
  return (
    <>
      {before}
      <span style={{ color: AFTER_ACCENT, textShadow: `0 0 12px ${AFTER_ACCENT}` }}>
        {accentWord}
      </span>
      {after}
    </>
  );
};

interface PanelProps {
  side: "left" | "right";
  data: BeforeAfterPanelData;
  defaultLabel: string;
  defaultAccent: string;
  bg: string;
  frame: number;
  fps: number;
  revealFrame: number;
}

// Slides in from its outer edge on the shared reveal spring, then staggers
// its own points in once the panel has (roughly) arrived.
const Panel: React.FC<PanelProps> = ({
  side,
  data,
  defaultLabel,
  defaultAccent,
  bg,
  frame,
  fps,
  revealFrame,
}) => {
  const isLeft = side === "left";
  const accent = data.color ?? defaultAccent;
  const label = data.label || defaultLabel;
  const icon = isLeft ? "✗" : "✓";

  const slideSpring = spring({
    frame: frame - revealFrame,
    fps,
    config: { damping: 16 },
  });
  const translateX = interpolate(slideSpring, [0, 1], [isLeft ? -60 : 60, 0]);

  // Points wait for the panel to (roughly) settle, then the right column
  // starts its own stagger 15 frames after the left column.
  const panelArriveFrame = revealFrame + 40;
  const groupStartFrame = isLeft ? panelArriveFrame : panelArriveFrame + 15;

  return (
    <div
      style={{
        position: "absolute",
        top: PANEL_TOP,
        left: isLeft ? LEFT_X : RIGHT_X,
        width: PANEL_W,
        height: PANEL_HEIGHT,
        backgroundColor: bg,
        opacity: Math.min(slideSpring, 1),
        transform: `translateX(${translateX}px)`,
        boxSizing: "border-box",
        padding: "24px 22px",
      }}
    >
      <div
        style={{
          fontFamily: `${JETBRAINS_MONO}, monospace`,
          fontSize: 13,
          fontWeight: 500,
          color: accent,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: 22,
        }}
      >
        {label}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {data.points.map((point, i) => {
          const startFrame = groupStartFrame + i * 8;
          const opacity = interpolate(frame, [startFrame, startFrame + 8], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const translateY = interpolate(frame, [startFrame, startFrame + 8], [10, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                opacity,
                transform: `translateY(${translateY}px)`,
              }}
            >
              <span
                style={{
                  fontFamily: `${INTER}, sans-serif`,
                  fontSize: 14,
                  fontWeight: 700,
                  color: accent,
                  lineHeight: "20px",
                }}
              >
                {icon}
              </span>
              <span
                style={{
                  fontFamily: `${INTER}, sans-serif`,
                  fontSize: 14,
                  fontWeight: 400,
                  color: "#ffffff",
                  lineHeight: "20px",
                }}
              >
                {point}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const BeforeAfterScene: React.FC<BeforeAfterSceneProps> = ({
  before,
  after,
  headline,
  accentWord,
  revealFrame = 30,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Scaled container to fit the 750x1080 virtual canvas inside the real composition
  const scale = height / VB_H;
  const scaledWidth = VB_W * scale;
  const leftOffset = (width - scaledWidth) / 2;

  // Frame 0-20: headline fade + slide up
  const headlineOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const headlineTranslateY = interpolate(frame, [0, 20], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // revealFrame -> revealFrame+40: vertical divider draws top to bottom
  const dividerDraw = interpolate(frame, [revealFrame, revealFrame + 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Divider "TRƯỚC" / "SAU" labels fade in once the draw-on finishes
  const dividerLabelOpacity = interpolate(
    frame,
    [revealFrame + 40, revealFrame + 55],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ backgroundColor: BG, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: leftOffset,
          width: VB_W,
          height: VB_H,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {/* Headline */}
        <div
          style={{
            position: "absolute",
            top: 70,
            width: VB_W,
            textAlign: "center",
            color: "#ffffff",
            fontFamily: `${INTER}, sans-serif`,
            fontSize: 28,
            fontWeight: 700,
            opacity: headlineOpacity,
            transform: `translateY(${headlineTranslateY}px)`,
            padding: "0 30px",
            boxSizing: "border-box",
          }}
        >
          {renderHeadline(headline, accentWord)}
        </div>

        {/* Divider */}
        <svg
          width={VB_W}
          height={VB_H}
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
        >
          <line
            x1={DIVIDER_X}
            y1={PANEL_TOP}
            x2={DIVIDER_X}
            y2={PANEL_TOP + PANEL_HEIGHT}
            stroke={DIVIDER_COLOR}
            strokeWidth={1}
            strokeDasharray={PANEL_HEIGHT}
            strokeDashoffset={PANEL_HEIGHT * (1 - dividerDraw)}
          />
        </svg>

        {/* Divider top labels */}
        <div
          style={{
            position: "absolute",
            top: PANEL_TOP - 26,
            left: DIVIDER_X - 130,
            width: 110,
            textAlign: "right",
            opacity: dividerLabelOpacity,
            fontFamily: `${JETBRAINS_MONO}, monospace`,
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: "0.1em",
            color: "rgba(255,255,255,0.4)",
            textTransform: "uppercase",
          }}
        >
          TRƯỚC
        </div>
        <div
          style={{
            position: "absolute",
            top: PANEL_TOP - 26,
            left: DIVIDER_X + 20,
            width: 110,
            textAlign: "left",
            opacity: dividerLabelOpacity,
            fontFamily: `${JETBRAINS_MONO}, monospace`,
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: "0.1em",
            color: "rgba(255,255,255,0.4)",
            textTransform: "uppercase",
          }}
        >
          SAU
        </div>

        {/* Panels */}
        <Panel
          side="left"
          data={before}
          defaultLabel="TRƯỚC"
          defaultAccent={BEFORE_ACCENT}
          bg={BEFORE_BG}
          frame={frame}
          fps={fps}
          revealFrame={revealFrame}
        />
        <Panel
          side="right"
          data={after}
          defaultLabel="SAU"
          defaultAccent={AFTER_ACCENT}
          bg={AFTER_BG}
          frame={frame}
          fps={fps}
          revealFrame={revealFrame}
        />
      </div>
    </AbsoluteFill>
  );
};

export default BeforeAfterScene;
