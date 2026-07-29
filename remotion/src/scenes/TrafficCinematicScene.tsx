import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { BE_VIETNAM_PRO, INTER } from "../styles";
import { TrafficCinematicSceneProps, TrafficScenario } from "../types";

const W = 1080;
const H = 1920;
const HORIZON_Y = 590;
const CYAN = "#61dafb";
const BLUE = "#4f8cff";
const RED = "#ff5a68";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const hash = (n: number) => {
  const value = Math.sin(n * 91.73 + 17.19) * 43758.5453;
  return value - Math.floor(value);
};

const quadPoint = (
  t: number,
  x0: number,
  y0: number,
  cx: number,
  cy: number,
  x1: number,
  y1: number
) => {
  const inv = 1 - t;
  return [
    inv * inv * x0 + 2 * inv * t * cx + t * t * x1,
    inv * inv * y0 + 2 * inv * t * cy + t * t * y1,
  ];
};

const NightBackdrop: React.FC<{ frame: number; cameraPush: number }> = ({ frame, cameraPush }) => {
  const buildings = Array.from({ length: 34 }, (_, i) => {
    const depth = i % 3;
    const width = 48 + hash(i) * 80;
    const height = 130 + hash(i + 40) * (depth === 0 ? 320 : 220);
    const x = -30 + i * 35 + hash(i + 90) * 22;
    const baseY = HORIZON_Y + 185 - depth * 36;
    const parallax = cameraPush * (depth + 1) * (i % 2 === 0 ? -14 : 14);
    const shade = depth === 0 ? "#0b1730" : depth === 1 ? "#102343" : "#163158";
    return { x: x + parallax, y: baseY - height, width, height, shade, depth, i };
  });

  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 35%, #102f54 0%, #081528 34%, #030711 72%, #010207 100%)",
        }}
      />
      <svg viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        <defs>
          <linearGradient id="city-floor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#10213b" stopOpacity="0.4" />
            <stop offset="1" stopColor="#02050c" />
          </linearGradient>
          <filter id="soft-cyan" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {Array.from({ length: 42 }, (_, i) => (
          <circle
            key={`star-${i}`}
            cx={30 + hash(i + 10) * 1020}
            cy={80 + hash(i + 80) * 500}
            r={0.7 + hash(i + 120) * 1.6}
            fill="#bdeaff"
            opacity={0.2 + hash(i + 50) * 0.55 + Math.sin(frame / 18 + i) * 0.08}
          />
        ))}
        <path d={`M0 ${HORIZON_Y + 170} H${W} V${H} H0Z`} fill="url(#city-floor)" />
        {buildings
          .sort((a, b) => a.depth - b.depth)
          .map((b) => (
            <g key={`building-${b.i}`} opacity={0.58 + b.depth * 0.14}>
              <rect x={b.x} y={b.y} width={b.width} height={b.height} rx={3} fill={b.shade} />
              {Array.from({ length: 4 }, (_, row) =>
                Array.from({ length: 3 }, (_, col) => {
                  const lit = hash(b.i * 30 + row * 4 + col) > 0.46;
                  return (
                    <rect
                      key={`${row}-${col}`}
                      x={b.x + 12 + col * Math.max(11, (b.width - 24) / 3)}
                      y={b.y + 22 + row * 38}
                      width={5}
                      height={10}
                      rx={1}
                      fill={lit ? "#6fdcff" : "#172c4b"}
                      opacity={lit ? 0.65 : 0.3}
                    />
                  );
                })
              )}
            </g>
          ))}
        <path d={`M480 ${HORIZON_Y + 95} L75 ${H} H1005 L600 ${HORIZON_Y + 95}Z`} fill="#03070f" />
        {[-1, -0.55, 0, 0.55, 1].map((lane, i) => (
          <line
            key={`lane-${i}`}
            x1={540 + lane * 26}
            y1={HORIZON_Y + 100}
            x2={540 + lane * 430}
            y2={H}
            stroke={i === 2 ? "rgba(98,221,255,0.48)" : "rgba(98,221,255,0.15)"}
            strokeWidth={i === 2 ? 3 : 2}
          />
        ))}
        {Array.from({ length: 13 }, (_, i) => {
          const travel = (frame * 0.018 + i / 13) % 1;
          const y = HORIZON_Y + 105 + Math.pow(travel, 2.1) * 1300;
          const span = 25 + travel * 720;
          return (
            <line
              key={`cross-${i}`}
              x1={540 - span / 2}
              x2={540 + span / 2}
              y1={y}
              y2={y}
              stroke="rgba(79,140,255,0.16)"
              strokeWidth={1 + travel * 2}
            />
          );
        })}
      </svg>
    </>
  );
};

