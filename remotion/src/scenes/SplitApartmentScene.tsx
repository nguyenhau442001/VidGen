import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { SplitApartmentSceneProps, SplitApartmentSide, SplitApartmentTimelineEvent } from "../types";
import { BE_VIETNAM_PRO, INTER } from "../styles";
import {
  cameraShake,
  ImpactFlash,
  phaseProgress,
  SoundWaveVisual,
  SplitScreenDivider,
  TextPunchIn,
} from "./cinematicPrimitives";

const W = 1080;
const H = 1920;
const MID = W / 2;

const DEFAULT_LEFT: SplitApartmentSide = {
  label: "Căn hộ A",
  hasRemote: false,
  hasDrink: true,
  hasSnack: true,
  accentColor: "#00ff41",
  couchColor: "#203143",
  screenLabel: "LIVE",
};

const DEFAULT_RIGHT: SplitApartmentSide = {
  label: "Căn hộ B",
  hasRemote: true,
  hasDrink: true,
  hasSnack: true,
  accentColor: "#61dafb",
  couchColor: "#2e2b3f",
  screenLabel: "LIVE+5s",
};

const DEFAULT_TIMELINE: SplitApartmentTimelineEvent[] = [
  { frame: 0, label: "Bóng vào", side: "left", emphasis: "impact" },
  { frame: 12, label: "Hét trước", side: "left", emphasis: "warning" },
  { frame: 28, label: "Âm qua tường", side: "both", emphasis: "warning" },
  { frame: 48, label: "TV giữ sẵn", side: "right", emphasis: "calm" },
  { frame: 72, label: "Bên kia mới thấy", side: "right", emphasis: "impact" },
];

const hash = (seed: number) => {
  const value = Math.sin(seed * 91.73 + 17.19) * 43758.5453;
  return value - Math.floor(value);
};

