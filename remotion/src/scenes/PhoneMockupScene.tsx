import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { PhoneMockupSceneProps, PhoneMockupStateRange } from "../types";
import { BE_VIETNAM_PRO, colors } from "../styles";
import { AmbientBackground } from "../AmbientBackground";

const ENTER_FRAMES = 10;
const EXIT_FRAMES = 8;

const PHONE_W = 380;
const PHONE_H = 760;
const PHONE_R = 52;
const SCREEN_INSET = 10;
const STATUS_BAR_H = 40;
const NOTCH_W = 108;
const NOTCH_H = 24;

const PHONE_BODY = "#0d1117";
const PHONE_BORDER = "rgba(255,255,255,0.13)";
const SCREEN_BG = "#0f1520";

// ---------------------------------------------------------------------------
// Duration helper — pass to calculateMetadata or use as a fixed durationInFrames
// ---------------------------------------------------------------------------
export function calculatePhoneMockupDuration(
  states: Array<"idle" | "loading" | "matched">,
  fps: number,
  frameCounts?: Partial<Record<"idle" | "loading" | "matched", number>>
): number {
  const defaults: Record<"idle" | "loading" | "matched", number> = {
    idle: fps * 2,
    loading: Math.round(fps * 1.5),
    matched: fps * 3,
  };
  return states.reduce(
    (total, state) => total + (frameCounts?.[state] ?? defaults[state]),
    0
  );
}

// ---------------------------------------------------------------------------
// Effective state resolver
// ---------------------------------------------------------------------------
function resolveState(
  frame: number,
  fallback: "idle" | "loading" | "matched",
  idleRange?: PhoneMockupStateRange,
  loadingRange?: PhoneMockupStateRange,
  matchedRange?: PhoneMockupStateRange
): "idle" | "loading" | "matched" {
  if (matchedRange && frame >= matchedRange[0] && frame <= matchedRange[1]) return "matched";
  if (loadingRange && frame >= loadingRange[0] && frame <= loadingRange[1]) return "loading";
  if (idleRange && frame >= idleRange[0] && frame <= idleRange[1]) return "idle";
  return fallback;
}

// ---------------------------------------------------------------------------
// Sub-screens
// ---------------------------------------------------------------------------

