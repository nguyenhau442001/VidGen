import React from "react";
import { AbsoluteFill, interpolate, spring } from "remotion";
import { BE_VIETNAM_PRO, INTER } from "../../styles";

export type Point = { x: number; y: number };

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const hash01 = (seed: number) => {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return value - Math.floor(value);
};

export const mix = (a: number, b: number, t: number) => a + (b - a) * t;

export const phaseProgress = (
  frame: number,
  startFrame: number,
  durationFrames: number,
  from = 0,
  to = 1
) =>
  interpolate(frame, [startFrame, startFrame + Math.max(1, durationFrames)], [from, to], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

export const cameraShake = (
  frame: number,
  startFrame: number,
  strength = 12,
  seed = 0
): { x: number; y: number } => {
  const active = Math.max(0, 1 - Math.abs(frame - startFrame) / 28);
  const wobble = active * strength;
  const phase = frame * 0.45 + seed * 17.3;
  return {
    x: Math.sin(phase) * wobble * (0.4 + hash01(seed + 1.1) * 0.6),
    y: Math.cos(phase * 1.13) * wobble * (0.4 + hash01(seed + 2.2) * 0.6),
  };
};

export const pointOnPolyline = (points: Point[], t: number): Point => {
  if (!points.length) return { x: 0, y: 0 };
  if (points.length === 1) return points[0];
  const lengths = points.slice(1).map((pt, i) => Math.hypot(pt.x - points[i].x, pt.y - points[i].y));
  const total = lengths.reduce((sum, len) => sum + len, 0);
  if (total <= 0) return points[0];
  const target = clamp(t, 0, 1) * total;
  let cursor = 0;
  for (let i = 0; i < lengths.length; i++) {
    const next = cursor + lengths[i];
    if (target <= next || i === lengths.length - 1) {
      const segT = lengths[i] <= 0 ? 0 : (target - cursor) / lengths[i];
      return {
        x: mix(points[i].x, points[i + 1].x, segT),
        y: mix(points[i].y, points[i + 1].y, segT),
      };
    }
    cursor = next;
  }
  return points[points.length - 1];
};

export const polylineToPath = (points: Point[]) => {
  if (!points.length) return "";
  const [first, ...rest] = points;
  return `M ${first.x} ${first.y} ${rest.map((p) => `L ${p.x} ${p.y}`).join(" ")}`;
};

export const routeLength = (points: Point[]) => {
  if (points.length < 2) return 0;
  return points.slice(1).reduce((sum, pt, i) => sum + Math.hypot(pt.x - points[i].x, pt.y - points[i].y), 0);
};

export const TextPunchIn: React.FC<{
  frame: number;
  startFrame?: number;
  headline: string;
  accentWord?: string;
  subtext?: string;
  accentColor?: string;
  align?: "left" | "center";
}> = ({ frame, startFrame = 0, headline, accentWord, subtext, accentColor = "#00ff41", align = "left" }) => {
  const pop = spring({
    frame: frame - startFrame,
    fps: 30,
    config: { stiffness: 140, damping: 16 },
    durationInFrames: 26,
  });
  const accentIndex = accentWord ? headline.indexOf(accentWord) : -1;
  const before = accentIndex >= 0 ? headline.slice(0, accentIndex) : "";
  const after = accentIndex >= 0 ? headline.slice(accentIndex + accentWord!.length) : "";

  return (
    <div
      style={{
        opacity: pop,
        transform: `translateY(${(1 - pop) * 18}px) scale(${0.97 + pop * 0.03})`,
        textAlign: align,
      }}
    >
      <div
        style={{
          color: "#fff",
          fontFamily: BE_VIETNAM_PRO,
          fontWeight: 900,
          fontSize: 58,
          lineHeight: 1.08,
          letterSpacing: "-0.04em",
          textShadow: "0 12px 40px rgba(0,0,0,0.55)",
        }}
      >
        {accentIndex >= 0 ? (
          <>
            {before}
            <span style={{ color: accentColor }}>{accentWord}</span>
            {after}
          </>
        ) : (
          headline
        )}
      </div>
      {subtext ? (
        <div
          style={{
            marginTop: 14,
            fontFamily: INTER,
            fontSize: 24,
            color: "rgba(255,255,255,0.78)",
            lineHeight: 1.35,
          }}
        >
          {subtext}
        </div>
      ) : null}
    </div>
  );
};

export const SplitScreenDivider: React.FC<{
  x: number;
  y: number;
  height: number;
  frame: number;
  color?: string;
  label?: string;
}> = ({ x, y, height, frame, color = "rgba(255,255,255,0.18)", label }) => {
  const pulse = 0.5 + Math.sin(frame * 0.12) * 0.15;
  return (
    <g>
      <rect x={x - 4} y={y} width={8} height={height} fill={color} opacity={0.22} />
      <line x1={x} y1={y} x2={x} y2={y + height} stroke={color} strokeWidth={2} strokeDasharray="10 12" opacity={pulse} />
      {label ? (
        <text
          x={x}
          y={y + 34}
          textAnchor="middle"
          fontSize={18}
          fontWeight={700}
          style={{ fill: "rgba(255,255,255,0.78)", fontFamily: INTER }}
        >
          {label}
        </text>
      ) : null}
    </g>
  );
};

export const SoundWaveVisual: React.FC<{
  frame: number;
  startFrame: number;
  source: Point;
  target: Point;
  color?: string;
  strength?: number;
}> = ({ frame, startFrame, source, target, color = "#61dafb", strength = 1 }) => {
  const progress = phaseProgress(frame, startFrame, 80);
  const reach = mix(source.x, target.x, progress);
  const rings = [0, 0.16, 0.32].map((delay, i) => {
    const t = clamp(progress - delay, 0, 1);
    const radius = 18 + t * 230 * strength + i * 14;
    const opacity = (1 - t) * (0.38 - i * 0.08);
    return <circle key={i} cx={source.x} cy={source.y} r={radius} fill="none" stroke={color} strokeWidth={2} opacity={opacity} />;
  });

  return (
    <g>
      <line x1={source.x} y1={source.y} x2={reach} y2={source.y} stroke={color} strokeOpacity={0.26} strokeWidth={2} />
      {rings}
    </g>
  );
};

export const ImpactFlash: React.FC<{
  frame: number;
  startFrame: number;
  durationFrames?: number;
  color?: string;
  strength?: number;
}> = ({ frame, startFrame, durationFrames = 24, color = "#00ff41", strength = 1 }) => {
  const opacity = phaseProgress(frame, startFrame, durationFrames, strength * 0.9, 0);
  if (opacity <= 0) return null;
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        background: `radial-gradient(circle at 50% 42%, ${color} 0%, rgba(0,0,0,0) 62%)`,
        mixBlendMode: "screen",
        opacity,
      }}
    />
  );
};

