import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { colors, INTER, JETBRAINS_MONO } from "../styles";

// ---------------------------------------------------------------------------
// Virtual canvas — "contain" fit inside the real composition, matching
// BeforeAfterScene/BubbleComparatorScene conventions.
// ---------------------------------------------------------------------------
const VB_W = 750;
const VB_H = 1080;

const CENTER_X = 375;
const HEADLINE_TOP = 80;
const LINE_START_Y = 200;
const ITEM_SPACING = 130;
const LINE_DRAW_START = 20;
const LINE_DRAW_FRAMES = 30;
const ITEM_STAGGER = 14;

const DOT_SIZE = 8;
const CONNECTOR_LEN = 40;
const GAP = DOT_SIZE / 2 + CONNECTOR_LEN;
const BOX_WIDTH = 280;
const MAX_ITEMS = 6;

const BG = colors.bg;
const ACCENT = colors.green;
const LINE_COLOR = "#00000018";
const DOT_DEFAULT = "#00000033";
const CONNECTOR_COLOR = "#00000022";
const PILL_BG = "#0000000a";
const PILL_BORDER_DEFAULT = "#00000022";
const PILL_TEXT = "#00000088";
const SUBLABEL_COLOR = "#00000055";

export type TimelineItem = {
  year: string;
  label: string;
  sublabel?: string;
  accent?: boolean;
};

export type TimelineSceneProps = {
  items: TimelineItem[];
  headline: string;
  accentWord: string;
  durationInFrames: number;
};

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
      <span style={{ color: ACCENT }}>{accentWord}</span>
      {after}
    </>
  );
};

interface TimelineRowProps {
  item: TimelineItem;
  index: number;
  frame: number;
  fps: number;
  itemsStartFrame: number;
}

const TimelineRow: React.FC<TimelineRowProps> = ({
  item,
  index,
  frame,
  fps,
  itemsStartFrame,
}) => {
  const isLeft = index % 2 === 1;
  const y = LINE_START_Y + index * ITEM_SPACING;
  const startFrame = itemsStartFrame + index * ITEM_STAGGER;

  const rowSpring = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 16 },
  });
  const opacity = Math.min(rowSpring, 1);
  const translateX = interpolate(rowSpring, [0, 1], [isLeft ? -30 : 30, 0]);
  const connectorWidth = interpolate(rowSpring, [0, 1], [0, CONNECTOR_LEN], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const dotColor = item.accent ? ACCENT : DOT_DEFAULT;
  const pillBorder = item.accent ? ACCENT : PILL_BORDER_DEFAULT;
  const labelColor = item.accent ? ACCENT : colors.textPrimary;

  return (
    <React.Fragment>
      {/* Connector dot on the center line */}
      <div
        style={{
          position: "absolute",
          top: y,
          left: CENTER_X,
          width: DOT_SIZE,
          height: DOT_SIZE,
          borderRadius: "50%",
          backgroundColor: dotColor,
          boxShadow: item.accent ? `0 0 10px 2px ${ACCENT}` : "none",
          transform: "translate(-50%, -50%)",
          opacity,
        }}
      />

      {/* Horizontal connector line from dot to item box */}
      <div
        style={{
          position: "absolute",
          top: y - 0.5,
          left: isLeft ? CENTER_X - GAP : CENTER_X + DOT_SIZE / 2,
          width: connectorWidth,
          height: 1,
          backgroundColor: CONNECTOR_COLOR,
        }}
      />

      {/* Item box */}
      <div
        style={{
          position: "absolute",
          top: y,
          left: isLeft ? CENTER_X - GAP - BOX_WIDTH : CENTER_X + GAP,
          width: BOX_WIDTH,
          textAlign: "left",
          opacity,
          transform: `translateY(-50%) translateX(${translateX}px)`,
        }}
      >
        <div
          style={{
            display: "inline-block",
            padding: "3px 10px",
            borderRadius: 999,
            backgroundColor: PILL_BG,
            border: `1px solid ${pillBorder}`,
            fontFamily: `${JETBRAINS_MONO}, monospace`,
            fontSize: 12,
            fontWeight: 500,
            color: PILL_TEXT,
            marginBottom: 6,
          }}
        >
          {item.year}
        </div>
        <div
          style={{
            fontFamily: `${INTER}, sans-serif`,
            fontSize: 14,
            fontWeight: 500,
            color: labelColor,
          }}
        >
          {item.label}
        </div>
        {item.sublabel && (
          <div
            style={{
              fontFamily: `${INTER}, sans-serif`,
              fontSize: 12,
              fontWeight: 400,
              color: SUBLABEL_COLOR,
              marginTop: 2,
            }}
          >
            {item.sublabel}
          </div>
        )}
      </div>
    </React.Fragment>
  );
};

const TimelineScene: React.FC<TimelineSceneProps> = ({
  items,
  headline,
  accentWord,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // "Contain" fit — avoids clipping when the real composition's aspect ratio
  // doesn't match the 750x1080 virtual canvas.
  const scale = Math.min(width / VB_W, height / VB_H);
  const scaledWidth = VB_W * scale;
  const scaledHeight = VB_H * scale;
  const leftOffset = (width - scaledWidth) / 2;
  const topOffset = (height - scaledHeight) / 2;

  const cappedItems = items.slice(0, MAX_ITEMS);

  // Frame 0-20: headline slide up + fade
  const headlineOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const headlineTranslateY = interpolate(frame, [0, 20], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Frame 20+: center line draws downward over 30 frames
  const lineDrawEnd = LINE_DRAW_START + LINE_DRAW_FRAMES;
  const lineDraw = interpolate(frame, [LINE_DRAW_START, lineDrawEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const lineEndY =
    cappedItems.length > 0
      ? LINE_START_Y + (cappedItems.length - 1) * ITEM_SPACING + 40
      : LINE_START_Y;
  const lineLength = lineEndY - LINE_START_Y;

  return (
    <AbsoluteFill style={{ backgroundColor: BG, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          top: topOffset,
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
            top: HEADLINE_TOP,
            width: VB_W,
            textAlign: "center",
            color: colors.textPrimary,
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

        {/* Center vertical line */}
        <svg
          width={VB_W}
          height={VB_H}
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
        >
          <line
            x1={CENTER_X}
            y1={LINE_START_Y}
            x2={CENTER_X}
            y2={lineEndY}
            stroke={LINE_COLOR}
            strokeWidth={2}
            strokeDasharray={lineLength}
            strokeDashoffset={lineLength * (1 - lineDraw)}
          />
        </svg>

        {/* Timeline items */}
        {cappedItems.map((item, i) => (
          <TimelineRow
            key={i}
            item={item}
            index={i}
            frame={frame}
            fps={fps}
            itemsStartFrame={lineDrawEnd}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};

export default TimelineScene;
