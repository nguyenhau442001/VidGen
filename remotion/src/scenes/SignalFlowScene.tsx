import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { SignalFlowSceneProps } from "../types";
import { colors, INTER, JETBRAINS_MONO } from "../styles";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Authored on this viewBox. The SVG covers the full 1080×1920 canvas with
// preserveAspectRatio="slice", which crops the sides: only x ≈ 71–679 of the
// viewBox is visible. Keep nodes inside that band.
const VB_W = 750;
const VB_H = 1080;

// Phase boundaries (designed for a ~298-frame scene at 30fps)
const INPUT_STAGGER = 12;
const BRAIN_START = 40;
const STREAMS_START = 60;
const PULSE_START = 180;
const PULSE_END = 240;
const OUTPUT_LABEL_START = 240;
const OUTPUT_LABEL_FADE = 20;
const EXIT_FRAMES = 20;

const ACCENT_DEFAULT = "#22C55E";

// Layout: inputs stacked on the left, brain on the right. Vertical anchor
// sits above true center (not VB_H/2) and spacing is tightened so the
// bottom-most input's label clears Caption.tsx's bottom-anchored pill.
const INPUT_X = 195;
const INPUT_RADIUS = 54;
const INPUT_SPACING = 190;
const CONTENT_CENTER_Y = 460;
const BRAIN_X = 545;
const BRAIN_Y = CONTENT_CENTER_Y;
const BRAIN_RADIUS = 85;

const PARTICLES_PER_STREAM = 5;
const PARTICLE_TRAVEL_FRAMES = 70;
const PARTICLE_RADIUS = 3;

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

