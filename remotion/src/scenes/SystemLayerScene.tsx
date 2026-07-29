import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { SystemLayerSceneProps, SystemLayer } from "../types";
import { CAPTION_CLEAR_Y, colors, INTER } from "../styles";
import { VectorIconHtml } from "../icons";

export type { SystemLayerSceneProps, SystemLayer };

// ---------------------------------------------------------------------------
// Frame plan — BASE = the start frame of the topmost (last-index) layer's
// slide-in, since that's the active layer arriving on top of the stack. The
// spec's "(last layer +20) → +40", "+40 → +60", "+60 → end" rows share this
// same BASE:
//   0–20                    headline fade in
//   20 + i*staggerFrames    layer i slides in (translateY 40→0) + fades in,
//                            i=0 (bottom) first, i=n-1 (top/active) last
//   BASE+20 → BASE+40       active layer scale 1→1.02 + glow intensifies
//   BASE+40 → BASE+60       bodyText fade in
//   BASE+60 → end           all layers pulse together every 30 frames,
//                            looped via (frame - BASE-60) % 30, no CSS
//                            animation / setInterval
// ---------------------------------------------------------------------------
const CANVAS_W = 1080;
const CANVAS_H = 1920;

const HEADLINE_TOP_FRACTION = 0.15;
const STACK_TOP_FRACTION = 0.3;
// Stack bottom and bodyText must clear CAPTION_CLEAR_Y (the bottom caption
// pill can grow to 5-6 lines for long Vietnamese narration) — derive both
// fractions from it instead of hardcoded values that land past it.
const STACK_BOTTOM_FRACTION = (CAPTION_CLEAR_Y - 130) / CANVAS_H;
const BODY_TEXT_TOP_FRACTION = (CAPTION_CLEAR_Y - 90) / CANVAS_H;

const BASE_LAYER_W = CANVAS_W * 0.85;
const BASE_LAYER_H = 80;
const LAYER_GAP = 8;
const ACTIVE_SIZE_BOOST = 10; // active layer is +10px wider and +10px taller
const CONNECTOR_LENGTH = 8;

const HEADLINE_START = 0;
const HEADLINE_END = 20;
const LAYER_ENTER_DURATION = 20;
const ACTIVE_PULSE_DURATION = 20; // BASE+20 -> BASE+40
const BODY_TEXT_DURATION = 20; // BASE+40 -> BASE+60
const SYSTEM_PULSE_PERIOD = 30;

const GLOW_BASE_PX = 12;
const GLOW_PEAK_PX = 20;
const GLOW_BASE_ALPHA = 0.3;
const GLOW_PEAK_ALPHA = 0.45;

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