const Header: React.FC<{
  frame: number;
  eyebrow?: string;
  headline: string;
  subtext?: string;
  accent: string;
}> = ({ frame, eyebrow, headline, subtext, accent }) => {
  const enter = spring({ frame, fps: 30, config: { stiffness: 130, damping: 18 }, durationInFrames: 30 });
  // Authored "\n" breaks must land as exactly one row per line, never a
  // further auto-wrap into extra rows — shrink the font when the longest
  // authored line would overflow the 834px column at the base size (tuned
  // against short headlines like "Thành phố trở thành"/"một hệ thần kinh",
  // ~19 chars, which render at full size unchanged).
  const headlineLines = headline.split("\n");
  const longestLine = Math.max(...headlineLines.map((l) => l.length));
  const SAFE_CHARS = 20;
  const BASE_FONT = 62;
  const headlineFontSize = longestLine > SAFE_CHARS ? BASE_FONT * (SAFE_CHARS / longestLine) : BASE_FONT;
  return (
    <div
      style={{
        position: "absolute",
        zIndex: 20,
        top: 238,
        left: 92,
        right: 154,
        opacity: enter,
        transform: `translateY(${22 * (1 - enter)}px)`,
      }}
    >
      {eyebrow ? (
        <div
          style={{
            color: accent,
            fontFamily: INTER,
            fontWeight: 800,
            fontSize: 20,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            marginBottom: 14,
          }}
        >
          {eyebrow}
        </div>
      ) : null}
      <div
        style={{
          color: "#f5fbff",
          fontFamily: BE_VIETNAM_PRO,
          fontWeight: 850,
          fontSize: headlineFontSize,
          lineHeight: 1.08,
          letterSpacing: "-0.035em",
          whiteSpace: "pre",
          textShadow: "0 10px 40px rgba(0,0,0,0.65)",
        }}
      >
        {headline}
      </div>
      {subtext ? (
        <div
          style={{
            marginTop: 18,
            maxWidth: 720,
            color: "rgba(226,242,255,0.72)",
            fontFamily: BE_VIETNAM_PRO,
            fontSize: 26,
            fontWeight: 500,
            lineHeight: 1.4,
          }}
        >
          {subtext}
        </div>
      ) : null}
    </div>
  );
};

const FinalLockup: React.FC<{
  frame: number;
  eyebrow?: string;
  headline: string;
  accent: string;
}> = ({ frame, eyebrow, headline, accent }) => {
  const enter = spring({ frame, fps: 30, config: { stiffness: 105, damping: 18 }, durationInFrames: 34 });
  const headlineLines = headline.split("\n");
  const longestLine = Math.max(...headlineLines.map((l) => l.length));
  const SAFE_CHARS = 20;
  const BASE_FONT = 62;
  const headlineFontSize = longestLine > SAFE_CHARS ? BASE_FONT * (SAFE_CHARS / longestLine) : BASE_FONT;
  return (
    <div
      style={{
        position: "absolute",
        zIndex: 20,
        top: 250,
        left: 94,
        right: 154,
        textAlign: "center",
        opacity: enter,
        transform: `translateY(${28 * (1 - enter)}px) scale(${0.96 + enter * 0.04})`,
      }}
    >
      <div
        style={{
          color: accent,
          fontFamily: INTER,
          fontWeight: 850,
          fontSize: 20,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          marginBottom: 18,
        }}
      >
        {eyebrow}
      </div>
      <div
        style={{
          color: "#f7fcff",
          fontFamily: BE_VIETNAM_PRO,
          fontWeight: 850,
          fontSize: headlineFontSize,
          lineHeight: 1.08,
          letterSpacing: "-0.035em",
          whiteSpace: "pre",
          textShadow: "0 12px 42px rgba(0,0,0,0.72)",
        }}
      >
        {headline}
      </div>
      <div style={{ width: 150, height: 4, borderRadius: 999, background: accent, margin: "26px auto 0" }} />
    </div>
  );
};