const Silhouette: React.FC<{
  frame: number;
  mood: SplitApartmentSide["reaction"];
  accent: string;
  x: number;
  y: number;
}> = ({ frame, mood, accent, x, y }) => {
  const cheer = mood === "cheering" ? spring({ frame, fps: 30, config: { stiffness: 180, damping: 14 } }) : 0.35;
  const startled = mood === "startled" ? interpolate(frame, [0, 20, 40], [0.1, 1, 0.55], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
  const frozen = mood === "frozen" ? 0.38 : 1;
  const lift = mood === "cheering" ? -8 * cheer : 0;
  const lean = mood === "startled" ? -0.12 * startled : 0;
  const armUp = mood === "cheering" ? 18 + cheer * 24 : mood === "startled" ? 8 : 0;
  const glow = mood === "cheering" || mood === "startled" ? 0.22 + cheer * 0.12 : 0;

  return (
    <g transform={`translate(${x}, ${y + lift}) rotate(${lean * 55}) scale(${0.95 + cheer * 0.05})`} opacity={frozen}>
      <circle cx={0} cy={-72} r={22} fill="rgba(255,255,255,0.92)" />
      <path
        d="M -25 -44 C -22 -74, 22 -74, 25 -44 L 20 24 C 18 48, -18 48, -20 24 Z"
        fill="rgba(255,255,255,0.92)"
      />
      <path
        d={`M -16 -18 L -42 ${armUp} L -34 ${armUp + 24} L -6 0 Z`}
        fill="rgba(255,255,255,0.82)"
      />
      <path
        d={`M 16 -18 L 38 ${mood === "cheering" ? -6 : 4} L 30 ${mood === "cheering" ? 16 : 24} L 6 2 Z`}
        fill="rgba(255,255,255,0.82)"
      />
      <rect x={-15} y={30} width={12} height={60} rx={6} fill="rgba(255,255,255,0.92)" />
      <rect x={3} y={30} width={12} height={60} rx={6} fill="rgba(255,255,255,0.92)" />
      <circle cx={-4} cy={-72} r={31} fill={accent} opacity={glow} />
    </g>
  );
};

const CoffeeTable: React.FC<{
  frame: number;
  x: number;
  y: number;
  accent: string;
  side: "left" | "right";
  activeShake: number;
  hasRemote?: boolean;
  hasDrink?: boolean;
  hasSnack?: boolean;
}> = ({ frame, x, y, accent, side, activeShake, hasRemote, hasDrink, hasSnack }) => {
  const jitter = cameraShake(frame, activeShake, side === "left" ? 3 : 8, side === "left" ? 9 : 27);
  return (
    <g transform={`translate(${x + jitter.x}, ${y + jitter.y})`}>
      <rect x={-102} y={0} width={204} height={22} rx={11} fill="rgba(0,0,0,0.22)" />
      {hasDrink ? (
        <g transform={`translate(-58, -16) rotate(${side === "left" ? -3 : 6})`}>
          <rect x={-10} y={0} width={20} height={28} rx={6} fill="#f7f1df" />
          <rect x={-8} y={4} width={16} height={16} rx={5} fill={accent} opacity={0.2} />
        </g>
      ) : null}
      {hasSnack ? (
        <g transform={`translate(4, -14) rotate(${side === "left" ? 10 : -7})`}>
          <ellipse cx={0} cy={0} rx={20} ry={12} fill="#d6b07f" />
          <ellipse cx={-8} cy={-4} rx={7} ry={5} fill="#f2d6a1" />
          <ellipse cx={8} cy={-1} rx={8} ry={5} fill="#f2d6a1" />
        </g>
      ) : null}
      {hasRemote ? (
        <g transform={`translate(62, -20) rotate(${side === "left" ? 18 : -22})`}>
          <rect x={-8} y={0} width={16} height={42} rx={8} fill="#1b1f2e" />
          <circle cx={0} cy={12} r={2.6} fill={accent} />
        </g>
      ) : null}
    </g>
  );
};

const ApartmentTV: React.FC<{
  frame: number;
  x: number;
  y: number;
  accent: string;
  state: SplitApartmentSide["tvState"];
  label: string;
  roomSide: "left" | "right";
  goalFrame: number;
  catchupFrame: number;
}> = ({ frame, x, y, accent, state, label, roomSide, goalFrame, catchupFrame }) => {
  const pulse = roomSide === "left" ? phaseProgress(frame, goalFrame - 4, 18) : phaseProgress(frame, catchupFrame - 8, 18);
  const liveBall = roomSide === "left"
    ? interpolate(frame, [goalFrame - 32, goalFrame + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : interpolate(frame, [goalFrame - 6, catchupFrame + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const buffer = roomSide === "right" ? interpolate(frame, [goalFrame - 40, catchupFrame], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;

  const screenState = state ?? (roomSide === "left" ? (frame > goalFrame ? "goal" : "live") : frame > catchupFrame ? "goal" : "buffering");

  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x={-110} y={-76} width={220} height={138} rx={18} fill="#161b28" stroke="rgba(255,255,255,0.2)" strokeWidth={3} />
      <rect x={-96} y={-62} width={192} height={110} rx={12} fill="url(#tvScreenGrad)" />
      <rect x={-52} y={62} width={104} height={10} rx={5} fill="rgba(255,255,255,0.14)" />
      {screenState === "buffering" || screenState === "delay" ? (
        <g transform="translate(0, -6)">
          <circle cx={0} cy={0} r={30} fill="none" stroke={accent} strokeWidth={4} strokeDasharray="16 10" opacity={0.9} />
          <text x={0} y={8} textAnchor="middle" fontSize={18} fontWeight={800} style={{ fill: "#fff", fontFamily: INTER }}>
            {screenState === "delay" ? "TRỄ" : label}
          </text>
          <text x={0} y={34} textAnchor="middle" fontSize={14} fontWeight={700} style={{ fill: "rgba(255,255,255,0.7)", fontFamily: INTER }}>
            +{Math.max(1, Math.round(buffer * 5))}s
          </text>
        </g>
      ) : null}
      {screenState === "live" || screenState === "goal" || screenState === "replay" ? (
        <g>
          <rect x={-96} y={-62} width={192} height={110} rx={12} fill={screenState === "goal" ? "rgba(255,255,255,0.94)" : "rgba(16,26,42,1)"} />
          <path d="M -90 -4 H 90" stroke="rgba(255,255,255,0.16)" strokeWidth={2} />
          <path d="M -52 2 C -30 -20, 30 -20, 52 2" fill="none" stroke={accent} strokeWidth={5} opacity={0.6} />
          <circle cx={-36 + liveBall * 54} cy={-8 + Math.sin(frame * 0.18) * 4} r={screenState === "goal" ? 10 : 8} fill={accent} />
          <path d="M 42 -36 L 42 26 M 42 -36 H 74 M 42 -6 H 74 M 42 26 H 74" stroke="rgba(255,255,255,0.8)" strokeWidth={2} opacity={0.6} />
          <text x={0} y={-20} textAnchor="middle" fontSize={18} fontWeight={900} style={{ fill: screenState === "goal" ? "#0a0a0f" : "#fff", fontFamily: BE_VIETNAM_PRO }}>
            {screenState === "goal" ? "GOAL" : screenState === "replay" ? "REPLAY" : label}
          </text>
          {screenState === "goal" ? (
            <circle cx={-48} cy={-10} r={22} fill={accent} opacity={0.18 * pulse} />
          ) : null}
        </g>
      ) : null}
      {screenState === "freeze" ? (
        <g>
          <rect x={-96} y={-62} width={192} height={110} rx={12} fill="rgba(255,255,255,0.92)" />
          <text x={0} y={-10} textAnchor="middle" fontSize={22} fontWeight={900} style={{ fill: "#0a0a0f", fontFamily: BE_VIETNAM_PRO }}>
            FREEZE
          </text>
        </g>
      ) : null}
    </g>
  );
};

const ApartmentRoom: React.FC<{
  frame: number;
  side: "left" | "right";
  config: SplitApartmentSide;
  cameraJitter: { x: number; y: number };
  goalFrame: number;
  catchupFrame: number;
  waveHitFrame: number;
  roomPulse: number;
}> = ({ frame, side, config, cameraJitter, goalFrame, catchupFrame, waveHitFrame, roomPulse }) => {
  const x0 = side === "left" ? 0 : MID;
  const accent = config.accentColor ?? (side === "left" ? "#00ff41" : "#61dafb");
  const roomTint = side === "left" ? "rgba(40, 82, 42, 0.28)" : "rgba(24, 42, 76, 0.3)";
  const wallTint = side === "left" ? "rgba(29, 38, 43, 0.96)" : "rgba(23, 22, 38, 0.96)";
  const reaction = config.reaction ?? (side === "left" ? "cheering" : "watching");

  return (
    <g transform={`translate(${x0 + cameraJitter.x * (side === "left" ? -0.2 : 0.2)}, ${cameraJitter.y})`}>
      <defs>
        <linearGradient id={`roomGrad-${side}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={wallTint} />
          <stop offset="100%" stopColor={roomTint} />
        </linearGradient>
      </defs>
      <rect x={0} y={320} width={MID} height={1260} fill={`url(#roomGrad-${side})`} />
      <path d={`M 0 320 H ${MID} V 1580 H 0 Z`} fill="url(#roomGrad-left)" opacity={0} />

      <rect x={0} y={1320} width={MID} height={260} fill="rgba(0,0,0,0.22)" />
      <rect x={88} y={1468} width={214} height={40} rx={20} fill="rgba(255,255,255,0.06)" />
      <rect x={92} y={1402} width={172} height={20} rx={10} fill="rgba(255,255,255,0.08)" />

      <g transform={`translate(${MID / 2}, 460)`}>
        <rect x={-182} y={-80} width={364} height={210} rx={26} fill="rgba(0,0,0,0.24)" stroke="rgba(255,255,255,0.12)" strokeWidth={2} />
        <rect x={-164} y={-62} width={328} height={174} rx={18} fill="url(#tvScreenGrad)" />
        <ApartmentTV
          frame={frame}
          x={0}
          y={6}
          accent={accent}
          state={config.tvState}
          label={config.screenLabel ?? (side === "left" ? "LIVE" : "LIVE+5s")}
          roomSide={side}
          goalFrame={goalFrame}
          catchupFrame={catchupFrame}
        />
        <g opacity={0.12}>
          <rect x={-160} y={-58} width={320} height={166} rx={16} fill="none" stroke="#fff" />
        </g>
        <text x={0} y={-106} textAnchor="middle" fontSize={22} fontWeight={900} style={{ fill: "#fff", fontFamily: INTER, letterSpacing: "0.08em" }}>
          {config.label}
        </text>
      </g>

      <g transform={`translate(${MID / 2}, 1260)`}>
        <rect x={-186} y={0} width={372} height={120} rx={22} fill="rgba(255,255,255,0.08)" />
        <rect x={-180} y={12} width={360} height={96} rx={18} fill={config.couchColor ?? "rgba(36,48,70,0.85)"} />
        <rect x={-168} y={24} width={336} height={74} rx={16} fill="rgba(255,255,255,0.05)" />
      </g>

      <Silhouette frame={frame} mood={reaction} accent={accent} x={MID / 2 - 36} y={1250} />
      <CoffeeTable
        frame={frame}
        x={MID / 2}
        y={1328}
        accent={accent}
        side={side}
        activeShake={waveHitFrame}
        hasRemote={config.hasRemote}
        hasDrink={config.hasDrink}
        hasSnack={config.hasSnack}
      />

      {config.label ? (
        <text
          x={MID / 2}
          y={1738}
          textAnchor="middle"
          fontSize={18}
          fontWeight={700}
          style={{ fill: "rgba(255,255,255,0.72)", fontFamily: INTER, letterSpacing: "0.12em" }}
        >
          {config.label}
        </text>
      ) : null}
      {reaction === "startled" ? (
        <text x={MID / 2} y={1190} textAnchor="middle" fontSize={42} fontWeight={900} style={{ fill: accent, fontFamily: BE_VIETNAM_PRO }}>
          ỦA?
        </text>
      ) : null}
      {reaction === "cheering" ? (
        <text x={MID / 2} y={1190} textAnchor="middle" fontSize={42} fontWeight={900} style={{ fill: accent, fontFamily: BE_VIETNAM_PRO }}>
          VÀO!
        </text>
      ) : null}
      {frame >= waveHitFrame && side === "right" ? (
        <text x={MID / 2} y={1190} textAnchor="middle" fontSize={38} fontWeight={900} style={{ fill: "#fff", fontFamily: BE_VIETNAM_PRO, opacity: roomPulse }}>
          HỠI ÔI
        </text>
      ) : null}
    </g>
  );
};

export const SplitApartmentScene: React.FC<SplitApartmentSceneProps> = ({
  preset = "shockwave_hook",
  headline = "Hai TV, hai nhịp khác nhau",
  accentWord = "khác nhau",
  subtext = "Một bên hét trước, một bên vẫn còn buffer.",
  accentColor = "#61dafb",
  cameraMode = "static",
  shoutSide = "left",
  leftApartment,
  rightApartment,
  timeline,
  checklist,
  wallLabel = "TƯỜNG MỎNG",
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sceneDuration = Math.max(1, durationInFrames);
  const goalFrame = Math.round(sceneDuration * (preset === "delayed_goal" ? 0.42 : 0.34));
  const waveHitFrame = Math.round(sceneDuration * 0.45);
  const catchupFrame = Math.round(sceneDuration * 0.66);
  const closeFrame = Math.round(sceneDuration * 0.86);

  const left = { ...DEFAULT_LEFT, ...leftApartment };
  const right = { ...DEFAULT_RIGHT, ...rightApartment };
  const pan = cameraMode === "pan" ? interpolate(frame, [0, sceneDuration], [-32, 28], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
  const shake = cameraShake(frame, waveHitFrame, preset === "neighbor_alert_callback" ? 14 : 10, 7);
  const cameraJitter = { x: pan + shake.x, y: shake.y };

  const leftReaction = frame < goalFrame ? (shoutSide === "left" ? "cheering" : "calm") : frame < waveHitFrame ? "cheering" : "frozen";
  const rightReaction = frame < waveHitFrame ? "watching" : frame < catchupFrame ? "startled" : "cheering";

  const leftConfig: SplitApartmentSide = {
    ...left,
    reaction: left.reaction ?? leftReaction,
    tvState: left.tvState ?? (frame < goalFrame ? "live" : frame < closeFrame ? "goal" : "freeze"),
    screenLabel: left.screenLabel ?? "LIVE",
  };
  const rightConfig: SplitApartmentSide = {
    ...right,
    reaction: right.reaction ?? rightReaction,
    tvState: right.tvState ?? (frame < waveHitFrame ? "buffering" : frame < catchupFrame ? "delay" : "goal"),
    screenLabel: right.screenLabel ?? "LIVE+5s",
  };

  const resolvedTimeline = (timeline?.length ? timeline : DEFAULT_TIMELINE).map((item) => ({
    ...item,
    frame: Math.min(sceneDuration - 1, Math.max(0, item.frame)),
  }));

  const checklistItems = checklist ?? ["Một căn đã biết trước", "Một căn vẫn còn trễ", "TV giữ vài giây để tránh đứng hình"];
  const checklistProgress = resolvedTimeline.map((item, i) =>
    frame >= item.frame ? 1 : interpolate(frame, [Math.max(0, item.frame - 8), item.frame], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
  );
  const soundStart = Math.max(0, goalFrame - 8);
  const shoutOpacity = interpolate(frame, [goalFrame - 2, goalFrame + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(circle at 50% 34%, #2d3952 0%, #101725 34%, #07090f 68%, #040507 100%)",
        overflow: "hidden",
      }}
    >
      <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="tvScreenGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0f1a2e" />
            <stop offset="55%" stopColor="#0c1322" />
            <stop offset="100%" stopColor="#04070d" />
          </linearGradient>
          <linearGradient id="wallGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#00ff41" stopOpacity="0.08" />
          </linearGradient>
        </defs>

        {Array.from({ length: 46 }, (_, i) => (
          <circle
            key={i}
            cx={24 + hash(i + 5) * 1030}
            cy={68 + hash(i + 90) * 620}
            r={0.7 + hash(i + 35) * 1.9}
            fill="#d7f2ff"
            opacity={0.18 + hash(i + 130) * 0.42}
          />
        ))}

        <rect x={0} y={320} width={W} height={1260} fill="rgba(0,0,0,0.14)" />
        <rect x={MID - 12} y={320} width={24} height={1260} fill="url(#wallGlow)" />
        <SplitScreenDivider x={MID} y={320} height={1260} frame={frame} color="rgba(255,255,255,0.24)" label={wallLabel} />

        <ApartmentRoom
          frame={frame}
          side="left"
          config={leftConfig}
          cameraJitter={cameraJitter}
          goalFrame={goalFrame}
          catchupFrame={catchupFrame}
          waveHitFrame={waveHitFrame}
          roomPulse={1}
        />
        <ApartmentRoom
          frame={frame}
          side="right"
          config={rightConfig}
          cameraJitter={cameraJitter}
          goalFrame={goalFrame}
          catchupFrame={catchupFrame}
          waveHitFrame={waveHitFrame}
          roomPulse={interpolate(frame, [waveHitFrame, waveHitFrame + 20], [1, 0.5], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
        />

        <SoundWaveVisual frame={frame} startFrame={soundStart} source={{ x: MID - 170, y: 920 }} target={{ x: MID + 170, y: 920 }} color={accentColor} strength={1.1} />

        <g opacity={shoutOpacity}>
          <path d="M 120 622 Q 220 550 334 624" fill="rgba(0,0,0,0.45)" />
          <rect x={104} y={518} width={210} height={96} rx={28} fill="rgba(255,255,255,0.94)" />
          <text x={209} y={580} textAnchor="middle" fontSize={42} fontWeight={900} style={{ fill: "#0a0a0f", fontFamily: BE_VIETNAM_PRO }}>
            VÀO!
          </text>
        </g>

        {resolvedTimeline.map((item, i) => {
          const itemOpacity = checklistProgress[i];
          const isLeft = item.side === "left" || item.side === "both";
          const isRight = item.side === "right" || item.side === "both";
          const badgeX = item.side === "right" ? 760 : item.side === "left" ? 260 : 540;
          const badgeY = 280 + i * 54;
          const emphasisColor = item.emphasis === "impact" ? "#fff" : item.emphasis === "warning" ? accentColor : "rgba(255,255,255,0.75)";
          return (
            <g key={i} opacity={itemOpacity}>
              <rect x={badgeX - 92} y={badgeY - 18} width={184} height={36} rx={18} fill="rgba(0,0,0,0.34)" />
              <text x={badgeX} y={badgeY + 7} textAnchor="middle" fontSize={16} fontWeight={800} style={{ fill: emphasisColor, fontFamily: INTER }}>
                {item.label}
              </text>
              {isLeft ? <circle cx={badgeX - 114} cy={badgeY} r={5} fill={accentColor} opacity={0.85} /> : null}
              {isRight ? <circle cx={badgeX + 114} cy={badgeY} r={5} fill="#61dafb" opacity={0.85} /> : null}
            </g>
          );
        })}

        <ImpactFlash frame={frame} startFrame={goalFrame} color={accentColor} strength={frame < catchupFrame ? 0.7 : 1} />
      </svg>

      <div
        style={{
          position: "absolute",
          left: 96,
          right: 96,
          top: 110,
          zIndex: 20,
        }}
      >
        <TextPunchIn frame={frame} headline={headline} accentWord={accentWord} subtext={subtext} accentColor={accentColor} align="center" />
      </div>

      <div
        style={{
          position: "absolute",
          left: 94,
          right: 94,
          top: 206,
          display: "flex",
          justifyContent: "center",
          gap: 12,
          flexWrap: "wrap",
          zIndex: 19,
          opacity: interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        {checklistItems.map((item, i) => (
          <div
            key={i}
            style={{
              padding: "10px 16px",
              borderRadius: 999,
              background: i % 2 === 0 ? "rgba(0,0,0,0.34)" : "rgba(255,255,255,0.1)",
              border: `1px solid ${i % 2 === 0 ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.08)"}`,
              color: "#fff",
              fontSize: 16,
              fontWeight: 700,
              fontFamily: INTER,
              letterSpacing: "0.01em",
            }}
          >
            {item}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
