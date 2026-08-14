import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  PhoneMockupSceneProps,
  PhoneMockupStateRange,
  PhoneMockupCheckoutVoucher,
  PhoneMockupCheckoutTap,
  PhoneMockupVoucherFlow,
  PhoneMockupVoucherListItem,
  PhoneMockupForensicReplay,
  PhoneMockupForensicPhase,
  PhoneMockupSplitScreen,
  PhoneMockupMobileBrowser,
} from "../types";
import { BE_VIETNAM_PRO, colors } from "../styles";
import { AmbientBackground } from "../AmbientBackground";
import { GoogleMapsIcon } from "../icons/GoogleMapsIcon";
import { XanhSMBirdIcon } from "./shared/greensmBikePalette";

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
  fallback:
    | "idle"
    | "loading"
    | "matched"
    | "checkout"
    | "voucherFlow"
    | "forensicReplay"
    | "splitScreen"
    | "mobileBrowser",
  idleRange?: PhoneMockupStateRange,
  loadingRange?: PhoneMockupStateRange,
  matchedRange?: PhoneMockupStateRange
):
  | "idle"
  | "loading"
  | "matched"
  | "checkout"
  | "voucherFlow"
  | "forensicReplay"
  | "splitScreen"
  | "mobileBrowser" {
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
  label: string;
}> = ({ accentColor, frame, label }) => {
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
        {label}
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
  statusLabel: string;
  confirmLabel: string;
  kind?: "driver" | "route";
}> = ({ driverName, driverEta, accentColor, cardY, cardOpacity, statusLabel, confirmLabel, kind = "driver" }) => {
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
            {statusLabel}
          </div>

          {/* Result row */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
            {/* Avatar / route glyph */}
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
              {kind === "route" ? (
                <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
                  <path
                    d="M7 23c6 0 4-16 12-16h4"
                    stroke="#0a0a0f"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <circle cx="7" cy="23" r="3" fill="#0a0a0f" />
                  <path d="M22 4l4 3-4 3V4z" fill="#0a0a0f" />
                </svg>
              ) : (
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
              )}
            </div>

            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.92)",
                  fontFamily: BE_VIETNAM_PRO,
                  marginBottom: 3,
                }}
              >
                {driverName}
              </div>
              {kind === "route" ? (
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.45)",
                    fontFamily: BE_VIETNAM_PRO,
                  }}
                >
                  ETA dự kiến
                </span>
              ) : (
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
              )}
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
                  color: "rgba(255,255,255,0.92)",
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
              {confirmLabel}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// UI-forensic checkout screen: a neutral ride-booking checkout with two