const Core: React.FC<{ frame: number; x?: number; y?: number; accent: string; scale?: number }> = ({
  frame,
  x = 540,
  y = 950,
  accent,
  scale = 1,
}) => {
  const pulse = 1 + Math.sin(frame / 9) * 0.045;
  return (
    <g transform={`translate(${x} ${y}) scale(${scale * pulse})`} filter="url(#soft-cyan)">
      <circle r={150} fill={accent} opacity={0.06} />
      <circle r={112} fill="#071425" stroke={accent} strokeWidth={3} opacity={0.98} />
      <circle r={78} fill={accent} opacity={0.1} stroke={accent} strokeWidth={2} />
      <path
        d="M-38 -20 C-70 -76,-8 -98,0 -55 C8 -98,70 -76,38 -20 C76 2,45 75,0 47 C-45 75,-76 2,-38 -20Z"
        fill="none"
        stroke={accent}
        strokeWidth={5}
      />
      <path d="M0 -58 V48 M-45 -15 H45 M-28 -48 C-12 -30,-12 18,-28 40 M28 -48 C12 -30,12 18,28 40" fill="none" stroke={accent} strokeWidth={2.5} opacity={0.7} />
      <circle r={10} fill="#ffffff" opacity={0.92} />
    </g>
  );
};

const MetricStrip: React.FC<{
  metrics: { value: string; label: string; highlight?: boolean }[];
  accent: string;
  frame: number;
}> = ({ metrics, accent, frame }) => {
  const opacity = interpolate(frame, [24, 42], [0, 1], clamp);
  return (
    <div
      style={{
        position: "absolute",
        left: 92,
        right: 154,
        top: 1110,
        display: "grid",
        gridTemplateColumns: `repeat(${metrics.length}, 1fr)`,
        gap: 12,
        opacity,
      }}
    >
      {metrics.map((metric, i) => (
        <div
          key={metric.label}
          style={{
            padding: "18px 10px",
            borderRadius: 18,
            background: "rgba(4,15,28,0.76)",
            border: `1px solid ${metric.highlight ? accent : "rgba(164,213,255,0.18)"}`,
            textAlign: "center",
            transform: `translateY(${Math.max(0, 18 - frame + i * 4)}px)`,
          }}
        >
          <div style={{ color: metric.highlight ? accent : "#f7fbff", fontFamily: INTER, fontSize: 29, fontWeight: 850 }}>
            {metric.value}
          </div>
          <div style={{ color: "rgba(220,238,255,0.58)", fontFamily: BE_VIETNAM_PRO, fontSize: 15, marginTop: 5 }}>
            {metric.label}
          </div>
        </div>
      ))}
    </div>
  );
};

