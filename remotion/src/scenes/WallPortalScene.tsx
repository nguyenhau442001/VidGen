import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame } from "remotion";
import { WallPortalDialogue, WallPortalSceneProps } from "../types";
import { BE_VIETNAM_PRO, INTER } from "../styles";
import {
  cameraShake,
  clamp,
  ImpactFlash,
  phaseProgress,
  PortalMask,
  SplitScreenDivider,
  TextPunchIn,
} from "./shared/cinematicPrimitives";

const W = 1080;
const H = 1920;
const MID = W / 2;

const DEFAULT_DIALOGUE: WallPortalDialogue[] = [
  { frame: 18, side: "left", text: "Có ai ở trong đó?" },
  { frame: 36, side: "right", text: "Cửa này dẫn sang đâu?" },
  { frame: 60, side: "left", text: "Bước qua đi." },
];

const Figure: React.FC<{
  x: number;
  y: number;
  scale?: number;
  accent: string;
  mood?: "neutral" | "pointing" | "leaning";
  frame: number;
}> = ({ x, y, scale = 1, accent, mood = "neutral", frame }) => {
  const wobble = mood === "pointing" ? Math.sin(frame * 0.12) * 0.04 : mood === "leaning" ? -0.06 : 0;
  return (
    <g transform={`translate(${x}, ${y}) scale(${scale}) rotate(${wobble * 90})`}>
      <circle cx={0} cy={-72} r={22} fill="rgba(255,255,255,0.95)" />
      <path d="M -24 -44 C -24 -74, 24 -74, 24 -44 L 18 24 C 18 48, -18 48, -18 24 Z" fill="rgba(255,255,255,0.95)" />
      <path d="M -16 -16 L -42 2 L -36 22 L -6 2 Z" fill="rgba(255,255,255,0.82)" />
      <path
        d={mood === "pointing" ? "M 16 -16 L 52 -24 L 58 -14 L 24 6 Z" : "M 16 -16 L 34 0 L 28 20 L 6 2 Z"}
        fill="rgba(255,255,255,0.82)"
      />
      <rect x={-15} y={30} width={12} height={60} rx={6} fill="rgba(255,255,255,0.95)" />
      <rect x={3} y={30} width={12} height={60} rx={6} fill="rgba(255,255,255,0.95)" />
      <circle cx={-2} cy={-76} r={32} fill={accent} opacity={0.1} />
    </g>
  );
};

const Booth: React.FC<{
  frame: number;
  x: number;
  y: number;
  open: number;
  accent: string;
}> = ({ frame, x, y, open, accent }) => {
  return (
    <g transform={`translate(${x}, ${y}) scale(${0.88 + open * 0.12})`}>
      <rect x={-124} y={-92} width={248} height={176} rx={26} fill="rgba(255,255,255,0.12)" stroke={accent} strokeOpacity={0.4} strokeWidth={2} />
      <rect x={-106} y={-74} width={212} height={140} rx={20} fill="rgba(0,0,0,0.26)" />
      <rect x={-88} y={-56} width={176} height={104} rx={16} fill="rgba(255,255,255,0.07)" />
      <rect x={-36} y={48} width={72} height={16} rx={8} fill="rgba(255,255,255,0.12)" />
      <rect x={-58} y={24} width={116} height={18} rx={9} fill={accent} opacity={0.26} />
      <circle cx={-30} cy={-6} r={12} fill={accent} />
      <path d="M -8 -6 C 8 -26, 28 -26, 44 -6" fill="none" stroke={accent} strokeWidth={4} strokeLinecap="round" />
      <circle cx={4} cy={-28} r={7} fill="#fff" />
      <text x={0} y={-118} textAnchor="middle" fontSize={18} fontWeight={900} style={{ fill: "#fff", fontFamily: INTER, letterSpacing: "0.18em" }}>
        BOOTH
      </text>
      <text x={0} y={74} textAnchor="middle" fontSize={14} fontWeight={700} style={{ fill: "rgba(255,255,255,0.72)", fontFamily: INTER }}>
        COMMENTARY
      </text>
      <circle cx={62} cy={-16} r={18} fill={accent} opacity={0.15 + open * 0.08} />
      <circle cx={-64} cy={-16} r={18} fill={accent} opacity={0.15 + open * 0.08} />
      <circle cx={0} cy={-92} r={open * 64} fill={accent} opacity={0.05} />
    </g>
  );
};

