import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GoogleMapsRevealSceneProps, GoogleMapsRoute } from "../types";
import { BE_VIETNAM_PRO, SAFE_ZONE } from "../styles";

// ---------------------------------------------------------------------------
// Scene timing — phase boundaries scale with the scene's actual duration
// rather than fixed frame counts. Authored duration_frames is only a
// pre-TTS estimate; main.py's tightening pass shrinks it to match the real
// synthesized audio (often to well under half the authored value), and
// phase 3 — the Maps route reveal, the entire payoff of this scene — needs
// to keep the majority of whatever time remains rather than being squeezed
// to nothing by fixed phase-1/phase-2 frame counts sized for the authored
// estimate.
// ---------------------------------------------------------------------------
function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

function computePhaseBounds(durationInFrames: number): { phase1End: number; phase2End: number } {
  const phase1End = Math.round(clamp(durationInFrames * 0.16, 14, 34));
  const phase2End = Math.round(clamp(durationInFrames * 0.38, phase1End + 18, 70));
  return { phase1End, phase2End };
}

// ---------------------------------------------------------------------------
// Color system — this scene always renders Google Maps' own light chrome,
// independent of the channel's global dark/light theme toggle.
// ---------------------------------------------------------------------------
const BG = "#FFFFFF";
const MAP_BG = "#F1F3F4";
const STREET = "#E8EAED";
const GREY_ROUTE = "#9AA0A6";
const PIN_RED = "#EA4335";
const TEXT_PRIMARY = "#202124";
const TEXT_SECONDARY = "#5F6368";
const PERSON_COLOR = "rgba(32,33,36,0.85)";
const PHONE_BEZEL = "#1c1c1e";

// Big (phase-3) phone frame, centered in the canvas
const BIG_PHONE_W = 460;
const BIG_PHONE_H = 900;
const BIG_PHONE_CX = 540;
const BIG_PHONE_CY = 760;

// Small (phase-1) held phone — sits near the character's raised hand
// (right-arm rotate(130) from (38,-116), see PersonHoldingPhone below).
const SMALL_PHONE_W = 70;
const SMALL_PHONE_H = 138;
const SMALL_PHONE_CX = 548;
const SMALL_PHONE_CY = 850;

const PERSON_CX = 540;
const PERSON_CY = 1000;

function springProgress(frame: number, fps: number, fromFrame: number, durationInFrames: number): number {
  return spring({
    frame: frame - fromFrame,
    fps,
    from: 0,
    to: 1,
    config: { stiffness: 120, damping: 20 },
    durationInFrames,
  });
}

// ---------------------------------------------------------------------------
// Person holding a phone — minimal standing silhouette, right arm bent up
// toward the small phone near the head (a "looking down at the screen" pose).
// ---------------------------------------------------------------------------
const PersonHoldingPhone: React.FC<{ opacity: number; bob: number }> = ({ opacity, bob }) => {
  if (opacity <= 0) return null;
  return (
    <svg
      style={{ position: "absolute", left: 0, top: 0, opacity }}
      width={1080}
      height={1920}
      viewBox="0 0 1080 1920"
    >
      <g transform={`translate(${PERSON_CX},${PERSON_CY + bob})`}>
        {/* Head */}
        <circle cx="0" cy="-152" r="30" fill={PERSON_COLOR} />
        {/* Torso */}
        <rect x="-30" y="-118" width="60" height="66" rx="12" fill={PERSON_COLOR} />
        {/* Left arm: idle, hangs down */}
        <g transform="translate(-38,-114) rotate(10)">
          <rect x="-7" y="0" width="14" height="56" rx="7" fill={PERSON_COLOR} />
        </g>
        {/* Right arm: bent up toward the phone near the head */}
        <g transform="translate(38,-116) rotate(130)">
          <rect x="-7" y="0" width="14" height="52" rx="7" fill={PERSON_COLOR} />
        </g>
        {/* Legs */}
        <g transform="translate(-14,-52) rotate(-4)">
          <rect x="-11" y="0" width="22" height="82" rx="11" fill={PERSON_COLOR} />
        </g>
        <g transform="translate(14,-52) rotate(4)">
          <rect x="-11" y="0" width="22" height="82" rx="11" fill={PERSON_COLOR} />
        </g>
      </g>
    </svg>
  );
};

