import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { ParallelRoutesGapSceneProps } from "../types";
import { colors, INTER } from "../styles";
import { SafeZone } from "../SafeZone";
import { AmbientBackground } from "../AmbientBackground";
import { xanhSmBlue } from "./greensmBikePalette";

const ENTER_FRAMES = 10;
const EXIT_FRAMES = 8;
const FILL_START = 14;
const FILL_DURATION = 130;

const ROW_COLOR: Record<string, string> = {
  "CHỜ": "rgba(0,0,0,0.06)",
  "ĐI ĐÓN": "rgba(0,0,0,0.06)",
  "CHẠY RỖNG": "rgba(0,0,0,0.06)",
  "ĐANG CHỞ KHÁCH": "rgba(14,165,233,0.16)",
};

const Route: React.FC<{
  label: string;
  segments: string[];
  progress: number;
  accent: string;
}> = ({ label, segments, progress, accent }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 12, width: 780, maxWidth: "90%" }}>
    <div style={{ fontSize: 22, fontWeight: 800, color: colors.textPrimary }}>{label}</div>
    <div
      style={{
        display: "flex",
        height: 68,
        borderRadius: 16,
        overflow: "hidden",
        border: `2px solid ${accent}55`,
      }}
    >
      {segments.map((segment, i) => {
        const segWidth = 100 / segments.length;
        const segStart = i / segments.length;
        const segProgress = interpolate(progress, [segStart, segStart + 1 / segments.length], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <div
            key={i}
            style={{
              width: `${segWidth}%`,
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(0,0,0,0.03)",
              borderRight: i < segments.length - 1 ? "1px solid rgba(0,0,0,0.08)" : undefined,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                width: `${segProgress * 100}%`,
                backgroundColor: ROW_COLOR[segment] ?? "rgba(0,0,0,0.06)",
              }}
            />
            <span
              style={{
                position: "relative",
                fontSize: 15,
                fontWeight: 700,
                color: colors.textDim,
                textAlign: "center",
                padding: "0 6px",
              }}
            >
              {segment}
            </span>
          </div>
        );
      })}
    </div>
  </div>
);

export const ParallelRoutesGapShot: React.FC<ParallelRoutesGapSceneProps> = ({
  durationLabel,
  driverA,
  driverB,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();

  const hasExitRoom = durationInFrames > ENTER_FRAMES + EXIT_FRAMES;
  const sceneOpacity = interpolate(
    frame,
    hasExitRoom
      ? [0, ENTER_FRAMES, durationInFrames - EXIT_FRAMES, durationInFrames]
      : [0, durationInFrames],
    hasExitRoom ? [0, 1, 1, 0] : [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const labelOpacity = interpolate(frame, [0, ENTER_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const fillProgress = interpolate(frame, [FILL_START, FILL_START + FILL_DURATION], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg, opacity: sceneOpacity }}>
      <AmbientBackground accent={xanhSmBlue} />
      <SafeZone
        style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", fontFamily: INTER, gap: 40 }}
      >
        <div
          style={{
            opacity: labelOpacity,
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: "0.06em",
            color: colors.textDim,
          }}
        >
          {durationLabel} · CÙNG ONLINE
        </div>

        <Route label={driverA.label} segments={driverA.segments} progress={fillProgress} accent={colors.textDim} />
        <Route label={driverB.label} segments={driverB.segments} progress={fillProgress} accent={xanhSmBlue} />
      </SafeZone>
    </AbsoluteFill>
  );
};

export default ParallelRoutesGapShot;
