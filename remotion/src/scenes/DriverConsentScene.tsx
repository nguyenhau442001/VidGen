import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { DriverConsentSceneProps } from "../types";
import { colors, INTER, SAFE_ZONE } from "../styles";

// Re-exported for callers that only need the shape (notificationTitle/
// detailLines/acceptLabel/declineLabel/driverReply/chosenAction/accentColor/
// onScreenText), matching the props interface as authored. durationInFrames
// is appended by DriverConsentSceneProps in ../types to match the manifest
// scene-renderer pattern (SceneRenderer spreads scene.visual + durationInFrames
// into every scene component); this scene's own animation is fully
// fixed-frame (0–220) and doesn't use it.
export type { DriverConsentSceneProps };

// ---------------------------------------------------------------------------
// Frame plan (fixed, not scaled by durationInFrames):
//   0–30    card slide in (translateY 60→0) + fade in
//   30–60   notificationTitle fade in
//   60–100  detailLines fade in, staggered 18 frames apart
//   100–130 both buttons fade in
//   130–160 chosen button: brightness pulse 1→1.4→1 + border glow
//   160–190 unchosen button dims to opacity 0.3
//   190–220 reply bubble slide in + fade in (accept only)
// ---------------------------------------------------------------------------
const CARD_ENTER_START = 0;
const CARD_ENTER_END = 30;
const TITLE_START = 30;
const TITLE_END = 60;
const DETAIL_START = 60;
const DETAIL_STAGGER = 18;
const DETAIL_FADE_DURATION = 20;
const BUTTONS_START = 100;
const BUTTONS_END = 130;
const PULSE_START = 130;
const PULSE_MID = 145;
const PULSE_END = 160;
const DIM_START = 160;
const DIM_END = 190;
const BUBBLE_START = 190;
const BUBBLE_END = 220;

const ACCENT_DEFAULT = "#00ff41";
const DECLINE_COLOR = "#ff4444";
const GLOW_PEAK = 6;

const CANVAS_H = 1920;
const CARD_WIDTH_FRACTION = 0.8;
const CARD_TOP_FRACTION = 0.3;
const CARD_PADDING = 24;
const BUTTON_GAP = 16;
const BUTTON_GLOW_FILTER_ID = "driver-consent-button-glow";

interface ConsentButtonProps {
  label: string;
  isDecline: boolean;
  chosen: boolean;
  width: number;
  entranceOpacity: number;
  unchosenOpacity: number;
  chosenBrightness: number;
  glowStdDeviation: number;
  accentColor: string;
}

const ConsentButton: React.FC<ConsentButtonProps> = ({
  label,
  isDecline,
  chosen,
  width,
  entranceOpacity,
  unchosenOpacity,
  chosenBrightness,
  glowStdDeviation,
  accentColor,
}) => {
  const borderColor = isDecline ? "rgba(255,68,68,0.4)" : accentColor;
  const textColor = isDecline ? "rgba(255,110,110,0.85)" : accentColor;
  const opacity = entranceOpacity * (chosen ? 1 : unchosenOpacity);

  return (
    <div style={{ position: "relative", width, opacity }}>
      {chosen && glowStdDeviation > 0.05 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 12,
            border: `2px solid ${isDecline ? DECLINE_COLOR : accentColor}`,
            filter: `url(#${BUTTON_GLOW_FILTER_ID})`,
          }}
        />
      )}
      <div
        style={{
          position: "relative",
          borderRadius: 12,
          padding: "14px 0",
          textAlign: "center",
          background: isDecline ? "rgba(255,68,68,0.15)" : "rgba(0,255,65,0.15)",
          border: `1px solid ${borderColor}`,
          color: textColor,
          fontFamily: `${INTER}, sans-serif`,
          fontSize: 18,
          fontWeight: 600,
          filter: chosen ? `brightness(${chosenBrightness})` : undefined,
        }}
      >
        {label}
      </div>
    </div>
  );
};

