import React from "react";

// Xanh SM (GSM) brand palette — this video's shots use the brand's cyan-blue
// identity instead of the generic green/cyan mix other scripts default to.
// Exact hex not confirmed from an official brand-guidelines source; this is a
// close approximation of the vivid cyan-blue seen across Xanh SM's fleet and
// app livery. Swap `xanhSmBlue` here if an official hex becomes available —
// every shot in this video reads it from this one constant.
export const xanhSmBlue = "#0EA5E9";
export const xanhSmBlueDeep = "#0284C7";

// Minimal bird-in-flight glyph echoing Xanh SM's logomark (a bird/wings shape
// worked into their "V" mark). Single-path, fill-only so it scales cleanly at
// small badge sizes.
export const XanhSMBirdIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 28,
  color = xanhSmBlue,
}) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <path
      d="M16 6c1.2 2.6 3.4 4.4 6.4 5.1-2.2 1-3.8 2.4-4.8 4.3 3.6-.4 6.6.6 9.4 3-4.2 1-7.6.4-10.4-1.7.3 3 1.6 5.4 4 7.3-3.4-.1-5.9-1.5-7.6-4.3-1.7 2.8-4.2 4.2-7.6 4.3 2.4-1.9 3.7-4.3 4-7.3-2.8 2.1-6.2 2.7-10.4 1.7 2.8-2.4 5.8-3.4 9.4-3-1-1.9-2.6-3.3-4.8-4.3 3-.7 5.2-2.5 6.4-5.1z"
      fill={color}
    />
  </svg>
);