export const FreezeFrameOverlay: React.FC<{
  frame: number;
  startFrame: number;
  label?: string;
  color?: string;
}> = ({ frame, startFrame, label = "FREEZE", color = "#61dafb" }) => {
  const opacity = phaseProgress(frame, startFrame, 20);
  if (opacity <= 0) return null;
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        border: `4px solid ${color}`,
        boxShadow: `inset 0 0 0 4px rgba(255,255,255,0.08)`,
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(0,0,0,0.02) 100%)",
        opacity: opacity * 0.65,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 40,
          left: 40,
          padding: "10px 16px",
          borderRadius: 999,
          background: "rgba(0,0,0,0.42)",
          color: "#fff",
          fontFamily: INTER,
          fontWeight: 800,
          letterSpacing: "0.16em",
          fontSize: 18,
        }}
      >
        {label}
      </div>
    </AbsoluteFill>
  );
};

export const PortalMask: React.FC<{
  frame: number;
  startFrame: number;
  center: Point;
  radius: number;
  color?: string;
  secondaryColor?: string;
  mode?: "crack" | "door" | "circle" | "energy";
}> = ({
  frame,
  startFrame,
  center,
  radius,
  color = "#61dafb",
  secondaryColor = "#00ff41",
  mode = "energy",
}) => {
  const open = phaseProgress(frame, startFrame, 58);
  const pulse = 1 + Math.sin(frame * 0.18) * 0.03;
  const ringR = radius * (0.18 + open * 0.82) * pulse;

  return (
    <g>
      <circle
        cx={center.x}
        cy={center.y}
        r={ringR}
        fill="rgba(0,0,0,0.10)"
        stroke={color}
        strokeWidth={mode === "door" ? 8 : 5}
        opacity={0.7 * open}
      />
      <circle
        cx={center.x}
        cy={center.y}
        r={ringR + 12}
        fill="none"
        stroke={secondaryColor}
        strokeWidth={2}
        strokeDasharray="8 10"
        opacity={0.5 * open}
      />
      {mode === "crack" ? (
        <path
          d={`M ${center.x - 18} ${center.y - radius * 0.9} L ${center.x + 5} ${center.y - 14} L ${center.x - 9} ${center.y + 6} L ${center.x + 22} ${center.y + radius * 0.78}`}
          fill="none"
          stroke="#ffffffcc"
          strokeWidth={2}
          opacity={0.5 * open}
        />
      ) : null}
      {mode === "energy" ? (
        <g opacity={0.8 * open}>
          {Array.from({ length: 8 }, (_, i) => {
            const angle = (Math.PI * 2 * i) / 8 + frame * 0.05;
            const sx = center.x + Math.cos(angle) * (ringR - 18);
            const sy = center.y + Math.sin(angle) * (ringR - 18);
            const ex = center.x + Math.cos(angle) * (ringR + 24);
            const ey = center.y + Math.sin(angle) * (ringR + 24);
            return <line key={i} x1={sx} y1={sy} x2={ex} y2={ey} stroke={secondaryColor} strokeWidth={2} strokeLinecap="round" />;
          })}
        </g>
      ) : null}
    </g>
  );
};