// voucher rows. One row is the applied discount (accent-filled "applied"
// badge); the other is scripted to highlight briefly on tap, then revert —
// proving the tap registers but never changes which code gets applied.
const CheckoutScreen: React.FC<{
  vouchers: PhoneMockupCheckoutVoucher[];
  tap?: PhoneMockupCheckoutTap;
  totalLabel: string;
  rideLabel: string;
  accentColor: string;
  frame: number;
  fps: number;
}> = ({ vouchers, tap, totalLabel, rideLabel, accentColor, frame, fps }) => {
  const rowsIn = interpolate(frame, [0, 16], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const tapVoucherHighlight = (code: string): number => {
    if (!tap || tap.voucherCode !== code) return 0;
    const hold = tap.holdFrames ?? 20;
    return interpolate(
      frame,
      [tap.tapFrame, tap.tapFrame + 6, tap.tapFrame + hold, tap.tapFrame + hold + 10],
      [0, 1, 1, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
  };

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        padding: "20px 18px",
        gap: 14,
        opacity: rowsIn,
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "rgba(255,255,255,0.4)",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          fontFamily: BE_VIETNAM_PRO,
        }}
      >
        {rideLabel}
      </div>

      {vouchers.map((v) => {
        const tapGlow = tapVoucherHighlight(v.code);
        const isLit = v.applied || tapGlow > 0;
        return (
          <div
            key={v.code}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 18px",
              borderRadius: 16,
              backgroundColor: v.applied ? `${accentColor}1a` : "rgba(255,255,255,0.04)",
              border: `2px solid ${
                v.applied
                  ? accentColor
                  : tapGlow > 0
                  ? accentColor
                  : "rgba(255,255,255,0.12)"
              }`,
              opacity: v.applied ? 1 : 0.4 + 0.6 * tapGlow,
            }}
          >
            <span
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: isLit ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.55)",
                fontFamily: BE_VIETNAM_PRO,
              }}
            >
              {v.code}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  color: isLit ? accentColor : "rgba(255,255,255,0.4)",
                  fontFamily: BE_VIETNAM_PRO,
                }}
              >
                {v.amountLabel}
              </span>
              {v.applied && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#0a0a0f",
                    backgroundColor: accentColor,
                    borderRadius: 999,
                    padding: "4px 9px",
                    letterSpacing: "0.04em",
                    fontFamily: BE_VIETNAM_PRO,
                  }}
                >
                  ĐANG ÁP
                </span>
              )}
            </div>
          </div>
        );
      })}

      <div style={{ flex: 1 }} />

      <div
        style={{
          borderTop: "1px solid rgba(255,255,255,0.1)",
          paddingTop: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "rgba(255,255,255,0.6)",
            fontFamily: BE_VIETNAM_PRO,
          }}
        >
          Tổng thanh toán
        </span>
        <span
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "rgba(255,255,255,0.92)",
            fontFamily: BE_VIETNAM_PRO,
          }}
        >
          {totalLabel}
        </span>
      </div>
    </div>
  );
};

// One real screen, physically split top/bottom into two simultaneous states
// (e.g. voucher list still showing 20K over checkout applying 8K) instead of
// two floating side-by-side text panels — the contradiction reads as one
// screenshot. Top half settles in first, the divider draws across, then the
// bottom half settles in — so it plays as a reveal, not a static split.
const SplitScreenView: React.FC<{
  split: PhoneMockupSplitScreen;
  accentColor: string;
  frame: number;
  fps: number;
}> = ({ split, accentColor, frame, fps }) => {
  const topSpring = spring({ frame, fps, config: { stiffness: 200, damping: 22 }, durationInFrames: 18 });
  const dividerFrame = 16;
  const dividerWidth = interpolate(frame, [dividerFrame, dividerFrame + 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const bottomSpring = spring({
    frame: frame - (dividerFrame + 10),
    fps,
    config: { stiffness: 200, damping: 22 },
    durationInFrames: 18,
  });

  const Half: React.FC<{ label: string; heading: string; body: string; s: number }> = ({ label, heading, body, s }) => (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        opacity: s,
        transform: `translateY(${interpolate(s, [0, 1], [14, 0])}px)`,
      }}
    >
      <span
        style={{
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.4)",
          fontFamily: BE_VIETNAM_PRO,
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 44, fontWeight: 700, color: accentColor, fontFamily: BE_VIETNAM_PRO, lineHeight: 1 }}>
        {heading}
      </span>
      <span style={{ fontSize: 17, fontWeight: 600, color: "rgba(255,255,255,0.85)", fontFamily: BE_VIETNAM_PRO, textAlign: "center" }}>
        {body}
      </span>
    </div>
  );

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
      <Half label={split.topLabel} heading={split.topHeading} body={split.topBody} s={topSpring} />
      <div style={{ position: "relative", height: 1, flexShrink: 0 }}>
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 0,
            height: 1,
            width: `${dividerWidth * 100}%`,
            transform: "translateX(-50%)",
            backgroundColor: `${accentColor}55`,
          }}
        />
      </div>
      <Half label={split.bottomLabel} heading={split.bottomHeading} body={split.bottomBody} s={bottomSpring} />
    </div>
  );
};

