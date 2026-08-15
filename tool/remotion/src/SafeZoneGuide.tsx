import React from "react";
import { AbsoluteFill } from "remotion";
import { SAFE_ZONE } from "./styles";

// Toggle via REMOTION_SAFE_ZONE_GUIDE=1 env var, never rendered in production output.
export const SafeZoneGuide: React.FC = () => {
  if (process.env.REMOTION_SAFE_ZONE_GUIDE !== "1") return null;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 999 }}>
      <div
        style={{
          position: "absolute",
          top: SAFE_ZONE.top,
          left: SAFE_ZONE.left,
          right: SAFE_ZONE.right,
          bottom: SAFE_ZONE.bottom,
          border: "2px solid red",
        }}
      />
    </AbsoluteFill>
  );
};
