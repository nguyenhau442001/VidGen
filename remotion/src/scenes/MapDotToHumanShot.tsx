import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { MapDotToHumanSceneProps } from "../types";
import { AmbientBackground } from "../AmbientBackground";
import { BE_VIETNAM_PRO } from "../styles";
import { p2Colors, P2Icons } from "./shared/grabfoodP2Palette";

// Frame plan: 0-40 map dot glows and zooms; 40-90 dot morphs into a phone
// silhouette (camera-push feel via scale+blur); 90-130 phone UI fades in
// with battery/route; 130+ notification badge springs in over it.
export const MapDotToHumanShot: React.FC<MapDotToHumanSceneProps> = ({
  headline,
  subheadline,
  seriesLabel,
  illustrativeLabel,
  batteryPercent,
  timeLabel,
  targetCurrent,
  targetTotal,
  sideNoteText,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Side-note message bubble: reads early (before the notification badge
  // steals focus at frame 130) and clears out well before it, so it plants a
  // detail rather than competing with the shot's main beat.
  const sideNoteOpacity = interpolate(frame, [55, 75, 105, 120], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Series marker reads immediately — a viewer landing on this shot with no
  // context (algorithmic feed, direct link) needs to know what they're
  // watching before anything else resolves.
  const seriesLabelOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const dotToPhone = interpolate(frame, [0, 40, 90], [0, 0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const dotScale = interpolate(frame, [0, 40], [1, 6], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const dotBlur = interpolate(frame, [20, 40], [0, 18], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const phoneOpacity = interpolate(frame, [60, 95], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const notifSpring = spring({ frame: frame - 130, fps, config: { damping: 14, stiffness: 170 } });
  // Headline follows the notification badge in (badge settles ~145f) rather
  // than waiting for the shot's last ~30 frames — it needs to read as the
  // shot's title, not a last-second flash before the cut.
  const headlineOpacity = interpolate(frame, [145, 175], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Night-street environmental layer: a clear car outline icon placed
  // beside the phone (not behind/blurred), so a viewer immediately reads
  // it as "GrabCar driver" rather than an ambiguous dark shape.
  const streetOpacity = interpolate(frame, [50, 95], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitOpacity = interpolate(
    frame,
    [durationInFrames - 12, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ backgroundColor: p2Colors.bg, fontFamily: BE_VIETNAM_PRO, overflow: "hidden" }}>
      <AbsoluteFill style={{ opacity: exitOpacity }}>
      <AmbientBackground accent={p2Colors.grab} />

      {/* Series marker — visible from frame 0, independent of the phone/dot morph */}
      <div
        style={{
          position: "absolute",
          top: 90,
          left: 70,
          padding: "9px 18px",
          borderRadius: 999,
          background: "rgba(0,177,79,0.14)",
          border: `1.5px solid ${p2Colors.grab}`,
          color: p2Colors.grab,
          fontSize: 18,
          fontWeight: 800,
          letterSpacing: 1.2,
          opacity: seriesLabelOpacity,
        }}
      >
        {seriesLabel}
      </div>

      {/* Map dot -> camera push */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "38%",
          width: 18,
          height: 18,
          marginLeft: -9,
          marginTop: -9,
          borderRadius: "50%",
          background: p2Colors.grab,
          boxShadow: `0 0 ${20 + dotScale * 4}px ${p2Colors.grab}`,
          transform: `scale(${dotScale})`,
          filter: `blur(${dotBlur}px)`,
          opacity: interpolate(dotToPhone, [0, 1], [1, 0]),
        }}
      />

      {/* Rider + phone side by side, same row, both scaled down to fit
          1080px width. Streetlight glow sits behind both so the pairing
          still reads as "night, tired driver" without hiding either icon. */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 260,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 56,
        }}
      >
        {/* Streetlight glow, centered behind the pairing */}
        <div
          style={{
            position: "absolute",
            width: 720,
            height: 720,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${p2Colors.warmHome}20 0%, transparent 65%)`,
          }}
        />

        {/* Car icon — paired with an explicit text label since the bare
            wheels-and-frame glyph alone was ambiguous at a glance. */}
        <div
          style={{
            opacity: streetOpacity,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
            position: "relative",
          }}
        >
          {sideNoteText && (
            <div
              style={{
                position: "absolute",
                top: -64,
                left: "50%",
                transform: "translateX(-50%)",
                whiteSpace: "nowrap",
                padding: "8px 16px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.08)",
                border: `1.5px solid ${p2Colors.textDim}`,
                fontSize: 14,
                fontWeight: 600,
                color: p2Colors.textPrimary,
                opacity: sideNoteOpacity,
              }}
            >
              {sideNoteText}
            </div>
          )}
          <P2Icons.Car size={220} color={p2Colors.textPrimary} />
          <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: 2, color: p2Colors.textDim }}>
            Ô TÔ
          </span>
        </div>

        {/* Phone mockup — Android-style: squared corners, no notch/island,
            status bar with a familiar horizontal battery-bar icon instead
            of just a number, since most drivers use Android, not iPhone. */}
        <div style={{ opacity: phoneOpacity, position: "relative" }}>
          <div
            style={{
              width: 300,
              height: 600,
              borderRadius: 20,
              border: `3px solid ${p2Colors.grabDim}`,
              background: `linear-gradient(180deg, ${p2Colors.bgDeep} 0%, #0d1420 100%)`,
              boxShadow: `0 0 60px rgba(0,177,79,0.15)`,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ position: "absolute", top: 18, left: 18, right: 18, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              {timeLabel && (
                <span style={{ fontSize: 13, color: p2Colors.textDim, fontWeight: 700 }}>{timeLabel}</span>
              )}
              {/* Android-style horizontal battery bar icon + percent, low-battery tinted red */}
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ fontSize: 12, color: batteryPercent <= 10 ? p2Colors.danger : p2Colors.textDim, fontWeight: 700 }}>
                  {batteryPercent}%
                </span>
                <svg width="20" height="11" viewBox="0 0 20 11" fill="none">
                  <rect x="0.5" y="0.5" width="16" height="10" rx="2" stroke={batteryPercent <= 10 ? p2Colors.danger : p2Colors.textDim} strokeWidth="1" />
                  <rect x="17" y="3.5" width="2" height="4" rx="0.7" fill={batteryPercent <= 10 ? p2Colors.danger : p2Colors.textDim} />
                  <rect
                    x="2"
                    y="2"
                    width={Math.max(1, 13 * (batteryPercent / 100))}
                    height="7"
                    rx="1"
                    fill={batteryPercent <= 10 ? p2Colors.danger : p2Colors.grab}
                  />
                </svg>
              </div>
            </div>

            {/* Route line home — kept entirely below the notification badge
                (badge occupies ~y 260-370) so it never crosses the "MỤC TIÊU
                HÔM NAY" text. */}
            <svg width="300" height="600" style={{ position: "absolute", inset: 0 }}>
              <path
                d="M 235 390 Q 205 460 235 535"
                stroke={p2Colors.warmHome}
                strokeWidth="4"
                fill="none"
                strokeDasharray="8 7"
                opacity={0.7}
              />
            </svg>

            {/* Notification badge */}
            <div
              style={{
                position: "absolute",
                left: 20,
                right: 20,
                top: 260,
                borderRadius: 16,
                padding: "16px 18px",
                background: "rgba(0,177,79,0.14)",
                border: `2px solid ${p2Colors.grab}`,
                opacity: Math.min(1, notifSpring),
                transform: `translateY(${(1 - Math.min(1, notifSpring)) * 30}px) scale(${Math.min(1, notifSpring)})`,
                textAlign: "center",
                boxSizing: "border-box",
              }}
            >
              <div style={{ fontSize: 13, color: p2Colors.textDim, fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>
                MỤC TIÊU HÔM NAY
              </div>
              <div style={{ fontSize: 32, fontWeight: 900, color: p2Colors.textPrimary }}>
                {targetCurrent}/{targetTotal}
              </div>
              <div
                style={{
                  marginTop: 8,
                  display: "inline-block",
                  padding: "3px 9px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.08)",
                  fontSize: 10,
                  color: p2Colors.textDim,
                  fontWeight: 600,
                }}
              >
                {illustrativeLabel}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Headline centered in the open band below the phone (top 970-1920)
          — clear of both the phone mockup above and the safe-zone bottom
          margin, and never overlapping the streetlight/rider layer. */}
      <div
        style={{
          position: "absolute",
          left: 70,
          right: 70,
          top: 970,
          bottom: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ opacity: headlineOpacity, display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            style={{
              fontSize: 40,
              fontWeight: 800,
              lineHeight: 1.25,
              color: p2Colors.textPrimary,
              textAlign: "center",
            }}
          >
            {headline}
          </div>
          {subheadline && (
            <div
              style={{
                fontSize: 26,
                fontWeight: 700,
                lineHeight: 1.3,
                color: p2Colors.textDim,
                textAlign: "center",
              }}
            >
              {subheadline}
            </div>
          )}
        </div>
      </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default MapDotToHumanShot;
