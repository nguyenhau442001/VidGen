import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { SafeZone } from "../SafeZone";
import { BE_VIETNAM_PRO } from "../styles";
import { DriverJourneySceneProps } from "../types";

export const DriverJourneyScene: React.FC<DriverJourneySceneProps> = ({
  headline,
  customerTradeoff,
  driverTradeoff,
  tasks,
  closingLine,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const balanceOpacity = interpolate(frame, [0, 22, durationInFrames * 0.42, durationInFrames * 0.52], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const humanProgress = interpolate(frame, [durationInFrames * 0.42, durationInFrames * 0.62], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const closingOpacity = interpolate(frame, [durationInFrames * 0.78, durationInFrames * 0.9], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: "radial-gradient(circle at 50% 35%, #163729 0%, #07130e 58%, #030806 100%)",
        color: "white",
        fontFamily: BE_VIETNAM_PRO,
      }}
    >
      <SafeZone style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "absolute", top: 180, fontSize: 48, fontWeight: 850, textAlign: "center" }}>
          {headline}
        </div>

        <div
          style={{
            position: "absolute",
            top: 430,
            width: 870,
            display: "grid",
            gridTemplateColumns: "1fr 100px 1fr",
            alignItems: "center",
            opacity: balanceOpacity,
          }}
        >
          {[customerTradeoff, driverTradeoff].map((item, index) => (
            <React.Fragment key={item.label}>
              {index === 1 && (
                <div style={{ fontSize: 70, textAlign: "center", color: "#00e676", fontWeight: 900 }}>⇄</div>
              )}
              <div
                style={{
                  minHeight: 300,
                  borderRadius: 34,
                  padding: "34px 28px",
                  background: index === 0 ? "rgba(0,230,118,0.12)" : "rgba(97,218,251,0.12)",
                  border: `2px solid ${index === 0 ? "#00e676" : "#61dafb"}`,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  textAlign: "center",
                  gap: 20,
                }}
              >
                <div style={{ fontSize: 28, fontWeight: 800, color: index === 0 ? "#00e676" : "#61dafb" }}>
                  {item.label}
                </div>
                <div style={{ fontSize: 38, fontWeight: 850, lineHeight: 1.25, whiteSpace: "pre-line" }}>{item.value}</div>
              </div>
            </React.Fragment>
          ))}
        </div>

        <div
          style={{
            position: "absolute",
            top: 390,
            width: 880,
            opacity: humanProgress,
            transform: `translateY(${(1 - humanProgress) * 80}px)`,
          }}
        >
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 250 }}>
            <div
              style={{
                width: interpolate(humanProgress, [0, 1], [24, 150]),
                height: interpolate(humanProgress, [0, 1], [24, 150]),
                borderRadius: 999,
                background: "#00e676",
                boxShadow: "0 0 70px rgba(0,230,118,0.65)",
                display: "grid",
                placeItems: "center",
                fontSize: 72,
              }}
            >
              {humanProgress > 0.72 ? "🛵" : ""}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            {tasks.map((task, index) => {
              const start = durationInFrames * 0.54 + index * 18;
              const opacity = interpolate(frame, [start, start + 16], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              const scale = spring({ frame: frame - start, fps, config: { damping: 16, stiffness: 150 } });
              return (
                <div
                  key={task}
                  style={{
                    height: 78,
                    boxSizing: "border-box",
                    borderRadius: 22,
                    padding: "14px 16px",
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.14)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    whiteSpace: "nowrap",
                    fontSize: task.length >= 26 ? 20 : 23,
                    lineHeight: 1,
                    fontWeight: 700,
                    opacity,
                    transform: `scale(${scale})`,
                  }}
                >
                  {task}
                </div>
              );
            })}
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 250,
            width: 960,
            fontSize: 38,
            lineHeight: 1.3,
            fontWeight: 900,
            textAlign: "center",
            whiteSpace: "pre",
            opacity: closingOpacity,
          }}
        >
          {closingLine}
        </div>
      </SafeZone>
    </AbsoluteFill>
  );
};
