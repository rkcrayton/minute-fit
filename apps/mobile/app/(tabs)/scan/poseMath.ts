export type PoseKeypoint = {
  name?: string;
  x: number;
  y: number;
  score?: number;
};

export type Point = { x: number; y: number; score?: number };

export function kpMap(keypoints: PoseKeypoint[]): Record<string, Point> {
  const map: Record<string, Point> = {};
  for (const kp of keypoints) {
    if (kp.name) map[kp.name] = { x: kp.x, y: kp.y, score: kp.score };
  }
  return map;
}

// Angle at B formed by A-B-C in degrees
export function angleABC(A: Point, B: Point, C: Point): number | null {
  const BAx = A.x - B.x;
  const BAy = A.y - B.y;
  const BCx = C.x - B.x;
  const BCy = C.y - B.y;

  const dot = BAx * BCx + BAy * BCy;
  const magBA = Math.hypot(BAx, BAy);
  const magBC = Math.hypot(BCx, BCy);

  if (magBA === 0 || magBC === 0) return null;

  const cos = Math.max(-1, Math.min(1, dot / (magBA * magBC)));
  const rad = Math.acos(cos);
  return (rad * 180) / Math.PI;
}

export function dist(A: Point, B: Point): number {
  return Math.hypot(A.x - B.x, A.y - B.y);
}

export function minScore(...pts: Point[]): number {
  const scores = pts.map(p => (typeof p.score === "number" ? p.score : 0));
  return Math.min(...scores);
}

export function roundN(x: number | null, digits = 1): number | null {
  if (x === null || Number.isNaN(x)) return null;
  const m = Math.pow(10, digits);
  return Math.round(x * m) / m;
}
