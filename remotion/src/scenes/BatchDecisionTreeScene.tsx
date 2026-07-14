import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BatchDecisionTreeSceneProps, DecisionNode } from "../types";
import { colors, INTER } from "../styles";

export type { BatchDecisionTreeSceneProps, DecisionNode };

// ---------------------------------------------------------------------------
// Constants — layout is fully derived from nodes.length (spacing = canvasHeight
// / (nodes.length + 2)); nothing below hardcodes a per-node pixel position.
//
// Reveal order per node i, generalized from the spec so it extends to any
// nodes.length:
//   node i        [nodeStart(i), +NODE_ENTER_DURATION]        spring scale 0.8→1.0 + fade
//   "Có" line i   [nodeStart(i)+LINE_START_OFFSET, +LINE_DRAW_DURATION]   strokeDashoffset draw
//   node i+1 (or the final accept terminal once i is the last node) starts
//   at nodeStart(i+1) — which is exactly staggerFrames after node i, so the
//   "Có" line finishes drawing just before the next stage appears.
//   "Không" line i + reject terminal i   start REJECT_GAP frames after that
//   next stage begins, so the reject branch always resolves after the
//   "accepted" path has already moved on.
// ---------------------------------------------------------------------------
const CANVAS_W = 1080;
const CANVAS_H = 1920;

const QUESTION_NODE_X = 330; // center x of the vertical question-node column
const NODE_W = 380;
const NODE_H = 90;
const TERMINAL_W = 220;
const TERMINAL_H = 80;
const REJECT_X_OFFSET = 220; // reject terminal's left edge = QUESTION_NODE_X + this

const NODE_ENTER_DURATION = 22;
const LINE_START_OFFSET = 15;
const LINE_DRAW_DURATION = 20;
const REJECT_GAP = 10;
const TERMINAL_ENTER_DURATION = 15;

const GLOW_BASE = 2;
const GLOW_PEAK = 6;