// Point on a quadratic bezier: B(t) = (1-t)²·P0 + 2(1-t)t·C + t²·P1
const quadPoint = (
  t: number,
  x0: number,
  y0: number,
  cx: number,
  cy: number,
  x1: number,
  y1: number
): [number, number] => {
  const u = 1 - t;
  return [
    u * u * x0 + 2 * u * t * cx + t * t * x1,
    u * u * y0 + 2 * u * t * cy + t * t * y1,
  ];
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export const SignalFlowScene: React.FC<SignalFlowSceneProps> = ({
  signals = [],
  outputLabel,
  accentColor = ACCENT_DEFAULT,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const inputYs = signals.map(
    (_, i) => CONTENT_CENTER_Y + (i - (signals.length - 1) / 2) * INPUT_SPACING
  );

  // Brain enters at BRAIN_START with a bloom: the glow overshoots wide while
  // the circle springs up to size, then both settle.
  const brainScale = spring({
    frame: frame - BRAIN_START,
    fps,
    config: { stiffness: 160, damping: 13 },
    durationInFrames: 25,
  });

  // Continuous subtle glow breathing once the brain is alive, plus the
  // dedicated 180–240 "processing" pulse: scale 1.0 → 1.15 → 1.0.
  const glowBreath = 0.75 + 0.25 * Math.sin(frame / 12);
  const processPulse = interpolate(
    frame,
    [PULSE_START, (PULSE_START + PULSE_END) / 2, PULSE_END],
    [1, 1.15, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const brainTotalScale = brainScale * processPulse;
  const pulseBright = interpolate(
    frame,
    [PULSE_START, (PULSE_START + PULSE_END) / 2, PULSE_END],
    [0, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Scene duration comes from narration length in the pipeline — anchor the
  // exit fade to it. The output label is anchored too, so it still gets
  // screen time on scenes shorter than the designed ~298.
  const hasExitRoom = durationInFrames > BRAIN_START + EXIT_FRAMES;
  const sceneOpacity = hasExitRoom
    ? interpolate(
        frame,
        [durationInFrames - EXIT_FRAMES, durationInFrames],
        [1, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      )
    : 1;
  const outputStart = Math.max(
    STREAMS_START + 20,
    Math.min(OUTPUT_LABEL_START, durationInFrames - EXIT_FRAMES - OUTPUT_LABEL_FADE - 10)
  );
  const outputOpacity = interpolate(
    frame,
    [outputStart, outputStart + OUTPUT_LABEL_FADE],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const outputRise = interpolate(
    frame,
    [outputStart, outputStart + OUTPUT_LABEL_FADE],
    [10, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid slice"
        style={{ position: "absolute", top: 0, left: 0, opacity: sceneOpacity }}
      >
        <defs>
          {/* userSpaceOnUse at (0,0): referenced inside the brain group, whose
              local origin is the brain center */}
          <radialGradient id="signal-brain-glow" gradientUnits="userSpaceOnUse" cx={0} cy={0} r={BRAIN_RADIUS * 2.1}>
            <stop offset="0%" stopColor={accentColor} stopOpacity={0.35} />
            <stop offset="55%" stopColor={accentColor} stopOpacity={0.12} />
            <stop offset="100%" stopColor={accentColor} stopOpacity={0} />
          </radialGradient>
        </defs>

        {/* Connections + particle streams (behind the nodes) */}
        {signals.map((s, i) => {
          const y0 = inputYs[i];
          // Control point pulls the curve horizontal out of the input before
          // it bends toward the brain — reads as directed flow, not a chord.
          const cx = (INPUT_X + BRAIN_X) / 2 + 30;
          const cy = y0;
          const pathOpacity = interpolate(
            frame,
            [STREAMS_START, STREAMS_START + 20],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );
          if (pathOpacity <= 0) return null;

          const particles = [];
          for (let p = 0; p < PARTICLES_PER_STREAM; p++) {
            // Staggered start per particle (and per stream) so the dots
            // travel as a spaced procession, looping until the scene ends.
            const offset = STREAMS_START + p * (PARTICLE_TRAVEL_FRAMES / PARTICLES_PER_STREAM) + i * 5;
            const elapsed = frame - offset;
            if (elapsed < 0) continue;
            const t = (elapsed / PARTICLE_TRAVEL_FRAMES) % 1;
            const [px, py] = quadPoint(t, INPUT_X, y0, cx, cy, BRAIN_X, BRAIN_Y);
            // Fade at both ends of the run so particles emerge from the
            // input and dissolve into the brain instead of popping.
            const edgeFade = Math.min(1, t / 0.12, (1 - t) / 0.12);
            particles.push(
              <circle
                key={p}
                cx={px}
                cy={py}
                r={PARTICLE_RADIUS}
                fill={s.color}
                opacity={edgeFade}
              />
            );
          }

          return (
            <g key={i} opacity={pathOpacity}>
              <path
                d={`M ${INPUT_X} ${y0} Q ${cx} ${cy} ${BRAIN_X} ${BRAIN_Y}`}
                fill="none"
                stroke={rgba(s.color, 0.18)}
                strokeWidth={2}
              />
              {particles}
            </g>
          );
        })}

        {/* Input nodes — staggered scale springs from frame 0 */}
        {signals.map((s, i) => {
          const enterFrame = i * INPUT_STAGGER;
          const scale = spring({
            frame: frame - enterFrame,
            fps,
            config: { stiffness: 180, damping: 15 },
            durationInFrames: 25,
          });
          if (scale <= 0) return null;
          const opacity = interpolate(frame, [enterFrame, enterFrame + 10], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const y = inputYs[i];
          return (
            <g key={i} opacity={opacity} transform={`translate(${INPUT_X}, ${y}) scale(${scale})`}>
              <circle
                r={INPUT_RADIUS}
                fill={rgba(s.color, 0.1)}
                stroke={s.color}
                strokeWidth={2}
              />
              <text
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={42}
              >
                {s.icon}
              </text>
              <text
                y={INPUT_RADIUS + 34}
                textAnchor="middle"
                fontSize={22}
                fontWeight={600}
                style={{ fill: colors.textPrimary, fontFamily: INTER }}
              >
                {s.label}
              </text>
            </g>
          );
        })}

        {/* Brain node — bloom entrance, breathing glow, processing pulse */}
        {brainScale > 0 && (
          <g transform={`translate(${BRAIN_X}, ${BRAIN_Y}) scale(${brainTotalScale})`}>
            <circle
              r={BRAIN_RADIUS * 2.1}
              fill="url(#signal-brain-glow)"
              opacity={glowBreath * (0.6 + 0.4 * pulseBright)}
            />
            <circle
              r={BRAIN_RADIUS}
              fill={rgba(accentColor, 0.1)}
              stroke={accentColor}
              strokeWidth={2}
            />
            <circle
              r={BRAIN_RADIUS - 16}
              fill="none"
              stroke={rgba(accentColor, 0.35)}
              strokeWidth={1.5}
            />
            <text
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={44}
            >
              🧠
            </text>
          </g>
        )}

        {/* Output label next to the brain */}
        {outputLabel && outputOpacity > 0 && (
          <text
            x={BRAIN_X}
            y={BRAIN_Y + BRAIN_RADIUS + 52 + outputRise}
            textAnchor="middle"
            fontSize={26}
            fontWeight={700}
            paintOrder="stroke"
            stroke={colors.bg}
            strokeWidth={7}
            strokeLinejoin="round"
            style={{ fill: colors.textPrimary, fontFamily: JETBRAINS_MONO }}
            opacity={outputOpacity}
          >
            {outputLabel}
          </text>
        )}
      </svg>
    </AbsoluteFill>
  );
};