// Converges a driver dot on the user's pin over the back ~80% of the scene,
// with a GPS-style pulse ring and a dashed trail — the map otherwise has no
// motion at all for the whole idle duration, which reads flat against a
// narration that's specifically describing a driver already en route.
const DriverApproachMarker: React.FC<{
  accentColor: string;
  frame: number;
  fps: number;
  durationInFrames: number;
}> = ({ accentColor, frame, fps, durationInFrames }) => {
  const enterFrame = Math.round(durationInFrames * 0.2);
  const travelEnd = Math.max(enterFrame + 40, durationInFrames - 45);

  const enter = spring({
    frame: frame - enterFrame,
    fps,
    from: 0,
    to: 1,
    config: { stiffness: 260, damping: 20 },
    durationInFrames: 18,
  });
  if (enter <= 0) return null;

  const travel = interpolate(frame, [enterFrame, travelEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Start near the map's far corner (reads as "600m away"), arrive just
  // beside the pin — stopping short keeps the pin as the visual anchor. Wide
  // span on purpose: a short twitch wouldn't register as "en route" at this
  // scale.
  const startX = 94, startY = 6;
  const endX = 54, endY = 44;
  const x = startX + (endX - startX) * travel;
  const y = startY + (endY - startY) * travel;

  const pulsePhase = ((frame - enterFrame) % 40) / 40;
  const angle = (Math.atan2(endY - startY, endX - startX) * 180) / Math.PI;

  return (
    <div style={{ position: "absolute", inset: 0, opacity: enter }}>
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        <line
          x1={`${x}%`}
          y1={`${y}%`}
          x2="50%"
          y2="46%"
          stroke={accentColor}
          strokeOpacity={0.3}
          strokeWidth={2}
          strokeDasharray="4 6"
        />
      </svg>
      {/* Pulsing GPS ping ring */}
      <div
        style={{
          position: "absolute",
          left: `${x}%`,
          top: `${y}%`,
          width: 24,
          height: 24,
          borderRadius: "50%",
          border: `2px solid ${accentColor}`,
          transform: `translate(-50%, -50%) scale(${1 + pulsePhase * 1.4})`,
          opacity: 0.6 * (1 - pulsePhase),
        }}
      />
      {/* Driver marker */}
      <div
        style={{
          position: "absolute",
          left: `${x}%`,
          top: `${y}%`,
          transform: `translate(-50%, -50%) rotate(${angle}deg)`,
        }}
      >
        <svg width="24" height="17" viewBox="0 0 28 20" fill="none">
          <rect x="2" y="6" width="24" height="12" rx="3" fill={accentColor} opacity={0.95} />
          <rect x="6" y="2" width="14" height="8" rx="2" fill={accentColor} opacity={0.75} />
          <circle cx="7" cy="18" r="3" fill="rgba(255,255,255,0.9)" />
          <circle cx="21" cy="18" r="3" fill="rgba(255,255,255,0.9)" />
        </svg>
      </div>
    </div>
  );
};

// Deterministic pseudo-random stream (mulberry32) so raindrop layout is
// stable across re-renders instead of reshuffling every frame.
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const RAIN_DROP_COUNT = 34;
const rand = mulberry32(20240611);
const RAIN_DROPS = Array.from({ length: RAIN_DROP_COUNT }, () => ({
  x: rand() * 100,
  seed: rand() * 100,
  speed: 1.6 + rand() * 1.2,
  length: 14 + rand() * 14,
  drift: -3 + rand() * 6,
}));

// Falling rain streaks over the map — the narration is specifically about
// live weather data driving demand, so the idle map needs its own motion
// cue rather than sitting static for the whole scene.
const RainOverlay: React.FC<{ frame: number }> = ({ frame }) => (
  <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
    {RAIN_DROPS.map((d, i) => {
      const cyclePx = 340; // travel distance before looping back above the frame
      const y = ((frame * d.speed + d.seed * 10) % cyclePx) - 40;
      return (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${d.x + (y / cyclePx) * d.drift}%`,
            top: y,
            width: 2,
            height: d.length,
            borderRadius: 1,
            background: "linear-gradient(rgba(140,200,255,0), rgba(140,200,255,0.55))",
            transform: "rotate(8deg)",
          }}
        />
      );
    })}
    {/* Cool wash + faint pulse to sell "rain" without obscuring the map */}
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(70,120,190,0.06)",
      }}
    />
  </div>
);

const IdleScreen: React.FC<{
  buttonLabel: string;
  accentColor: string;
  frame: number;
  fps: number;
  durationInFrames: number;
  showApproachingDriver?: boolean;
  weatherEffect?: "rain";
}> = ({ buttonLabel, accentColor, frame, fps, durationInFrames, showApproachingDriver, weatherEffect }) => {
  const btnScale = spring({
    frame: frame - ENTER_FRAMES,
    fps,
    from: 0.8,
    to: 1,
    config: { stiffness: 280, damping: 18 },
    durationInFrames: 20,
  });

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
      {/* Map placeholder */}
      <div
        style={{
          flex: 1,
          background: SCREEN_BG,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Grid lines to suggest a map */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        {/* Road lines */}
        <div
          style={{
            position: "absolute",
            top: "30%",
            left: 0,
            right: 0,
            height: 2,
            backgroundColor: "rgba(255,255,255,0.06)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "60%",
            left: 0,
            right: 0,
            height: 2,
            backgroundColor: "rgba(255,255,255,0.06)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: "40%",
            width: 2,
            backgroundColor: "rgba(255,255,255,0.06)",
          }}
        />
        {/* Location pin SVG at center */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -60%)",
          }}
        >
          <svg width="32" height="40" viewBox="0 0 32 40" fill="none">
            <circle cx="16" cy="14" r="13" fill={accentColor} opacity={0.9} />
            <circle cx="16" cy="14" r="6" fill="#fff" opacity={0.95} />
            <path d="M16 27 L9 14 Q9 1 16 1 Q23 1 23 14 Z" fill={accentColor} opacity={0.9} />
            <circle cx="16" cy="36" r="3" fill="rgba(0,0,0,0.25)" />
          </svg>
        </div>

        {showApproachingDriver && (
          <DriverApproachMarker
            accentColor={accentColor}
            frame={frame}
            fps={fps}
            durationInFrames={durationInFrames}
          />
        )}

        {weatherEffect === "rain" && <RainOverlay frame={frame} />}
      </div>

      {/* Bottom action area */}
      <div
        style={{
          padding: "16px 20px 20px",
          backgroundColor: PHONE_BODY,
          borderTop: `1px solid ${PHONE_BORDER}`,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "rgba(255,255,255,0.4)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            marginBottom: 10,
            fontFamily: BE_VIETNAM_PRO,
          }}
        >
          Vị trí của bạn
        </div>
        <div
          style={{
            fontSize: 13,
            color: "rgba(255,255,255,0.75)",
            marginBottom: 16,
            fontFamily: BE_VIETNAM_PRO,
          }}
        >
          123 Nguyễn Huệ, Q.1, TP.HCM
        </div>
        {/* Book button */}
        <div
          style={{
            backgroundColor: accentColor,
            borderRadius: 14,
            padding: "14px 0",
            textAlign: "center",
            transform: `scale(${btnScale})`,
          }}
        >
          <span
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "#0a0a0f",
              fontFamily: BE_VIETNAM_PRO,
            }}
          >
            {buttonLabel}
          </span>
        </div>
      </div>
    </div>
  );
};

const LoadingScreen: React.FC<{
  accentColor: string;
  frame: number;
}> = ({ accentColor, frame }) => {
  // Continuous rotation — extrapolateRight: "extend" removes the clamp
  const rotation = interpolate(frame, [0, 60], [0, 360], {
    extrapolateLeft: "extend",
    extrapolateRight: "extend",
  });

  const dotPulse = (offset: number) =>
    0.3 + 0.7 * Math.abs(Math.sin(((frame + offset) * Math.PI) / 20));

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
      }}
    >
      {/* Spinner ring */}
      <svg
        width="64"
        height="64"
        viewBox="0 0 64 64"
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        <circle
          cx="32"
          cy="32"
          r="26"
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="5"
        />
        <circle
          cx="32"
          cy="32"
          r="26"
          fill="none"
          stroke={accentColor}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray="50 114"
          strokeDashoffset="0"
        />
      </svg>

      <div
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: "rgba(255,255,255,0.6)",
          fontFamily: BE_VIETNAM_PRO,
          textAlign: "center",
        }}
      >
        Đang tìm tài xế...
      </div>

      {/* Animated dots */}
      <div style={{ display: "flex", gap: 8 }}>
        {[0, 20, 40].map((offset, i) => (
          <div
            key={i}
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              backgroundColor: accentColor,
              opacity: dotPulse(offset),
            }}
          />
        ))}
      </div>
    </div>
  );
};

const MatchedScreen: React.FC<{
  driverName: string;
  driverEta: string;
  accentColor: string;
  cardY: number;
  cardOpacity: number;
}> = ({ driverName, driverEta, accentColor, cardY, cardOpacity }) => {
  // Derive initials for avatar
  const initials = driverName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {/* Map background (same as idle) */}
      <div style={{ position: "absolute", inset: 0, background: SCREEN_BG, overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        {/* Moving car marker */}
        <div
          style={{
            position: "absolute",
            top: "35%",
            left: "45%",
            fontSize: 22,
            transform: "rotate(-30deg)",
          }}
        >
          <svg width="28" height="20" viewBox="0 0 28 20" fill="none">
            <rect x="2" y="6" width="24" height="12" rx="3" fill={accentColor} opacity={0.9} />
            <rect x="6" y="2" width="14" height="8" rx="2" fill={accentColor} opacity={0.7} />
            <circle cx="7" cy="18" r="3" fill="rgba(255,255,255,0.9)" />
            <circle cx="21" cy="18" r="3" fill="rgba(255,255,255,0.9)" />
          </svg>
        </div>
      </div>

      {/* Driver card — springs up from bottom */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          transform: `translateY(${cardY}px)`,
          opacity: cardOpacity,
        }}
      >
        <div
          style={{
            backgroundColor: PHONE_BODY,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            borderTop: `1px solid ${PHONE_BORDER}`,
            padding: "18px 20px 24px",
          }}
        >
          {/* Handle bar */}
          <div
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: "rgba(255,255,255,0.2)",
              margin: "0 auto 16px",
            }}
          />

          {/* Status label */}
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: accentColor,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              marginBottom: 14,
              fontFamily: BE_VIETNAM_PRO,
            }}
          >
            Đã tìm thấy tài xế
          </div>

          {/* Driver row */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
            {/* Avatar */}
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                backgroundColor: accentColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#0a0a0f",
                  fontFamily: BE_VIETNAM_PRO,
                }}
              >
                {initials}
              </span>
            </div>

            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: colors.textPrimary,
                  fontFamily: BE_VIETNAM_PRO,
                  marginBottom: 3,
                }}
              >
                {driverName}
              </div>
              {/* Star rating */}
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <svg key={s} width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M6 1l1.236 2.508L10 3.918l-2 1.948.472 2.753L6 7.258 3.528 8.619 4 5.866 2 3.918l2.764-.41L6 1z"
                      fill={s <= 4 ? accentColor : "rgba(255,255,255,0.2)"}
                    />
                  </svg>
                ))}
                <span
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.45)",
                    fontFamily: BE_VIETNAM_PRO,
                    marginLeft: 2,
                  }}
                >
                  4.8
                </span>
              </div>
            </div>

            {/* ETA badge */}
            <div
              style={{
                backgroundColor: "rgba(255,255,255,0.07)",
                borderRadius: 10,
                padding: "8px 12px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: colors.textPrimary,
                  fontFamily: BE_VIETNAM_PRO,
                  lineHeight: 1,
                }}
              >
                {driverEta}
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: "rgba(255,255,255,0.4)",
                  fontFamily: BE_VIETNAM_PRO,
                  marginTop: 2,
                  letterSpacing: "0.04em",
                }}
              >
                PHÚT
              </div>
            </div>
          </div>

          {/* Confirm button */}
          <div
            style={{
              backgroundColor: accentColor,
              borderRadius: 12,
              padding: "13px 0",
              textAlign: "center",
            }}
          >
            <span
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "#0a0a0f",
                fontFamily: BE_VIETNAM_PRO,
              }}
            >
              Xác nhận chuyến đi
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const PhoneMockupScene: React.FC<PhoneMockupSceneProps> = ({
  screenState,
  driverName,
  driverEta,
  accentColor,
  buttonLabel = "Đặt xe",
  idleRange,
  loadingRange,
  matchedRange,
  showApproachingDriver,
  weatherEffect,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const hasExitRoom = durationInFrames > ENTER_FRAMES + EXIT_FRAMES;
  const sceneOpacity = interpolate(
    frame,
    hasExitRoom
      ? [0, ENTER_FRAMES, durationInFrames - EXIT_FRAMES, durationInFrames]
      : [0, durationInFrames],
    hasExitRoom ? [0, 1, 1, 0] : [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const sceneY = interpolate(frame, [0, ENTER_FRAMES], [24, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const effective = resolveState(frame, screenState, idleRange, loadingRange, matchedRange);

  // Card spring: anchored to when "matched" state starts
  const matchedStartFrame = matchedRange?.[0] ?? (effective === "matched" ? 0 : 0);
  const cardSpring = spring({
    frame: frame - matchedStartFrame,
    fps,
    from: 0,
    to: 1,
    config: { stiffness: 200, damping: 24 },
    durationInFrames: 28,
  });
  const cardY = interpolate(cardSpring, [0, 1], [220, 0]);
  const cardOpacity = interpolate(cardSpring, [0, 0.3], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.bg,
        opacity: sceneOpacity,
        transform: `translateY(${sceneY}px)`,
      }}
    >
      <AmbientBackground accent={accentColor} />

      {/* Phone centered in canvas */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Phone body */}
        <div
          style={{
            width: PHONE_W,
            height: PHONE_H,
            borderRadius: PHONE_R,
            backgroundColor: PHONE_BODY,
            border: `2px solid ${PHONE_BORDER}`,
            position: "relative",
            overflow: "hidden",
            filter: "drop-shadow(0 12px 40px rgba(0,0,0,0.7))",
          }}
        >
          {/* Notch */}
          <div
            style={{
              position: "absolute",
              top: 16,
              left: "50%",
              transform: "translateX(-50%)",
              width: NOTCH_W,
              height: NOTCH_H,
              backgroundColor: PHONE_BODY,
              borderRadius: NOTCH_H / 2,
              zIndex: 10,
              border: `2px solid ${PHONE_BORDER}`,
            }}
          />

          {/* Screen */}
          <div
            style={{
              position: "absolute",
              top: SCREEN_INSET,
              left: SCREEN_INSET,
              right: SCREEN_INSET,
              bottom: SCREEN_INSET,
              borderRadius: PHONE_R - SCREEN_INSET,
              backgroundColor: SCREEN_BG,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              fontFamily: BE_VIETNAM_PRO,
            }}
          >
            {/* Status bar */}
            <div
              style={{
                height: STATUS_BAR_H,
                backgroundColor: "rgba(0,0,0,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 18px",
                flexShrink: 0,
                zIndex: 5,
              }}
            >
              <span
                style={{
                  color: "rgba(255,255,255,0.65)",
                  fontSize: 11,
                  fontWeight: 600,
                  fontFamily: BE_VIETNAM_PRO,
                }}
              >
                9:41
              </span>
              <span
                style={{
                  color: "rgba(255,255,255,0.65)",
                  fontSize: 10,
                  fontFamily: BE_VIETNAM_PRO,
                }}
              >
                ▌▌▌  100%
              </span>
            </div>

            {/* App name header */}
            <div
              style={{
                padding: "10px 18px 8px",
                borderBottom: `1px solid ${PHONE_BORDER}`,
                flexShrink: 0,
                backgroundColor: PHONE_BODY,
              }}
            >
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: accentColor,
                  fontFamily: BE_VIETNAM_PRO,
                  letterSpacing: "-0.02em",
                }}
              >
                RideApp
              </span>
            </div>

            {/* Content area */}
            <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
              {effective === "idle" && (
                <IdleScreen
                  buttonLabel={buttonLabel}
                  accentColor={accentColor}
                  frame={frame}
                  fps={fps}
                  durationInFrames={durationInFrames}
                  showApproachingDriver={showApproachingDriver}
                  weatherEffect={weatherEffect}
                />
              )}
              {effective === "loading" && (
                <LoadingScreen accentColor={accentColor} frame={frame} />
              )}
              {effective === "matched" && (
                <MatchedScreen
                  driverName={driverName}
                  driverEta={driverEta}
                  accentColor={accentColor}
                  cardY={cardY}
                  cardOpacity={cardOpacity}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
