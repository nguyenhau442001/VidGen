import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import {
  DiagramFlowNode,
  DiagramFlowSceneProps,
  DiagramFlowTimelineStep,
  DiagramFlowBranch,
} from "../types";
import { colors, colorsDark, INTER } from "../styles";
import { SafeZone } from "../SafeZone";
import { AmbientBackground } from "../AmbientBackground";
import { VectorIconHtml } from "../icons";
import { XanhSMBirdIcon } from "./shared/greensmBikePalette";
import { BrowserChrome } from "./shared/incognitoShared";

const ENTER_FRAMES = 10;
const EXIT_FRAMES = 8;
const NODES_START = 22;
const NODE_STAGGER = 16;

// Loop layout geometry — a closed circular track sized to sit inside the
// SafeZone content band (832×1252 usable at 1080×1920) with room for node
// cards at every angle.
const LOOP_SIZE = 780;
const LOOP_RADIUS = 280;
const LOOP_CARD_W = 196;
const LOOP_CARD_H = 74;

const STATUS_COLOR: Record<DiagramFlowNode["status"], string> = {
  deleted: "#ff6666",
  intact: colors.green,
  neutral: colors.textPrimary,
};

const effectiveStatus = (node: DiagramFlowNode, frame: number): DiagramFlowNode["status"] =>
  node.revealFrame != null && frame >= node.revealFrame ? node.revealStatus ?? node.status : node.status;

const renderHeadline = (
  headline: string,
  accentWord: string | undefined,
  accentColor: string
): React.ReactNode => {
  if (!accentWord) return <>{headline}</>;
  const index = headline.indexOf(accentWord);
  if (index === -1) return <>{headline}</>;
  const before = headline.slice(0, index);
  const after = headline.slice(index + accentWord.length);
  return (
    <>
      {before}
      <span style={{ color: accentColor, textShadow: `0 0 12px ${accentColor}` }}>{accentWord}</span>
      {after}
    </>
  );
};

