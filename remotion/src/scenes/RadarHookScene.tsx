import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { RadarHookSceneProps } from "../types";
import { INTER, JETBRAINS_MONO, SAFE_ZONE } from "../styles";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const BG = "#030d06";
const ACCENT_DEFAULT = "#00ff41";
const USER_COLOR_DEFAULT = "#ff6b35";

const RADAR_SIZE = 560; // px diameter of the radar container
const RADAR_TOP = SAFE_ZONE.top + 70;

const RING_RADII = [10, 20, 30, 40, 48]; // percent of radar container (viewBox 0-100)
const SWEEP_DURATION_SECONDS = 4;
const PULSE_PERIOD_SECONDS = 3;
const PULSE_OFFSET_SECONDS = 1;
const PULSE_MAX_RADIUS = 48; // percent, matches outer ring

// Blip default positions — percent of the radar container's bounding box
const BLIP_POSITIONS = [
  { x: 65, y: 28 }, // top-right
  { x: 22, y: 58 }, // left
  { x: 64, y: 72 }, // bottom-right
];
const BLIP_ENTER_FRAMES = [20, 35, 50];
const BLIP_BREATH_PERIOD = 60; // frames, 2s @ 30fps
const BLIP_BREATH_OFFSET = 15; // frames, 0.5s @ 30fps

const DEFAULT_DRIVER_LABELS = ["TX-4821", "TX-3302", "TX-0917"];

