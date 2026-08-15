// Shared geometry for "core hub + orbiting nodes + connector lines" scenes
// (DriverMatrixTeaserScene, RouteOptimizerScene). Node boxes sit on evenly
// spaced angles around a core point; connectors run from each box's edge
// to the core's radius, not its center, so lines touch borders exactly.

export type RadialPoint = { x: number; y: number };

export function radialNodePositions(
  core: RadialPoint,
  angles: number[],
  orbitRadius: number,
  nodeWidth: number,
  nodeHeight: number
): RadialPoint[] {
  return angles.map((angle) => {
    const radians = (angle * Math.PI) / 180;
    return {
      x: core.x + Math.cos(radians) * orbitRadius - nodeWidth / 2,
      y: core.y + Math.sin(radians) * orbitRadius - nodeHeight / 2,
    };
  });
}

export function radialConnector(
  core: RadialPoint,
  position: RadialPoint,
  nodeWidth: number,
  nodeHeight: number,
  coreRadius: number
): { x1: number; y1: number; x2: number; y2: number } {
  const centerX = position.x + nodeWidth / 2;
  const centerY = position.y + nodeHeight / 2;
  const dx = core.x - centerX;
  const dy = core.y - centerY;
  const distance = Math.hypot(dx, dy);
  const ux = dx / distance;
  const uy = dy / distance;
  const horizontalExit = Math.abs(ux) > 1e-6 ? nodeWidth / 2 / Math.abs(ux) : Number.POSITIVE_INFINITY;
  const verticalExit = Math.abs(uy) > 1e-6 ? nodeHeight / 2 / Math.abs(uy) : Number.POSITIVE_INFINITY;
  const boxExit = Math.min(horizontalExit, verticalExit);
  return {
    x1: centerX + ux * boxExit,
    y1: centerY + uy * boxExit,
    x2: core.x - ux * coreRadius,
    y2: core.y - uy * coreRadius,
  };
}
