import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { HSKScreenshotSceneProps } from "../types";
import { INTER } from "../styles";

const RED = "#c0392b";
const BG = "#f5f1eb";
const CHROME_BG = "#ffffff";
const CHROME_BORDER = "rgba(26,23,20,0.12)";

const FRAME_ENTER_FRAMES = 22;
const BADGE_DELAY = 14;
const BADGE_ENTER_FRAMES = 16;

export const HSKScreenshotScene: React.FC<HSKScreenshotSceneProps> = ({
  imageSrc,
  badgeText = "GIAO DIỆN THẬT",
}) => {
  const frame = useCurrentFrame();

  const frameOpacity = interpolate(frame, [0, FRAME_ENTER_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const frameScale = interpolate(frame, [0, FRAME_ENTER_FRAMES], [0.92, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const badgeOpacity = interpolate(
    frame,
    [BADGE_DELAY, BADGE_DELAY + BADGE_ENTER_FRAMES],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const badgeY = interpolate(
    frame,
    [BADGE_DELAY, BADGE_DELAY + BADGE_ENTER_FRAMES],
    [16, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BG,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 64px 120px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 22px",
          borderRadius: 999,
          backgroundColor: RED,
          marginBottom: 28,
          opacity: badgeOpacity,
          transform: `translateY(${badgeY}px)`,
        }}
      >
        <span
          style={{
            fontFamily: INTER,
            fontWeight: 800,
            fontSize: 18,
            letterSpacing: "0.06em",
            color: "#ffffff",
          }}
        >
          {badgeText}
        </span>
      </div>

      <div
        style={{
          width: "100%",
          maxHeight: 900,
          borderRadius: 20,
          backgroundColor: CHROME_BG,
          border: `1px solid ${CHROME_BORDER}`,
          boxShadow: "0 30px 60px rgba(26,23,20,0.18)",
          overflow: "hidden",
          opacity: frameOpacity,
          transform: `scale(${frameScale})`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "14px 18px",
            borderBottom: `1px solid ${CHROME_BORDER}`,
          }}
        >
          {["#ff5f57", "#febc2e", "#28c840"].map((dot) => (
            <div
              key={dot}
              style={{ width: 11, height: 11, borderRadius: "50%", backgroundColor: dot }}
            />
          ))}
        </div>
        <Img src={staticFile(imageSrc)} style={{ width: "100%", display: "block" }} />
      </div>
    </AbsoluteFill>
  );
};

export default HSKScreenshotScene;