// ---------------------------------------------------------------------------
// Google Maps route screen — rendered inside the phone once it has expanded.
// Screen-local canvas is 440×880 (BIG_PHONE_W/H minus the 10px bezel inset
// on each side).
// ---------------------------------------------------------------------------
const SELECTED_PATH_LENGTH = 680; // approximate cubic-bezier arc length, for the draw-in dash effect

const MapsUI: React.FC<{
  frame: number;
  fps: number;
  accent: string;
  rejectedRoute: GoogleMapsRoute;
  selectedRoute: GoogleMapsRoute;
  phaseStart: number;
  durationInFrames: number;
}> = ({ frame, fps, accent, rejectedRoute, selectedRoute, phaseStart, durationInFrames }) => {
  const p3Len = Math.max(20, durationInFrames - phaseStart);
  const f3 = (frac: number) => phaseStart + p3Len * frac;

  const bannerOpacity = interpolate(frame, [f3(0.02), f3(0.12)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const pinSpring = springProgress(frame, fps, f3(0.02), Math.round(p3Len * 0.18));
  const dotSpring = springProgress(frame, fps, f3(0.05), Math.round(p3Len * 0.18));

  const drawStart = f3(0.08);
  const drawEnd = f3(0.42);
  const drawProgress = interpolate(frame, [drawStart, drawEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const selectedBadgeSpring = springProgress(frame, fps, drawEnd, Math.round(p3Len * 0.15));

  const rejectedFadeStart = f3(0.42);
  const rejectedFadeEnd = f3(0.62);
  const rejectedOpacity = interpolate(frame, [rejectedFadeStart, rejectedFadeEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const xMarkSpring = springProgress(frame, fps, rejectedFadeEnd, Math.round(p3Len * 0.12));

  const sheetSpring = springProgress(frame, fps, f3(0.15), Math.round(p3Len * 0.25));

  const selectedLabel = `${selectedRoute.distance} • ${selectedRoute.duration}`;
  const rejectedLabel = `${rejectedRoute.distance} • ${rejectedRoute.duration}`;

  return (
    <>
      {/* Top banner */}
      <div
        style={{
          position: "absolute",
          top: 16,
          left: "50%",
          transform: "translateX(-50%)",
          opacity: bannerOpacity,
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "#fff",
          borderRadius: 999,
          padding: "8px 18px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.12)",
          whiteSpace: "nowrap",
        }}
      >
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: accent }} />
        <span style={{ fontSize: 15, fontWeight: 700, color: TEXT_PRIMARY, fontFamily: BE_VIETNAM_PRO }}>
          Google Maps đề xuất
        </span>
      </div>

      {/* Map area */}
      <div style={{ position: "absolute", top: 64, left: 0, right: 0, height: 710, background: MAP_BG, overflow: "hidden" }}>
        <svg width={440} height={710} viewBox="0 0 440 710" style={{ position: "absolute", inset: 0 }}>
          {/* Simplified street grid */}
          <g stroke={STREET} strokeWidth={3} opacity={0.9}>
            <line x1={0} y1={180} x2={440} y2={180} />
            <line x1={0} y1={360} x2={440} y2={360} />
            <line x1={0} y1={540} x2={440} y2={540} />
            <line x1={90} y1={0} x2={90} y2={710} />
            <line x1={220} y1={0} x2={220} y2={710} />
            <line x1={350} y1={0} x2={350} y2={710} />
          </g>

          {/* Rejected route: shorter, straighter, dashed grey */}
          <path
            d="M150,640 C190,440 230,240 300,90"
            fill="none"
            stroke={GREY_ROUTE}
            strokeWidth={5}
            strokeDasharray="10 8"
            strokeLinecap="round"
            opacity={rejectedOpacity * 0.85}
          />

          {/* Selected route: longer detour, solid blue, draws itself in */}
          <path
            d="M150,640 C390,520 390,220 300,90"
            fill="none"
            stroke={accent}
            strokeWidth={7}
            strokeLinecap="round"
            strokeDasharray={SELECTED_PATH_LENGTH}
            strokeDashoffset={SELECTED_PATH_LENGTH * (1 - drawProgress)}
          />

          {/* Destination pin */}
          <g transform={`translate(300,90) scale(${pinSpring})`}>
            <path d="M0,26 C-20,10 -20,-24 0,-24 C20,-24 20,10 0,26 Z" fill={PIN_RED} />
            <circle cx={0} cy={-10} r={8} fill="#fff" />
          </g>

          {/* User location dot */}
          <g transform="translate(150,640)" opacity={dotSpring}>
            <circle r={18 * dotSpring} fill={accent} opacity={0.18} />
            <circle r={9} fill={accent} />
            <circle r={3.5} fill="#fff" />
          </g>
        </svg>

        {/* Rejected route badge */}
        <div
          style={{
            position: "absolute",
            left: 105,
            top: 430,
            transform: `translate(-50%,-50%) scale(${rejectedOpacity})`,
            opacity: rejectedOpacity,
            background: "#fff",
            border: `1.5px solid ${GREY_ROUTE}`,
            borderRadius: 999,
            padding: "6px 12px",
            display: "flex",
            alignItems: "center",
            gap: 6,
            boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 700, color: TEXT_SECONDARY, fontFamily: BE_VIETNAM_PRO }}>
            {rejectedLabel}
          </span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: PIN_RED,
              opacity: xMarkSpring,
              transform: `scale(${xMarkSpring})`,
              display: "inline-block",
            }}
          >
            ✕
          </span>
        </div>

        {/* Selected route badge */}
        <div
          style={{
            position: "absolute",
            left: 355,
            top: 360,
            transform: `translate(-50%,-50%) scale(${selectedBadgeSpring})`,
            opacity: selectedBadgeSpring,
            background: accent,
            borderRadius: 999,
            padding: "7px 14px",
            display: "flex",
            alignItems: "center",
            gap: 6,
            boxShadow: `0 3px 10px ${accent}66`,
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 800, color: "#fff", fontFamily: BE_VIETNAM_PRO }}>
            {selectedLabel}
          </span>
          <span style={{ fontSize: 13, fontWeight: 900, color: "#fff" }}>✓</span>
        </div>
      </div>

      {/* Bottom sheet */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 106,
          background: "#fff",
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          boxShadow: "0 -6px 20px rgba(0,0,0,0.12)",
          transform: `translateY(${interpolate(sheetSpring, [0, 1], [80, 0])}px)`,
          opacity: sheetSpring,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
        }}
      >
        <span style={{ fontSize: 26, fontWeight: 800, color: TEXT_PRIMARY, fontFamily: BE_VIETNAM_PRO }}>
          {selectedLabel}
        </span>
        <span style={{ fontSize: 14, fontWeight: 500, color: TEXT_SECONDARY, fontFamily: BE_VIETNAM_PRO }}>
          Đường nhanh hơn
        </span>
      </div>
    </>
  );
};

// ---------------------------------------------------------------------------
// Main scene
// ---------------------------------------------------------------------------
export const GoogleMapsRevealScene: React.FC<GoogleMapsRevealSceneProps> = ({
  rejectedRoute,
  selectedRoute,
  headlineText,
  accentColor,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const accent = accentColor ?? "#1A73E8";

  const { phase1End, phase2End } = computePhaseBounds(durationInFrames);

  const EXIT_FRAMES = 10;
  const hasExitRoom = durationInFrames > phase1End + EXIT_FRAMES;
  const sceneOpacity = interpolate(
    frame,
    hasExitRoom ? [0, 8, durationInFrames - EXIT_FRAMES, durationInFrames] : [0, durationInFrames],
    hasExitRoom ? [0, 1, 1, 0] : [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Phase 1: person fades in, then out again once the phone takes over.
  const personFadeInEnd = Math.min(12, Math.round(phase1End * 0.4));
  const personFadeOutEnd = phase1End + Math.round((phase2End - phase1End) * 0.6);
  const personOpacity = interpolate(frame, [0, personFadeInEnd, phase1End, personFadeOutEnd], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const personBob = Math.sin(frame * 0.08) * 3;

  // Phase 2: phone scales+translates from the small held position to a
  // centered, full-size frame. Order matters: translate is listed first so
  // it applies last (outermost), shifting the already-scaled phone by a
  // literal pixel offset rather than a scaled one.
  const p2 = springProgress(frame, fps, phase1End, phase2End - phase1End);
  const dx = interpolate(p2, [0, 1], [SMALL_PHONE_CX - BIG_PHONE_CX, 0]);
  const dy = interpolate(p2, [0, 1], [SMALL_PHONE_CY - BIG_PHONE_CY, 0]);
  const scale = interpolate(p2, [0, 1], [SMALL_PHONE_W / BIG_PHONE_W, 1]);
  const rotation = interpolate(p2, [0, 1], [-10, 0]);

  const glowOpacity =
    interpolate(frame, [4, Math.max(5, phase1End * 0.7)], [0, 0.5], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }) *
    interpolate(frame, [phase1End, phase1End + 14], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Phase 3: Maps UI fades in as the phone finishes expanding.
  const screenContentOpacity = interpolate(frame, [Math.max(0, phase2End - 10), phase2End + 4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const headlineOpacity = interpolate(frame, [15, 32], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const headlineY = interpolate(frame, [15, 32], [16, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: BG, opacity: sceneOpacity }}>
      <PersonHoldingPhone opacity={personOpacity} bob={personBob} />

      <div
        style={{
          position: "absolute",
          left: BIG_PHONE_CX,
          top: BIG_PHONE_CY,
          width: BIG_PHONE_W,
          height: BIG_PHONE_H,
          marginLeft: -BIG_PHONE_W / 2,
          marginTop: -BIG_PHONE_H / 2,
          transform: `translate(${dx}px, ${dy}px) scale(${scale}) rotate(${rotation}deg)`,
        }}
      >
        {/* Ambient glow, phase 1 only — draws attention to the held phone */}
        <div
          style={{
            position: "absolute",
            inset: -36,
            borderRadius: BIG_PHONE_W,
            background: accent,
            opacity: glowOpacity,
            filter: "blur(36px)",
          }}
        />

        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 56,
            background: PHONE_BEZEL,
            border: "3px solid rgba(0,0,0,0.35)",
            overflow: "hidden",
            boxShadow: "0 24px 60px rgba(0,0,0,0.22)",
          }}
        >
          <div style={{ position: "absolute", inset: 10, borderRadius: 46, background: BG, overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, opacity: screenContentOpacity }}>
              <MapsUI
                frame={frame}
                fps={fps}
                accent={accent}
                rejectedRoute={rejectedRoute}
                selectedRoute={selectedRoute}
                phaseStart={phase2End}
                durationInFrames={durationInFrames}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Overlay headline — dark text on the scene's light background */}
      <div
        style={{
          position: "absolute",
          bottom: SAFE_ZONE.bottom + 90,
          left: SAFE_ZONE.left,
          right: SAFE_ZONE.right,
          textAlign: "center",
          opacity: headlineOpacity,
          transform: `translateY(${headlineY}px)`,
        }}
      >
        <span
          style={{
            fontSize: 38,
            fontWeight: 700,
            lineHeight: 1.25,
            color: TEXT_PRIMARY,
            fontFamily: BE_VIETNAM_PRO,
            letterSpacing: "-0.01em",
          }}
        >
          {headlineText}
        </span>
      </div>
    </AbsoluteFill>
  );
};