export const SystemLayerScene: React.FC<SystemLayerSceneProps> = ({
  headline = "Ba mảnh ghép của một hệ thống",
  layers,
  accentColor = "#00ff41",
  bodyText,
  staggerFrames = 35,
  payoff,
}) => {
  const frame = useCurrentFrame();
  const n = layers.length;

  const layerStart = (i: number) => HEADLINE_END + i * staggerFrames;
  const lastLayerStart = layerStart(n - 1);
  const BASE = lastLayerStart;

  const activePulseStart = BASE + 20;
  const activePulseEnd = activePulseStart + ACTIVE_PULSE_DURATION;
  const bodyTextStart = activePulseEnd;
  const bodyTextEnd = bodyTextStart + BODY_TEXT_DURATION;
  const systemPulseStart = bodyTextEnd;

  const headlineOpacity = interpolate(frame, [HEADLINE_START, HEADLINE_END], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const activeScale = interpolate(frame, [activePulseStart, activePulseEnd], [1, 1.02], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const activeGlowPx = interpolate(frame, [activePulseStart, activePulseEnd], [GLOW_BASE_PX, GLOW_PEAK_PX], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const activeGlowAlpha = interpolate(
    frame,
    [activePulseStart, activePulseEnd],
    [GLOW_BASE_ALPHA, GLOW_PEAK_ALPHA],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const bodyTextOpacity = interpolate(frame, [bodyTextStart, bodyTextEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const systemPulsePhase = frame >= systemPulseStart ? (frame - systemPulseStart) % SYSTEM_PULSE_PERIOD : 0;
  const pulseAlphaBoost =
    frame >= systemPulseStart
      ? interpolate(systemPulsePhase, [0, SYSTEM_PULSE_PERIOD / 2, SYSTEM_PULSE_PERIOD], [0, 0.05, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 0;

  // Layout: index n-1 (top/active-most-recent) is placed first (topmost),
  // walking down to index 0 (bottom), so each layer's vertical position is
  // derived purely from base sizes — no hardcoded per-index pixel offsets.
  const stackTop = CANVAS_H * STACK_TOP_FRACTION;
  const stackBottom = CANVAS_H * STACK_BOTTOM_FRACTION;
  const heights = layers.map((l) => (l.isActive ? BASE_LAYER_H + ACTIVE_SIZE_BOOST : BASE_LAYER_H));
  const totalStackHeight = heights.reduce((a, b) => a + b, 0) + LAYER_GAP * (n - 1);
  const stackStartTop = stackTop + (stackBottom - stackTop - totalStackHeight) / 2;

  const layerTops: number[] = new Array(n);
  let cumTop = stackStartTop;
  for (let i = n - 1; i >= 0; i--) {
    layerTops[i] = cumTop;
    cumTop += heights[i] + LAYER_GAP;
  }

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      <div
        style={{
          position: "absolute",
          top: CANVAS_H * HEADLINE_TOP_FRACTION,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: headlineOpacity,
          fontFamily: `${INTER}, sans-serif`,
          fontSize: 38,
          fontWeight: 800,
          letterSpacing: "-0.01em",
          color: colors.textPrimary,
          padding: "0 48px",
        }}
      >
        {headline}
      </div>

      {/* Connector dashes between adjacent layers — SVG only, no CSS border */}
      <svg
        width={CANVAS_W}
        height={CANVAS_H}
        viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
        style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
      >
        {layers.slice(0, n - 1).map((_, i) => {
          const start = layerStart(i + 1);
          const opacity = interpolate(frame, [start, start + LAYER_ENTER_DURATION], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          if (opacity <= 0) return null;
          // Midpoint of the gap between layer i's top edge and layer i+1's bottom edge.
          const y = (layerTops[i] + (layerTops[i + 1] + heights[i + 1])) / 2;
          return (
            <line
              key={i}
              x1={CANVAS_W / 2 - CONNECTOR_LENGTH / 2}
              x2={CANVAS_W / 2 + CONNECTOR_LENGTH / 2}
              y1={y}
              y2={y}
              stroke="rgba(0,0,0,0.1)"
              strokeWidth={1}
              strokeDasharray="4 4"
              opacity={opacity}
            />
          );
        })}
      </svg>

      {layers.map((layer, i) => {
        const start = layerStart(i);
        const enterOpacity = interpolate(frame, [start, start + LAYER_ENTER_DURATION], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        if (enterOpacity <= 0) return null;
        const translateY = interpolate(frame, [start, start + LAYER_ENTER_DURATION], [40, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        const isActive = !!layer.isActive;
        const layerColor = layer.color ?? accentColor;
        const width = isActive ? BASE_LAYER_W + ACTIVE_SIZE_BOOST : BASE_LAYER_W;
        const height = heights[i];
        const top = layerTops[i];

        const baseFillAlpha = isActive ? 0.1 : 0.05;
        const fillAlpha = baseFillAlpha + pulseAlphaBoost;
        const background = isActive ? rgba(layerColor, fillAlpha) : `rgba(0,0,0,${fillAlpha})`;
        const border = isActive ? `1px solid ${layerColor}` : "1px solid rgba(0,0,0,0.1)";
        const filter = isActive ? `drop-shadow(0 0 ${activeGlowPx}px ${rgba(layerColor, activeGlowAlpha)})` : undefined;
        const scale = isActive ? activeScale : 1;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              top,
              left: (CANVAS_W - width) / 2,
              width,
              height,
              borderRadius: 12,
              background,
              border,
              filter,
              opacity: enterOpacity,
              transform: `translateY(${translateY}px) scale(${scale})`,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              textAlign: "center",
              padding: "0 24px",
              boxSizing: "border-box",
            }}
          >
            <span
              style={{
                fontFamily: `${INTER}, sans-serif`,
                fontSize: 26,
                fontWeight: isActive ? 800 : 700,
                color: isActive ? colors.textPrimary : "rgba(0,0,0,0.78)",
              }}
            >
              {layer.label}
            </span>
            {layer.sublabel && (
              <span
                style={{
                  marginTop: 4,
                  fontFamily: `${INTER}, sans-serif`,
                  fontSize: 16,
                  fontWeight: 500,
                  color: isActive ? rgba(layerColor, 0.7) : "rgba(0,0,0,0.45)",
                }}
              >
                {layer.sublabel}
              </span>
            )}
          </div>
        );
      })}

      {payoff ? (
        <div
          style={{
            position: "absolute",
            top: CANVAS_H * BODY_TEXT_TOP_FRACTION,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            gap: 14,
            opacity: bodyTextOpacity,
            padding: "0 40px",
          }}
        >
          {payoff.steps.map((step, i) => {
            const stepFrame = bodyTextStart + i * 8;
            const stepOpacity = interpolate(frame, [stepFrame, stepFrame + 14], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            return (
              <React.Fragment key={i}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                    opacity: stepOpacity,
                    width: 96,
                  }}
                >
                  <VectorIconHtml name={step.icon} size={38} color={accentColor} />
                  <span
                    style={{
                      fontFamily: `${INTER}, sans-serif`,
                      fontSize: 16,
                      fontWeight: 700,
                      color: "rgba(0,0,0,0.7)",
                      textAlign: "center",
                      lineHeight: 1.2,
                    }}
                  >
                    {step.label}
                  </span>
                </div>
                {i < payoff.steps.length - 1 && (
                  <div style={{ fontSize: 20, color: "rgba(0,0,0,0.35)", marginTop: 14, opacity: stepOpacity }}>→</div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      ) : (
        bodyText && (
          <div
            style={{
              position: "absolute",
              top: CANVAS_H * BODY_TEXT_TOP_FRACTION,
              left: 0,
              right: 0,
              textAlign: "center",
              opacity: bodyTextOpacity,
              fontFamily: `${INTER}, sans-serif`,
              fontSize: 16,
              color: "rgba(0,0,0,0.45)",
              padding: "0 64px",
            }}
          >
            {bodyText}
          </div>
        )
      )}
    </AbsoluteFill>
  );
};
