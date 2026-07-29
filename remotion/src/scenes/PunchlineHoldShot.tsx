import React from "react";
import { AbsoluteFill } from "remotion";
import { PunchlineHoldVisual } from "../types";
import { colors, INTER } from "../styles";
import { SafeZone } from "../SafeZone";

export type PunchlineHoldSceneProps = PunchlineHoldVisual & { durationInFrames: number };

// SafeZone content width at 1080×1920 (left 94 + right 154 margins) minus a
// little extra breathing room.
const AVAILABLE_WIDTH = 1080 - 94 - 154 - 40;
// Empirical average glyph width for bold Inter, in em — used only to decide
// whether a line needs shrinking to guarantee it never auto-wraps; each
// authored line must render as exactly one row (see CLAUDE.md Visual Text
// Rules), never split mid-line with an orphan trailing word.
const CHAR_WIDTH_EM = 0.6;

const fitFontSize = (text: string, baseFontSize: number): number => {
  const estWidth = text.length * baseFontSize * CHAR_WIDTH_EM;
  return estWidth > AVAILABLE_WIDTH ? baseFontSize * (AVAILABLE_WIDTH / estWidth) : baseFontSize;
};

// Deliberately has zero animation: opacity is always 1, no interpolate, no
// spring. The closing beat must "đứng yên trọn 1 giây" (hold fully still for
// a full second) with no CTA — any motion here (even a fade-in) would break
// that stillness, so this component ignores `frame` entirely.
export const PunchlineHoldShot: React.FC<PunchlineHoldSceneProps> = ({
  line1 = "KHÔNG LƯU LỊCH SỬ",
  line2 = "KHÔNG CÓ NGHĨA KHÔNG AI BIẾT",
  accentColor = colors.green,
}) => {
  const line1FontSize = fitFontSize(line1, 52);
  const line2FontSize = fitFontSize(line2, 44);
  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      <SafeZone style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, textAlign: "center" }}>
          <span
            style={{
              fontFamily: INTER,
              fontWeight: 800,
              fontSize: line1FontSize,
              color: colors.textPrimary,
              lineHeight: 1.2,
              whiteSpace: "nowrap",
            }}
          >
            {line1}
          </span>
          <div style={{ width: 90, height: 4, borderRadius: 2, background: accentColor }} />
          <span
            style={{
              fontFamily: INTER,
              fontWeight: 800,
              fontSize: line2FontSize,
              color: accentColor,
              lineHeight: 1.25,
              whiteSpace: "nowrap",
            }}
          >
            {line2}
          </span>
        </div>
      </SafeZone>
    </AbsoluteFill>
  );
};

export default PunchlineHoldShot;
