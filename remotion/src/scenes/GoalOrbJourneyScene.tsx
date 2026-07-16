import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { GoalOrbJourneyNode, GoalOrbJourneySceneProps, GoalOrbJourneyTarget } from "../types";
import { BE_VIETNAM_PRO, CAPTION_CLEAR_Y, INTER } from "../styles";
import {
  cameraShake,
  clamp,
  ImpactFlash,
  phaseProgress,
  pointOnPolyline,
  polylineToPath,
  RouteFollower,
  TextPunchIn,
} from "./cinematicPrimitives";

const W = 1080;
const H = 1920;

const DEFAULT_NODES: GoalOrbJourneyNode[] = [
  { x: 160, y: 1100, label: "Sân vận động", kind: "stadium" },
  { x: 310, y: 920, label: "Relay 1", kind: "relay" },
  { x: 460, y: 760, label: "Relay 2", kind: "relay" },
  { x: 650, y: 620, label: "Relay 3", kind: "relay" },
  { x: 780, y: 770, label: "Nhà A", kind: "house" },
];

const DEFAULT_TARGETS: GoalOrbJourneyTarget[] = [
  { x: 850, y: 780, label: "TV nhà bạn", kind: "tv", arriveOffsetFrames: 0 },
  { x: 860, y: 1120, label: "TV hàng xóm", kind: "tv", arriveOffsetFrames: 12 },
];

const cityHash = (seed: number) => {
  const value = Math.sin(seed * 101.73 + 9.17) * 43758.5453;
  return value - Math.floor(value);
};

const Skyline: React.FC<{ frame: number; shiftX: number; shiftY: number }> = ({ frame, shiftX, shiftY }) => {
  const buildings = Array.from({ length: 24 }, (_, i) => {
    const depth = i % 3;
    const width = 44 + cityHash(i + 3) * 80;
    const height = 140 + cityHash(i + 17) * (depth === 0 ? 320 : 220);
    const x = 36 + i * 42 + cityHash(i + 27) * 18;
    const y = 520 - height + depth * 16;
    const shade = depth === 0 ? "#0d1b31" : depth === 1 ? "#11284b" : "#173558";
    return { x, y, width, height, shade };
  });
  return (
    <g>
      {buildings.map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={b.y} width={b.width} height={b.height} rx={4} fill={b.shade} opacity={0.85} />
          {Array.from({ length: 5 }, (_, row) =>
            Array.from({ length: 3 }, (_, col) => {
              const lit = cityHash(i * 31 + row * 5 + col) > 0.48;
              return (
                <rect
                  key={`${row}-${col}`}
                  x={b.x + 10 + col * Math.max(10, (b.width - 22) / 3)}
                  y={b.y + 18 + row * 28}
                  width={4}
                  height={8}
                  rx={1}
                  fill={lit ? "#cfefff" : "#142139"}
                  opacity={lit ? 0.7 : 0.24}
                />
              );
            })
          )}
        </g>
      ))}
    </g>
  );
};

const NodeMark: React.FC<{
  node: GoalOrbJourneyNode;
  frame: number;
  color: string;
  active: boolean;
}> = ({ node, frame, color, active }) => {
  const pulse = active ? 1 + Math.sin(frame * 0.16) * 0.08 : 1;
  const size = node.kind === "stadium" ? 18 : node.kind === "house" ? 14 : 10;
  return (
    <g transform={`translate(${node.x}, ${node.y}) scale(${pulse})`} opacity={active ? 1 : 0.64}>
      <circle cx={0} cy={0} r={size * 2.8} fill={color} opacity={0.1} />
      <circle cx={0} cy={0} r={size} fill={color} />
      <circle cx={0} cy={0} r={4} fill="#fff" />
      <text x={0} y={size + 24} textAnchor="middle" fontSize={16} fontWeight={800} style={{ fill: "rgba(255,255,255,0.82)", fontFamily: INTER }}>
        {node.label}
      </text>
    </g>
  );
};