const CityTrails: React.FC<{
  frame: number;
  accent: string;
  count: number;
  network?: boolean;
  tracking?: boolean;
  trackingStartFrame?: number;
  trackingDurationFrames?: number;
  // Once the driver has traveled past a node's point along the path, drop a
  // small diamond "map data" marker there and keep it — the wheel light
  // trail visibly leaves behind map/route data instead of just dissipating.
  crystallize?: boolean;
}> = ({
  frame,
  accent,
  count,
  network = false,
  tracking = false,
  trackingStartFrame = 8,
  trackingDurationFrames = 82,
  crystallize = false,
}) => {
  const paths = Array.from({ length: count }, (_, i) => {
    const side = i % 2 === 0 ? -1 : 1;
    const startX = 540 + side * (85 + hash(i + 2) * 390);
    const startY = 1560 - hash(i + 20) * 440;
    const endX = 540 + (hash(i + 60) - 0.5) * 150;
    const endY = 690 + hash(i + 80) * 170;
    const cx = 540 + side * (40 + hash(i + 100) * 210);
    const cy = 1000 + hash(i + 120) * 220;
    return { startX, startY, endX, endY, cx, cy, i };
  });
  const trackingPath = paths[0];
  const t = Easing.inOut(Easing.cubic)(
    interpolate(frame, [trackingStartFrame, trackingStartFrame + trackingDurationFrames], [0, 1], clamp)
  );
  const [carX, carY] = quadPoint(
    t,
    trackingPath.startX,
    trackingPath.startY,
    trackingPath.cx,
    trackingPath.cy,
    trackingPath.endX,
    trackingPath.endY
  );
  const CRYSTAL_NODE_COUNT = 5;

  return (
    <g>
      {paths.map((path, i) => {
        const reveal = interpolate(frame, [8 + i * 3, 42 + i * 3], [0, 1], clamp);
        const d = `M${path.startX} ${path.startY} Q${path.cx} ${path.cy} ${path.endX} ${path.endY}`;
        return (
          <g key={`trail-${i}`} opacity={tracking && i > 0 ? 0 : reveal}>
            <path d={d} fill="none" stroke={i % 4 === 0 ? RED : accent} strokeWidth={tracking ? 8 : 2.5} opacity={tracking ? 0.82 : 0.42} />
            <path
              d={d}
              fill="none"
              stroke="#ffffff"
              strokeWidth={tracking ? 3.5 : 1.4}
              strokeDasharray={tracking ? "22 34" : "5 26"}
              strokeDashoffset={-frame * (tracking ? 6 : 3) - i * 17}
              opacity={tracking ? 0.95 : 0.72}
            />
            {!tracking ? (
              <circle cx={path.startX} cy={path.startY} r={4.5} fill={i % 4 === 0 ? RED : accent} filter="url(#soft-cyan)" />
            ) : null}
          </g>
        );
      })}
      {network
        ? paths.slice(0, 16).map((path, i) => {
            const other = paths[(i * 5 + 3) % paths.length];
            const opacity = interpolate(frame, [36 + i, 70 + i], [0, 0.34], clamp);
            return (
              <line
                key={`link-${i}`}
                x1={path.endX}
                y1={path.endY}
                x2={other.endX}
                y2={other.endY}
                stroke={accent}
                strokeWidth={1.5}
                opacity={opacity}
              />
            );
          })
        : null}
      {tracking && crystallize
        ? Array.from({ length: CRYSTAL_NODE_COUNT }, (_, ni) => {
            const nt = (ni + 1) / (CRYSTAL_NODE_COUNT + 1);
            if (nt > t) return null;
            const appearFrame = trackingStartFrame + trackingDurationFrames * nt;
            const opacity = interpolate(frame, [appearFrame, appearFrame + 18], [0, 1], clamp);
            if (opacity <= 0) return null;
            const [nx, ny] = quadPoint(
              nt,
              trackingPath.startX,
              trackingPath.startY,
              trackingPath.cx,
              trackingPath.cy,
              trackingPath.endX,
              trackingPath.endY
            );
            return (
              <g key={`crystal-${ni}`} opacity={opacity} transform={`translate(${nx} ${ny})`} filter="url(#soft-cyan)">
                <rect x={-7} y={-7} width={14} height={14} rx={3} fill={accent} opacity={0.9} transform="rotate(45)" />
                <rect x={-7} y={-7} width={14} height={14} rx={3} fill="none" stroke="#ffffff" strokeWidth={1.2} opacity={0.7} transform="rotate(45)" />
              </g>
            );
          })
        : null}
      {tracking ? (
        <g transform={`translate(${carX} ${carY})`} filter="url(#soft-cyan)">
          <rect x={-22} y={-38} width={44} height={76} rx={15} fill="#e9f8ff" stroke={accent} strokeWidth={4} />
          <rect x={-13} y={-20} width={26} height={25} rx={6} fill="#15314c" />
          <circle cy={-4} r={56} fill="none" stroke={accent} strokeWidth={2} opacity={0.35 + Math.sin(frame / 5) * 0.18} />
        </g>
      ) : null}
    </g>
  );
};

