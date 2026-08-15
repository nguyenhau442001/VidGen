import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { HSKFlashCardThumbnailSceneProps } from "../types";
import { INTER, BE_VIETNAM_PRO, NOTO_SERIF_SC } from "../styles";

const RED = "#b52a1c";
const RED_DARK = "#8a1e12";
const CREAM = "#f5f1eb";
const RIGHT_BG = "#ede8e0";
const INK = "#1a1714";
const GREEN = "#1b7a3e";

function splitCount(count: string): { main: string; suffix: string } {
  const match = count.match(/^(.*?)(\D*)$/);
  if (!match) return { main: count, suffix: "" };
  return { main: match[1], suffix: match[2] };
}

function renderAccentHanzi(text: string, accent?: string): React.ReactNode {
  if (!accent) return text;
  const idx = text.indexOf(accent);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span style={{ color: "#c0392b", fontWeight: 700 }}>{accent}</span>
      {text.slice(idx + accent.length)}
    </>
  );
}

export const HSKFlashCardThumbnailScene: React.FC<HSKFlashCardThumbnailSceneProps> = ({
  titleTop = "HSK",
  range = "1 – 6",
  badgeText = "MIỄN PHÍ",
  count = "5000+",
  countSub = "Từ vựng",
  hanzi = "爱惜",
  pinyin = "àixī",
  meaning = "trân trọng, tiết kiệm",
  exampleZh = "要爱惜粮食，不要浪费。",
  exampleVi = "Phải trân trọng lương thực.",
  accentHanzi = "爱惜",
}) => {
  useCurrentFrame();
  useVideoConfig();

  const { main: countMain, suffix: countSuffix } = splitCount(count);

  return (
    <AbsoluteFill style={{ flexDirection: "row", backgroundColor: CREAM }}>
      {/* Left half */}
      <div
        style={{
          width: "52%",
          backgroundColor: RED,
          borderRight: `3px solid ${RED_DARK}`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -40,
            left: -30,
            fontFamily: NOTO_SERIF_SC,
            fontWeight: 900,
            fontSize: 340,
            color: "rgba(255,255,255,0.06)",
          }}
        >
          汉字
        </div>

        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              fontFamily: INTER,
              fontWeight: 900,
              fontSize: 210,
              lineHeight: 0.88,
              color: "#fff",
            }}
          >
            {titleTop}
          </div>

          <div
            style={{
              fontFamily: INTER,
              fontWeight: 900,
              fontSize: 52,
              color: "rgba(255,255,255,0.75)",
              letterSpacing: "0.2em",
              marginBottom: 26,
            }}
          >
            {range}
          </div>

          <div
            style={{
              backgroundColor: "#fff",
              color: RED,
              fontFamily: BE_VIETNAM_PRO,
              fontWeight: 900,
              fontSize: 38,
              padding: "14px 44px",
              borderRadius: 18,
              transform: "rotate(-4deg)",
              boxShadow: "8px 8px 0px rgba(0,0,0,0.28)",
              border: "7px solid rgba(255,255,255,0.45)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 22,
            }}
          >
            {badgeText}
          </div>

          <div style={{ display: "flex", alignItems: "flex-start" }}>
            <span
              style={{
                fontFamily: INTER,
                fontWeight: 900,
                fontSize: 144,
                lineHeight: 1,
                color: "#fff",
              }}
            >
              {countMain}
            </span>
            {countSuffix && (
              <span
                style={{
                  fontFamily: INTER,
                  fontWeight: 900,
                  fontSize: 72,
                  color: "#fff",
                  verticalAlign: "top",
                }}
              >
                {countSuffix}
              </span>
            )}
          </div>

          <div
            style={{
              fontFamily: BE_VIETNAM_PRO,
              fontWeight: 700,
              fontSize: 30,
              color: "rgba(255,255,255,0.65)",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              marginTop: 4,
            }}
          >
            {countSub}
          </div>
        </div>
      </div>

      {/* Right half */}
      <div
        style={{
          flex: 1,
          backgroundColor: RIGHT_BG,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "28px 24px",
          gap: 14,
        }}
      >
        <div
          style={{
            alignSelf: "flex-end",
            backgroundColor: INK,
            color: "#fff",
            fontFamily: BE_VIETNAM_PRO,
            fontWeight: 700,
            fontSize: 22,
            padding: "8px 24px",
            borderRadius: 60,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          ✓ Web · Không cần App
        </div>

        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: 28,
            border: "5px solid #d0c8be",
            padding: "26px 30px 22px",
            width: "100%",
            textAlign: "center",
            boxShadow: "0 8px 28px rgba(0,0,0,0.13)",
          }}
        >
          <div
            style={{
              fontFamily: NOTO_SERIF_SC,
              fontWeight: 900,
              fontSize: 80,
              color: INK,
              lineHeight: 1,
              marginBottom: 6,
            }}
          >
            {hanzi}
          </div>
          <div
            style={{
              fontFamily: INTER,
              fontWeight: 700,
              fontStyle: "italic",
              fontSize: 28,
              color: RED,
              marginBottom: 6,
            }}
          >
            {pinyin}
          </div>
          <div
            style={{
              fontFamily: BE_VIETNAM_PRO,
              fontWeight: 600,
              fontSize: 28,
              color: "#444",
            }}
          >
            {meaning}
          </div>
        </div>

        <div
          style={{
            backgroundColor: "#fdf6ee",
            borderRadius: 16,
            padding: "14px 20px",
            width: "100%",
            borderLeft: "7px solid #c0392b",
            fontSize: 24,
            color: "#777",
            textAlign: "left",
            lineHeight: 1.5,
          }}
        >
          <div style={{ fontFamily: NOTO_SERIF_SC, fontWeight: 900 }}>
            {renderAccentHanzi(exampleZh, accentHanzi)}
          </div>
          <div
            style={{
              fontFamily: BE_VIETNAM_PRO,
              fontStyle: "italic",
              color: "#aaa",
              fontSize: 22,
            }}
          >
            {exampleVi}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "row", gap: 14, width: "100%" }}>
          <div
            style={{
              backgroundColor: "#fde8e8",
              color: RED,
              fontFamily: BE_VIETNAM_PRO,
              fontWeight: 800,
              fontSize: 26,
              padding: "14px 0",
              borderRadius: 16,
              flex: 1,
              border: "4px solid #f5c0c0",
              textAlign: "center",
            }}
          >
            ✗ Chưa nhớ
          </div>
          <div
            style={{
              backgroundColor: GREEN,
              color: "#fff",
              fontFamily: BE_VIETNAM_PRO,
              fontWeight: 800,
              fontSize: 26,
              padding: "14px 0",
              borderRadius: 16,
              flex: 1,
              boxShadow: "0 6px 18px rgba(27,122,62,0.4)",
              textAlign: "center",
            }}
          >
            ✓ Đã nhớ
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export default HSKFlashCardThumbnailScene;
