import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { NightTypingHookVisual } from "../types";
import { colors, INTER } from "../styles";
import { SafeZone } from "../SafeZone";
import { AmbientBackground } from "../AmbientBackground";
import { BrowserChrome, HeadlineBar } from "./shared/incognitoShared";
import { phaseProgress } from "./shared/cinematicPrimitives";

export type NightTypingHookSceneProps = NightTypingHookVisual & { durationInFrames: number };

// Frame plan (fixed beats, independent of durationInFrames so the hook reads
// the same whether the shot is 6s or 8s — only the hold at the end grows):
//   0–14              card fades/slides in
//   16–?              typedTextPart1 types out
//   +pauseFrames      hesitation pause (hands off keyboard, cursor still blinks)
//   ?–?               typedTextPart2 types out, with emphasizeWord popping in bold+scale
//   +6                glance icon flashes briefly ("nhìn quanh")
//   +10               card flips into incognito chrome (dark), badge stamps in
//   +10               headline punches in
const CARD_IN_END = 14;
const TYPE_START = 16;
const TYPE_FRAMES_PER_CHAR = 1.4;
const PAUSE_FRAMES_DEFAULT = 12; // 0.4s @ 30fps
const GLANCE_HOLD = 10;
const FLIP_DURATION = 10;
const HEADLINE_DURATION = 18;

export const NightTypingHookShot: React.FC<NightTypingHookSceneProps> = ({
  timeLabel = "0:14 SÁNG",
  typedTextPart1 = "Cách để ngừng nghĩ về…",
  typedTextPart2 = " Laura cà phê…",
  emphasizeWord = "Laura cà phê",
  pauseFrames = PAUSE_FRAMES_DEFAULT,
  headline = "THẬT SỰ ẨN DANH?",
  accentWord = "ẨN DANH?",
  accentColor = colors.green,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardOpacity = phaseProgress(frame, 0, CARD_IN_END);
  const cardY = interpolate(cardOpacity, [0, 1], [26, 0]);

  // Part 1 types out, then a hesitation pause, then part 2 continues typing —
  // one continuous cursor, not two separate animations, so the pause reads
  // as the same person hesitating mid-sentence rather than a scene cut.
  const part1End = TYPE_START + typedTextPart1.length * TYPE_FRAMES_PER_CHAR;
  const part2Start = part1End + pauseFrames;
  const part2End = part2Start + typedTextPart2.length * TYPE_FRAMES_PER_CHAR;

  const chars1 = Math.round(
    interpolate(frame, [TYPE_START, part1End], [0, typedTextPart1.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );
  const chars2 = Math.round(
    interpolate(frame, [part2Start, part2End], [0, typedTextPart2.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );

  const emphasizeStart = Math.max(0, typedTextPart2.indexOf(emphasizeWord));
  const emphasizeEnd = emphasizeStart + emphasizeWord.length;
  const emphasizePopFrame = part2Start + emphasizeStart * TYPE_FRAMES_PER_CHAR;
  const emphasizePop = spring({
    frame: frame - emphasizePopFrame,
    fps,
    config: { stiffness: 260, damping: 14 },
    durationInFrames: 14,
  });
  const emphasizeScale = 1 + Math.max(0, emphasizePop) * 0.08 * Math.max(0, 1 - emphasizePop * 0.4);

  const before2 = typedTextPart2.slice(0, Math.min(chars2, emphasizeStart));
  const emphasized2 = chars2 > emphasizeStart ? typedTextPart2.slice(emphasizeStart, Math.min(chars2, emphasizeEnd)) : "";
  const after2 = chars2 > emphasizeEnd ? typedTextPart2.slice(emphasizeEnd, chars2) : "";

  const typeEndFrame = part2End;
  const cursorOn = Math.floor(frame / 15) % 2 === 0;

  const glanceStart = typeEndFrame + 6;
  const glanceOpacity = phaseProgress(frame, glanceStart, GLANCE_HOLD / 2, 0, 1) *
    (1 - phaseProgress(frame, glanceStart + GLANCE_HOLD / 2, GLANCE_HOLD / 2));

  const flipStart = glanceStart + GLANCE_HOLD + 4;
  const flip = phaseProgress(frame, flipStart, FLIP_DURATION);

  const headlineStart = flipStart + FLIP_DURATION + 6;
  const headlineOpacity = phaseProgress(frame, headlineStart, HEADLINE_DURATION);

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      <AmbientBackground accent={accentColor} />
      <SafeZone style={{ justifyContent: "center", alignItems: "center" }}>
        <div
          style={{
            position: "absolute",
            top: 210,
            fontFamily: INTER,
            fontSize: 22,
            fontWeight: 600,
            color: colors.textDim,
            letterSpacing: "0.06em",
          }}
        >
          {"\u{1F319} "}{timeLabel}
        </div>

        <div style={{ opacity: cardOpacity, transform: `translateY(${cardY}px)` }}>
          <BrowserChrome
            width={880}
            urlLabel={flip > 0.5 ? "Cửa sổ ẩn danh mới" : "google.com/search"}
            accentColor={accentColor}
            incognito={flip > 0.5}
          >
            <div
              style={{
                minHeight: 220,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                gap: 22,
                position: "relative",
              }}
            >
              {flip <= 0.5 ? (
                <div
                  style={{
                    fontFamily: INTER,
                    fontSize: 34,
                    fontWeight: 600,
                    color: "rgba(0,0,0,0.78)",
                    textAlign: "center",
                    lineHeight: 1.4,
                  }}
                >
                  {typedTextPart1.slice(0, chars1)}
                  {before2}
                  <span
                    style={{
                      fontWeight: 800,
                      display: "inline-block",
                      transform: `scale(${emphasizeScale})`,
                    }}
                  >
                    {emphasized2}
                  </span>
                  {after2}
                  <span style={{ opacity: cursorOn ? 1 : 0 }}>|</span>
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 14,
                    opacity: flip,
                  }}
                >
                  <span style={{ fontSize: 56 }}>{"\u{1F576}️"}</span>
                  <span
                    style={{
                      fontFamily: INTER,
                      fontWeight: 700,
                      fontSize: 24,
                      color: accentColor,
                      letterSpacing: "0.08em",
                    }}
                  >
                    BẠN ĐANG DUYỆT WEB Ở CHẾ ĐỘ ẨN DANH
                  </span>
                </div>
              )}

              <div
                style={{
                  position: "absolute",
                  top: -6,
                  right: 4,
                  fontSize: 40,
                  opacity: glanceOpacity,
                }}
              >
                {"\u{1F440}"}
              </div>
            </div>
          </BrowserChrome>
        </div>

        <HeadlineBar
          headline={headline}
          accentWord={accentWord}
          accentColor={accentColor}
          opacity={headlineOpacity}
          translateY={interpolate(headlineOpacity, [0, 1], [16, 0])}
        />
      </SafeZone>
    </AbsoluteFill>
  );
};

export default NightTypingHookShot;