// Compact in-app URL bar + a scrolling FAQ list that lands on the target
// line, all inside the real phone frame — mobile counterpart of
// QuoteCalloutScene's floating desktop browser card, kept on-device so the
// "browser evidence" beat matches the phone-mockup shots around it.
const MobileBrowserScreen: React.FC<{
  browser: PhoneMockupMobileBrowser;
  accentColor: string;
  frame: number;
}> = ({ browser, accentColor, frame }) => {
  const { urlLabel, scrollLines, highlightLine, scrollDurationFrames } = browser;
  const ROW_STEP = 46;
  const WINDOW_H = ROW_STEP * 3 + 20;
  const contentH = (scrollLines.length + 1) * ROW_STEP;
  const maxScroll = Math.max(0, contentH - WINDOW_H);
  const scrollY = -interpolate(frame, [10, 10 + scrollDurationFrames], [0, maxScroll], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const settled = interpolate(
    frame,
    [10 + scrollDurationFrames, 10 + scrollDurationFrames + 10],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
      <div
        style={{
          margin: "16px 18px 10px",
          padding: "9px 14px",
          borderRadius: 10,
          backgroundColor: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.1)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>🔒</span>
        <span style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.55)", fontFamily: BE_VIETNAM_PRO }}>
          {urlLabel}
        </span>
      </div>
      <div style={{ height: WINDOW_H, overflow: "hidden", position: "relative", padding: "0 18px" }}>
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 18,
            right: 18,
            transform: `translateY(${scrollY}px)`,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {scrollLines.map((line, i) => (
            <div
              key={i}
              style={{
                fontFamily: BE_VIETNAM_PRO,
                fontSize: 15,
                fontWeight: 500,
                color: "rgba(255,255,255,0.32)",
                lineHeight: 1.35,
              }}
            >
              {line}
            </div>
          ))}
          <div
            style={{
              fontFamily: BE_VIETNAM_PRO,
              fontWeight: 700,
              fontSize: 18,
              lineHeight: 1.35,
              color: settled > 0.5 ? accentColor : "rgba(255,255,255,0.55)",
              textShadow: settled > 0.5 ? `0 0 ${10 * settled}px ${accentColor}` : "none",
            }}
          >
            {highlightLine}
          </div>
        </div>
      </div>
    </div>
  );
};

// One continuous forensic beat: a membership voucher list scrolls the tap
// target into view, taps it (brief highlight, same "registers but doesn't
// change what's applied" language as CheckoutScreen's tap), then hard-slides
// up into the checkout screen. checkoutTap.tapFrame (if present) is relative
// to `flow.transitionFrame`, not to the shot's own frame 0.
const VoucherFlowScreen: React.FC<{
  flow: PhoneMockupVoucherFlow;
  accentColor: string;
  frame: number;
  fps: number;
}> = ({ flow, accentColor, frame, fps }) => {
  const {
    listHeading,
    items,
    scrollFrame,
    tapItemLabel,
    tapFrame,
    transitionFrame,
    checkoutVouchers,
    checkoutTap,
    checkoutTotalLabel,
    checkoutRideLabel,
  } = flow;

  const ROW_H = 78;
  const tapIndex = Math.max(0, items.findIndex((it) => it.label === tapItemLabel));
  const scrollY = interpolate(frame, [0, scrollFrame], [0, -tapIndex * ROW_H], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const tapHighlight = interpolate(
    frame,
    [tapFrame, tapFrame + 6, tapFrame + 16, tapFrame + 24],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const transitionProgress = interpolate(frame, [transitionFrame, transitionFrame + 16], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {/* List layer — scrolls, taps, then slides fully up out of frame */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          transform: `translateY(${-transitionProgress * 100}%)`,
          opacity: 1 - transitionProgress,
        }}
      >
        <div
          style={{
            padding: "20px 18px 12px",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.4)",
            fontFamily: BE_VIETNAM_PRO,
            flexShrink: 0,
          }}
        >
          {listHeading}
        </div>
        <div style={{ position: "relative", flex: 1, overflow: "hidden" }}>
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              transform: `translateY(${scrollY}px)`,
              padding: "0 18px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {items.map((it) => {
              const isTapRow = it.label === tapItemLabel;
              const glow = isTapRow ? tapHighlight : 0;
              return (
                <div
                  key={it.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "16px 18px",
                    borderRadius: 16,
                    backgroundColor: glow > 0 ? `${accentColor}1a` : "rgba(255,255,255,0.04)",
                    border: `2px solid ${glow > 0 ? accentColor : "rgba(255,255,255,0.12)"}`,
                  }}
                >
                  <span
                    style={{
                      fontSize: 17,
                      fontWeight: 700,
                      color: "rgba(255,255,255,0.92)",
                      fontFamily: BE_VIETNAM_PRO,
                    }}
                  >
                    {it.label}
                  </span>
                  <span
                    style={{
                      fontSize: 17,
                      fontWeight: 700,
                      color: glow > 0 ? accentColor : "rgba(255,255,255,0.6)",
                      fontFamily: BE_VIETNAM_PRO,
                    }}
                  >
                    {it.amountLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Checkout layer — hard-slides up from below as the list exits */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `translateY(${(1 - transitionProgress) * 100}%)`,
        }}
      >
        <CheckoutScreen
          vouchers={checkoutVouchers}
          tap={checkoutTap}
          totalLabel={checkoutTotalLabel}
          rideLabel={checkoutRideLabel}
          accentColor={accentColor}
          frame={frame - transitionFrame}
          fps={fps}
        />
      </div>
    </div>
  );
};