export const RouteFollower: React.FC<{
  frame: number;
  startFrame: number;
  durationFrames: number;
  path: Point[];
  color?: string;
  trailColor?: string;
  radius?: number;
  trailCount?: number;
  label?: string;
  labelColor?: string;
  showFragments?: boolean;
  fragmentCount?: number;
}> = ({
  frame,
  startFrame,
  durationFrames,
  path,
  color = "#00ff41",
  trailColor = "#61dafb",
  radius = 14,
  trailCount = 5,
  label,
  labelColor = "#fff",
  showFragments = false,
  fragmentCount = 4,
}) => {
  const t = phaseProgress(frame, startFrame, durationFrames);
  const point = pointOnPolyline(path, t);
  const trail = Array.from({ length: trailCount }, (_, i) => {
    const tailT = clamp(t - (i + 1) * 0.05, 0, 1);
    const p = pointOnPolyline(path, tailT);
    return { ...p, opacity: 0.35 - i * 0.06, scale: 1 - i * 0.12 };
  });
  const fragments = showFragments
    ? Array.from({ length: fragmentCount }, (_, i) => {
        const angle = (Math.PI * 2 * i) / fragmentCount + frame * 0.06;
        return {
          x: point.x + Math.cos(angle) * (radius * 1.7),
          y: point.y + Math.sin(angle) * (radius * 1.7),
          opacity: 0.55,
        };
      })
    : [];

  return (
    <g>
      {trail.map((dot, i) => (
        <circle
          key={i}
          cx={dot.x}
          cy={dot.y}
          r={radius * dot.scale * 0.64}
          fill={trailColor}
          opacity={dot.opacity}
        />
      ))}
      <circle cx={point.x} cy={point.y} r={radius} fill={color} />
      <circle cx={point.x} cy={point.y} r={radius * 2.2} fill={color} opacity={0.14} />
      {fragments.map((fragment, i) => (
        <circle key={i} cx={fragment.x} cy={fragment.y} r={radius * 0.32} fill="#ffffff" opacity={fragment.opacity} />
      ))}
      {label ? (
        <text
          x={point.x}
          y={point.y - radius - 14}
          textAnchor="middle"
          fontSize={18}
          fontWeight={800}
          style={{ fill: labelColor, fontFamily: INTER }}
        >
          {label}
        </text>
      ) : null}
    </g>
  );
};

export const MotionTrail: React.FC<{
  frame: number;
  startFrame: number;
  point: Point;
  color?: string;
  trailColor?: string;
  radius?: number;
}> = ({ frame, startFrame, point, color = "#00ff41", trailColor = "#61dafb", radius = 14 }) => {
  const pop = spring({
    frame: frame - startFrame,
    fps: 30,
    config: { stiffness: 180, damping: 18 },
    durationInFrames: 18,
  });
  const opacity = clamp(pop, 0, 1);
  return (
    <g opacity={opacity}>
      <circle cx={point.x} cy={point.y} r={radius * 2.2} fill={trailColor} opacity={0.18} />
      <circle cx={point.x} cy={point.y} r={radius} fill={color} />
    </g>
  );
};
