import React from "react";

// Shared vector-icon set, added to replace bare emoji as the primary iconography
// in shared scenes (SignalFlowScene, DiagramFlowScene, SystemLayerScene payoff).
// Each shape is authored in a local -12..12 coordinate space so it can be dropped
// directly into a <g transform="translate(x,y) scale(s)"> wrapper — the same
// placement pattern those scenes already use for emoji <text>. Unknown/legacy
// icon keys (including any emoji string) fall through to the text/span fallback
// in VectorIconSvg/VectorIconHtml, so existing videos that pass emoji keep
// rendering unchanged.

type IconRenderer = (color: string) => React.ReactNode;

const ICONS: Record<string, IconRenderer> = {
  "road-closure": (color) => (
    <g>
      <path d="M0 -10 L9 8 H-9 Z" fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <rect x={-7} y={0.5} width={14} height={3} rx={1.5} fill={color} />
      <rect x={-7} y={-4.5} width={14} height={3} rx={1.5} fill={color} opacity={0.55} />
    </g>
  ),
  "map-pin": (color) => (
    <g>
      <path
        d="M0 -10 C-5 -10 -8 -6.7 -8 -2.6 C-8 3 0 11 0 11 S8 3 8 -2.6 C8 -6.7 5 -10 0 -10 Z"
        fill={color}
      />
      <circle cx={0} cy={-3} r={2.6} fill="#04121f" />
    </g>
  ),
  poi: (color) => (
    <g>
      <circle r={8} fill="none" stroke={color} strokeWidth={2} />
      <circle r={3} fill={color} />
    </g>
  ),
  "traffic-sign": (color) => (
    <g>
      <rect x={-1} y={-2} width={2} height={12} fill={color} opacity={0.7} />
      <rect x={-9} y={-11} width={18} height={10} rx={2} fill="none" stroke={color} strokeWidth={2} />
      <line x1={-5} y1={-6} x2={5} y2={-6} stroke={color} strokeWidth={2} strokeLinecap="round" />
    </g>
  ),
  motorbike: (color) => (
    <g>
      <circle cx={-6} cy={6} r={3.4} fill="none" stroke={color} strokeWidth={2} />
      <circle cx={6} cy={6} r={3.4} fill="none" stroke={color} strokeWidth={2} />
      <path
        d="M-6 6 L-1 -2 H5 L9 6 M-1 -2 L2 6 M2 -6 H7"
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  ),
  signal: (color) => (
    <g>
      <circle cy={6} r={1.6} fill={color} />
      <path d="M-5 2 a7 7 0 0 1 10 0" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <path d="M-8.5 -1.5 a11.5 11.5 0 0 1 17 0" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" opacity={0.55} />
    </g>
  ),
  validation: (color) => (
    <g>
      <circle r={9} fill="none" stroke={color} strokeWidth={2} />
      <path d="M-4 0 L-1 3.5 L5 -4" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  ),
  map: (color) => (
    <g>
      <path
        d="M-9 -6 L-3 -8 L3 -6 L9 -8 V8 L3 6 L-3 8 L-9 6 Z"
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <line x1={-3} y1={-8} x2={-3} y2={8} stroke={color} strokeWidth={1.4} opacity={0.6} />
      <line x1={3} y1={-6} x2={3} y2={6} stroke={color} strokeWidth={1.4} opacity={0.6} />
    </g>
  ),
  "next-trip": (color) => (
    <g>
      <path d="M-8 4 C-4 -6, 4 -6, 7 2" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
      <path d="M3 -2 L8 2 L3 6" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  ),
  photo: (color) => (
    <g>
      <rect x={-9} y={-4} width={18} height={12} rx={2} fill="none" stroke={color} strokeWidth={2} />
      <rect x={-3} y={-8} width={6} height={4} rx={1} fill={color} />
      <circle cy={2} r={4} fill="none" stroke={color} strokeWidth={2} />
    </g>
  ),
  "street-name": (color) => (
    <g>
      <rect x={-9} y={-5} width={18} height={10} rx={2} fill="none" stroke={color} strokeWidth={2} />
      <line x1={-5} y1={-1} x2={5} y2={-1} stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      <line x1={-5} y1={2} x2={2} y2={2} stroke={color} strokeWidth={1.6} strokeLinecap="round" opacity={0.6} />
    </g>
  ),
  dispatch: (color) => (
    <g>
      <circle cx={0} cy={-7} r={2.2} fill={color} />
      <circle cx={-7} cy={6} r={2.2} fill={color} opacity={0.75} />
      <circle cx={7} cy={6} r={2.2} fill={color} opacity={0.75} />
      <path d="M0 -5 L-6 4 M0 -5 L6 4" stroke={color} strokeWidth={1.6} opacity={0.6} />
    </g>
  ),
  eta: (color) => (
    <g>
      <circle r={9} fill="none" stroke={color} strokeWidth={2} />
      <path d="M0 -5 V0 L4 3" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  ),
  route: (color) => (
    <g>
      <path d="M-7 7 C-7 -2, 7 -2, 7 -7" fill="none" stroke={color} strokeWidth={2.2} strokeDasharray="1 4" strokeLinecap="round" />
      <circle cx={-7} cy={7} r={2.4} fill={color} />
      <circle cx={7} cy={-7} r={2.4} fill={color} />
    </g>
  ),
  gate: (color) => (
    <g>
      <rect x={-7} y={-8} width={14} height={16} rx={1} fill="none" stroke={color} strokeWidth={2} />
      <rect x={-2.4} y={2} width={4.8} height={6} fill={color} />
    </g>
  ),
  reject: (color) => (
    <g>
      <circle r={9} fill="none" stroke={color} strokeWidth={2} />
      <path d="M-4 -4 L4 4 M4 -4 L-4 4" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    </g>
  ),
};

export const hasVectorIcon = (name: string): boolean => Object.prototype.hasOwnProperty.call(ICONS, name);

// For raw <svg> canvases (SignalFlowScene): a self-contained nested <svg> so it
// composes inside an existing viewBox without fighting parent coordinates.
export const VectorIconSvg: React.FC<{ name: string; size?: number; color?: string; textFallbackSize?: number }> = ({
  name,
  size = 32,
  color = "currentColor",
  textFallbackSize,
}) => {
  const render = ICONS[name];
  if (!render) {
    return (
      <text textAnchor="middle" dominantBaseline="central" fontSize={textFallbackSize ?? size}>
        {name}
      </text>
    );
  }
  return (
    <svg x={-size / 2} y={-size / 2} width={size} height={size} viewBox="-12 -12 24 24">
      {render(color)}
    </svg>
  );
};

// For HTML flow (DiagramFlowScene, SystemLayerScene): plain block-level <svg>,
// falls back to a <span> for emoji/legacy keys.
export const VectorIconHtml: React.FC<{ name: string; size?: number; color?: string; textFallbackSize?: number }> = ({
  name,
  size = 32,
  color = "currentColor",
  textFallbackSize,
}) => {
  const render = ICONS[name];
  if (!render) {
    return <span style={{ fontSize: textFallbackSize ?? size, lineHeight: 1 }}>{name}</span>;
  }
  return (
    <svg width={size} height={size} viewBox="-12 -12 24 24" style={{ display: "block" }}>
      {render(color)}
    </svg>
  );
};