export const DriverConsentScene: React.FC<DriverConsentSceneProps> = ({
  notificationTitle,
  detailLines,
  acceptLabel = "Chấp nhận",
  declineLabel = "Từ chối",
  driverReply,
  chosenAction,
  accentColor = ACCENT_DEFAULT,
  onScreenText,
}) => {
  const frame = useCurrentFrame();

  const cardTranslateY = interpolate(frame, [CARD_ENTER_START, CARD_ENTER_END], [60, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cardOpacity = interpolate(frame, [CARD_ENTER_START, CARD_ENTER_END], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const titleOpacity = interpolate(frame, [TITLE_START, TITLE_END], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const buttonsOpacity = interpolate(frame, [BUTTONS_START, BUTTONS_END], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const chosenBrightness = interpolate(frame, [PULSE_START, PULSE_MID, PULSE_END], [1, 1.4, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const glowStdDeviation = interpolate(frame, [PULSE_START, PULSE_MID, PULSE_END], [0, GLOW_PEAK, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const unchosenOpacity = interpolate(frame, [DIM_START, DIM_END], [1, 0.3], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const bubbleTranslateY = interpolate(frame, [BUBBLE_START, BUBBLE_END], [40, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const bubbleOpacity = interpolate(frame, [BUBBLE_START, BUBBLE_END], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const accepted = chosenAction === "accept";
  const showBubble = accepted && !!driverReply;

  const buttonWidth = (CARD_WIDTH_FRACTION * 1080 - CARD_PADDING * 2 - BUTTON_GAP) / 2;

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      {/* Hidden defs: glow filter for the chosen button's border, built from
          feGaussianBlur + feComposite (no CSS box-shadow) */}
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <defs>
          <filter id={BUTTON_GLOW_FILTER_ID} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur in="SourceGraphic" stdDeviation={glowStdDeviation} result="blur" />
            <feComposite in="blur" in2="SourceGraphic" operator="over" />
          </filter>
        </defs>
      </svg>

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: CANVAS_H * CARD_TOP_FRACTION,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: `${CARD_WIDTH_FRACTION * 100}%`,
            padding: CARD_PADDING,
            borderRadius: 16,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            opacity: cardOpacity,
            transform: `translateY(${cardTranslateY}px)`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, opacity: titleOpacity }}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>🔔</span>
            <span
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "#fff",
                fontFamily: `${INTER}, sans-serif`,
              }}
            >
              {notificationTitle}
            </span>
          </div>

          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            {detailLines.map((line, i) => {
              const start = DETAIL_START + i * DETAIL_STAGGER;
              const opacity = interpolate(frame, [start, start + DETAIL_FADE_DURATION], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              return (
                <div
                  key={i}
                  style={{
                    opacity,
                    fontSize: 16,
                    color: "rgba(255,255,255,0.6)",
                    fontFamily: `${INTER}, sans-serif`,
                  }}
                >
                  <span style={{ marginRight: 6 }}>✦</span>
                  {line}
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 20, display: "flex", gap: BUTTON_GAP }}>
            <ConsentButton
              label={declineLabel}
              isDecline
              chosen={!accepted}
              width={buttonWidth}
              entranceOpacity={buttonsOpacity}
              unchosenOpacity={unchosenOpacity}
              chosenBrightness={chosenBrightness}
              glowStdDeviation={glowStdDeviation}
              accentColor={accentColor}
            />
            <ConsentButton
              label={acceptLabel}
              isDecline={false}
              chosen={accepted}
              width={buttonWidth}
              entranceOpacity={buttonsOpacity}
              unchosenOpacity={unchosenOpacity}
              chosenBrightness={chosenBrightness}
              glowStdDeviation={glowStdDeviation}
              accentColor={accentColor}
            />
          </div>
        </div>

        {showBubble && (
          <div
            style={{
              marginTop: 16,
              width: `${CARD_WIDTH_FRACTION * 100}%`,
              padding: "14px 20px",
              borderRadius: 14,
              background: "rgba(0,255,65,0.1)",
              border: `1px solid ${accentColor}66`,
              opacity: bubbleOpacity,
              transform: `translateY(${bubbleTranslateY}px)`,
            }}
          >
            <span
              style={{
                fontSize: 16,
                color: "#fff",
                fontFamily: `${INTER}, sans-serif`,
              }}
            >
              {driverReply}
            </span>
          </div>
        )}
      </div>

      {onScreenText && (
        <AbsoluteFill
          style={{
            justifyContent: "flex-end",
            alignItems: "center",
            paddingBottom: SAFE_ZONE.bottom,
            paddingLeft: SAFE_ZONE.left,
            paddingRight: SAFE_ZONE.right,
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              fontSize: 16,
              color: "rgba(255,255,255,0.5)",
              fontFamily: `${INTER}, sans-serif`,
              textAlign: "center",
            }}
          >
            {onScreenText}
          </span>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
