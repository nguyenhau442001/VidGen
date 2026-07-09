import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { INTER } from "../styles";

// ---------------------------------------------------------------------------
// Virtual canvas — 750x1080 portrait, authored 1:1 (no scaling needed since
// the composition itself is 750x1080).
// ---------------------------------------------------------------------------
const VB_W = 750;
const VB_H = 1080;

const BG = "#0a0a0f";
const LANE_LINE_COLOR = "#ffffff18";
const DEFAULT_PACKET_COLOR = "#ffffff66";

const LEFT_LABEL_X = 100;
const PATH_START_X = 130;
const PATH_END_X = 620;
const RIGHT_LABEL_X = 630;
const LANE_HEIGHT = 70;
const MAX_LANES = 5;
const DEFAULT_PACKET_COUNT = 4;
const ENDPOINT_LABEL_BOTTOM_Y = VB_H - 60;

const HEADLINE_TOP = 70;
const LANE_FADE_STAGGER = 10;
const LANE_FADE_FRAMES = 10;

const BASE_CYCLE_FRAMES = 80;
const TRAIL_STEPS = [2, 4, 6];
const TRAIL_OPACITIES = [0.6, 0.3, 0.1];
const EXIT_FRAMES = 15;

type LaneColor = "green" | "cyan" | "amber";

const LANE_COLORS: Record<LaneColor, string> = {
  green: "#00ff41",
  cyan: "#61dafb",
  amber: "#ffa500",
};

export type PacketFlowLane = {
  label: string;
  speed: number;
  color?: LaneColor;
  packetCount?: number;
};

export type PacketFlowSceneProps = {
  lanes: PacketFlowLane[];
  headline: string;
  sourceLabel?: string;
  targetLabel?: string;
  durationInFrames: number;
};

// Position along the lane path at progress t (0..1). A gentle bezier sag
// gives the straight run some visual interest without reading as a detour.
const pathPoint = (t: number, y: number): [number, number] => {
  const x = PATH_START_X + (PATH_END_X - PATH_START_X) * t;
  const sag = Math.sin(t * Math.PI) * 6;
  return [x, y + sag];
};

const PacketFlowScene: React.FC<PacketFlowSceneProps> = ({
  lanes,
  headline,
  sourceLabel,
  targetLabel,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const scale = Math.min(width / VB_W, height / VB_H);
  const scaledWidth = VB_W * scale;
  const scaledHeight = VB_H * scale;
  const leftOffset = (width - scaledWidth) / 2;
  const topOffset = (height - scaledHeight) / 2;

  const visibleLanes = lanes.slice(0, MAX_LANES);
  const laneCount = visibleLanes.length;
  const totalLanesHeight = laneCount * LANE_HEIGHT;
  const firstLaneCenterY = VB_H / 2 - totalLanesHeight / 2 + LANE_HEIGHT / 2;

  const headlineOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const hasExitRoom = durationInFrames > EXIT_FRAMES;
  const sceneOpacity = hasExitRoom
    ? interpolate(
        frame,
        [durationInFrames - EXIT_FRAMES, durationInFrames],
        [1, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      )
    : 1;

  return (
    <AbsoluteFill style={{ backgroundColor: BG, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          top: topOffset,
          left: leftOffset,
          width: VB_W,
          height: VB_H,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          opacity: sceneOpacity,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: HEADLINE_TOP,
            width: VB_W,
            textAlign: "center",
            color: "#ffffff",
            fontFamily: `${INTER}, sans-serif`,
            fontSize: 26,
            fontWeight: 700,
            opacity: headlineOpacity,
            padding: "0 30px",
            boxSizing: "border-box",
          }}
        >
          {headline}
        </div>

        <svg
          width={VB_W}
          height={VB_H}
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          style={{ position: "absolute", top: 0, left: 0 }}
        >
          {visibleLanes.map((lane, laneIndex) => {
            const laneY = firstLaneCenterY + laneIndex * LANE_HEIGHT;
            const laneEnterFrame = laneIndex * LANE_FADE_STAGGER;
            const laneOpacity = interpolate(
              frame,
              [laneEnterFrame, laneEnterFrame + LANE_FADE_FRAMES],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            );

            const packetColor = lane.color
              ? LANE_COLORS[lane.color]
              : DEFAULT_PACKET_COLOR;
            const packetCount = lane.packetCount ?? DEFAULT_PACKET_COUNT;
            const cycleFrames = BASE_CYCLE_FRAMES / lane.speed;
            // Packets only start moving once this lane has finished fading in.
            const packetsActiveFrame = laneEnterFrame + LANE_FADE_FRAMES;

            const packets = [];
            for (let p = 0; p < packetCount; p++) {
              const packetOffset = (p / packetCount) * cycleFrames;
              const localFrame = frame - packetsActiveFrame - packetOffset;
              if (localFrame < 0) continue;

              const renderTrail = (stepFrames: number, opacity: number) => {
                const trailFrame = localFrame - stepFrames;
                if (trailFrame < 0) return null;
                const t = (trailFrame % cycleFrames) / cycleFrames;
                const [tx, ty] = pathPoint(t, laneY);
                return (
                  <circle
                    cx={tx}
                    cy={ty}
                    r={5}
                    fill={packetColor}
                    opacity={opacity}
                  />
                );
              };

              const t = (localFrame % cycleFrames) / cycleFrames;
              const [px, py] = pathPoint(t, laneY);

              packets.push(
                <g key={p}>
                  {TRAIL_STEPS.map((stepFrames, i) => (
                    <React.Fragment key={i}>
                      {renderTrail(stepFrames, TRAIL_OPACITIES[i])}
                    </React.Fragment>
                  ))}
                  <circle cx={px} cy={py} r={5} fill={packetColor} />
                </g>
              );
            }

            return (
              <g key={laneIndex} opacity={laneOpacity}>
                <line
                  x1={PATH_START_X}
                  y1={laneY}
                  x2={PATH_END_X}
                  y2={laneY}
                  stroke={LANE_LINE_COLOR}
                  strokeWidth={1}
                />
                <text
                  x={LEFT_LABEL_X}
                  y={laneY}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={13}
                  fontWeight={500}
                  style={{ fill: "#ffffff", fontFamily: INTER }}
                >
                  {lane.label}
                </text>
                {packets}
              </g>
            );
          })}

          {sourceLabel && (
            <text
              x={PATH_START_X}
              y={ENDPOINT_LABEL_BOTTOM_Y}
              textAnchor="start"
              fontSize={13}
              fontWeight={500}
              style={{ fill: "#ffffff", fontFamily: INTER }}
              opacity={headlineOpacity}
            >
              {sourceLabel}
            </text>
          )}
          {targetLabel && (
            <text
              x={RIGHT_LABEL_X}
              y={ENDPOINT_LABEL_BOTTOM_Y}
              textAnchor="start"
              fontSize={13}
              fontWeight={500}
              style={{ fill: "#ffffff", fontFamily: INTER }}
              opacity={headlineOpacity}
            >
              {targetLabel}
            </text>
          )}
        </svg>
      </div>
    </AbsoluteFill>
  );
};

export default PacketFlowScene;