const DialogueBubble: React.FC<{
  frame: number;
  item: WallPortalDialogue & { frame: number; side: "left" | "right" };
  accent: string;
}> = ({ frame, item, accent }) => {
  const enter = spring({ frame: frame - item.frame, fps: 30, config: { stiffness: 220, damping: 18 }, durationInFrames: 18 });
  if (enter <= 0) return null;
  const x = item.side === "left" ? 112 : 650;
  const words = item.text.split(/\s+/);
  const lines = words.reduce<string[]>((result, word) => {
    const last = result[result.length - 1];
    if (!last || `${last} ${word}`.length > 24) result.push(word);
    else result[result.length - 1] = `${last} ${word}`;
    return result;
  }, []);
  const bubbleW = Math.min(350, Math.max(190, Math.max(...lines.map((line) => line.length)) * 12 + 34));
  const bubbleH = lines.length > 1 ? 112 : 86;
  return (
    <g opacity={enter} transform={`translate(${x}, ${item.side === "left" ? 650 : 690})`}>
      <rect x={0} y={0} width={bubbleW} height={bubbleH} rx={22} fill="rgba(255,255,255,0.94)" />
      <path d={item.side === "left" ? `M 70 ${bubbleH} L 96 ${bubbleH} L 68 ${bubbleH + 32} Z` : `M ${bubbleW - 70} ${bubbleH} L ${bubbleW - 44} ${bubbleH} L ${bubbleW - 66} ${bubbleH + 34} Z`} fill="rgba(255,255,255,0.94)" />
      <text
        x={bubbleW / 2}
        y={lines.length > 1 ? 42 : 52}
        textAnchor="middle"
        fontSize={lines.length > 1 ? 21 : 24}
        fontWeight={900}
        style={{ fill: accent, fontFamily: BE_VIETNAM_PRO }}
      >
        {lines.map((line, index) => (
          <tspan key={line} x={bubbleW / 2} dy={index === 0 ? 0 : 30}>{line}</tspan>
        ))}
      </text>
    </g>
  );
};

// Dialogue can carry any number of lines (commentary exchanges routinely run
// 4+), but each side has one fixed bubble slot — so only the most recent
// line whose frame has arrived is shown per side, instead of hard-coding
// three slots and silently dropping every line past index 2.
const latestPerSide = (
  items: Array<WallPortalDialogue & { frame: number; side: "left" | "right" }>,
  frame: number,
) => {
  const latest: Partial<Record<"left" | "right", WallPortalDialogue & { frame: number; side: "left" | "right" }>> = {};
  for (const item of items) {
    if (item.frame > frame) continue;
    const current = latest[item.side];
    if (!current || item.frame >= current.frame) latest[item.side] = item;
  }
  return latest;
};