const hexToRgb = (hex: string): [number, number, number] => {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const rgba = (hex: string, alpha: number): string => {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const glowStdDeviation = (frame: number, start: number, end: number) => {
  const t = interpolate(frame, [start, (start + end) / 2, end], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return GLOW_BASE + t * (GLOW_PEAK - GLOW_BASE);
};

export const BatchDecisionTreeScene: React.FC<BatchDecisionTreeSceneProps> = ({
  nodes,
  finalYesLabel,
  rejectLabel = "❌ Tách cuốc",
  accentColor = "#00ff41",
  rejectColor = "#ff4444",
  staggerFrames = 40,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const n = nodes.length;
  const spacing = CANVAS_H / (n + 2);
  const nodeY = (i: number) => spacing * (i + 1);
  const finalY = spacing * (n + 1);

  const nodeStart = (i: number) => i * staggerFrames;
  const yesLineStart = (i: number) => nodeStart(i) + LINE_START_OFFSET;
  const yesLineEnd = (i: number) => yesLineStart(i) + LINE_DRAW_DURATION;
  const nextStageStart = (i: number) => (i + 1 < n ? nodeStart(i + 1) : yesLineEnd(n - 1));
  const rejectLineStart = (i: number) => nextStageStart(i) + REJECT_GAP;
  const rejectLineEnd = (i: number) => rejectLineStart(i) + LINE_DRAW_DURATION;
  const finalAcceptStart = n > 0 ? yesLineEnd(n - 1) : 0;

  const rejectCenterX = QUESTION_NODE_X + REJECT_X_OFFSET + TERMINAL_W / 2;

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        <defs>
          {nodes.map((_, i) => (
            <filter key={i} id={`reject-glow-${i}`} x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur
                stdDeviation={glowStdDeviation(frame, rejectLineEnd(i), rejectLineEnd(i) + TERMINAL_ENTER_DURATION)}
                result="blur"
              />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          ))}
          <filter id="accept-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur
              stdDeviation={glowStdDeviation(frame, finalAcceptStart, finalAcceptStart + TERMINAL_ENTER_DURATION)}
              result="blur"
            />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* "Có" branch — vertical line from node i down to node i+1, or to the
            final accept terminal once i is the last node */}
        {nodes.map((node, i) => {
          const y1 = nodeY(i) + NODE_H / 2;
          const y2 = i + 1 < n ? nodeY(i + 1) - NODE_H / 2 : finalY - TERMINAL_H / 2;
          const length = Math.abs(y2 - y1);
          const t = interpolate(frame, [yesLineStart(i), yesLineEnd(i)], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          if (t <= 0) return null;
          return (
            <g key={`yes-${i}`}>
              <path
                d={`M ${QUESTION_NODE_X} ${y1} L ${QUESTION_NODE_X} ${y2}`}
                fill="none"
                stroke={accentColor}
                strokeWidth={2}
                strokeDasharray={length || 1}
                strokeDashoffset={length * (1 - t)}
              />
              <text
                x={QUESTION_NODE_X + 14}
                y={y1 + (y2 - y1) * 0.35}
                fontSize={14}
                fontWeight={700}
                style={{ fill: accentColor, fontFamily: INTER }}
              >
                {node.yesLabel ?? "Có"}
              </text>
            </g>
          );
        })}

        {/* "Không" branch — horizontal line from node i to its reject terminal */}
        {nodes.map((node, i) => {
          const y = nodeY(i);
          const x1 = QUESTION_NODE_X + NODE_W / 2;
          const x2 = rejectCenterX - TERMINAL_W / 2;
          const length = Math.abs(x2 - x1);
          const t = interpolate(frame, [rejectLineStart(i), rejectLineEnd(i)], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          if (t <= 0) return null;
          return (
            <g key={`no-${i}`}>
              <path
                d={`M ${x1} ${y} L ${x2} ${y}`}
                fill="none"
                stroke={rejectColor}
                strokeWidth={2}
                strokeDasharray={length || 1}
                strokeDashoffset={length * (1 - t)}
              />
              <text
                x={(x1 + x2) / 2}
                y={y - 14}
                textAnchor="middle"
                fontSize={14}
                fontWeight={700}
                style={{ fill: rejectColor, fontFamily: INTER }}
              >
                {node.noLabel ?? "Không"}
              </text>
            </g>
          );
        })}

        {/* Question nodes */}
        {nodes.map((node, i) => {
          const start = nodeStart(i);
          const opacity = interpolate(frame, [start, start + NODE_ENTER_DURATION], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          if (opacity <= 0) return null;
          const springVal = spring({
            frame: Math.max(0, frame - start),
            fps,
            config: { stiffness: 120, damping: 14 },
            durationInFrames: NODE_ENTER_DURATION,
          });
          const scale = 0.8 + springVal * 0.2;
          const y = nodeY(i);
          return (
            <g key={`node-${i}`} opacity={opacity} transform={`translate(${QUESTION_NODE_X}, ${y}) scale(${scale})`}>
              <rect
                x={-NODE_W / 2}
                y={-NODE_H / 2}
                width={NODE_W}
                height={NODE_H}
                rx={16}
                fill="rgba(0,0,0,0.04)"
                stroke="rgba(0,0,0,0.4)"
                strokeWidth={1}
              />
              <text
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={18}
                fontWeight={500}
                style={{ fill: colors.textPrimary, fontFamily: INTER }}
              >
                {node.question}
              </text>
            </g>
          );
        })}

        {/* Final accept terminal — bottom of the last "Có" branch */}
        {n > 0 &&
          (() => {
            const opacity = interpolate(
              frame,
              [finalAcceptStart, finalAcceptStart + TERMINAL_ENTER_DURATION],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            );
            if (opacity <= 0) return null;
            return (
              <g
                opacity={opacity}
                transform={`translate(${QUESTION_NODE_X}, ${finalY})`}
                filter="url(#accept-glow)"
              >
                <rect
                  x={-TERMINAL_W / 2}
                  y={-TERMINAL_H / 2}
                  width={TERMINAL_W}
                  height={TERMINAL_H}
                  rx={16}
                  fill={rgba(accentColor, 0.12)}
                  stroke={accentColor}
                  strokeWidth={2}
                />
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={20}
                  fontWeight={700}
                  style={{ fill: accentColor, fontFamily: INTER }}
                >
                  {finalYesLabel}
                </text>
              </g>
            );
          })()}

        {/* Reject terminals — one per node, to the right of its question node */}
        {nodes.map((node, i) => {
          const opacity = interpolate(
            frame,
            [rejectLineEnd(i), rejectLineEnd(i) + TERMINAL_ENTER_DURATION],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );
          if (opacity <= 0) return null;
          const y = nodeY(i);
          return (
            <g
              key={`reject-node-${i}`}
              opacity={opacity}
              transform={`translate(${rejectCenterX}, ${y})`}
              filter={`url(#reject-glow-${i})`}
            >
              <rect
                x={-TERMINAL_W / 2}
                y={-TERMINAL_H / 2}
                width={TERMINAL_W}
                height={TERMINAL_H}
                rx={16}
                fill={rgba(rejectColor, 0.12)}
                stroke={rejectColor}
                strokeWidth={2}
              />
              <text
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={20}
                fontWeight={700}
                style={{ fill: rejectColor, fontFamily: INTER }}
              >
                {node.noResult ?? rejectLabel}
              </text>
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
