import React from "react";

// Dark cinematic palette local to grabfood_driver_retention_matrix_p2 — NOT
// the channel-wide `colors` export in styles.ts (which stays light theme).
export const p2Colors = {
  bg: "#0a0e14",
  bgDeep: "#05070a",
  grab: "#00B14F",
  grabDim: "rgba(0,177,79,0.35)",
  warmHome: "#f97316",
  danger: "#ef4444",
  textPrimary: "rgba(255,255,255,0.95)",
  textDim: "rgba(255,255,255,0.55)",
} as const;

type IconProps = { size?: number; color?: string };

export const P2Icons = {
  Lock: ({ size = 22, color = p2Colors.textDim }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="5" y="11" width="14" height="9" rx="2" stroke={color} strokeWidth="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke={color} strokeWidth="2" fill="none" />
    </svg>
  ),
  Unlock: ({ size = 22, color = p2Colors.grab }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="5" y="11" width="14" height="9" rx="2" stroke={color} strokeWidth="2" />
      <path d="M8 11V7a4 4 0 0 1 7.5-1.8" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  ),
  Phone: ({ size = 22, color = p2Colors.textPrimary }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="6" y="2" width="12" height="20" rx="2.5" stroke={color} strokeWidth="2" />
      <line x1="10" y1="19" x2="14" y2="19" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  Clock: ({ size = 22, color = p2Colors.textPrimary }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" />
      <path d="M12 7v5l3.5 2" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  ),
  Calendar: ({ size = 22, color = p2Colors.textPrimary }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="5" width="18" height="16" rx="2" stroke={color} strokeWidth="2" />
      <line x1="3" y1="10" x2="21" y2="10" stroke={color} strokeWidth="2" />
      <line x1="8" y1="2" x2="8" y2="6" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="16" y1="2" x2="16" y2="6" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  Scale: ({ size = 22, color = p2Colors.textPrimary }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <line x1="12" y1="3" x2="12" y2="21" stroke={color} strokeWidth="2" />
      <line x1="4" y1="7" x2="20" y2="7" stroke={color} strokeWidth="2" />
      <path d="M4 7l-3 6a3.5 3.5 0 0 0 7 0Z" stroke={color} strokeWidth="1.6" fill="none" />
      <path d="M20 7l-3 6a3.5 3.5 0 0 0 7 0Z" stroke={color} strokeWidth="1.6" fill="none" />
    </svg>
  ),
  Confetti: ({ size = 22, color = p2Colors.grab }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="4" height="4" fill={color} transform="rotate(15 5 5)" />
      <rect x="17" y="4" width="4" height="4" fill={p2Colors.warmHome} transform="rotate(-20 19 6)" />
      <rect x="10" y="14" width="4" height="4" fill={color} transform="rotate(30 12 16)" />
      <circle cx="19" cy="16" r="2" fill={p2Colors.warmHome} />
    </svg>
  ),
  Home: ({ size = 22, color = p2Colors.warmHome }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4 11l8-7 8 7" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" stroke={color} strokeWidth="2" fill="none" />
    </svg>
  ),
};
