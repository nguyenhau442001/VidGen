import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { RevenueClockHookSceneProps } from "../types";
import { colors, INTER } from "../styles";
import { SafeZone } from "../SafeZone";
import { AmbientBackground } from "../AmbientBackground";
import { xanhSmBlue, XanhSMBirdIcon } from "./greensmBikePalette";

const ENTER_FRAMES = 10;
const EXIT_FRAMES = 8;
const STEP_GAP = 12; // frames between each counter step popping in — fast tick, matches "tăng nhanh"
const HEADLINE_SPRING_FRAMES = 18;
const MIN_HOLD_AFTER_HEADLINE = 15; // frames the payoff line must stay fully settled before the exit fade

export const RevenueClockHookShot: React.FC<RevenueClockHookSceneProps> = ({
  cityLabel,
  counterSteps,
  headline,
  illustrativeLabel,
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

  const cityOpacity = interpolate(frame, [0, ENTER_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Which step of counterSteps is currently active/frozen.
  const stepIndex = Math.min(
    counterSteps.length - 1,
    Math.max(0, Math.floor(frame / STEP_GAP))
  );
  const stepStart = stepIndex * STEP_GAP;
  const stepSpring = spring({
    frame: frame - stepStart,
    fps,
    config: { stiffness: 300, damping: 16 },
    durationInFrames: 16,
  });
  const isFinalStep = stepIndex === counterSteps.length - 1;

  // Reveal timing is derived from the actual shot length (post-TTS-tightened
  // durations can be much shorter than first authored) so the payoff headline
  // always finishes settling with room to spare before the exit fade — never
  // starts its entrance mid-fade-out.
  const lastStepFrame = (counterSteps.length - 1) * STEP_GAP;
  const idealFreezeFrame = lastStepFrame + 10;
  const latestHeadlineStart = Math.max(
    lastStepFrame + 4,
    durationInFrames - EXIT_FRAMES - HEADLINE_SPRING_FRAMES - MIN_HOLD_AFTER_HEADLINE
  );
  const freezeFrame = Math.min(idealFreezeFrame, latestHeadlineStart);
  const headlineStart = Math.min(freezeFrame + 10, latestHeadlineStart + 10);

  const freezeGlow = isFinalStep
    ? interpolate(frame, [freezeFrame - 6, freezeFrame], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;

  const headlineSpring = spring({
    frame: frame - headlineStart,
    fps,
    config: { stiffness: 220, damping: 18 },
    durationInFrames: HEADLINE_SPRING_FRAMES,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg, opacity: sceneOpacity }}>
      <AmbientBackground accent={xanhSmBlue} />
      <SafeZone
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          fontFamily: INTER,
        }}
      >
        {illustrativeLabel && (
          <div
            style={{
              position: "absolute",
              top: 0,
              opacity: cityOpacity,
              padding: "8px 18px",
              borderRadius: 999,
              backgroundColor: "rgba(0,0,0,0.05)",
              border: "1px solid rgba(0,0,0,0.12)",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 0.5,
              color: colors.textDim,
            }}
          >
            {illustrativeLabel}
          </div>
        )}

        <div
          style={{
            opacity: cityOpacity,
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: "0.06em",
            color: colors.textDim,
            marginBottom: 46,
            textTransform: "uppercase",
          }}
        >
          <XanhSMBirdIcon size={24} />
          {cityLabel}
        </div>

        <div
          style={{
            width: 680,
            maxWidth: "88%",
            padding: "48px 40px",
            borderRadius: 32,
            textAlign: "center",
            backgroundColor: "rgba(0,0,0,0.04)",
            border: `2px solid ${xanhSmBlue}${isFinalStep ? "ff" : "33"}`,
            boxShadow: isFinalStep
              ? `0 0 ${40 + freezeGlow * 40}px ${xanhSmBlue}55`
              : "0 20px 50px rgba(0,0,0,0.08)",
            transition: "border-color 0.2s",
          }}
        >
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: colors.textDim,
              letterSpacing: "0.08em",
              marginBottom: 18,
            }}
          >
            ĐỒNG HỒ DOANH THU
          </div>
          <div
            style={{
              fontSize: 76,
              fontWeight: 900,
              color: xanhSmBlue,
              opacity: Math.min(1, stepSpring),
              transform: `scale(${0.86 + Math.min(1, stepSpring) * 0.14})`,
              whiteSpace: "nowrap",
            }}
          >
            {counterSteps[stepIndex]}
          </div>
        </div>

        {headline && (
          <div
            style={{
              marginTop: 52,
              maxWidth: 760,
              textAlign: "center",
              fontSize: 52,
              fontWeight: 900,
              lineHeight: 1.2,
              color: colors.textPrimary,
              opacity: Math.min(1, headlineSpring),
              transform: `translateY(${(1 - Math.min(1, headlineSpring)) * 24}px)`,
            }}
          >
            {headline}
          </div>
        )}
      </SafeZone>
    </AbsoluteFill>
  );
};

export default RevenueClockHookShot;
