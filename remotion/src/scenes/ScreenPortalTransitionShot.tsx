import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { ScreenPortalTransitionVisual } from "../types";
import { colors, INTER } from "../styles";
import { AmbientBackground } from "../AmbientBackground";
import { BrowserChrome, HeadlineBar } from "./incognitoShared";
import { cameraShake, ImpactFlash, phaseProgress } from "./cinematicPrimitives";

export type ScreenPortalTransitionSceneProps = ScreenPortalTransitionVisual & { durationInFrames: number };

// The single most dramatic beat in the video: camera pushes into the empty
// gap in the history list until the screen itself "punches through" into
// the website's side. Driven entirely by fractions of durationInFrames (like
// WallPortalScene) so it scales cleanly whatever the shot's final tightened
// length ends up being after TTS.
export const ScreenPortalTransitionShot: React.FC<ScreenPortalTransitionSceneProps> = ({
  websiteUrlLabel = "tinviet.vn/tim-kiem",
  headline = "NHƯNG KHOAN…",
  accentWord = "KHOAN",
  accentColor = colors.green,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const duration = Math.max(1, durationInFrames);

  const pushStart = Math.round(duration * 0.28);
  const pushEnd = Math.round(duration * 0.58);
  const flashStart = Math.round(duration * 0.5);
  const revealStart = Math.round(duration * 0.62);
  const headlineStart = Math.round(duration * 0.78);

  // Punch all the way in through the gap, then pull back out to a normal
  // reading scale once the website side has flashed into view — without the
  // pull-back, the frame stays pinned at 6.5x forever and the "reveal" only
  // ever shows a blown-up fragment of the website card, never the full card.
  const zoomOutEnd = revealStart + 30;
  const zoom = interpolate(
    frame,
    [0, pushStart, pushEnd, zoomOutEnd],
    [1, 1.15, 6.5, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const shake = cameraShake(frame, pushEnd - 6, phaseProgress(frame, pushStart, pushEnd - pushStart) * 16, 4);
  const ringOpen = phaseProgress(frame, pushStart, pushEnd - pushStart);
  const gapOpacity = 1 - phaseProgress(frame, revealStart - 8, 10);
  const websiteOpacity = phaseProgress(frame, revealStart, 18);
  const websiteScale = interpolate(frame, [revealStart, revealStart + 26], [1.5, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const headlineOpacity = phaseProgress(frame, headlineStart, 18);

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg, overflow: "hidden" }}>
      <AmbientBackground accent={accentColor} />

      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          transform: `translate(${shake.x}px, ${shake.y}px) scale(${zoom})`,
        }}
      >
        <div style={{ position: "relative", width: 900, display: "flex", justifyContent: "center" }}>
          <div style={{ opacity: gapOpacity, position: websiteOpacity > 0 ? "absolute" : "static" }}>
            <BrowserChrome width={900} urlLabel="chrome://history" accentColor={accentColor}>
              <div
                style={{
                  padding: "40px 10px",
                  borderRadius: 12,
                  border: `1.5px dashed ${accentColor}`,
                  background: `${accentColor}14`,
                  boxShadow: `0 0 ${ringOpen * 60}px ${accentColor}88`,
                  textAlign: "center",
                }}
              >
                <span style={{ fontFamily: INTER, fontSize: 22, fontWeight: 700, color: accentColor }}>
                  — không có mục nào —
                </span>
              </div>
            </BrowserChrome>
          </div>

          <div
            style={{
              opacity: websiteOpacity,
              transform: `scale(${websiteScale})`,
            }}
          >
            <BrowserChrome width={900} urlLabel={websiteUrlLabel} accentColor={accentColor}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16, minHeight: 220 }}>
                <div
                  style={{
                    height: 34,
                    width: "70%",
                    borderRadius: 8,
                    background: "rgba(0,0,0,0.08)",
                  }}
                />
                <div style={{ height: 18, width: "92%", borderRadius: 6, background: "rgba(0,0,0,0.06)" }} />
                <div style={{ height: 18, width: "80%", borderRadius: 6, background: "rgba(0,0,0,0.06)" }} />
                <div
                  style={{
                    marginTop: 8,
                    height: 120,
                    borderRadius: 12,
                    background: `${accentColor}12`,
                    border: `1px solid ${accentColor}33`,
                  }}
                />
              </div>
            </BrowserChrome>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            width: 40 + ringOpen * 260,
            height: 40 + ringOpen * 260,
            borderRadius: "50%",
            border: `3px solid ${accentColor}`,
            opacity: (1 - websiteOpacity) * ringOpen * 0.8,
          }}
        />
      </AbsoluteFill>

      <ImpactFlash frame={frame} startFrame={flashStart} durationFrames={26} color={accentColor} strength={1} />

      <HeadlineBar
        headline={headline}
        accentWord={accentWord}
        accentColor={accentColor}
        opacity={headlineOpacity}
        translateY={interpolate(headlineOpacity, [0, 1], [16, 0])}
      />
    </AbsoluteFill>
  );
};

export default ScreenPortalTransitionShot;
