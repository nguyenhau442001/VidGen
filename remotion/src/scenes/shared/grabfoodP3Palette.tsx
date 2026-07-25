import React from "react";

// Dark fintech palette local to grabfood_discount_who_pays_p3 — NOT the
// channel-wide `colors` export in styles.ts (which stays light theme).
// Chosen for this video's receipt/ledger/app-UI motion graphics: a navy
// background reads as a finance/reconciliation surface, paper-white cards
// carry the invoice content, and the Grab green stays the one brand anchor.
export const p3Colors = {
  bg: "#0a0e16",
  bgDeep: "#05070c",
  grab: "#00B14F",
  grabDim: "rgba(0,177,79,0.16)",
  paper: "#f7faf8",
  paperDim: "rgba(247,250,248,0.08)",
  cost: "#ef4444",
  costDim: "rgba(239,68,68,0.16)",
  sponsor: "#f59e0b",
  sponsorDim: "rgba(245,158,11,0.16)",
  textPrimary: "rgba(255,255,255,0.95)",
  textDim: "rgba(255,255,255,0.55)",
} as const;

type IconProps = { size?: number; color?: string };

export const P3Icons = {
  Receipt: ({ size = 22, color = p3Colors.textPrimary }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M6 2h12v19l-2.5-1.6L13 21l-2.5-1.6L8 21l-2-1.3V2Z"
        stroke={color}
        strokeWidth="1.6"
        fill="none"
        strokeLinejoin="round"
      />
      <line x1="8.5" y1="7" x2="15.5" y2="7" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      <line x1="8.5" y1="11" x2="15.5" y2="11" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      <line x1="8.5" y1="15" x2="13" y2="15" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  Store: ({ size = 22, color = p3Colors.textPrimary }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M3 9l1.5-5h15L21 9" stroke={color} strokeWidth="1.7" strokeLinejoin="round" fill="none" />
      <path d="M4 9v11h16V9" stroke={color} strokeWidth="1.7" fill="none" />
      <path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" stroke={color} strokeWidth="1.5" fill="none" />
      <rect x="9.5" y="14" width="5" height="6" stroke={color} strokeWidth="1.5" fill="none" />
    </svg>
  ),
  Tag: ({ size = 22, color = p3Colors.grab }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M11.5 3H4v7.5L14 20l7.5-7.5L11.5 3Z"
        stroke={color}
        strokeWidth="1.6"
        fill="none"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="7" r="1.4" fill={color} />
    </svg>
  ),
  Ledger: ({ size = 22, color = p3Colors.textPrimary }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="4" y="3" width="16" height="18" rx="1.5" stroke={color} strokeWidth="1.6" fill="none" />
      <line x1="7.5" y1="8" x2="16.5" y2="8" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
      <line x1="7.5" y1="12" x2="16.5" y2="12" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
      <line x1="7.5" y1="16" x2="13.5" y2="16" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  Phone: ({ size = 22, color = p3Colors.textPrimary }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="6" y="2" width="12" height="20" rx="2.5" stroke={color} strokeWidth="2" />
      <line x1="10" y1="19" x2="14" y2="19" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  Coin: ({ size = 22, color = p3Colors.grab }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.8" fill="none" />
      <text x="12" y="16" textAnchor="middle" fontSize="11" fontWeight={800} fill={color} fontFamily="sans-serif">
        đ
      </text>
    </svg>
  ),
  Building: ({ size = 22, color = p3Colors.textPrimary }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="5" y="4" width="14" height="17" stroke={color} strokeWidth="1.6" fill="none" />
      <line x1="8.5" y1="8" x2="8.5" y2="8.01" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
      <line x1="12" y1="8" x2="12" y2="8.01" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
      <line x1="15.5" y1="8" x2="15.5" y2="8.01" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
      <line x1="8.5" y1="12" x2="8.5" y2="12.01" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
      <line x1="12" y1="12" x2="12" y2="12.01" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
      <line x1="15.5" y1="12" x2="15.5" y2="12.01" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
      <rect x="10" y="16" width="4" height="5" stroke={color} strokeWidth="1.4" fill="none" />
    </svg>
  ),
};

// A minimal, brand-neutral "G" mark standing in for the Grab app icon in
// illustrative UI — never a copy of Grab's real logotype, just a rounded
// green badge with a letterform, enough to read as "the platform" at a glance.
export const GrabMark: React.FC<{ size?: number }> = ({ size = 64 }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: size * 0.28,
      background: p3Colors.grab,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: `0 0 ${size * 0.5}px rgba(0,177,79,0.45)`,
    }}
  >
    <span style={{ color: "#04140a", fontWeight: 900, fontSize: size * 0.5, fontFamily: "sans-serif" }}>G</span>
  </div>
);
