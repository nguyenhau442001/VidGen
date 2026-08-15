import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { SplitSyncActionVisual } from "../types";
import { colors, INTER } from "../styles";
import { SafeZone } from "../SafeZone";
import { AmbientBackground } from "../AmbientBackground";
import { BrowserChrome, HeadlineBar } from "./shared/incognitoShared";
import { phaseProgress } from "./shared/cinematicPrimitives";

export type SplitSyncActionSceneProps = SplitSyncActionVisual & { durationInFrames: number };

// Left and right panels are both driven off the exact same two frame
// numbers (searchFrame, viewFrame) — there is no independent "left timeline"
// and "right timeline" to drift apart. Every left action and its right-side
// counter-reaction read the identical constant, so they land on the same
// frame by construction rather than by tuning two separate animations to
// line up.
export const SplitSyncActionShot: React.FC<SplitSyncActionSceneProps> = ({
  leftKeyword = "cách xin nghỉ việc đúng luật",
  leftResultLabel = "Xin nghỉ việc thế nào cho đúng luật?",
  typeStartFrame = 20,
  searchFrame = 70,
  viewFrame = 130,
  counterBefore = 128,
  counterAfter = 129,
  searchLabel = "Một lượt tìm kiếm",
  viewLabel = "Một lượt xem",
  headline = "WEBSITE VẪN NHẬN LƯỢT TRUY CẬP",
  accentWord = "VẪN NHẬN",
  accentColor = colors.green,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const typeChars = Math.round(
    interpolate(frame, [typeStartFrame, searchFrame - 4], [0, leftKeyword.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );
  const cursorOn = Math.floor(frame / 15) % 2 === 0;

  const resultOpacity = phaseProgress(frame, searchFrame, 10);
  const resultClickPulse = spring({
    frame: frame - viewFrame,
    fps,
    config: { stiffness: 260, damping: 16 },
    durationInFrames: 16,
  });

  const counterPop = spring({
    frame: frame - searchFrame,
    fps,
    config: { stiffness: 300, damping: 14 },
    durationInFrames: 18,
  });
  const counterShown = frame >= searchFrame;
  const counterValue = counterShown ? counterAfter : counterBefore;
  const counterScale = 1 + Math.max(0, counterPop) * 0.28 * Math.max(0, 1 - counterPop);

  const searchBadgeOpacity = phaseProgress(frame, searchFrame, 8);
  const viewBadgeOpacity = phaseProgress(frame, viewFrame, 8);

  const headlineStart = viewFrame + 30;
  const headlineOpacity = phaseProgress(frame, headlineStart, 18);

  const panelStyle: React.CSSProperties = {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  };

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      <AmbientBackground accent={accentColor} />
      <SafeZone style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: 160 }}>
        <div style={{ display: "flex", gap: 24, width: "100%" }}>
          <div style={panelStyle}>
            <div style={{ fontFamily: INTER, fontSize: 16, fontWeight: 700, color: colors.textDim, marginBottom: 10, letterSpacing: "0.08em" }}>
              NGƯỜI DÙNG
            </div>
            <BrowserChrome width={430} urlLabel="tinviet.vn" accentColor={accentColor}>
              <div style={{ minHeight: 280, display: "flex", flexDirection: "column", gap: 14 }}>
                <div
                  style={{
                    borderRadius: 10,
                    border: "1px solid rgba(0,0,0,0.12)",
                    padding: "10px 14px",
                    fontFamily: INTER,
                    fontSize: 18,
                    color: "rgba(0,0,0,0.78)",
                  }}
                >
                  {leftKeyword.slice(0, typeChars)}
                  <span style={{ opacity: frame < searchFrame && cursorOn ? 1 : 0 }}>|</span>
                </div>
                <div
                  style={{
                    opacity: resultOpacity,
                    marginTop: 6,
                    padding: "14px 16px",
                    borderRadius: 10,
                    background: `${accentColor}${resultClickPulse > 0 ? "22" : "10"}`,
                    border: `1px solid ${accentColor}55`,
                    transform: `scale(${1 + Math.max(0, resultClickPulse) * 0.03})`,
                    fontFamily: INTER,
                    fontSize: 17,
                    fontWeight: 600,
                    color: "rgba(0,0,0,0.8)",
                  }}
                >
                  {"\u{1F310} "}{leftResultLabel}
                </div>
              </div>
            </BrowserChrome>
          </div>

          <div style={panelStyle}>
            <div style={{ fontFamily: INTER, fontSize: 16, fontWeight: 700, color: colors.textDim, marginBottom: 10, letterSpacing: "0.08em" }}>
              PHÍA WEBSITE
            </div>
            <BrowserChrome width={430} urlLabel="Bảng đo lượt truy cập" accentColor={accentColor}>
              <div style={{ minHeight: 280, display: "flex", flexDirection: "column", alignItems: "center", gap: 22, justifyContent: "center" }}>
                <div
                  style={{
                    fontFamily: INTER,
                    fontWeight: 900,
                    fontSize: 52,
                    color: accentColor,
                    transform: `scale(${counterScale})`,
                  }}
                >
                  {counterValue}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
                  <div
                    style={{
                      opacity: searchBadgeOpacity,
                      padding: "8px 12px",
                      borderRadius: 999,
                      background: `${accentColor}18`,
                      border: `1px solid ${accentColor}55`,
                      textAlign: "center",
                      fontFamily: INTER,
                      fontSize: 16,
                      fontWeight: 700,
                      color: accentColor,
                    }}
                  >
                    {searchLabel}
                  </div>
                  <div
                    style={{
                      opacity: viewBadgeOpacity,
                      padding: "8px 12px",
                      borderRadius: 999,
                      background: `${colors.cyan}18`,
                      border: `1px solid ${colors.cyan}66`,
                      textAlign: "center",
                      fontFamily: INTER,
                      fontSize: 16,
                      fontWeight: 700,
                      color: colors.cyan,
                    }}
                  >
                    {viewLabel}
                  </div>
                </div>
              </div>
            </BrowserChrome>
          </div>
        </div>
      </SafeZone>

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

export default SplitSyncActionShot;