export const WallPortalScene: React.FC<WallPortalSceneProps> = ({
  preset = "commentary_booth",
  headline = "Bức tường thành cổng",
  accentWord = "cổng",
  subtext = "Mở ra phòng bí mật, thế giới số hoặc một cú chuyển cảnh điện ảnh.",
  accentColor = "#61dafb",
  secondaryColor = "#00ff41",
  cameraMode = "push-through",
  portalStyle = "energy",
  leftLabel = "BÊN TRÁI",
  rightLabel = "BÊN PHẢI",
  portalLabel = "BÊN TRONG TƯỜNG",
  dialogue,
  boilerplate = "commentary booth",
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const duration = Math.max(1, durationInFrames);
  const openStart = Math.round(duration * 0.12);
  const pushStart = Math.round(duration * 0.38);
  const closeStart = Math.round(duration * 0.8);

  const open = phaseProgress(frame, openStart, 40);
  const push = cameraMode === "push-through" ? interpolate(frame, [pushStart, closeStart], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
  const close = phaseProgress(frame, closeStart, 18);
  const portalOpen = clamp(open * (1 - close * 0.8), 0, 1);
  const camera = cameraShake(frame, openStart + 16, preset === "commentary_booth" ? 10 : 6, 13);
  const scale = 1 + push * 0.05;
  const offsetX = camera.x + (push * -34) + 0;
  const offsetY = camera.y + (push * -10);

  const rawItems = dialogue?.length ? dialogue : DEFAULT_DIALOGUE;
  const maxDialogueFrame = Math.max(...rawItems.map((item) => item.frame ?? item.start_frame ?? 0), 1);
  const dialogueFrameScale = maxDialogueFrame > duration - 16 ? (duration - 16) / maxDialogueFrame : 1;
  const items = rawItems.map((item, index) => ({
    ...item,
    frame: Math.round((item.frame ?? item.start_frame ?? index * 30) * dialogueFrameScale),
    side: item.side ?? (item.speaker === "host" ? "left" : "right"),
  }));
  const boothVisible = preset === "commentary_booth";

  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(circle at 50% 32%, #18324e 0%, #0b1220 32%, #05070d 66%, #030409 100%)",
        overflow: "hidden",
      }}
    >
      <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="portalWall" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1b2636" />
            <stop offset="100%" stopColor="#0f1522" />
          </linearGradient>
          <linearGradient id="floorGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.08)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.06)" />
          </linearGradient>
        </defs>

        {Array.from({ length: 40 }, (_, i) => (
          <circle
            key={i}
            cx={30 + (Math.sin(i * 2.1) * 0.5 + 0.5) * 1020}
            cy={80 + (Math.cos(i * 1.7) * 0.5 + 0.5) * 480}
            r={0.8 + (i % 3) * 0.45}
            fill="#cfe7ff"
            opacity={0.18}
          />
        ))}

        <g transform={`translate(${offsetX}, ${offsetY}) scale(${scale})`}>
          <rect x={0} y={320} width={W} height={1260} fill="url(#portalWall)" />
          <rect x={0} y={1280} width={W} height={300} fill="url(#floorGlow)" />
          <SplitScreenDivider x={MID} y={320} height={1260} frame={frame} color="rgba(255,255,255,0.18)" label="TƯỜNG" />

          <Figure frame={frame} x={170} y={1280} scale={0.92} accent={accentColor} mood="pointing" />
          <Figure frame={frame} x={910} y={1270} scale={0.88} accent={secondaryColor} mood="neutral" />

          <PortalMask
            frame={frame}
            startFrame={openStart}
            center={{ x: MID, y: 840 }}
            radius={176}
            color={accentColor}
            secondaryColor={secondaryColor}
            mode={portalStyle}
          />

          {boothVisible ? <Booth frame={frame} x={MID} y={840} open={portalOpen} accent={accentColor} /> : null}

          {!boothVisible ? (
            <g opacity={portalOpen}>
              <rect x={MID - 116} y={754} width={232} height={168} rx={26} fill="rgba(255,255,255,0.12)" />
              <rect x={MID - 98} y={774} width={196} height={126} rx={18} fill="rgba(0,0,0,0.2)" />
              <path d={`M ${MID - 76} 864 L ${MID - 16} 806 L ${MID + 18} 836 L ${MID + 78} 784`} fill="none" stroke={accentColor} strokeWidth={8} strokeLinecap="round" />
            </g>
          ) : null}

          <g opacity={portalOpen * 0.8}>
            <circle cx={MID} cy={840} r={230} fill="none" stroke={accentColor} strokeWidth={3} strokeDasharray="12 10" />
            <circle cx={MID} cy={840} r={256} fill="none" stroke={secondaryColor} strokeWidth={1.5} opacity={0.45} />
          </g>

          <text x={MID} y={372} textAnchor="middle" fontSize={20} fontWeight={800} style={{ fill: "rgba(255,255,255,0.7)", fontFamily: INTER, letterSpacing: "0.2em" }}>
            {leftLabel}  ·  {rightLabel}
          </text>

          {(() => {
            const latest = latestPerSide(items, frame);
            return (
              <>
                {latest.left ? <DialogueBubble frame={frame} item={latest.left} accent={accentColor} /> : null}
                {latest.right ? <DialogueBubble frame={frame} item={latest.right} accent={accentColor} /> : null}
              </>
            );
          })()}

          <text x={MID} y={1020} textAnchor="middle" fontSize={18} fontWeight={800} style={{ fill: "rgba(255,255,255,0.68)", fontFamily: INTER }}>
            {portalLabel}
          </text>
          {boothVisible ? (
            <text x={MID} y={1060} textAnchor="middle" fontSize={14} fontWeight={700} style={{ fill: "rgba(255,255,255,0.55)", fontFamily: INTER, letterSpacing: "0.16em" }}>
              {boilerplate.toUpperCase()}
            </text>
          ) : null}
        </g>

        <ImpactFlash frame={frame} startFrame={openStart + 8} color={accentColor} strength={0.65} />
      </svg>

      <div style={{ position: "absolute", top: 112, left: 94, right: 94, zIndex: 20 }}>
        <TextPunchIn frame={frame} headline={headline} accentWord={accentWord} subtext={subtext} accentColor={accentColor} align="center" />
      </div>
    </AbsoluteFill>
  );
};