const TargetHouse: React.FC<{
  target: GoalOrbJourneyTarget;
  frame: number;
  accent: string;
  arrived: boolean;
}> = ({ target, frame, accent, arrived }) => {
  const glow = arrived ? 1 : 0.3 + Math.sin(frame * 0.12) * 0.1;
  return (
    <g transform={`translate(${target.x}, ${target.y})`}>
      <rect x={-70} y={-58} width={140} height={112} rx={18} fill="rgba(255,255,255,0.08)" />
      <path d="M -82 -18 L 0 -90 L 82 -18 Z" fill="rgba(255,255,255,0.12)" />
      <rect x={-48} y={-12} width={96} height={66} rx={12} fill="rgba(0,0,0,0.2)" stroke="rgba(255,255,255,0.18)" />
      <rect x={-18} y={18} width={36} height={36} rx={8} fill={accent} opacity={0.28 + glow * 0.15} />
      <circle cx={0} cy={-6} r={20 + glow * 10} fill={accent} opacity={0.08} />
      <text x={0} y={84} textAnchor="middle" fontSize={16} fontWeight={800} style={{ fill: "rgba(255,255,255,0.76)", fontFamily: INTER }}>
        {target.label}
      </text>
    </g>
  );
};

export const GoalOrbJourneyScene: React.FC<GoalOrbJourneySceneProps> = ({
  mode = "birth_from_goal",
  headline = "Quả bóng đi xuyên thành phố",
  accentWord = "thành phố",
  subtext = "Bàn thắng đổi thành một quả bóng ánh sáng, rồi chạy qua nhiều chặng trước khi về tới TV.",
  accentColor = "#00ff41",
  secondaryColor = "#61dafb",
  trailColor = "#f5c542",
  cameraFollow = "lag",
  routeNodes,
  targets,
  statusText = "TV giữ sẵn vài giây để tránh đứng hình",
  branchLabels = ["TV nhà bạn", "TV hàng xóm"],
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const duration = Math.max(1, durationInFrames);
  // Node/target labels render below their marker (see NodeMark/TargetHouse),
  // so clamp authored y so the label — not just the marker — clears the
  // caption pill's danger zone instead of landing under it.
  const nodes = (routeNodes?.length ? routeNodes : DEFAULT_NODES).map((n) => ({
    ...n,
    y: Math.min(n.y, CAPTION_CLEAR_Y - 40),
  }));
  const finalTargets = (targets?.length ? targets : DEFAULT_TARGETS).map((t) => ({
    ...t,
    y: Math.min(t.y, CAPTION_CLEAR_Y - 84),
  }));

  const birthEnd = Math.round(duration * 0.13);
  const splitEnd = Math.round(duration * 0.25);
  const relayEnd = Math.round(duration * 0.47);
  const cityEnd = Math.round(duration * 0.63);
  const branchEnd = Math.round(duration * 0.82);
  const arrivalEnd = Math.round(duration * 0.96);

  const relay = phaseProgress(frame, splitEnd, relayEnd - splitEnd);
  const city = phaseProgress(frame, relayEnd, cityEnd - relayEnd);

  const mainPath = nodes.map((n) => ({ x: n.x, y: n.y }));
  const branchStart = mainPath[Math.max(0, mainPath.length - 2)];
  const route = polylineToPath(mainPath);

  const mainPoint = pointOnPolyline(mainPath, clamp(relay + city * 0.45, 0, 1));
  const followPoint = cameraFollow === "ball" ? mainPoint : pointOnPolyline(mainPath, clamp(relay - 0.08, 0, 1));
  const camera = cameraFollow === "lag" ? cameraShake(frame, splitEnd + 10, 12, 29) : { x: 540 - followPoint.x * 0.08, y: 980 - followPoint.y * 0.06 };
  const cityShiftX = camera.x;
  const cityShiftY = camera.y;

  const branchPaths = finalTargets.map((target) => [
    branchStart,
    { x: branchStart.x + (target.x - branchStart.x) * 0.52, y: branchStart.y - 60 },
    { x: target.x - 40, y: target.y - 22 },
    { x: target.x, y: target.y },
  ]);
  const firstTarget = finalTargets[0] ?? DEFAULT_TARGETS[0];
  const secondTarget = finalTargets[1] ?? finalTargets[0] ?? DEFAULT_TARGETS[1];

  const mainOrbVisible = frame < branchEnd;
  const branchAProgress = phaseProgress(frame, cityEnd - 4, arrivalEnd - cityEnd + 6);
  const branchBProgress = phaseProgress(frame, cityEnd + 10, arrivalEnd - cityEnd + 12);
  const splitFragments = mode === "split_into_fragments" || mode === "branch_to_targets" || frame >= splitEnd;

  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(circle at 50% 28%, #233b5a 0%, #09111d 34%, #05070d 68%, #020204 100%)",
        overflow: "hidden",
      }}
    >
      <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="roadGlow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#00ff41" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#61dafb" stopOpacity="0.08" />
          </linearGradient>
          <filter id="orbBlur" x="-200%" y="-200%" width="400%" height="400%">
            <feGaussianBlur stdDeviation="10" />
          </filter>
        </defs>

        {Array.from({ length: 34 }, (_, i) => (
          <circle
            key={i}
            cx={22 + cityHash(i + 9) * 1028}
            cy={72 + cityHash(i + 60) * 560}
            r={0.7 + cityHash(i + 92) * 1.8}
            fill="#d5ecff"
            opacity={0.16}
          />
        ))}

        <g transform={`translate(${cityShiftX}, ${cityShiftY})`}>
          <Skyline frame={frame} shiftX={cityShiftX} shiftY={cityShiftY} />

          <path d={route} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={3} strokeDasharray="12 12" />
          <path d={route} fill="none" stroke="url(#roadGlow)" strokeWidth={8} strokeLinecap="round" opacity={0.8} />

          {nodes.map((node, i) => (
            <NodeMark key={i} node={node} frame={frame} color={i === 0 ? accentColor : secondaryColor} active={frame >= i * 10} />
          ))}

          <g opacity={splitFragments ? 1 : 0.35}>
            {mainOrbVisible ? (
              <RouteFollower
                frame={frame}
                startFrame={0}
                durationFrames={Math.max(1, branchEnd - 6)}
                path={mainPath}
                color={accentColor}
                trailColor={trailColor}
                radius={16}
                trailCount={6}
                showFragments={mode === "split_into_fragments" || mode === "branch_to_targets"}
                fragmentCount={5}
                label={frame >= birthEnd ? "ORB" : undefined}
                labelColor="#fff"
              />
            ) : null}
          </g>

          {branchPaths.map((path, i) => {
            const progress = i === 0 ? branchAProgress : branchBProgress;
            const visible = frame >= cityEnd - (i === 0 ? 0 : 10);
            if (!visible) return null;
            return (
              <RouteFollower
                key={i}
                frame={frame}
                startFrame={cityEnd - 2 + i * 10}
                durationFrames={Math.max(12, arrivalEnd - cityEnd + i * 10)}
                path={path}
                color={i === 0 ? accentColor : secondaryColor}
                trailColor={trailColor}
                radius={i === 0 ? 13 : 11}
                trailCount={4}
                showFragments={mode === "split_into_fragments" || mode === "branch_to_targets"}
                fragmentCount={3}
                label={progress > 0.45 ? (branchLabels[i] ?? finalTargets[i]?.label) : undefined}
                labelColor={i === 0 ? accentColor : secondaryColor}
              />
            );
          })}

          {finalTargets.map((target, i) => (
            <TargetHouse key={i} target={target} frame={frame} accent={i === 0 ? accentColor : secondaryColor} arrived={frame >= arrivalEnd - (i === 0 ? 0 : 10)} />
          ))}

          <g opacity={0.8}>
            <path
              d={`M ${nodes[0].x} ${nodes[0].y} C ${nodes[1].x - 20} ${nodes[1].y - 100}, ${nodes[2].x - 20} ${nodes[2].y - 72}, ${nodes[nodes.length - 1].x} ${nodes[nodes.length - 1].y}`}
              fill="none"
              stroke={accentColor}
              strokeWidth={6}
              strokeLinecap="round"
              strokeDasharray="16 12"
              opacity={0.22}
            />
          </g>

          {frame >= branchEnd - 16 ? (
            <g opacity={phaseProgress(frame, branchEnd - 16, 20)}>
              <circle cx={firstTarget.x} cy={firstTarget.y} r={54} fill={accentColor} opacity={0.12} filter="url(#orbBlur)" />
              <circle cx={secondTarget.x} cy={secondTarget.y} r={54} fill={secondaryColor} opacity={0.12} filter="url(#orbBlur)" />
            </g>
          ) : null}
        </g>

        <ImpactFlash frame={frame} startFrame={branchEnd - 6} color={accentColor} strength={0.8} />
      </svg>

      <div style={{ position: "absolute", top: 88, left: 92, right: 92, zIndex: 20 }}>
        <TextPunchIn frame={frame} headline={headline} accentWord={accentWord} subtext={subtext} accentColor={accentColor} align="center" />
      </div>

      <div
        style={{
          position: "absolute",
          left: 94,
          right: 94,
          top: 260,
          display: "flex",
          justifyContent: "center",
          gap: 12,
          flexWrap: "wrap",
          zIndex: 19,
          opacity: interpolate(frame, [0, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        <div style={{ padding: "10px 16px", borderRadius: 999, background: "rgba(0,0,0,0.35)", color: "#fff", fontFamily: INTER, fontWeight: 800, fontSize: 16 }}>
          {statusText}
        </div>
      </div>
    </AbsoluteFill>
  );
};
