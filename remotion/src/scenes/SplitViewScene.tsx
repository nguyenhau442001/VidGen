import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { SplitViewSceneProps, SplitPanelContent } from "../types";
import { colors, INTER, type as t } from "../styles";
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