const COPY_ENTER_FRAME = 8;
const STATS_ENTER_FRAME = 60;
const EXIT_FRAMES = 15;

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
// Top badge
// ---------------------------------------------------------------------------
const TopBadge: React.FC<{ text: string; accent: string; frame: number; fps: number }> = ({
  text,
  accent,
  frame,
  fps,
}) => {
  const entrance = spring({
    frame,
    fps,
    from: 0,
    to: 1,
    config: { stiffness: 200, damping: 20 },
    durationInFrames: 20,
  });

  return (
    <div
      style={{
        position: "absolute",
        top: SAFE_ZONE.top + 20,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        opacity: entrance,
        transform: `translateY(${interpolate(entrance, [0, 1], [-12, 0])}px)`,
      }}
    >
      <div
        style={{
          padding: "12px 30px",
          borderRadius: 30,
          border: `1px solid ${rgba(accent, 0.5)}`,
        }}
      >
        <span
          style={{
            fontSize: 26,
            fontWeight: 600,
            letterSpacing: "0.25em",
            color: rgba(accent, 0.9),
            fontFamily: INTER,
          }}
        >
          {text}
        </span>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Radar
// ---------------------------------------------------------------------------
const Radar: React.FC<{
  accent: string;
  userColor: string;
  driverLabels: string[];
  frame: number;
  fps: number;
}> = ({ accent, userColor, driverLabels, frame, fps }) => {
  const sweepFrames = fps * SWEEP_DURATION_SECONDS;
  const sweepDeg = (frame / sweepFrames) * 360;

  const pulsePeriodFrames = fps * PULSE_PERIOD_SECONDS;
  const pulseOffsetFrames = fps * PULSE_OFFSET_SECONDS;

  return (
    <div
      style={{
        position: "absolute",
        top: RADAR_TOP,
        left: "50%",
        transform: "translateX(-50%)",
        width: RADAR_SIZE,
        height: RADAR_SIZE,
      }}
    >
      {/* Rings, pulses, connector lines */}
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        {RING_RADII.map((r) => (
          <circle key={r} cx={50} cy={50} r={r} fill="none" stroke={rgba(accent, 0.1)} strokeWidth={0.35} />
        ))}

        {[0, 1].map((i) => {
          const age = frame - i * pulseOffsetFrames;
          const t = ((age % pulsePeriodFrames) + pulsePeriodFrames) % pulsePeriodFrames / pulsePeriodFrames;
          if (age < 0) return null;
          const r = t * PULSE_MAX_RADIUS;
          const opacity = 0.7 * (1 - t);
          return (
            <circle key={i} cx={50} cy={50} r={r} fill="none" stroke={rgba(accent, opacity)} strokeWidth={0.4} />
          );
        })}

        {BLIP_POSITIONS.map((pos, i) => {
          const enter = BLIP_ENTER_FRAMES[i];
          const dist = Math.hypot(pos.x - 50, pos.y - 50);
          const progress = interpolate(frame, [enter, enter + 15], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const dashoffset = dist * (1 - progress);
          return (
            <line
              key={i}
              x1={50}
              y1={50}
              x2={pos.x}
              y2={pos.y}
              stroke={rgba(accent, 0.35)}
              strokeWidth={0.3}
              strokeDasharray={`${dist} ${dist}`}
              strokeDashoffset={dashoffset}
            />
          );
        })}
      </svg>

      {/* Sweep arm — CSS conic-gradient wedge, masked to the radar circle */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          overflow: "hidden",
          background: `conic-gradient(from ${sweepDeg}deg, ${rgba(accent, 0.4)} 0deg, ${rgba(accent, 0)} 55deg, ${rgba(accent, 0)} 360deg)`,
        }}
      />

      {/* Driver blips */}
      {BLIP_POSITIONS.map((pos, i) => {
        const enter = BLIP_ENTER_FRAMES[i];
        const popScale = spring({
          frame: frame - enter,
          fps,
          config: { stiffness: 220, damping: 16 },
          durationInFrames: 15,
        });
        if (popScale <= 0) return null;

        const breath =
          0.625 +
          0.375 * Math.sin(((frame - enter + i * BLIP_BREATH_OFFSET) / BLIP_BREATH_PERIOD) * Math.PI * 2);

        return (
          <div key={i} style={{ position: "absolute", left: `${pos.x}%`, top: `${pos.y}%` }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                backgroundColor: accent,
                boxShadow: `0 0 6px ${accent}`,
                transform: `translate(-50%, -50%) scale(${popScale})`,
                opacity: breath,
              }}
            />
            <div
              style={{
                position: "absolute",
                top: 10,
                left: "50%",
                transform: `translate(-50%, 0)`,
                whiteSpace: "nowrap",
                opacity: popScale,
              }}
            >
              <span
                style={{
                  fontSize: 22,
                  fontFamily: JETBRAINS_MONO,
                  color: rgba(accent, 0.85),
                }}
              >
                {driverLabels[i]}
              </span>
            </div>
          </div>
        );
      })}

      {/* User dot (radar center) */}
      <div style={{ position: "absolute", left: "50%", top: "50%" }}>
        <div
          style={{
            width: 14,
            height: 14,
            borderRadius: "50%",
            backgroundColor: userColor,
            filter: `drop-shadow(0 0 8px ${userColor})`,
            transform: "translate(-50%, -50%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 14,
            left: "50%",
            transform: "translate(-50%, 0)",
            whiteSpace: "nowrap",
          }}
        >
          <span
            style={{
              fontSize: 24,
              fontWeight: 600,
              letterSpacing: "0.17em",
              color: rgba(userColor, 0.9),
              fontFamily: INTER,
            }}
          >
            BẠN
          </span>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Copy block
// ---------------------------------------------------------------------------
const CopyBlock: React.FC<{ eyebrow: string; headline: string; accent: string; frame: number; fps: number }> = ({
  eyebrow,
  headline,
  accent,
  frame,
  fps,
}) => {
  const entrance = spring({
    frame: frame - COPY_ENTER_FRAME,
    fps,
    from: 12,
    to: 0,
    config: { damping: 14 },
    durationInFrames: 20,
  });
  const opacity = interpolate(frame, [COPY_ENTER_FRAME, COPY_ENTER_FRAME + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const lines = headline.split("\n");

  return (
    <div
      style={{
        position: "absolute",
        top: RADAR_TOP + RADAR_SIZE + 40,
        left: 0,
        right: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        padding: "0 80px",
        opacity,
        transform: `translateY(${entrance}px)`,
      }}
    >
      <span
        style={{
          fontSize: 26,
          letterSpacing: "0.25em",
          color: "rgba(255,255,255,0.38)",
          fontFamily: INTER,
        }}
      >
        {eyebrow}
      </span>
      <div style={{ marginTop: 16 }}>
        {lines.map((line, i) => (
          <div
            key={i}
            style={{
              fontSize: 58,
              fontWeight: i === 0 ? 800 : 400,
              lineHeight: 1.25,
              color: i === 0 ? accent : "rgba(255,255,255,0.55)",
              fontFamily: INTER,
            }}
          >
            {line}
          </div>
        ))}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Stats row
// ---------------------------------------------------------------------------
const StatsRow: React.FC<{
  stats: RadarHookSceneProps["stats"];
  accent: string;
  userColor: string;
  bottom: number;
  frame: number;
  fps: number;
}> = ({ stats, accent, userColor, bottom, frame, fps }) => {
  const entrance = spring({
    frame: frame - STATS_ENTER_FRAME,
    fps,
    from: 0,
    to: 1,
    config: { stiffness: 180, damping: 20 },
    durationInFrames: 20,
  });

  return (
    <div
      style={{
        // Anchored above Caption.tsx's own bottom-anchored pill (same
        // convention as CharacterIconScene) so a tall headline_bold caption
        // never overlaps the stats row.
        position: "absolute",
        bottom,
        left: 80,
        right: 80,
        display: "flex",
        borderRadius: 12,
        background: rgba(accent, 0.04),
        border: `1px solid ${rgba(accent, 0.12)}`,
        opacity: entrance,
        transform: `translateY(${interpolate(entrance, [0, 1], [16, 0])}px)`,
      }}
    >
      {stats.map((stat, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
            padding: "24px 12px",
            borderLeft: i > 0 ? `1px solid ${rgba(accent, 0.15)}` : "none",
          }}
        >
          <span
            style={{
              fontSize: 42,
              fontWeight: 800,
              fontFamily: INTER,
              color: stat.highlight ? userColor : accent,
            }}
          >
            {stat.value}
          </span>
          <span
            style={{
              fontSize: 19,
              fontFamily: INTER,
              color: "rgba(255,255,255,0.5)",
              textAlign: "center",
            }}
          >
            {stat.label}
          </span>
        </div>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export const RadarHookScene: React.FC<RadarHookSceneProps> = ({
  topicLabel,
  eyebrow,
  headline,
  driverLabels = DEFAULT_DRIVER_LABELS,
  stats,
  accentColor = ACCENT_DEFAULT,
  userColor = USER_COLOR_DEFAULT,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const hasExitRoom = durationInFrames > EXIT_FRAMES + 20;
  const sceneOpacity = hasExitRoom
    ? interpolate(frame, [durationInFrames - EXIT_FRAMES, durationInFrames], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 1;

  return (
    <AbsoluteFill style={{ backgroundColor: BG, opacity: sceneOpacity }}>
      {/* Grid overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `linear-gradient(${rgba(accentColor, 1)} 1px, transparent 1px), linear-gradient(90deg, ${rgba(accentColor, 1)} 1px, transparent 1px)`,
          backgroundSize: "36px 36px",
          opacity: 0.028,
        }}
      />

      {/* Vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at 50% 42%, transparent 40%, rgba(0,0,0,0.65) 100%)",
        }}
      />

      <TopBadge text={topicLabel} accent={accentColor} frame={frame} fps={fps} />
      <Radar accent={accentColor} userColor={userColor} driverLabels={driverLabels} frame={frame} fps={fps} />
      <CopyBlock eyebrow={eyebrow} headline={headline} accent={accentColor} frame={frame} fps={fps} />
      <StatsRow
        stats={stats}
        accent={accentColor}
        userColor={userColor}
        bottom={SAFE_ZONE.bottom + 206}
        frame={frame}
        fps={fps}
      />
    </AbsoluteFill>
  );
};