// Short, non-scrolling voucher list for forensic-replay beats — the replay
// only ever needs 1-2 rows in view at once, so this skips VoucherFlowScreen's
// scroll choreography and just renders rows with a tap-highlight.
const ForensicListView: React.FC<{
  items: PhoneMockupVoucherListItem[];
  tapItemLabel?: string;
  tapFrame?: number;
  accentColor: string;
  frame: number;
}> = ({ items, tapItemLabel, tapFrame, accentColor, frame }) => {
  const tapGlow = (code: string): number => {
    if (!tapItemLabel || tapItemLabel !== code || tapFrame == null) return 0;
    return interpolate(frame, [tapFrame, tapFrame + 6], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", padding: "24px 18px", gap: 14 }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.4)",
          fontFamily: BE_VIETNAM_PRO,
          marginBottom: 4,
        }}
      >
        HỘI VIÊN
      </div>
      {items.map((it) => {
        const glow = tapGlow(it.label);
        const isLit = glow > 0;
        return (
          <div
            key={it.label}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "18px 20px",
              borderRadius: 16,
              backgroundColor: isLit ? `${accentColor}1a` : "rgba(255,255,255,0.04)",
              border: `2px solid ${isLit ? accentColor : "rgba(255,255,255,0.12)"}`,
            }}
          >
            <span style={{ fontSize: 18, fontWeight: 700, color: "rgba(255,255,255,0.92)", fontFamily: BE_VIETNAM_PRO }}>
              {it.label}
            </span>
            <span
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: isLit ? accentColor : "rgba(255,255,255,0.6)",
                fontFamily: BE_VIETNAM_PRO,
              }}
            >
              {it.amountLabel}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// Multi-phase forensic beat: camera zooms/crops toward real UI (CSS
// transform-origin scale — no faked coordinates) as the shot cuts between
// the voucher list and checkout screens, with a small state tag riding
// along and an optional big freeze-zoom punchline at the end. This is the
// "camera/crop thay đổi theo từng thao tác" replay directly on real UI
// instead of an abstract diagram card.
const ForensicReplayScreen: React.FC<{
  replay: PhoneMockupForensicReplay;
  accentColor: string;
  frame: number;
  fps: number;
}> = ({ replay, accentColor, frame, fps }) => {
  const {
    items,
    tapItemLabel,
    tapFrame,
    checkoutVouchers,
    checkoutTap,
    checkoutTotalLabel,
    checkoutRideLabel,
    phases,
    freezeLabel,
    freezeAccentWord,
    freezeFrame,
  } = replay;

  const phaseFrames = phases.map((p) => p.frame);
  const activeIndex = phases.reduce((acc, p, i) => (frame >= p.frame ? i : acc), 0);
  const active: PhoneMockupForensicPhase = phases[activeIndex];

  const scaleTrack = phases.map((p) => p.zoomScale ?? 1);
  const focusXTrack = phases.map((p) => p.focus?.x ?? 0.5);
  const focusYTrack = phases.map((p) => p.focus?.y ?? 0.5);

  const zoomScale =
    phases.length === 1
      ? scaleTrack[0]
      : interpolate(frame, phaseFrames, scaleTrack, { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const focusX =
    phases.length === 1
      ? focusXTrack[0]
      : interpolate(frame, phaseFrames, focusXTrack, { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const focusY =
    phases.length === 1
      ? focusYTrack[0]
      : interpolate(frame, phaseFrames, focusYTrack, { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const listOpacity = interpolate(
    frame,
    active.screen === "list" ? [active.frame, active.frame + 8] : [active.frame, active.frame + 8],
    active.screen === "list" ? [0, 1] : [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  // Cross-fade is driven off whichever screen is active at THIS frame, not a
  // fixed "list then checkout" order — find the most recent real screen
  // switch. The opening screen (no switch yet) shows instantly opaque
  // instead of fading in from blank, so a shot can continue visually from
  // wherever the previous shot's phone screen ended.
  const lastSwitchFrame = (() => {
    for (let i = activeIndex; i >= 1; i--) {
      if (phases[i].screen !== phases[i - 1].screen) return phases[i].frame;
    }
    return -1;
  })();
  const activeScreenOpacity =
    lastSwitchFrame < 0
      ? 1
      : interpolate(frame, [lastSwitchFrame, lastSwitchFrame + 8], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

  const tagOpacity = interpolate(frame, [active.frame + 2, active.frame + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const freezeOpacity =
    freezeFrame != null
      ? interpolate(frame, [freezeFrame, freezeFrame + 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
      : 0;

  const renderScreenLabel = (label: string, accentWord: string | undefined, accent: string) => {
    if (!accentWord) return <>{label}</>;
    const idx = label.indexOf(accentWord);
    if (idx === -1) return <>{label}</>;
    return (
      <>
        {label.slice(0, idx)}
        <span style={{ color: accent, textShadow: `0 0 12px ${accent}` }}>{accentWord}</span>
        {label.slice(idx + accentWord.length)}
      </>
    );
  };

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          transformOrigin: `${focusX * 100}% ${focusY * 100}%`,
          transform: `scale(${zoomScale})`,
        }}
      >
        <div style={{ position: "absolute", inset: 0, opacity: active.screen === "list" ? activeScreenOpacity : 1 - activeScreenOpacity }}>
          <ForensicListView
            items={items}
            tapItemLabel={tapItemLabel}
            tapFrame={tapFrame}
            accentColor={accentColor}
            frame={frame}
          />
        </div>
        <div style={{ position: "absolute", inset: 0, opacity: active.screen === "checkout" ? activeScreenOpacity : 1 - activeScreenOpacity }}>
          <CheckoutScreen
            vouchers={checkoutVouchers}
            tap={checkoutTap}
            totalLabel={checkoutTotalLabel}
            rideLabel={checkoutRideLabel}
            accentColor={accentColor}
            frame={frame}
            fps={fps}
          />
        </div>
      </div>

      {active.tag && (
        <div
          style={{
            position: "absolute",
            top: 14,
            left: "50%",
            transform: "translateX(-50%)",
            opacity: tagOpacity,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: accentColor,
            background: "rgba(0,0,0,0.55)",
            border: `1px solid ${accentColor}66`,
            borderRadius: 999,
            padding: "6px 14px",
            fontFamily: BE_VIETNAM_PRO,
            whiteSpace: "nowrap",
            zIndex: 5,
          }}
        >
          {active.tag}
        </div>
      )}

      {freezeLabel && freezeOpacity > 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: freezeOpacity,
            background: "rgba(5,8,14,0.5)",
            zIndex: 6,
          }}
        >
          <div
            style={{
              fontSize: 34,
              fontWeight: 800,
              color: "#fff",
              fontFamily: BE_VIETNAM_PRO,
              textAlign: "center",
              padding: "0 20px",
              lineHeight: 1.3,
            }}
          >
            {renderScreenLabel(freezeLabel, freezeAccentWord, accentColor)}
          </div>
        </div>
      )}
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
  phoneYOffset = 0,
  idleRange,
  loadingRange,
  matchedRange,
  showApproachingDriver,
  weatherEffect,
  appName = "RideApp",
  appIcon,
  loadingLabel = "Đang tìm tài xế...",
  matchedStatusLabel = "Đã tìm thấy tài xế",
  matchedConfirmLabel = "Xác nhận chuyến đi",
  matchedKind = "driver",
  checkoutVouchers,
  checkoutTap,
  checkoutTotalLabel = "0đ",
  checkoutRideLabel = "Xanh SM Bike · Chuyến đi",
  voucherFlow,
  forensicReplay,
  splitScreen,
  mobileBrowser,
  sourceLabel,
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
            transform: `translateY(${phoneYOffset}px)`,
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
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {appIcon === "google_maps" && <GoogleMapsIcon size={16} />}
              {appIcon === "xanhsm" && <XanhSMBirdIcon size={16} color={accentColor} />}
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: accentColor,
                  fontFamily: BE_VIETNAM_PRO,
                  letterSpacing: "-0.02em",
                }}
              >
                {appName}
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
                <LoadingScreen accentColor={accentColor} frame={frame} label={loadingLabel} />
              )}
              {effective === "matched" && (
                <MatchedScreen
                  driverName={driverName}
                  driverEta={driverEta}
                  accentColor={accentColor}
                  cardY={cardY}
                  cardOpacity={cardOpacity}
                  statusLabel={matchedStatusLabel}
                  confirmLabel={matchedConfirmLabel}
                  kind={matchedKind}
                />
              )}
              {effective === "checkout" && checkoutVouchers && (
                <CheckoutScreen
                  vouchers={checkoutVouchers}
                  tap={checkoutTap}
                  totalLabel={checkoutTotalLabel}
                  rideLabel={checkoutRideLabel}
                  accentColor={accentColor}
                  frame={frame}
                  fps={fps}
                />
              )}
              {effective === "voucherFlow" && voucherFlow && (
                <VoucherFlowScreen flow={voucherFlow} accentColor={accentColor} frame={frame} fps={fps} />
              )}
              {effective === "forensicReplay" && forensicReplay && (
                <ForensicReplayScreen replay={forensicReplay} accentColor={accentColor} frame={frame} fps={fps} />
              )}
              {effective === "splitScreen" && splitScreen && (
                <SplitScreenView split={splitScreen} accentColor={accentColor} frame={frame} fps={fps} />
              )}
              {effective === "mobileBrowser" && mobileBrowser && (
                <MobileBrowserScreen browser={mobileBrowser} accentColor={accentColor} frame={frame} />
              )}
            </div>
          </div>
        </div>
      </div>

      {sourceLabel && (
        <div
          style={{
            position: "absolute",
            bottom: 140,
            left: 0,
            right: 0,
            textAlign: "center",
            opacity: sceneOpacity,
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 500, color: colors.textDim, fontFamily: BE_VIETNAM_PRO }}>
            {sourceLabel}
          </span>
        </div>
      )}
    </AbsoluteFill>
  );
};
