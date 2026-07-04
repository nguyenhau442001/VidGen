import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { SplitViewSceneProps, SplitPanelContent, MapPingAxis, MapPingAxisDriver } from "../types";
import { colors, INTER, JETBRAINS_MONO, type as t } from "../styles";
import { AmbientBackground } from "../AmbientBackground";

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------
const PANEL_W = 540;      // half of 1080
const ENTER_DELAY = 6;    // frames before animation starts
const RIGHT_STAGGER = 6;  // right panel enters this many frames after left
const ENTER_FRAMES = 12;
const EXIT_FRAMES = 10;

const LEFT_BG = "#0d1117";   // colors.terminalBg
const RIGHT_BG = "#07101e";  // slightly blue-tinted dark

// Safe zone insets (matching SafeZone component)
const SAFE_TOP = 244;
const SAFE_BOTTOM = 424;

// ---------------------------------------------------------------------------
// Deterministic pseudo-random hash — never Math.random() (see DotField in
// ZoomRevealScene.tsx for the same rationale: layout must stay frame-stable).
// ---------------------------------------------------------------------------
function hash(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

// ---------------------------------------------------------------------------
// Small decorative dot cluster — used by the "dots" panel kind to suggest
// many requests/signals arriving, each popping in on its own stagger.
// ---------------------------------------------------------------------------
const DotCluster: React.FC<{ frame: number; count: number; accentColor: string }> = ({
  frame,
  count,
  accentColor,
}) => {
  const size = 300;
  const dots = React.useMemo(() => {
    const arr: { x: number; y: number; r: number; delay: number }[] = [];
    for (let i = 0; i < count; i++) {
      const x = hash(i * 2.31 + 1) * size;
      const y = hash(i * 3.17 + 5) * size;
      const r = 4 + hash(i * 5.71 + 2) * 5;
      const delay = Math.floor(hash(i * 7.13 + 3) * 20);
      arr.push({ x, y, r, delay });
    }
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {dots.map((d, i) => {
        const enterFrame = 6 + d.delay;
        const opacity = interpolate(frame, [enterFrame, enterFrame + 10], [0, 0.8], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const scale = interpolate(frame, [enterFrame, enterFrame + 10], [0.3, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return <circle key={i} cx={d.x} cy={d.y} r={d.r * scale} fill={accentColor} opacity={opacity} />;
      })}
    </svg>
  );
};

// ---------------------------------------------------------------------------
// Road-constraint diagram — the "away" driver's own vector is blocked by a
// physical divider (e.g. a median), forcing a detour before they can reach
// the pickup. Panel-sized companion to MapPingScene's full-canvas
// AxisComparisonDiagram — same visual grammar (dashed barrier glyph,
// stroke-drawn vector) at a scale that fits inside a split panel.
// ---------------------------------------------------------------------------
const ROAD_VB_W = 300;
const ROAD_VB_H = 420;

const RoadConstraintDiagram: React.FC<{
  axis: MapPingAxis;
  roadConstraint?: "median";
  accentColor: string;
  frame: number;
}> = ({ axis, roadConstraint, accentColor, frame }) => {
  const driver = axis.drivers.find((d) => d.direction === "away") ?? axis.drivers[0];

  const pinX = ROAD_VB_W / 2;
  const pinY = 42;
  const roadTop = 74;
  const roadBottom = 360;
  const roadHalfW = 58;

  const dotX = pinX - 28;
  const dotY = 180;
  const arrowEndX = dotX - 46;
  const arrowEndY = 288;
  const arrowLen = Math.hypot(arrowEndX - dotX, arrowEndY - dotY);

  const roadIn = interpolate(frame, [4, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const pinIn = interpolate(frame, [10, 24], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const dotIn = interpolate(frame, [18, 32], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const arrowDraw = interpolate(frame, [28, 48], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const detourIn = interpolate(frame, [48, 62], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const warnPulse = 1 + Math.sin(frame * 0.15) * 0.15;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <svg width={ROAD_VB_W} height={ROAD_VB_H} viewBox={`0 0 ${ROAD_VB_W} ${ROAD_VB_H}`}>
        <defs>
          <marker id="roadArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 Z" fill={colors.errorRed} />
          </marker>
        </defs>

        {/* Road strip */}
        <rect
          x={pinX - roadHalfW}
          y={roadTop}
          width={roadHalfW * 2}
          height={roadBottom - roadTop}
          rx={18}
          fill="rgba(255,255,255,0.04)"
          stroke="rgba(255,255,255,0.16)"
          strokeWidth={2}
          opacity={roadIn}
        />

        {/* Median divider — the physical reason the away driver can't go straight */}
        {roadConstraint === "median" && (
          <line
            x1={pinX} y1={roadTop + 10} x2={pinX} y2={roadBottom - 10}
            stroke={accentColor}
            strokeWidth={3}
            strokeDasharray="11 9"
            strokeLinecap="round"
            opacity={0.7 * roadIn}
          />
        )}

        {/* Pickup pin */}
        <g transform={`translate(${pinX},${pinY}) scale(${pinIn})`} opacity={pinIn}>
          <line x1={0} y1={8} x2={0} y2={-22} stroke="#fff" strokeWidth={3} strokeLinecap="round" />
          <path d="M 0 -22 L 18 -16 L 0 -10 Z" fill="#fff" />
          <circle cx={0} cy={10} r={3.5} fill="#fff" />
        </g>

        {/* Away driver dot, with a soft pulsing warning ring */}
        <g transform={`translate(${dotX},${dotY})`} opacity={dotIn}>
          <circle r={20 * warnPulse} fill="none" stroke={colors.errorRed} strokeWidth={1.5} opacity={0.3} />
          <circle r={11 * dotIn} fill={colors.errorRed} />
          <circle r={4 * dotIn} fill="rgba(255,255,255,0.7)" />
        </g>

        {/* Vector pointing away from the pickup */}
        {arrowDraw > 0 && (
          <line
            x1={dotX} y1={dotY} x2={arrowEndX} y2={arrowEndY}
            stroke={colors.errorRed}
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={`${arrowLen}`}
            strokeDashoffset={`${arrowLen * (1 - arrowDraw)}`}
            markerEnd="url(#roadArrow)"
          />
        )}

        {/* U-turn detour back toward the road */}
        <path
          d={`M ${arrowEndX} ${arrowEndY} C ${arrowEndX - 34} ${arrowEndY + 46}, ${pinX - 10} ${arrowEndY + 56}, ${
            pinX + roadHalfW - 16
          } ${arrowEndY - 20}`}
          fill="none"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth={2.5}
          strokeDasharray="7 6"
          strokeLinecap="round"
          opacity={detourIn}
        />
      </svg>

      {driver && (
        <div style={{ textAlign: "center", opacity: detourIn }}>
          <div style={{ fontFamily: JETBRAINS_MONO, fontSize: 22, fontWeight: 700, color: colors.errorRed }}>
            {driver.distanceMeters}m
          </div>
          {driver.constraintNote && (
            <div
              style={{
                fontFamily: INTER,
                fontSize: 15,
                fontWeight: 400,
                color: "rgba(255,255,255,0.5)",
                marginTop: 4,
                maxWidth: 260,
              }}
            >
              {driver.constraintNote}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// ETA comparison — two drivers ranked by real travel time rather than raw
// distance. The lower-ETA driver is highlighted; the farther-but-faster one
// is dimmed with a struck-through distance, visually making the caller's
// point that Grab optimizes for arrival time, not proximity.
// ---------------------------------------------------------------------------
const MotorbikeIcon: React.FC<{ color: string }> = ({ color }) => (
  <svg width={30} height={30} viewBox="0 0 30 30" fill="none">
    <path d="M4 20 L10 20 L13 12 L18 12 L21 20 L26 20" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M13 12 L11 8 L7 8" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <circle cx={8} cy={22} r={3.4} stroke={color} strokeWidth={2} fill="none" />
    <circle cx={22} cy={22} r={3.4} stroke={color} strokeWidth={2} fill="none" />
  </svg>
);

const EtaRow: React.FC<{
  driver: MapPingAxisDriver;
  isWinner: boolean;
  color: string;
  rowFrame: number;
}> = ({ driver, isWinner, color, rowFrame }) => {
  const enter = interpolate(rowFrame, [0, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const slideFrom = isWinner ? -18 : 18;

  const seconds = driver.etaSeconds ?? 0;
  const countFrame = Math.max(0, rowFrame - 8);
  const displayed = Math.round(
    interpolate(countFrame, [0, 26], [0, seconds], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
  );
  const mm = Math.floor(displayed / 60);
  const ss = String(displayed % 60).padStart(2, "0");

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "16px 18px",
        borderRadius: 14,
        background: isWinner ? `${color}1a` : "transparent",
        border: `1px solid ${isWinner ? color : "rgba(255,255,255,0.12)"}`,
        opacity: enter * (isWinner ? 1 : 0.6),
        transform: `translateX(${interpolate(enter, [0, 1], [slideFrom, 0])}px)`,
      }}
    >
      <MotorbikeIcon color={color} />
      <div
        style={{
          flex: 1,
          fontFamily: INTER,
          fontSize: 15,
          color: "rgba(255,255,255,0.55)",
          textDecoration: isWinner ? "none" : "line-through",
        }}
      >
        {driver.distanceMeters}m
      </div>
      <div style={{ fontFamily: JETBRAINS_MONO, fontSize: 30, fontWeight: 700, color }}>
        {mm}:{ss}
      </div>
    </div>
  );
};

const EtaComparison: React.FC<{ axis: MapPingAxis; frame: number }> = ({ axis, frame }) => {
  const drivers = axis.drivers;
  const winner = drivers.reduce(
    (min, d) => ((d.etaSeconds ?? Infinity) < (min.etaSeconds ?? Infinity) ? d : min),
    drivers[0]
  );
  const cardIn = interpolate(frame, [4, 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, width: "100%", opacity: cardIn }}>
      {drivers.map((d, i) => (
        <EtaRow
          key={i}
          driver={d}
          isWinner={d === winner}
          color={d === winner ? colors.green : colors.errorRed}
          rowFrame={Math.max(0, frame - (10 + i * 12))}
        />
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Panel content renderer (manifest-driven panel types)
// ---------------------------------------------------------------------------
const PanelContent: React.FC<{
  panel: SplitPanelContent;
  frame: number;
  accentColor: string;
}> = ({ panel, frame, accentColor }) => {
  if (panel.kind === "loading") {
    // Continuous spinner rotation — no clamp so it spins forever
    const rotation = interpolate(frame, [0, 60], [0, 360], {
      extrapolateLeft: "extend",
      extrapolateRight: "extend",
    });
    const textOpacity = interpolate(frame, [10, 22], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 28,
        }}
      >
        <svg
          width="60"
          height="60"
          viewBox="0 0 60 60"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          <circle
            cx="30" cy="30" r="24"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="5"
          />
          <circle
            cx="30" cy="30" r="24"
            fill="none"
            stroke={accentColor}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray="45 105"
          />
        </svg>
        <span
          style={{
            fontSize: 22,
            fontWeight: 500,
            color: "rgba(255,255,255,0.6)",
            fontFamily: INTER,
            textAlign: "center",
            opacity: textOpacity,
          }}
        >
          {panel.text ?? "Đang tìm tài xế..."}
        </span>
      </div>
    );
  }

  if (panel.kind === "text") {
    const fadeIn = interpolate(frame, [4, 18], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return (
      <div style={{ opacity: fadeIn, textAlign: "center" }}>
        {panel.heading && (
          <div style={{ ...t.label, color: accentColor, marginBottom: 20 }}>
            {panel.heading}
          </div>
        )}
        <div
          style={{
            fontSize: 26,
            fontWeight: 400,
            color: colors.textPrimary,
            fontFamily: INTER,
            lineHeight: 1.5,
          }}
        >
          {panel.body}
        </div>
      </div>
    );
  }

  if (panel.kind === "dots") {
    return <DotCluster frame={frame} count={panel.count ?? 18} accentColor={accentColor} />;
  }

  if (panel.kind === "road_diagram") {
    return (
      <RoadConstraintDiagram
        axis={panel.axis}
        roadConstraint={panel.roadConstraint}
        accentColor={accentColor}
        frame={frame}
      />
    );
  }

  if (panel.kind === "eta_comparison") {
    return <EtaComparison axis={panel.axis} frame={frame} />;
  }

  return null;
};

// ---------------------------------------------------------------------------
// Single panel (left or right)
// ---------------------------------------------------------------------------
const Panel: React.FC<{
  side: "left" | "right";
  slideX: number;
  bg: string;
  content?: React.ReactNode;
  panelData?: SplitPanelContent;
  frame: number;
  label?: string;
  labelOpacity: number;
  accentColor: string;
}> = ({ side, slideX, bg, content, panelData, frame, label, labelOpacity, accentColor }) => {
  const isLeft = side === "left";

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: isLeft ? 0 : PANEL_W,
        width: PANEL_W,
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Inner div slides in from outside its clip boundary */}
      <div
        style={{
          width: "100%",
          height: "100%",
          transform: `translateX(${slideX}px)`,
          backgroundColor: bg,
          position: "relative",
        }}
      >
        {/* Safe-zone content area */}
        <div
          style={{
            position: "absolute",
            top: SAFE_TOP,
            bottom: SAFE_BOTTOM,
            left: 0,
            right: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 28px",
          }}
        >
          {content ?? (panelData && (
            <PanelContent panel={panelData} frame={frame} accentColor={accentColor} />
          ))}
        </div>

        {/* Panel caption label */}
        {label && (
          <div
            style={{
              position: "absolute",
              bottom: SAFE_BOTTOM - 60,
              left: 0,
              right: 0,
              textAlign: "center",
              opacity: labelOpacity,
            }}
          >
            <span
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: "rgba(255,255,255,0.35)",
                fontFamily: INTER,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              {label}
            </span>
          </div>
        )}

        {/* Divider line on the right edge of the left panel */}
        {isLeft && (
          <div
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              width: 1.5,
              height: "100%",
              backgroundColor: "rgba(255,255,255,0.10)",
            }}
          />
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main component — accepts both manifest-typed panels and React node overrides
// ---------------------------------------------------------------------------
interface SplitViewProps extends SplitViewSceneProps {
  leftContent?: React.ReactNode;
  rightContent?: React.ReactNode;
}

export const SplitViewScene: React.FC<SplitViewProps> = ({
  leftPanel,
  rightPanel,
  leftLabel,
  rightLabel,
  accentColor,
  durationInFrames,
  leftContent,
  rightContent,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const accent = accentColor ?? colors.cyan;

  // Scene fade in/out
  const hasExitRoom = durationInFrames > ENTER_FRAMES + EXIT_FRAMES;
  const sceneOpacity = interpolate(
    frame,
    hasExitRoom
      ? [0, ENTER_FRAMES, durationInFrames - EXIT_FRAMES, durationInFrames]
      : [0, durationInFrames],
    hasExitRoom ? [0, 1, 1, 0] : [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Left panel: spring from off-screen left → in place
  const leftSlide = spring({
    frame: frame - ENTER_DELAY,
    fps,
    from: -PANEL_W,
    to: 0,
    config: { stiffness: 220, damping: 26 },
    durationInFrames: 30,
  });

  // Right panel: spring from off-screen right → in place, staggered
  const rightSlide = spring({
    frame: frame - ENTER_DELAY - RIGHT_STAGGER,
    fps,
    from: PANEL_W,
    to: 0,
    config: { stiffness: 220, damping: 26 },
    durationInFrames: 30,
  });

  // Labels fade in after panels settle
  const labelOpacity = interpolate(
    frame,
    [ENTER_DELAY + 20, ENTER_DELAY + 36],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={
        {
          backgroundColor: colors.bg,
          opacity: sceneOpacity,
          "--panel-left-bg": LEFT_BG,
          "--panel-right-bg": RIGHT_BG,
          "--accent": accent,
        } as React.CSSProperties
      }
    >
      <AmbientBackground accent={accent} />

      <Panel
        side="left"
        slideX={leftSlide}
        bg={LEFT_BG}
        content={leftContent}
        panelData={leftPanel}
        frame={frame}
        label={leftLabel ?? "Bạn thấy"}
        labelOpacity={labelOpacity}
        accentColor={accent}
      />

      <Panel
        side="right"
        slideX={rightSlide}
        bg={RIGHT_BG}
        content={rightContent}
        panelData={rightPanel}
        frame={frame}
        label={rightLabel ?? "Hệ thống đang làm"}
        labelOpacity={labelOpacity}
        accentColor={accent}
      />
    </AbsoluteFill>
  );
};
