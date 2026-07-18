import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { SafeZone } from "../SafeZone";
import { BE_VIETNAM_PRO, colors } from "../styles";
import { GrabFoodScreenshotSceneProps } from "../types";

const FOCUS_AREAS = [
  { label: "3 km", top: 176, height: 48, radius: 18 },
  { label: "23 phút", top: 249, height: 124, radius: 31 },
  { label: "29 phút", top: 388, height: 81, radius: 29 },
  { label: "44 phút", top: 485, height: 88, radius: 30 },
];

const AccentText: React.FC<{ text: string; accentWord?: string }> = ({ text, accentWord }) => {
  if (!accentWord || !text.includes(accentWord)) return <>{text}</>;
  const index = text.indexOf(accentWord);
  return (
    <>
      {text.slice(0, index)}
      <span style={{ color: "#00b14f" }}>{accentWord}</span>
      {text.slice(index + accentWord.length)}
    </>
  );
};

export const GrabFoodScreenshotScene: React.FC<GrabFoodScreenshotSceneProps> = ({
  screenshotPath,
  mode,
  headline,
  accentWord,
  disclaimer,
  restaurantLabel,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 18, stiffness: 130 } });
  const screenshotScale = interpolate(
    frame,
    [0, durationInFrames],
    mode === "hook" ? [1.02, 1.12] : [1, 1.035],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const headlineOpacity = interpolate(frame, mode === "hook" ? [28, 52] : [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const activeFocus = Math.min(
    FOCUS_AREAS.length - 1,
    Math.floor((frame / Math.max(1, durationInFrames)) * FOCUS_AREAS.length)
  );

  return (
    <AbsoluteFill
      style={{
        background: "radial-gradient(circle at 50% 18%, #e7fff0 0%, #f7faf8 48%, #e9f1ec 100%)",
        fontFamily: BE_VIETNAM_PRO,
      }}
    >
      <SafeZone style={{ alignItems: "center", justifyContent: "center", gap: mode === "evidence" ? 54 : 38 }}>
        <div
          style={{
            color: colors.textPrimary,
            fontSize: mode === "hook" ? 34 : 36,
            lineHeight: mode === "hook" ? 1.28 : 1.22,
            fontWeight: 850,
            maxWidth: mode === "hook" ? 900 : 960,
            textAlign: "center",
            whiteSpace: mode === "hook" ? "pre" : "nowrap",
            letterSpacing: mode === "evidence" ? "-0.025em" : undefined,
            opacity: headlineOpacity,
          }}
        >
          <AccentText text={headline} accentWord={accentWord} />
        </div>

        <div
          style={{
            position: "relative",
            width: 850,
            height: mode === "hook" ? 760 : 900,
            overflow: "hidden",
            borderRadius: 42,
            background: "#fff",
            border: "2px solid rgba(15, 23, 42, 0.1)",
            boxShadow: "0 30px 90px rgba(15, 23, 42, 0.2)",
            opacity: enter,
            transform: `translateY(${(1 - enter) * 70}px) scale(${screenshotScale})`,
          }}
        >
          <Img src={staticFile(screenshotPath)} style={{ width: "100%", display: "block" }} />
          {restaurantLabel && (
            <div
              style={{
                position: "absolute",
                left: 119,
                top: 119,
                width: 240,
                height: 50,
                display: "flex",
                alignItems: "center",
                paddingLeft: 8,
                boxSizing: "border-box",
                background: "#fff",
                color: "#171717",
                fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
                fontSize: 25,
                lineHeight: 1,
                fontWeight: 650,
                whiteSpace: "nowrap",
              }}
            >
              {restaurantLabel}
            </div>
          )}
          {mode === "evidence" &&
            FOCUS_AREAS.map((area, index) => {
              const distance = Math.abs(index - activeFocus);
              const opacity = distance === 0 ? 1 : 0.12;
              return (
                <div
                  key={area.label}
                  style={{
                    position: "absolute",
                    left: 31,
                    right: 31,
                    top: area.top,
                    height: area.height,
                    boxSizing: "border-box",
                    borderRadius: area.radius,
                    border: `4px solid ${index === activeFocus ? "#00b14f" : "transparent"}`,
                    background: index === activeFocus ? "rgba(0, 177, 79, 0.06)" : "rgba(255,255,255,0.64)",
                    boxShadow: index === activeFocus ? "0 0 0 999px rgba(8, 18, 12, 0.34)" : undefined,
                    opacity,
                  }}
                >
                  {index === activeFocus && (
                    <div
                      style={{
                        position: "absolute",
                        right: 18,
                        top: -24,
                        borderRadius: 999,
                        padding: "8px 18px",
                        background: "#00b14f",
                        color: "white",
                        fontSize: 24,
                        fontWeight: 850,
                      }}
                    >
                      {area.label}
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        {disclaimer && (
          <div
            style={{
              color: "rgba(20, 35, 27, 0.62)",
              fontSize: 27,
              lineHeight: 1.45,
              fontWeight: 600,
              textAlign: "center",
              maxWidth: 820,
              whiteSpace: "pre-line",
            }}
          >
            {disclaimer}
          </div>
        )}
      </SafeZone>
    </AbsoluteFill>
  );
};
