import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { EventScanSceneProps } from "../types";
import { colors, INTER, JETBRAINS_MONO, SAFE_ZONE } from "../styles";
import { AmbientBackground } from "../AmbientBackground";

const ACCENT_DEFAULT = "#f59e0b";
const ACTION_COLOR = "#00ff41";

const ENTER_FRAMES = 10;
const EXIT_FRAMES = 15;
const PANEL_TOP = SAFE_ZONE.top + 120;
const ROW_HEIGHT = 172;
const ROW_GAP = 20;
// The multiplier stat + action banner used to be anchored a fixed distance
// from the bottom of the canvas (`bottom: SAFE_ZONE.bottom + 170`), which
// only cleared Caption.tsx's pill for short one-line captions — this
// project's longer narration-driven captions wrap to 4-6 lines and covered
// the banner. Flowing both top-down from the panel instead keeps them
// anchored to content above rather than to a caption height that isn't
// known at layout time.
const MULTIPLIER_GAP = 28;
const MULTIPLIER_BLOCK_HEIGHT = 145; // stat number (88px) + gap + label (24px)
const ACTION_GAP = 16;

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------
const EventIcon: React.FC<{ kind: string; color: string }> = ({ kind, color }) => {
  switch (kind) {
    case "sports":
      return (
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
          <circle cx="13" cy="13" r="11" stroke={color} strokeWidth="2" />
          <path
            d="M13 6l4.5 3.3-1.7 5.3H10.2L8.5 9.3 13 6z"
            fill={color}
            opacity={0.85}
          />
          <path d="M13 2v4M13 20v4M2 13h4M20 13h4" stroke={color} strokeWidth="1.4" opacity={0.5} />
        </svg>
      );
    case "festival":
      return (
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
          <path
            d="M13 2l2.8 8.2H24l-6.9 5 2.8 8.2L13 18.4 6.1 23.4 8.9 15.2 2 10.2h8.2L13 2z"
            fill={color}
            opacity={0.9}
          />
        </svg>
      );
    case "concert":
      return (
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
          <circle cx="7" cy="20" r="3.4" fill={color} opacity={0.9} />
          <circle cx="19" cy="17" r="3.4" fill={color} opacity={0.9} />
          <path
            d="M10.4 20V6.6L22.4 3v14"
            stroke={color}
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      );
    default:
      return (
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
          <rect x="3" y="5" width="20" height="18" rx="3" stroke={color} strokeWidth="2" />
          <path d="M3 10h20" stroke={color} strokeWidth="2" />
          <path d="M8 2v5M18 2v5" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
  }
};

// ---------------------------------------------------------------------------
// A single timeline row: skeleton shimmer → revealed "found" card
// ---------------------------------------------------------------------------
const EventRow: React.FC<{
  event: EventScanSceneProps["events"][number];
  index: number;
  revealFrame: number;
  accent: string;
  frame: number;
  fps: number;
}> = ({ event, index, revealFrame, accent, frame, fps }) => {
  const pop = spring({
    frame: frame - revealFrame,
    fps,
    from: 0,
    to: 1,
    config: { stiffness: 220, damping: 18 },
    durationInFrames: 20,
  });
  const revealed = pop > 0.02;

  const shimmerT = ((frame + index * 12) % 50) / 50;
  const shimmerOpacity = 0.06 + 0.05 * Math.sin(shimmerT * Math.PI * 2);

  return (
    <div
      style={{
        position: "relative",
        height: ROW_HEIGHT,
        borderRadius: 16,
        border: `1px solid ${revealed ? rgba(accent, 0.35) : "rgba(0,0,0,0.06)"}`,
        backgroundColor: revealed ? rgba(accent, 0.06) : "rgba(0,0,0,0.02)",
        overflow: "hidden",
        transform: `scale(${0.96 + 0.04 * pop})`,
      }}
    >
      {/* Skeleton shimmer, fades out once revealed */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 1 - pop,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 12,
          padding: "0 28px",
        }}
      >
        <div style={{ width: "46%", height: 20, borderRadius: 6, background: `rgba(0,0,0,${shimmerOpacity})` }} />
        <div style={{ width: "68%", height: 16, borderRadius: 6, background: `rgba(0,0,0,${shimmerOpacity * 0.7})` }} />
      </div>

      {/* Revealed content */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          gap: 20,
          padding: "0 26px",
          opacity: pop,
          transform: `translateX(${interpolate(pop, [0, 1], [16, 0])}px)`,
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            backgroundColor: rgba(accent, 0.16),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <EventIcon kind={event.icon ?? "generic"} color={accent} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 30,
              fontWeight: 700,
              color: colors.textPrimary,
              fontFamily: INTER,
              letterSpacing: "-0.01em",
              marginBottom: 6,
            }}
          >
            {event.label}
          </div>
          <div
            style={{
              fontSize: 22,
              color: "rgba(0,0,0,0.55)",
              fontFamily: INTER,
            }}
          >
            {event.meta}
          </div>
        </div>
        <div
          style={{
            flexShrink: 0,
            padding: "6px 12px",
            borderRadius: 20,
            border: `1px solid ${rgba(accent, 0.5)}`,
            opacity: interpolate(pop, [0.6, 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }}
        >
          <span
            style={{
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: "0.06em",
              color: accent,
              fontFamily: JETBRAINS_MONO,
            }}
          >
            FOUND
          </span>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export const EventScanScene: React.FC<EventScanSceneProps> = ({
  eyebrow,
  scanLabel,
  events,
  multiplierValue,
  multiplierLabel,
  actionText,
  accentColor = ACCENT_DEFAULT,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const hasExitRoom = durationInFrames > ENTER_FRAMES + EXIT_FRAMES;
  const sceneOpacity = interpolate(
    frame,
    hasExitRoom ? [0, ENTER_FRAMES, durationInFrames - EXIT_FRAMES, durationInFrames] : [0, durationInFrames],
    hasExitRoom ? [0, 1, 1, 0] : [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const panelHeight = events.length * ROW_HEIGHT + (events.length - 1) * ROW_GAP;

  // Reveal timing scales with duration so the scene reads correctly whether
  // narration runs short or long — evenly spaced across the first ~55%.
  const revealStart = Math.round(durationInFrames * 0.12);
  const revealSpacing = Math.round((durationInFrames * 0.42) / Math.max(1, events.length));
  const revealFrames = events.map((_, i) => revealStart + i * revealSpacing);
  const lastRevealFrame = revealFrames[revealFrames.length - 1] ?? revealStart;

  const multiplierRevealFrame = lastRevealFrame + revealSpacing;
  const actionRevealFrame = Math.min(
    multiplierRevealFrame + Math.round(durationInFrames * 0.16),
    durationInFrames - EXIT_FRAMES - 20
  );

  // Continuous scanning beam sweeps the panel — represents the system
  // watching the calendar live, independent of the discrete reveal beats.
  const sweepPeriod = fps * 2.6;
  const sweepT = (frame % sweepPeriod) / sweepPeriod;
  const beamY = sweepT * panelHeight;
  const beamOpacity = 0.9 * Math.sin(sweepT * Math.PI);

  // Multiplier count-up
  const multSpring = spring({
    frame: frame - multiplierRevealFrame,
    fps,
    from: 0,
    to: 1,
    config: { stiffness: 200, damping: 18 },
    durationInFrames: 22,
  });

  const numericMultiplier = parseFloat(multiplierValue) || 0;
  const multCountT = interpolate(
    frame,
    [multiplierRevealFrame, multiplierRevealFrame + 18],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }
  );
  const multDisplay = (numericMultiplier * multCountT).toFixed(1) + multiplierValue.replace(/[0-9.]/g, "");

  // Action banner
  const actionSpring = spring({
    frame: frame - actionRevealFrame,
    fps,
    from: 0,
    to: 1,
    config: { stiffness: 180, damping: 20 },
    durationInFrames: 20,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg, opacity: sceneOpacity }}>
      <AmbientBackground accent={accentColor} />

      {/* Eyebrow + scan status */}
      <div
        style={{
          position: "absolute",
          top: SAFE_ZONE.top,
          left: SAFE_ZONE.left,
          right: SAFE_ZONE.right,
          opacity: interpolate(frame, [0, ENTER_FRAMES], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        <div
          style={{
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: "0.2em",
            color: rgba(accentColor, 0.9),
            fontFamily: INTER,
            marginBottom: 14,
          }}
        >
          {eyebrow}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              backgroundColor: accentColor,
              opacity: 0.5 + 0.5 * Math.sin(frame / 6),
              boxShadow: `0 0 8px ${accentColor}`,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 24,
              color: "rgba(0,0,0,0.6)",
              fontFamily: JETBRAINS_MONO,
            }}
          >
            {scanLabel}
          </span>
        </div>
      </div>

      {/* Timeline panel */}
      <div
        style={{
          position: "absolute",
          top: PANEL_TOP,
          left: SAFE_ZONE.left,
          right: SAFE_ZONE.right,
          height: panelHeight,
          transform: `translateY(${interpolate(frame, [0, ENTER_FRAMES], [24, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
          opacity: interpolate(frame, [0, ENTER_FRAMES], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: ROW_GAP }}>
          {events.map((event, i) => (
            <EventRow
              key={i}
              event={event}
              index={i}
              revealFrame={revealFrames[i]}
              accent={accentColor}
              frame={frame}
              fps={fps}
            />
          ))}
        </div>

        {/* Scan beam overlay, clipped to the panel */}
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: 16, pointerEvents: "none" }}>
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: beamY - 2,
              height: 3,
              background: accentColor,
              opacity: beamOpacity,
              boxShadow: `0 0 24px 6px ${rgba(accentColor, 0.7)}`,
            }}
          />
        </div>
      </div>

      {/* Multiplier badge */}
      <div
        style={{
          position: "absolute",
          top: PANEL_TOP + panelHeight + MULTIPLIER_GAP,
          left: SAFE_ZONE.left,
          right: SAFE_ZONE.right,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 10,
          opacity: interpolate(multSpring, [0, 1], [0, 1]),
          transform: `scale(${0.85 + 0.15 * multSpring})`,
        }}
      >
        <div
          style={{
            fontSize: 88,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            color: accentColor,
            fontFamily: JETBRAINS_MONO,
            textShadow: `0 0 40px ${rgba(accentColor, 0.5)}`,
          }}
        >
          {multDisplay}
        </div>
        <div
          style={{
            fontSize: 24,
            color: "rgba(0,0,0,0.6)",
            fontFamily: INTER,
            textAlign: "center",
          }}
        >
          {multiplierLabel}
        </div>
      </div>

      {/* Dispatch action banner */}
      <div
        style={{
          position: "absolute",
          top: PANEL_TOP + panelHeight + MULTIPLIER_GAP + MULTIPLIER_BLOCK_HEIGHT + ACTION_GAP,
          left: SAFE_ZONE.left,
          right: SAFE_ZONE.right,
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "22px 26px",
          borderRadius: 16,
          backgroundColor: rgba(ACTION_COLOR, 0.08),
          border: `1px solid ${rgba(ACTION_COLOR, 0.35)}`,
          opacity: actionSpring,
          transform: `translateY(${interpolate(actionSpring, [0, 1], [20, 0])}px)`,
        }}
      >
        <span style={{ fontSize: 30, color: ACTION_COLOR, fontFamily: JETBRAINS_MONO, flexShrink: 0 }}>→</span>
        <span
          style={{
            fontSize: 26,
            fontWeight: 600,
            color: colors.textPrimary,
            fontFamily: INTER,
            lineHeight: 1.4,
          }}
        >
          {actionText}
        </span>
      </div>
    </AbsoluteFill>
  );
};
