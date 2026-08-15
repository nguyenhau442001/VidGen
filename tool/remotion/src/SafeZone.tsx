import React from "react";
import { AbsoluteFill } from "remotion";
import { SAFE_ZONE } from "./styles";

export const SafeZone: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ children, style }) => (
  <AbsoluteFill
    style={{
      paddingTop: SAFE_ZONE.top,
      paddingBottom: SAFE_ZONE.bottom,
      paddingLeft: SAFE_ZONE.left,
      paddingRight: SAFE_ZONE.right,
      boxSizing: "border-box",
      ...style,
    }}
  >
    {children}
  </AbsoluteFill>
);
