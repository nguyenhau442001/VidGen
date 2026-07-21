import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { WorkToGameMorphSceneProps } from "../types";
import { SafeZone } from "../SafeZone";
import { AmbientBackground } from "../AmbientBackground";
import { BE_VIETNAM_PRO } from "../styles";
import { p2Colors, P2Icons } from "./grabfoodP2Palette";

// Frame plan: phone silhouette shrinks to top; each transformation row
// flies in staggered (fromLabel -> arrow -> toLabel), arrow morphs via
// scaleX so it reads as "becoming", not just appearing.
export const WorkToGameMorphShot: React.FC<WorkToGameMorphSceneProps> = ({
  headline,
  transformations,
  showDriverSilhouette,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const phoneShrink = spring({ frame, fps, config: { damping: 16, stiffness: 140 }, durationInFrames: 30 });
  const headlineOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const silhouetteOpacity = interpolate(frame, [10, 35], [0, 0.5], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const exitOpacity = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: p2Colors.bg, fontFamily: BE_VIETNAM_PRO, overflow: "hidden" }}>
      <AbsoluteFill style={{ opacity: exitOpacity }}>
      <AmbientBackground accent={p2Colors.grab} />
      {/* Driver silhouette standing behind/among the HUD rows — dimmed so it
          reads as environment, not competing with the transformation copy. */}
      {showDriverSilhouette && (
        <div
          style={{
            position: "absolute",
            right: 60,
            bottom: 140,
            opacity: silhouetteOpacity,
          }}
        >
          <P2Icons.MotorbikeRider size={260} color={p2Colors.textDim} />
        </div>
      )}
      <SafeZone style={{ justifyContent: "center", flexDirection: "column" }}>
        <div
          style={{
            fontSize: 44,
            fontWeight: 800,
            lineHeight: 1.2,
            color: p2Colors.textPrimary,
            opacity: headlineOpacity,
            marginBottom: 56,
            whiteSpace: "pre-line",
            transform: `scale(${interpolate(phoneShrink, [0, 1], [1.1, 1])})`,
          }}
        >
          {headline}
        </div>

        {transformations.map((t, i) => {
          const start = 40 + i * 26;
          const rowSpring = spring({ frame: frame - start, fps, config: { damping: 15, stiffness: 160 }, durationInFrames: 24 });
          const arrowScale = interpolate(rowSpring, [0, 1], [0, 1]);
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 20,
                marginBottom: 28,
                opacity: Math.min(1, rowSpring),
                transform: `translateX(${(1 - Math.min(1, rowSpring)) * -40}px)`,
              }}
            >
              <div
                style={{
                  padding: "14px 22px",
                  borderRadius: 14,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  fontSize: 24,
                  fontWeight: 700,
                  color: p2Colors.textDim,
                }}
              >
                {t.from}
              </div>
              <div style={{ width: 40, height: 3, background: p2Colors.grab, transform: `scaleX(${arrowScale})`, transformOrigin: "left" }} />
              <div
                style={{
                  padding: "14px 22px",
                  borderRadius: 14,
                  background: p2Colors.grabDim,
                  border: `1px solid ${p2Colors.grab}`,
                  fontSize: 24,
                  fontWeight: 800,
                  color: p2Colors.textPrimary,
                }}
              >
                {t.to}
              </div>
            </div>
          );
        })}
      </SafeZone>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default WorkToGameMorphShot;
