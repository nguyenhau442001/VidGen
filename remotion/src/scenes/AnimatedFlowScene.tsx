import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { AnimatedFlowSceneProps } from "../types";
import { INTER, CAPTION_CLEAR_Y } from "../styles";

const VB_W = 750;
const VB_H = 1080;
const SLICE_SCALE = 1920 / VB_H; // this scene scales its 750x1080 layer to fill the 1920-tall canvas

const FLOW_START_Y = 280;
const NODE_W = 280;
const NODE_H = 56;
// Nodes flow top-down from FLOW_START_Y, spaced evenly down to whichever is
// tighter: FLOW_SPACING_MAX, or fitting the last node's bottom edge above
// CAPTION_CLEAR_Y — so a 5-node chain never lands under Caption.tsx's pill
// the way a canvas-centered layout would for larger N.
const FLOW_SPACING_MAX = 160;
const FLOW_BOTTOM_Y = CAPTION_CLEAR_Y / SLICE_SCALE - NODE_H / 2;

const AnimatedFlowScene: React.FC<AnimatedFlowSceneProps> = ({
  nodes = [],
  edges = [],
  headline,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // 1. Scaled container to fit 750x1080 viewBox inside the 1080x1920 target composition
  const scale = height / VB_H;
  const scaledWidth = VB_W * scale;
  const leftOffset = (width - scaledWidth) / 2;

  // 2. Headline animation: frame 0 to 15, fades + slides up
  const headlineSpring = frame >= 0
    ? spring({
        frame,
        fps,
        config: { damping: 18, stiffness: 120 },
      })
    : 0;

  const headlineOpacity = headlineSpring;
  const headlineTranslateY = interpolate(headlineSpring, [0, 1], [30, 0]);

  // 3. Node vertical positioning: top-down from FLOW_START_Y, evenly spaced
  const N = nodes.length;
  const spacing =
    N > 1 ? Math.min(FLOW_SPACING_MAX, (FLOW_BOTTOM_Y - FLOW_START_Y) / (N - 1)) : 0;

  const nodePositions = new Map<string, number>();
  nodes.forEach((node, i) => {
    const y = N === 1 ? (FLOW_START_Y + FLOW_BOTTOM_Y) / 2 : FLOW_START_Y + i * spacing;
    nodePositions.set(node.id, y);
  });

  // 4. Staggered node entrance animation starts at frame 16
  const nodesEntranceStart = 16;
  const edgesStartFrame = nodesEntranceStart + N * 12;

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0f", overflow: "hidden" }}>
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
            top: 130,
            width: VB_W,
            textAlign: "center",
            color: "#ffffff",
            fontFamily: `${INTER}, sans-serif`,
            fontSize: 28,
            fontWeight: 700,
            opacity: headlineOpacity,
            transform: `translateY(${headlineTranslateY}px)`,
            padding: "0 20px",
            boxSizing: "border-box",
          }}
        >
          {headline}
        </div>

        {/* SVG for Edges / Arrows */}
        <svg
          width={VB_W}
          height={VB_H}
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            pointerEvents: "none",
          }}
        >
          <defs>
            <marker
              id="arrow-inactive"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#ffffff44" />
            </marker>
            <marker
              id="arrow-active"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#00ff41" />
            </marker>
          </defs>

          {edges.map((edge, idx) => {
            const fromY = nodePositions.get(edge.from);
            const toY = nodePositions.get(edge.to);
            if (fromY === undefined || toY === undefined) return null;

            const isDown = fromY < toY;
            const startYEdge = isDown ? fromY + (NODE_H / 2) : fromY - (NODE_H / 2);
            const endYEdge = isDown ? toY - (NODE_H / 2) : toY + (NODE_H / 2);
            const startX = VB_W / 2;
            const endX = VB_W / 2;

            const pathLength = Math.abs(endYEdge - startYEdge);

            // Sequential edge draw animation starts after all nodes stagger begins
            const edgeStartFrame = edgesStartFrame + idx * 20;
            const edgeEndFrame = edgeStartFrame + 20;

            const edgeProgress = interpolate(
              frame,
              [edgeStartFrame, edgeEndFrame],
              [0, 1],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }
            );

            const strokeDashoffset = interpolate(
              edgeProgress,
              [0, 1],
              [pathLength, 0]
            );

            // Edge label fade-in after edge completes
            const labelOpacity = interpolate(
              frame,
              [edgeEndFrame, edgeEndFrame + 10],
              [0, 1],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }
            );

            const midY = (startYEdge + endYEdge) / 2;

            return (
              <g key={`edge-${idx}`}>
                {/* Background Inactive Path */}
                <path
                  d={`M ${startX} ${startYEdge} L ${endX} ${endYEdge}`}
                  stroke="#ffffff44"
                  strokeWidth={2}
                  fill="none"
                  markerEnd="url(#arrow-inactive)"
                />

                {/* Active Glowing Path */}
                {edgeProgress > 0 && (
                  <path
                    d={`M ${startX} ${startYEdge} L ${endX} ${endYEdge}`}
                    stroke="#00ff41"
                    strokeWidth={2}
                    fill="none"
                    strokeDasharray={pathLength}
                    strokeDashoffset={strokeDashoffset}
                    markerEnd={edgeProgress > 0.95 ? "url(#arrow-active)" : undefined}
                  />
                )}

                {/* Edge Label (if exists) */}
                {edge.label && labelOpacity > 0 && (
                  <text
                    x={startX + 15}
                    y={midY}
                    fill="#00ff41"
                    fontFamily={`${INTER}, sans-serif`}
                    fontSize={12}
                    fontWeight={500}
                    textAnchor="start"
                    dominantBaseline="middle"
                    opacity={labelOpacity}
                  >
                    {edge.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Nodes */}
        {nodes.map((node, i) => {
          const y = nodePositions.get(node.id);
          if (y === undefined) return null;

          const nodeStartFrame = nodesEntranceStart + i * 12;
          const nodeSpring = frame >= nodeStartFrame
            ? spring({
                frame: frame - nodeStartFrame,
                fps,
                config: { damping: 18, stiffness: 120 },
              })
            : 0;

          const nodeScale = nodeSpring;
          const nodeOpacity = nodeSpring;

          // Resolve color mapping
          const colorType = node.color || "neutral";
          let border = "#ffffff22";
          let bg = "#ffffff08";
          let text = "#ffffff88";
          let label = "#ffffff";

          if (colorType === "green") {
            border = "#00ff41";
            bg = "#00ff4112";
            text = "#00ff41";
            label = "#ffffff";
          } else if (colorType === "cyan") {
            border = "#61dafb";
            bg = "#61dafb12";
            text = "#61dafb";
            label = "#ffffff";
          }

          return (
            <div
              key={node.id}
              style={{
                position: "absolute",
                left: VB_W / 2 - NODE_W / 2,
                top: y - NODE_H / 2,
                width: NODE_W,
                height: NODE_H,
                borderRadius: NODE_H / 2, // pill style
                border: `1px solid ${border}`,
                backgroundColor: bg,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                opacity: nodeOpacity,
                transform: `scale(${nodeScale})`,
                boxSizing: "border-box",
                padding: "0 24px",
                pointerEvents: "none",
              }}
            >
              <div
                style={{
                  fontFamily: `${INTER}, sans-serif`,
                  fontSize: 16,
                  fontWeight: 600,
                  color: label,
                  textAlign: "center",
                  lineHeight: 1.2,
                }}
              >
                {node.label}
              </div>
              {node.sublabel && (
                <div
                  style={{
                    fontFamily: `${INTER}, sans-serif`,
                    fontSize: 12,
                    fontWeight: 400,
                    color: text,
                    textAlign: "center",
                    marginTop: 2,
                    lineHeight: 1.2,
                  }}
                >
                  {node.sublabel}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export default AnimatedFlowScene;
