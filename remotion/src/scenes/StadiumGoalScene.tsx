import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { StadiumGoalSceneProps } from "../types";
import { BE_VIETNAM_PRO, INTER } from "../styles";
import {
  cameraShake,
  clamp,
  FreezeFrameOverlay,
  ImpactFlash,
  phaseProgress,
  pointOnPolyline,
  RouteFollower,
  TextPunchIn,
} from "./cinematicPrimitives";

const W = 1080;
const H = 1920;

const background = "radial-gradient(circle at 50% 30%, #18355d 0%, #09101d 34%, #04070d 66%, #020204 100%)";

const hash = (seed: number) => {
  const value = Math.sin(seed * 91.73 + 17.19) * 43758.5453;
  return value - Math.floor(value);
};

const CrowdBand: React.FC<{
  frame: number;
  y: number;
  accent: string;
  pulse: number;
  height?: number;
}> = ({ frame, y, accent, pulse, height = 110 }) => {
  const rows = 4;
  const cols = 20;
  return (
    <g>
      {Array.from({ length: rows * cols }, (_, i) => {
        const row = Math.floor(i / cols);
        const col = i % cols;
        const cx = 42 + col * 50 + (row % 2) * 24;
        const cy = y + row * 20 + Math.sin(frame * 0.1 + i) * pulse * 4;
        const r = 5 + (i % 3);
        return <circle key={i} cx={cx} cy={cy} r={r} fill={i % 5 === 0 ? accent : "rgba(255,255,255,0.8)"} opacity={0.12 + pulse * 0.12} />;
      })}
      <rect x={0} y={y - 10} width={W} height={height} fill="rgba(0,0,0,0.18)" />
    </g>
  );
};

