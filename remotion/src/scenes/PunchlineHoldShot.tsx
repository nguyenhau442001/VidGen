import React from "react";
import { AbsoluteFill } from "remotion";
import { PunchlineHoldVisual } from "../types";
import { colors, INTER } from "../styles";
import { SafeZone } from "../SafeZone";

export type PunchlineHoldSceneProps = PunchlineHoldVisual & { durationInFrames: number };

// Deliberately has zero animation: opacity is always 1, no interpolate, no
// spring. The closing beat must "đứng yên trọn 1 giây" (hold fully still for
// a full second) with no CTA — any motion here (even a fade-in) would break
// that stillness, so this component ignores `frame` entirely.
export const PunchlineHoldShot: React.FC<PunchlineHoldSceneProps> = ({
  line1 = "KHÔNG LƯU LỊCH SỬ",
  line2 = "KHÔNG CÓ NGHĨA KHÔNG AI BIẾT",
  accentColor = colors.green,
}) => {
  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      <SafeZone style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, textAlign: "center" }}>
          <span style={{ fontFamily: INTER, fontWeight: 800, fontSize: 52, color: colors.textPrimary, lineHeight: 1.2 }}>
            {line1}
          </span>
          <div style={{ width: 90, height: 4, borderRadius: 2, background: accentColor }} />
          <span style={{ fontFamily: INTER, fontWeight: 800, fontSize: 44, color: accentColor, lineHeight: 1.25 }}>
            {line2}
          </span>
        </div>
      </SafeZone>
    </AbsoluteFill>
  );
};

export default PunchlineHoldShot;