// Closed circular flow: nodes arranged clockwise from the top, the track
// itself drawn as a full dashed circle (so it visibly closes — the last node
// connects back to the first, no linear terminus), with an optional red
// reject branch off a checkpoint node.
const LoopDiagram: React.FC<{
  nodes: DiagramFlowNode[];
  frame: number;
  fps: number;
  accentColor: string;
}> = ({ nodes, frame, fps, accentColor }) => {
  const n = nodes.length;
  const cx = LOOP_SIZE / 2;
  const cy = LOOP_SIZE / 2;
  const angleFor = (i: number) => -90 + (360 / n) * i;
  const pointFor = (i: number) => {
    const rad = (angleFor(i) * Math.PI) / 180;
    return { x: cx + LOOP_RADIUS * Math.cos(rad), y: cy + LOOP_RADIUS * Math.sin(rad) };
  };

  const trackReveal = interpolate(frame, [0, NODE_STAGGER * n + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const flowDash = -frame * 1.4;

  return (
    <div style={{ position: "relative", width: LOOP_SIZE, height: LOOP_SIZE, margin: "0 auto" }}>
      <svg
        width={LOOP_SIZE}
        height={LOOP_SIZE}
        viewBox={`0 0 ${LOOP_SIZE} ${LOOP_SIZE}`}
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        <circle
          cx={cx}
          cy={cy}
          r={LOOP_RADIUS}
          fill="none"
          stroke={colors.textDim}
          strokeWidth={2}
          strokeDasharray="3 10"
          opacity={0.35 * trackReveal}
        />
        <circle
          cx={cx}
          cy={cy}
          r={LOOP_RADIUS}
          fill="none"
          stroke={accentColor}
          strokeWidth={3}
          strokeDasharray="16 24"
          strokeDashoffset={flowDash}
          opacity={0.55 * trackReveal}
        />
        {/* Arrowheads at each node angle, tangent to the circle, showing the
            clockwise direction of travel around the closed loop. */}
        {nodes.map((_, i) => {
          const start = NODES_START + i * NODE_STAGGER;
          const opacity = interpolate(frame, [start, start + 14], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          if (opacity <= 0) return null;
          const midAngle = angleFor(i) + 360 / n / 2;
          const rad = (midAngle * Math.PI) / 180;
          const ax = cx + LOOP_RADIUS * Math.cos(rad);
          const ay = cy + LOOP_RADIUS * Math.sin(rad);
          const tangentDeg = midAngle + 90;
          return (
            <path
              key={`arrow-${i}`}
              d="M -8 -6 L 8 0 L -8 6 Z"
              fill={accentColor}
              opacity={opacity * 0.9}
              transform={`translate(${ax} ${ay}) rotate(${tangentDeg})`}
            />
          );
        })}
        {/* Reject branch: a short outward line + × mark off a checkpoint node,
            showing signals that get filtered out instead of continuing. */}
        {nodes.map((node, i) => {
          if (!node.rejectNote) return null;
          const start = NODES_START + i * NODE_STAGGER + 30;
          const opacity = interpolate(frame, [start, start + 20], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          if (opacity <= 0) return null;
          const angle = angleFor(i);
          const rad = (angle * Math.PI) / 180;
          const branchStart = { x: cx + (LOOP_RADIUS + 30) * Math.cos(rad), y: cy + (LOOP_RADIUS + 30) * Math.sin(rad) };
          const branchEnd = { x: cx + (LOOP_RADIUS + 118) * Math.cos(rad), y: cy + (LOOP_RADIUS + 118) * Math.sin(rad) };
          return (
            <g key={`reject-${i}`} opacity={opacity}>
              <line
                x1={branchStart.x}
                y1={branchStart.y}
                x2={branchEnd.x}
                y2={branchEnd.y}
                stroke="#ff6666"
                strokeWidth={2}
                strokeDasharray="4 5"
              />
              <g transform={`translate(${branchEnd.x} ${branchEnd.y})`}>
                <VectorIconHtml name="reject" size={22} color="#ff6666" />
              </g>
            </g>
          );
        })}
      </svg>

      {nodes.map((node, i) => {
        const start = NODES_START + i * NODE_STAGGER;
        const s = spring({ frame: frame - start, fps, config: { stiffness: 220, damping: 20 }, durationInFrames: 18 });
        if (s <= 0) return null;
        const color = STATUS_COLOR[effectiveStatus(node, frame)] ?? colors.textPrimary;
        const p = pointFor(i);
        const compact = node.label.length > 12;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: p.x,
              top: p.y,
              width: LOOP_CARD_W,
              minHeight: LOOP_CARD_H,
              transform: `translate(-50%, -50%) scale(${s})`,
              opacity: s,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "12px 14px",
              borderRadius: 16,
              backgroundColor: "rgba(0,0,0,0.04)",
              border: `1px solid ${color}55`,
              textAlign: "center",
              boxSizing: "border-box",
            }}
          >
            <VectorIconHtml name={node.icon} size={26} color={color} />
            <span style={{ fontSize: compact ? 15 : 18, fontWeight: 700, color, lineHeight: 1.2 }}>{node.label}</span>
          </div>
        );
      })}

      {/* Reject note label, placed just past its branch endpoint */}
      {nodes.map((node, i) => {
        if (!node.rejectNote) return null;
        const start = NODES_START + i * NODE_STAGGER + 34;
        const opacity = interpolate(frame, [start, start + 20], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        if (opacity <= 0) return null;
        const angle = angleFor(i);
        const rad = (angle * Math.PI) / 180;
        const labelPoint = { x: cx + (LOOP_RADIUS + 118) * Math.cos(rad), y: cy + (LOOP_RADIUS + 118) * Math.sin(rad) };
        return (
          <div
            key={`reject-label-${i}`}
            style={{
              position: "absolute",
              left: labelPoint.x,
              top: labelPoint.y + 26,
              width: 170,
              transform: "translate(-50%, 0)",
              opacity,
              fontSize: 14,
              fontWeight: 600,
              color: "#ff6666",
              textAlign: "center",
              lineHeight: 1.3,
            }}
          >
            {node.rejectNote}
          </div>
        );
      })}
    </div>
  );
};

// Horizontal filmstrip: a camera (track translateX) pans smoothly between
// each step's anchor frame — past steps stay visible but dim/small, the
// current step reads large and bright, future steps aren't shown yet. This
// is what makes "timeline" a forensic replay/build-up, distinct from
// "linear" (every node visible from the start) and "loop" (closed circle).
const TIMELINE_STEP_GAP = 260;

const TimelineTrack: React.FC<{
  steps: DiagramFlowTimelineStep[];
  frame: number;
  accentColor: string;
  dimColor: string;
  cardBg: string;
}> = ({ steps, frame, accentColor, dimColor, cardBg }) => {
  if (steps.length === 0) return null;
  const stepFrames = steps.map((s) => s.frame);
  const stepPositions = steps.map((_, i) => -i * TIMELINE_STEP_GAP);
  const trackX =
    steps.length === 1
      ? 0
      : interpolate(frame, stepFrames, stepPositions, {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
  const activeIndex = steps.reduce((acc, s, i) => (frame >= s.frame ? i : acc), 0);

  return (
    <div style={{ position: "relative", height: 160 }}>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          height: 2,
          width: 3000,
          transform: "translate(-50%, -50%)",
          background: `linear-gradient(90deg, transparent, ${accentColor}22 20%, ${accentColor}22 80%, transparent)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          display: "flex",
          gap: TIMELINE_STEP_GAP - 220,
          transform: `translate(${trackX - 110}px, -50%)`,
        }}
      >
        {steps.map((step, i) => {
          const dist = Math.abs(i - activeIndex);
          const isActive = i === activeIndex;
          const enter = interpolate(frame, [step.frame, step.frame + 12], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          if (enter <= 0) return null;
          return (
            <div
              key={i}
              style={{
                width: 236,
                flexShrink: 0,
                padding: "22px 24px",
                borderRadius: 20,
                textAlign: "center",
                backgroundColor: isActive ? `${accentColor}14` : cardBg,
                border: `1px solid ${isActive ? accentColor : dimColor}44`,
                boxShadow: isActive ? `0 18px 50px ${accentColor}22` : "none",
                opacity: enter * (isActive ? 1 : dist === 1 ? 0.55 : 0.28),
                transform: `scale(${isActive ? 1.06 : 0.84})`,
              }}
            >
              <span
                style={{
                  fontSize: isActive ? 26 : 18,
                  fontWeight: 700,
                  color: isActive ? accentColor : dimColor,
                  fontFamily: INTER,
                  lineHeight: 1.25,
                }}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Hypothesis cards fanning out from (or converging back into) a single
// center point below the headline — used for the "several possible causes"
// beat. Exactly one of branchesFrame (fan out, starts closed) or
// branchesCollapseFrame (starts open, converges closed) should be set.
const BranchFan: React.FC<{
  branches: DiagramFlowBranch[];
  frame: number;
  accentColor: string;
  textColor: string;
  cardBg: string;
  branchesFrame?: number;
  branchesCollapseFrame?: number;
}> = ({ branches, frame, accentColor, textColor, cardBg, branchesFrame, branchesCollapseFrame }) => {
  const progress =
    branchesCollapseFrame != null
      ? interpolate(frame, [0, 14, branchesCollapseFrame, branchesCollapseFrame + 26], [1, 1, 1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : interpolate(frame, [branchesFrame ?? 0, (branchesFrame ?? 0) + 34], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

  if (progress <= 0) return null;
  const n = branches.length;

  return (
    <div style={{ position: "relative", height: 300 }}>
      {branches.map((b, i) => {
        const spread = n > 1 ? i / (n - 1) - 0.5 : 0; // -0.5..0.5
        const x = spread * 520;
        const y = 90 + Math.abs(spread) * 40;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: "50%",
              top: 0,
              width: 228,
              padding: "20px 22px",
              borderRadius: 18,
              textAlign: "center",
              backgroundColor: cardBg,
              border: `1px solid ${accentColor}66`,
              boxShadow: `0 16px 40px ${accentColor}18`,
              // Opacity eases with progress^2 so cards fade out faster than
              // they converge on the collapse — otherwise, mid-collapse, all
              // labels are still ~50% visible while nearly overlapping at
              // the center, reading as illegible mush instead of a clean
              // merge.
              opacity: progress * progress,
              transform: `translate(${-114 + x * progress}px, ${y * progress}px) scale(${0.7 + 0.3 * progress})`,
            }}
          >
            <span style={{ fontSize: 18, fontWeight: 700, color: textColor, fontFamily: INTER, lineHeight: 1.3 }}>
              {b.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export const DiagramFlowScene: React.FC<DiagramFlowSceneProps> = ({
  headline,
  accentWord,
  nodes,
  arrow = "→",
  footer,
  sourceLabel,
  badgeText,
  layout = "linear",
  brandIcon,
  accentColor,
  timelineSteps,
  timelineCollapseFrame,
  branches,
  branchesFrame,
  branchesCollapseFrame,
  backgroundPanel,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const accent = accentColor ?? colors.cyan;
  const isTimeline = layout === "timeline";
  // timeline layout: the headline/badge/footer/source block doubles as the
  // "collapse into one punchline" beat, so it stays hidden until the
  // filmstrip/branches resolve instead of showing from frame 0.
  const collapseAnchor = timelineCollapseFrame ?? branchesCollapseFrame ?? 0;

  const hasExitRoom = durationInFrames > ENTER_FRAMES + EXIT_FRAMES;
  const sceneOpacity = interpolate(
    frame,
    hasExitRoom
      ? [0, ENTER_FRAMES, durationInFrames - EXIT_FRAMES, durationInFrames]
      : [0, durationInFrames],
    hasExitRoom ? [0, 1, 1, 0] : [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const headlineOpacity = isTimeline
    ? interpolate(frame, [collapseAnchor, collapseAnchor + 16], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : interpolate(frame, [0, ENTER_FRAMES], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });

  const trackFadeOpacity = isTimeline && timelineCollapseFrame != null
    ? interpolate(frame, [Math.max(0, timelineCollapseFrame - 10), timelineCollapseFrame], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 1;

  const footerStart = isTimeline ? collapseAnchor + 20 : NODES_START + nodes.length * NODE_STAGGER + 16;
  const footerOpacity = interpolate(frame, [footerStart, footerStart + 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // Source citation must read as present for the whole claim, not a
  // last-second disclaimer — fades in right after the headline and holds.
  const sourceOpacity = isTimeline
    ? headlineOpacity
    : interpolate(frame, [ENTER_FRAMES, ENTER_FRAMES + 14], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });

  // "timeline" is deliberately dark/cinematic (matches the phone-UI shots it
  // sits next to) instead of the light default used by "linear"/"loop" —
  // those two are unchanged for back-compat with existing videos.
  const timelineTextColor = colorsDark.textPrimary;
  const timelineDimColor = colorsDark.textDim;
  const timelineCardBg = "rgba(255,255,255,0.05)";

  return (
    <AbsoluteFill style={{ backgroundColor: isTimeline ? colorsDark.bg : colors.bg, opacity: sceneOpacity }}>
      <AmbientBackground accent={accent} />
      {brandIcon === "xanhsm" && (
        <div style={{ position: "absolute", top: 64, right: 64, opacity: 0.28 }}>
          <XanhSMBirdIcon size={40} color={accent} />
        </div>
      )}
      <SafeZone
        style={{ justifyContent: "center", alignItems: "stretch", flexDirection: "column", fontFamily: INTER }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 70 }}>
          <div
            style={{
              fontSize: 44,
              fontWeight: 700,
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
              color: isTimeline ? timelineTextColor : colors.textPrimary,
              opacity: headlineOpacity,
            }}
          >
            {renderHeadline(headline, accentWord, accent)}
          </div>
          {badgeText && (
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: accent,
                border: `1px solid ${accent}`,
                borderRadius: 20,
                padding: "6px 14px",
                whiteSpace: "nowrap",
                marginLeft: 16,
                opacity: headlineOpacity,
              }}
            >
              {badgeText}
            </span>
          )}
        </div>

        {layout === "loop" ? (
          <LoopDiagram nodes={nodes} frame={frame} fps={fps} accentColor={accent} />
        ) : isTimeline ? (
          <div style={{ position: "relative" }}>
            {backgroundPanel && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: "50%",
                  transform: "translateX(-50%) scale(0.62)",
                  transformOrigin: "top center",
                  opacity: 0.3,
                  pointerEvents: "none",
                }}
              >
                <BrowserChrome width={780} urlLabel={backgroundPanel.urlLabel} accentColor={accent} incognito>
                  <div style={{ fontFamily: INTER, fontWeight: 600, fontSize: 22, color: accent, textAlign: "left" }}>
                    {backgroundPanel.highlightLine}
                  </div>
                </BrowserChrome>
              </div>
            )}
            <div style={{ opacity: trackFadeOpacity, marginTop: backgroundPanel ? 220 : 0 }}>
              {branches && branches.length > 0 ? (
                <BranchFan
                  branches={branches}
                  frame={frame}
                  accentColor={accent}
                  textColor={timelineTextColor}
                  cardBg={timelineCardBg}
                  branchesFrame={branchesFrame}
                  branchesCollapseFrame={branchesCollapseFrame}
                />
              ) : (
                <TimelineTrack
                  steps={timelineSteps ?? []}
                  frame={frame}
                  accentColor={accent}
                  dimColor={timelineDimColor}
                  cardBg={timelineCardBg}
                />
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            {nodes.map((node, i) => {
              const start = NODES_START + i * NODE_STAGGER;
              const s = spring({ frame: frame - start, fps, config: { stiffness: 260, damping: 20 }, durationInFrames: 18 });
              const color = STATUS_COLOR[effectiveStatus(node, frame)] ?? colors.textPrimary;
              return (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 20,
                      width: "100%",
                      padding: "18px 26px",
                      borderRadius: 18,
                      backgroundColor: "rgba(0,0,0,0.04)",
                      border: `1px solid ${color}44`,
                      opacity: s,
                      transform: `translateY(${interpolate(s, [0, 1], [16, 0])}px)`,
                      textDecoration: node.status === "deleted" ? "line-through" : "none",
                      textDecorationColor: "#ff6666",
                    }}
                  >
                    <VectorIconHtml name={node.icon} size={34} color={color} />
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: 24, fontWeight: 600, color }}>{node.label}</span>
                      {node.sublabel && (
                        <span style={{ fontSize: 16, fontWeight: 400, color: colors.textDim, marginTop: 2 }}>
                          {node.sublabel}
                        </span>
                      )}
                    </div>
                  </div>
                  {i < nodes.length - 1 && (
                    <div style={{ fontSize: 26, color: colors.textDim, padding: "4px 0" }}>{arrow}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {footer && (
          <div
            style={{
              marginTop: 48,
              fontSize: 24,
              fontWeight: 600,
              color: accent,
              textAlign: "center",
              opacity: footerOpacity,
            }}
          >
            {footer}
          </div>
        )}

        {sourceLabel && (
          <div
            style={{
              marginTop: footer ? 18 : 48,
              fontSize: 15,
              fontWeight: 600,
              color: isTimeline ? timelineDimColor : colors.textDim,
              textAlign: "center",
              opacity: sourceOpacity,
            }}
          >
            {sourceLabel}
          </div>
        )}
      </SafeZone>
    </AbsoluteFill>
  );
};

export default DiagramFlowScene;