const Pitch: React.FC<{ goalOnTop: boolean; mode: string; frame: number; accent: string; secondary: string; ballPos: { x: number; y: number } | null; impact: number }> = ({
  goalOnTop,
  mode,
  frame,
  accent,
  secondary,
  ballPos,
  impact,
}) => {
  const topY = goalOnTop ? 470 : 980;
  const bottomY = goalOnTop ? 1540 : 430;
  const pitchColor = goalOnTop ? "#1f4e33" : "#214b30";
  const horizon = goalOnTop ? 400 : 1500;

  const zoom = mode === "low_pitch" ? 1.08 : mode === "ball_follow" ? 1.12 : mode === "crowd_push" ? 0.95 : 1;
  const xShift = mode === "ball_follow" && ballPos ? clamp(540 - ballPos.x, -110, 110) * 0.5 : 0;
  const yShift = mode === "ball_follow" && ballPos ? clamp(1180 - ballPos.y, -90, 90) * 0.25 : 0;

  const field = goalOnTop
    ? [
        { x: 128, y: 1450 },
        { x: 948, y: 1450 },
        { x: 720, y: 380 },
        { x: 360, y: 380 },
      ]
    : [
        { x: 360, y: 1540 },
        { x: 720, y: 1540 },
        { x: 948, y: 450 },
        { x: 128, y: 450 },
      ];

  const goalY = goalOnTop ? 420 : 1490;
  const netY0 = goalOnTop ? 432 : 1478;
  const netY1 = goalOnTop ? 382 : 1528;
  const strikerY = goalOnTop ? 1510 : 440;
  const keeperY = goalOnTop ? 410 : 1510;

  const ballPath = goalOnTop
    ? [
        { x: 540, y: strikerY - 28 },
        { x: 602, y: 1360 },
        { x: 572, y: 980 },
        { x: 540, y: goalY + 10 },
      ]
    : [
        { x: 540, y: strikerY + 28 },
        { x: 602, y: 560 },
        { x: 568, y: 980 },
        { x: 540, y: goalY - 12 },
      ];

  const pitchOpacity = interpolate(frame, [0, 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const netShake = Math.sin(frame * 0.4) * impact * 10;
  const netPull = impact * 26;

  return (
    <g transform={`translate(${xShift}, ${yShift}) scale(${zoom})`}>
      <path d={goalOnTop ? "M0 1530 L1080 1530 L1080 1920 L0 1920 Z" : "M0 0 L1080 0 L1080 390 L0 390 Z"} fill="rgba(0,0,0,0.24)" />
      <path d={`M 120 ${goalOnTop ? 1472 : 478} L 960 ${goalOnTop ? 1472 : 478} L 890 ${goalOnTop ? 560 : 1390} L 190 ${goalOnTop ? 560 : 1390} Z`} fill="url(#pitchGrad)" opacity={pitchOpacity} />
      <path d={`M 540 ${goalOnTop ? 560 : 1390} L 540 ${goalOnTop ? 1450 : 470}`} stroke="rgba(255,255,255,0.18)" strokeWidth={3} />
      <circle cx={540} cy={980} r={160} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={3} />
      <circle cx={540} cy={980} r={7} fill="rgba(255,255,255,0.65)" />

      <path
        d={`M 315 ${horizon} L 765 ${horizon} L 880 ${goalOnTop ? 1480 : 420} L 200 ${goalOnTop ? 1480 : 420} Z`}
        fill={pitchColor}
        opacity={0.96}
      />

      <g opacity={0.65}>
        <path d={`M 270 ${goalOnTop ? 1478 : 422} L 810 ${goalOnTop ? 1478 : 422}`} stroke="rgba(255,255,255,0.15)" strokeWidth={4} />
        <path d={`M 260 ${goalOnTop ? 1488 : 412} L 820 ${goalOnTop ? 1488 : 412}`} stroke="rgba(255,255,255,0.08)" strokeWidth={2} />
      </g>

      <g>
        <rect x={410} y={goalOnTop ? 400 : 1492} width={260} height={18} rx={9} fill="rgba(255,255,255,0.92)" opacity={0.9} />
        <rect x={414} y={goalOnTop ? 404 : 1496} width={252} height={10} rx={5} fill={accent} opacity={0.7} />
      </g>

      <g transform={`translate(540, ${strikerY})`}>
        <circle cx={0} cy={-86} r={24} fill="rgba(255,255,255,0.95)" />
        <path d="M -24 -60 C -22 -88, 22 -88, 24 -60 L 22 -12 C 18 14, -18 14, -22 -12 Z" fill="rgba(255,255,255,0.95)" />
        <path d={`M -16 -18 L -66 ${goalOnTop ? -2 : 8} L -60 ${goalOnTop ? 18 : 28} L -6 0 Z`} fill="rgba(255,255,255,0.8)" />
        <path d={`M 16 -18 L 38 ${goalOnTop ? -42 : 46} L 50 ${goalOnTop ? -28 : 62} L 8 2 Z`} fill="rgba(255,255,255,0.85)" />
        <rect x={-15} y={18} width={12} height={74} rx={6} fill="rgba(255,255,255,0.95)" />
        <rect x={3} y={18} width={12} height={74} rx={6} fill="rgba(255,255,255,0.95)" />
      </g>

      <g transform={`translate(540, ${keeperY}) scale(${1 + impact * 0.06})`}>
        <circle cx={0} cy={-72} r={22} fill="rgba(255,255,255,0.95)" />
        <path d="M -24 -44 C -24 -72, 24 -72, 24 -44 L 18 24 C 18 44, -18 44, -18 24 Z" fill="rgba(255,255,255,0.95)" />
        <path d="M -20 -12 L -66 -26 L -72 -10 L -30 12 Z" fill="rgba(255,255,255,0.8)" />
        <path d="M 20 -12 L 68 -20 L 74 -6 L 30 14 Z" fill="rgba(255,255,255,0.8)" />
      </g>

      <g transform={`translate(540, ${goalY})`}>
        <rect x={-128} y={goalOnTop ? -14 : 0} width={256} height={14} rx={7} fill="rgba(255,255,255,0.92)" />
        <rect x={-128} y={goalOnTop ? -14 : 0} width={14} height={120} rx={7} fill="rgba(255,255,255,0.92)" />
        <rect x={114} y={goalOnTop ? -14 : 0} width={14} height={120} rx={7} fill="rgba(255,255,255,0.92)" />
        <g transform={`translate(0, ${goalOnTop ? 0 : 120}) scale(1, ${1 + impact * 0.08})`}>
          {Array.from({ length: 7 }, (_, i) => (
            <line key={i} x1={-116 + i * 38} y1={0} x2={-96 + i * 38} y2={102} stroke="rgba(255,255,255,0.82)" strokeWidth={2} />
          ))}
          {Array.from({ length: 6 }, (_, i) => (
            <line key={`h-${i}`} x1={-120} y1={12 + i * 16} x2={120} y2={12 + i * 16} stroke="rgba(255,255,255,0.72)" strokeWidth={2} />
          ))}
        </g>
      </g>

      {ballPos ? (
        <g transform={`translate(${ballPos.x}, ${ballPos.y})`}>
          <circle r={28 + impact * 10} fill={accent} opacity={0.16} />
          <circle r={14 + impact * 2} fill={accent} />
          <circle r={5} fill="#fff" />
        </g>
      ) : null}

      <g opacity={0.35 + impact * 0.65}>
        {Array.from({ length: 18 }, (_, i) => {
          const x = 56 + i * 55 + (i % 2) * 18;
          const y = goalOnTop ? 1700 + (i % 4) * 34 : 100 + (i % 4) * 34;
          const sway = Math.sin(frame * 0.25 + i) * impact * 10;
          return <circle key={i} cx={x} cy={y + sway} r={5 + (i % 3)} fill={i % 5 === 0 ? accent : "rgba(255,255,255,0.8)"} />;
        })}
      </g>

      <path
        d={goalOnTop ? "M0 1490 Q 540 1450 1080 1490" : "M0 430 Q 540 470 1080 430"}
        fill="none"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth={4}
      />

      <g transform={`translate(${540}, ${goalOnTop ? 380 : 1520})`}>
        <circle cx={0} cy={0} r={160 + impact * 40} fill={accent} opacity={0.08 + impact * 0.18} />
        <circle cx={0} cy={0} r={220 + impact * 30} fill="none" stroke={secondary} strokeWidth={2} strokeDasharray="12 10" opacity={0.3 + impact * 0.3} />
      </g>

      <path
        d={goalOnTop ? "M 332 1420 C 390 1360, 430 1220, 520 1040" : "M 332 500 C 390 560, 430 700, 520 880"}
        fill="none"
        stroke={accent}
        strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray="14 10"
        opacity={0.5 + impact * 0.35}
      />
    </g>
  );
};

export const StadiumGoalScene: React.FC<StadiumGoalSceneProps> = ({
  phaseHint = "build_up",
  cameraMode = "behind_striker",
  headline = "Khoảnh khắc phải nổ",
  accentWord = "nổ",
  subtext = "Một cú sút thật sự biến thành năng lượng, rồi cướp luôn nhịp xem của cả khán đài.",
  accentColor = "#00ff41",
  secondaryColor = "#61dafb",
  scoreboard = { homeLabel: "NHÀ", awayLabel: "ĐỘI KHÁCH", homeScore: 1, awayScore: 0, minute: "90+3'" },
  strikerLabel = "STRIKER",
  keeperLabel = "KEEPER",
  crowdLabel = "CROWD",
  confetti = true,
  freezeLabel = "FREEZE GOAL",
  ballLabel = "BÓNG",
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const duration = Math.max(1, durationInFrames);

  const buildEnd = Math.round(duration * 0.18);
  const runEnd = Math.round(duration * 0.34);
  const shotEnd = Math.round(duration * 0.46);
  const flightEnd = Math.round(duration * 0.66);
  const impactEnd = Math.round(duration * 0.78);
  const freezeStart = Math.round(duration * 0.84);
  const goalOnTop = cameraMode !== "behind_goal";

  const build = phaseProgress(frame, 0, buildEnd);
  const run = phaseProgress(frame, buildEnd, runEnd - buildEnd);
  const shot = phaseProgress(frame, runEnd, shotEnd - runEnd);
  const flight = phaseProgress(frame, shotEnd, flightEnd - shotEnd);
  const impact = phaseProgress(frame, flightEnd, impactEnd - flightEnd, 0, 1);
  const crowd = phaseProgress(frame, impactEnd - 4, freezeStart - impactEnd);

  const runLead = goalOnTop ? interpolate(run, [0, 1], [0, -84], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : interpolate(run, [0, 1], [0, 84], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const strikerY = goalOnTop ? 1510 + runLead : 440 + runLead;
  const ballPath = goalOnTop
    ? [
        { x: 540, y: strikerY - 28 },
        { x: 610, y: 1340 },
        { x: 570, y: 980 },
        { x: 540, y: 420 },
      ]
    : [
        { x: 540, y: strikerY + 28 },
        { x: 610, y: 580 },
        { x: 570, y: 980 },
        { x: 540, y: 1490 },
      ];

  const ball = frame < shotEnd ? pointOnPolyline([ballPath[0], ballPath[0]], 0) : pointOnPolyline(ballPath, flight);
  const ballTrail = frame < shotEnd ? ballPath[0] : ball;

  const camera = cameraShake(frame, shotEnd + 4, cameraMode === "crowd_push" ? 14 : 10, 17);
  const crowdPulse = crowd + (phaseHint === "crowd_explosion" ? 0.2 : 0);
  const netImpact = clamp(impact * 1.1 + Math.sin(frame * 0.5) * impact * 0.08, 0, 1);
  const freeze = frame >= freezeStart;

  return (
    <AbsoluteFill style={{ background, overflow: "hidden" }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="pitchGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2f7c43" />
            <stop offset="100%" stopColor="#154123" />
          </linearGradient>
          <filter id="softGlow" x="-200%" y="-200%" width="400%" height="400%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
        </defs>

        {Array.from({ length: 38 }, (_, i) => (
          <circle
            key={i}
            cx={32 + hash(i + 4) * 1010}
            cy={48 + hash(i + 64) * 420}
            r={0.8 + hash(i + 104) * 1.6}
            fill="#d6efff"
            opacity={0.18}
          />
        ))}

        <g transform={`translate(${camera.x}, ${camera.y})`}>
          <CrowdBand frame={frame} y={goalOnTop ? 220 : 1680} accent={accentColor} pulse={crowdPulse} height={128} />
          <CrowdBand frame={frame} y={goalOnTop ? 1648 : 382} accent={secondaryColor} pulse={crowdPulse * 0.8} height={120} />

          <Pitch
            goalOnTop={goalOnTop}
            mode={cameraMode}
            frame={frame}
            accent={accentColor}
            secondary={secondaryColor}
            ballPos={frame >= shotEnd ? ball : null}
            impact={netImpact}
          />

          <g opacity={0.8 + build * 0.2}>
            <text x={540} y={goalOnTop ? 430 : 1490} textAnchor="middle" fontSize={18} fontWeight={800} style={{ fill: "rgba(255,255,255,0.72)", fontFamily: INTER, letterSpacing: "0.15em" }}>
              {crowdLabel}
            </text>
          </g>

          <RouteFollower
            frame={frame}
            startFrame={shotEnd - 6}
            durationFrames={Math.max(24, flightEnd - shotEnd + 14)}
            path={ballPath}
            color={accentColor}
            trailColor={secondaryColor}
            radius={14}
            trailCount={6}
            label={frame >= shotEnd ? ballLabel : undefined}
            labelColor={accentColor}
          />

          <g transform={`translate(${540}, ${goalOnTop ? 422 : 1490})`}>
            <circle cx={0} cy={0} r={176 + netImpact * 46} fill={accentColor} opacity={0.1 + netImpact * 0.16} filter="url(#softGlow)" />
          </g>
        </g>

        <ImpactFlash frame={frame} startFrame={flightEnd - 4} color={accentColor} strength={1} />
        <FreezeFrameOverlay frame={frame} startFrame={freezeStart} label={freezeLabel} color={secondaryColor} />

        {confetti && frame >= impactEnd ? (
          <g opacity={clamp((frame - impactEnd) / 28, 0, 1)}>
            {Array.from({ length: 52 }, (_, i) => {
              const seed = i * 12.31;
              const x = 120 + hash(seed + 1) * 840;
              const y = 220 + hash(seed + 2) * 960;
              const size = 3 + hash(seed + 3) * 6;
              const drift = Math.sin(frame * 0.2 + i) * 14;
              return <rect key={i} x={x + drift} y={y + Math.cos(frame * 0.18 + i) * 10} width={size} height={size * 1.6} rx={1.5} fill={i % 3 === 0 ? accentColor : secondaryColor} />;
            })}
          </g>
        ) : null}

        <g opacity={netImpact * 0.92}>
          <text x={540} y={320} textAnchor="middle" fontSize={58} fontWeight={900} style={{ fill: "#fff", fontFamily: BE_VIETNAM_PRO, letterSpacing: "0.06em" }}>
            GOAL
          </text>
          <text x={540} y={370} textAnchor="middle" fontSize={20} fontWeight={700} style={{ fill: "rgba(255,255,255,0.72)", fontFamily: INTER, letterSpacing: "0.2em" }}>
            {scoreboard.homeLabel ?? "HOME"} {scoreboard.homeScore ?? 0} - {scoreboard.awayScore ?? 0} {scoreboard.awayLabel ?? "AWAY"}
          </text>
        </g>
      </svg>

      <div style={{ position: "absolute", top: 100, left: 90, right: 90, zIndex: 20 }}>
        <TextPunchIn frame={frame} headline={headline} accentWord={accentWord} subtext={subtext} accentColor={accentColor} align="center" />
      </div>

      <div
        style={{
          position: "absolute",
          left: 94,
          right: 94,
          top: 210,
          display: "flex",
          justifyContent: "center",
          gap: 12,
          flexWrap: "wrap",
          zIndex: 19,
          opacity: interpolate(frame, [0, 24], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        <div style={{ padding: "10px 16px", borderRadius: 999, background: "rgba(0,0,0,0.35)", color: "#fff", fontFamily: INTER, fontWeight: 800, fontSize: 16 }}>
          {scoreboard.minute ?? "90+3'"}
        </div>
        <div style={{ padding: "10px 16px", borderRadius: 999, background: "rgba(255,255,255,0.08)", color: "#fff", fontFamily: INTER, fontWeight: 800, fontSize: 16 }}>
          {strikerLabel}
        </div>
        <div style={{ padding: "10px 16px", borderRadius: 999, background: "rgba(255,255,255,0.08)", color: "#fff", fontFamily: INTER, fontWeight: 800, fontSize: 16 }}>
          {keeperLabel}
        </div>
      </div>
    </AbsoluteFill>
  );
};