// Top-down/aerial city read: a plain map grid + faint blocks, distinct from
// NightBackdrop's street-level perspective. satellite_dive crossfades from
// this into NightBackdrop to sell "camera diving from satellite to street".
const SatelliteView: React.FC<{ frame: number; accent: string }> = ({ frame, accent }) => {
  const cols = 8;
  const rows = 14;
  const zoomIn = interpolate(frame, [0, 100], [1, 1.55], {
    ...clamp,
    easing: Easing.in(Easing.cubic),
  });
  const routeOpacity = interpolate(frame, [28, 52], [0, 1], clamp);
  return (
    <div style={{ position: "absolute", inset: 0, transform: `scale(${zoomIn})`, transformOrigin: "50% 62%" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        <rect width={W} height={H} fill="#050b16" />
        {Array.from({ length: cols + 1 }, (_, i) => {
          const x = (i / cols) * W;
          const reveal = interpolate(frame, [i * 3, i * 3 + 22], [0, 1], clamp);
          return <line key={`sv-v-${i}`} x1={x} y1={0} x2={x} y2={H * reveal} stroke="rgba(98,221,255,0.24)" strokeWidth={1.5} />;
        })}
        {Array.from({ length: rows + 1 }, (_, i) => {
          const y = (i / rows) * H;
          const reveal = interpolate(frame, [i * 2, i * 2 + 22], [0, 1], clamp);
          return <line key={`sv-h-${i}`} x1={0} y1={y} x2={W * reveal} y2={y} stroke="rgba(98,221,255,0.24)" strokeWidth={1.5} />;
        })}
        {Array.from({ length: 24 }, (_, i) => {
          const bx = 30 + (i % 6) * 175 + hash(i) * 40;
          const by = 70 + Math.floor(i / 6) * 300 + hash(i + 50) * 60;
          const bw = 70 + hash(i + 10) * 55;
          const bh = 70 + hash(i + 20) * 65;
          const opacity = interpolate(frame, [8 + i * 2, 38 + i * 2], [0, 0.55], clamp);
          return (
            <rect
              key={`sv-blk-${i}`}
              x={bx}
              y={by}
              width={bw}
              height={bh}
              rx={4}
              fill="#0d1d34"
              stroke="rgba(98,221,255,0.16)"
              opacity={opacity}
            />
          );
        })}
        <g opacity={routeOpacity}>
          <path
            d="M540 1560 C512 1210,566 940,540 660"
            fill="none"
            stroke={accent}
            strokeWidth={5}
            strokeDasharray="14 10"
            strokeLinecap="round"
            opacity={0.75}
          />
          <circle cx={540} cy={1560} r={13} fill={accent} filter="url(#soft-cyan)" />
        </g>
      </svg>
    </div>
  );
};

const ScenarioBranches: React.FC<{
  frame: number;
  scenarios: TrafficScenario[];
  accent: string;
  selectedOnly?: boolean;
}> = ({ frame, scenarios, accent, selectedOnly = false }) => {
  const ys = [720, 850, 980, 1110];
  return (
    <g>
      <Core frame={frame} x={310} y={920} accent={accent} scale={0.68} />
      {scenarios.slice(0, 4).map((scenario, i) => {
        const selectedIndex = Math.max(0, scenarios.findIndex((item) => item.highlight));
        const selected = selectedOnly && i === selectedIndex;
        const reveal = interpolate(frame, [15 + i * 9, 48 + i * 9], [0, 1], clamp);
        const opacity = selectedOnly ? reveal * (selected ? 1 : 0.12) : reveal * 0.72;
        const color = selected ? accent : "#7187a3";
        const d = `M405 920 C520 920, 520 ${ys[i]}, 640 ${ys[i]}`;
        return (
          <g key={scenario.label} opacity={opacity}>
            <path d={d} fill="none" stroke={color} strokeWidth={selected ? 5 : 2.5} />
            <path d={d} fill="none" stroke="#ffffff" strokeWidth={1.5} strokeDasharray="5 20" strokeDashoffset={-frame * 4} />
            <rect x={640} y={ys[i] - 42} width={290} height={84} rx={20} fill="rgba(5,16,29,0.92)" stroke={color} strokeWidth={selected ? 2.5 : 1.5} />
            <text x={668} y={ys[i] - 5} fill="#eef8ff" fontFamily={BE_VIETNAM_PRO} fontWeight={700} fontSize={23}>
              {scenario.label}
            </text>
            <text x={900} y={ys[i] + 22} textAnchor="end" fill={color} fontFamily={INTER} fontWeight={850} fontSize={26}>
              {scenario.metric}
            </text>
          </g>
        );
      })}
    </g>
  );
};

const SignalConvergence: React.FC<{ frame: number; accent: string; reverse?: boolean }> = ({
  frame,
  accent,
  reverse = false,
}) => {
  const points = [
    { x: 145, y: 760, label: reverse ? "ETA" : "GPS" },
    { x: 170, y: 1050, label: reverse ? "ROUTE" : "TỐC ĐỘ" },
    { x: 880, y: 760, label: reverse ? "CẢNH BÁO" : "LỊCH SỬ" },
    { x: 900, y: 1050, label: reverse ? "ĐIỀU HƯỚNG" : "MẠNG ĐƯỜNG" },
  ];
  return (
    <g>
      <Core frame={frame} accent={accent} />
      {points.map((point, i) => {
        const d = `M${point.x} ${point.y} Q${540 + (i % 2 ? 90 : -90)} 920 540 950`;
        const progress = ((frame * 0.021 + i * 0.19) % 1 + 1) % 1;
        const [px, py] = quadPoint(
          reverse ? 1 - progress : progress,
          point.x,
          point.y,
          540 + (i % 2 ? 90 : -90),
          920,
          540,
          950
        );
        return (
          <g key={point.label}>
            <path d={d} fill="none" stroke={accent} strokeWidth={2} opacity={0.32} />
            <circle cx={px} cy={py} r={7} fill="#ffffff" filter="url(#soft-cyan)" />
            <circle cx={point.x} cy={point.y} r={42} fill="#071425" stroke={accent} strokeWidth={2} />
            <text x={point.x} y={point.y + 5} textAnchor="middle" fill="#dff6ff" fontFamily={INTER} fontWeight={800} fontSize={13}>
              {point.label}
            </text>
          </g>
        );
      })}
    </g>
  );
};

export const TrafficCinematicScene: React.FC<TrafficCinematicSceneProps> = ({
  phase,
  eyebrow,
  headline,
  subtext,
  metrics = [],
  scenarios = [],
  accentColor = CYAN,
  secondaryColor = BLUE,
  vehicleCount = 22,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const exitOpacity = interpolate(frame, [durationInFrames - 14, durationInFrames], [1, 0], clamp);
  const cameraPush = interpolate(frame, [0, durationInFrames], [0, 1], clamp);
  const flyScale = phase === "flythrough" ? interpolate(frame, [0, durationInFrames], [1.08, 1.34], clamp) : 1;
  const brainEnter = spring({ frame: frame - 12, fps, config: { stiffness: 90, damping: 17 }, durationInFrames: 42 });

  const isSatelliteDive = phase === "satellite_dive";
  // Satellite view holds, then dives: crossfade + the street backdrop settles
  // in under it between frames 50–108 while CityTrails' tracking (started at
  // TRACK_START, below) picks the driver up right as the dive lands.
  const diveProgress = interpolate(frame, [50, 108], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const TRACK_START = 96;
  const trackDuration = Math.max(60, durationInFrames - TRACK_START - 46);

  return (
    <AbsoluteFill style={{ backgroundColor: "#010207", overflow: "hidden", opacity: exitOpacity }}>
      <div
        style={{
          position: "absolute",
          inset: -120,
          transform: `scale(${flyScale}) translateY(${phase === "flythrough" ? cameraPush * -48 : 0}px)`,
          transformOrigin: "50% 48%",
          opacity: isSatelliteDive ? diveProgress : 1,
        }}
      >
        <NightBackdrop frame={frame} cameraPush={cameraPush} />
      </div>
      {isSatelliteDive ? (
        <div style={{ position: "absolute", inset: 0, opacity: 1 - diveProgress }}>
          <SatelliteView frame={frame} accent={accentColor} />
        </div>
      ) : null}

      <svg viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        <defs>
          <filter id="soft-cyan" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="brain-vignette">
            <stop offset="0" stopColor={accentColor} stopOpacity="0.18" />
            <stop offset="1" stopColor={accentColor} stopOpacity="0" />
          </radialGradient>
        </defs>

        {phase === "flythrough" ? (
          <CityTrails frame={frame} accent={accentColor} count={10} />
        ) : null}
        {phase === "tracking" ? (
          <CityTrails frame={frame} accent={accentColor} count={1} tracking />
        ) : null}
        {phase === "satellite_dive" ? (
          <CityTrails
            frame={frame}
            accent={accentColor}
            count={1}
            tracking
            trackingStartFrame={TRACK_START}
            trackingDurationFrames={trackDuration}
            crystallize
          />
        ) : null}
        {phase === "swarm" ? (
          <CityTrails frame={frame} accent={accentColor} count={vehicleCount} />
        ) : null}
        {phase === "network" ? (
          <CityTrails frame={frame} accent={accentColor} count={vehicleCount} network />
        ) : null}
        {phase === "brain" ? (
          <g opacity={brainEnter} transform={`translate(540 950) scale(${0.75 + brainEnter * 0.25}) translate(-540 -950)`}>
            <ellipse cx={540} cy={960} rx={410} ry={330} fill="url(#brain-vignette)" />
            <CityTrails frame={frame} accent={accentColor} count={28} network />
            <Core frame={frame} accent={accentColor} scale={0.78} />
          </g>
        ) : null}
        {phase === "converge" ? <SignalConvergence frame={frame} accent={accentColor} /> : null}
        {phase === "route_estimates" ? (
          <ScenarioBranches frame={frame} scenarios={scenarios} accent={accentColor} />
        ) : null}
        {phase === "route_ranking" ? (
          <ScenarioBranches frame={frame} scenarios={scenarios} accent={accentColor} selectedOnly />
        ) : null}
        {phase === "broadcast" ? <SignalConvergence frame={frame} accent={accentColor} reverse /> : null}
        {phase === "recalculate" ? (
          <g>
            <CityTrails frame={frame} accent={accentColor} count={26} network />
            {[{ x: 360, y: 1020 }, { x: 690, y: 850 }, { x: 620, y: 1230 }].map((point, i) => {
              const r = 35 + ((frame * 4 + i * 38) % 100);
              return <circle key={i} cx={point.x} cy={point.y} r={r} fill="none" stroke={i === 0 ? RED : secondaryColor} strokeWidth={3} opacity={1 - r / 145} />;
            })}
          </g>
        ) : null}
        {phase === "finale" ? (
          <g>
            <ellipse cx={540} cy={980} rx={440} ry={350} fill="url(#brain-vignette)" />
            <CityTrails frame={frame} accent={accentColor} count={34} network />
            <Core frame={frame} accent={accentColor} scale={0.72} />
          </g>
        ) : null}
        {phase === "endcard" ? (
          <g>
            <ellipse cx={540} cy={1050} rx={470} ry={390} fill="url(#brain-vignette)" />
            <CityTrails frame={frame} accent={accentColor} count={42} network />
            {[0, 1, 2].map((i) => {
              const radius = 150 + ((frame * 5 + i * 105) % 315);
              return (
                <circle
                  key={i}
                  cx={540}
                  cy={1050}
                  r={radius}
                  fill="none"
                  stroke={accentColor}
                  strokeWidth={2}
                  opacity={Math.max(0, 0.34 * (1 - (radius - 150) / 315))}
                />
              );
            })}
            <Core frame={frame} accent={accentColor} y={1050} scale={0.82} />
          </g>
        ) : null}
      </svg>

      {phase === "endcard" ? (
        <FinalLockup frame={frame} eyebrow={eyebrow} headline={headline} accent={accentColor} />
      ) : (
        <Header frame={frame} eyebrow={eyebrow} headline={headline} subtext={subtext} accent={accentColor} />
      )}
      {metrics.length ? <MetricStrip metrics={metrics} accent={accentColor} frame={frame} /> : null}

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 620,
          pointerEvents: "none",
          background: "linear-gradient(to bottom, transparent 0%, rgba(1,2,7,0.32) 48%, #010207 100%)",
        }}
      />
    </AbsoluteFill>
  );
};
