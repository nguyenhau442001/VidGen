// remotion/src/scenes/ScreenshotScene.tsx
import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { ScreenshotSceneProps } from "../types";
import { INTER } from "../styles";

const FRAME_ENTER_FRAMES = 22;
const CHROME_BG = "#ffffff";
const CHROME_BORDER = "rgba(26,23,20,0.12)";

export const ScreenshotScene: React.FC<ScreenshotSceneProps> = ({
  imagePath,
  chrome,
  headline,
  accentWord,
  badgeText,
  spotlight = [],
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

  const renderHeadline = () => {
    if (!headline) return null;
    if (!accentWord || !headline.includes(accentWord)) {
      return <span>{headline}</span>;
    }
    const idx = headline.indexOf(accentWord);
    return (
      <span>
        {headline.slice(0, idx)}
        <span style={{ color: "#c0392b" }}>{accentWord}</span>
        {headline.slice(idx + accentWord.length)}
      </span>
    );
  };

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#f5f1eb",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 64px 120px",
      }}
    >
      {badgeText && (
        <div
          style={{
            display: "flex",
            padding: "10px 22px",
            borderRadius: 999,
            backgroundColor: "#c0392b",
            marginBottom: 28,
          }}
        >
          <span style={{ fontFamily: INTER, fontWeight: 800, fontSize: 18, color: "#ffffff" }}>
            {badgeText}
          </span>
        </div>
      )}

      {headline && (
        <div
          style={{
            fontFamily: INTER,
            fontWeight: 800,
            fontSize: 40,
            textAlign: "center",
            color: "#1a1714",
            marginBottom: 32,
          }}
        >
          {renderHeadline()}
        </div>
      )}

      {/* NOTE: chrome === "phone" is not yet visually distinct from the
          default rounded-card chrome below (no notch/status bar) — known
          gap inherited from the original design spec, not a regression.
          A future scene author should not assume "phone" renders a
          phone-shaped frame; treat it as an alias of the generic chrome
          until this gets a real phone-chrome visual. */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxHeight: 900,
          borderRadius: chrome === "none" ? 0 : 20,
          backgroundColor: CHROME_BG,
          border: chrome === "none" ? "none" : `1px solid ${CHROME_BORDER}`,
          boxShadow: chrome === "none" ? "none" : "0 30px 60px rgba(26,23,20,0.18)",
          overflow: "hidden",
          opacity: frameOpacity,
          transform: `scale(${frameScale})`,
        }}
      >
        {chrome === "browser" && (
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
              <div key={dot} style={{ width: 11, height: 11, borderRadius: "50%", backgroundColor: dot }} />
            ))}
          </div>
        )}
        <div style={{ position: "relative" }}>
          <Img src={staticFile(imagePath)} style={{ width: "100%", display: "block" }} />
          {spotlight.map((box, i) => {
            const active = frame >= box.startFrame && frame <= box.endFrame;
            if (!active) return null;
            // Clamp the fade-in/out knee width so the interpolate input
            // range stays strictly increasing even for narrow boxes (a
            // fixed 10-frame knee would make startFrame+10 >= endFrame-10
            // for any box under ~21 frames wide, which Remotion's
            // interpolate() throws on). A knee is only used when it leaves
            // strictly increasing room on both sides (width > 2*fade);
            // otherwise fall back to a flat [start, end] -> [1, 1] range,
            // and a 0-frame box (start === end) skips interpolate entirely.
            const width = box.endFrame - box.startFrame;
            const fade = Math.min(10, Math.floor(width / 2) - (width % 2 === 0 ? 1 : 0));
            const boxOpacity =
              width === 0
                ? 1
                : fade > 0
                ? interpolate(
                    frame,
                    [box.startFrame, box.startFrame + fade, box.endFrame - fade, box.endFrame],
                    [0, 1, 1, 0],
                    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                  )
                : interpolate(
                    frame,
                    [box.startFrame, box.endFrame],
                    [1, 1],
                    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                  );
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: `${box.x * 100}%`,
                  top: `${box.y * 100}%`,
                  width: `${box.w * 100}%`,
                  height: `${box.h * 100}%`,
                  border: "3px solid #c0392b",
                  borderRadius: 8,
                  boxShadow: "0 0 0 9999px rgba(0,0,0,0.35)",
                  opacity: boxOpacity,
                }}
              />
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export default ScreenshotScene;
