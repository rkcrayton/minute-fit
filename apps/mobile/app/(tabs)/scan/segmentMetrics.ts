import { PoseKeypoint, kpMap, angleABC, minScore, roundN } from "./poseMath";

type MetricsOut = { quality?: number } & Record<string, any>;

// Helper to check keypoints exist
function require<K extends string>(
  k: Record<string, any>,
  names: K[]
): Record<K, any> | null {
  const out: any = {};
  for (const n of names) {
    if (!k[n]) return null;
    out[n] = k[n];
  }
  return out;
}

export function computeSegmentMetrics(segmentType: string, keypoints: PoseKeypoint[]): MetricsOut {
  const k = kpMap(keypoints);

  switch (segmentType) {
    case "neutral_front": {
      const pts = require(k, ["left_shoulder","right_shoulder","left_hip","right_hip"]);
      if (!pts) return { missing: true, quality: 0 };

      const shoulderDiffPx = Math.abs(pts.left_shoulder.y - pts.right_shoulder.y);
      const hipDiffPx = Math.abs(pts.left_hip.y - pts.right_hip.y);
      const quality = minScore(pts.left_shoulder, pts.right_shoulder, pts.left_hip, pts.right_hip);

      return {
        quality,
        alignment: {
          shoulder_height_diff_px: roundN(shoulderDiffPx, 1),
          hip_height_diff_px: roundN(hipDiffPx, 1),
        }
      };
    }

    case "overhead_reach": {
      // Use elbow straightness + wrist-above-shoulder proxy
      const pts = require(k, [
        "left_shoulder","left_elbow","left_wrist",
        "right_shoulder","right_elbow","right_wrist"
      ]);
      if (!pts) return { missing: true, quality: 0 };

      const leftElbow = angleABC(pts.left_shoulder, pts.left_elbow, pts.left_wrist);
      const rightElbow = angleABC(pts.right_shoulder, pts.right_elbow, pts.right_wrist);

      const leftWristAbove = pts.left_shoulder.y - pts.left_wrist.y;
      const rightWristAbove = pts.right_shoulder.y - pts.right_wrist.y;

      const quality = Math.min(
        minScore(pts.left_shoulder, pts.left_elbow, pts.left_wrist),
        minScore(pts.right_shoulder, pts.right_elbow, pts.right_wrist),
      );

      return {
        quality,
        mobility: {
          left_elbow_angle_deg: roundN(leftElbow, 1),
          right_elbow_angle_deg: roundN(rightElbow, 1),
          left_wrist_above_shoulder_px: roundN(leftWristAbove, 1),
          right_wrist_above_shoulder_px: roundN(rightWristAbove, 1),
          symmetry_px: roundN(Math.abs(leftWristAbove - rightWristAbove), 1),
        }
      };
    }

    case "squat": {
      // Snapshot depth proxy: knee angles
      const pts = require(k, ["left_hip","left_knee","left_ankle","right_hip","right_knee","right_ankle"]);
      if (!pts) return { missing: true, quality: 0 };

      const leftKnee = angleABC(pts.left_hip, pts.left_knee, pts.left_ankle);
      const rightKnee = angleABC(pts.right_hip, pts.right_knee, pts.right_ankle);

      const avg = (leftKnee !== null && rightKnee !== null) ? (leftKnee + rightKnee)/2 : (leftKnee ?? rightKnee);
      const diff = (leftKnee !== null && rightKnee !== null) ? Math.abs(leftKnee - rightKnee) : null;

      const quality = Math.min(
        minScore(pts.left_hip, pts.left_knee, pts.left_ankle),
        minScore(pts.right_hip, pts.right_knee, pts.right_ankle),
      );

      return {
        quality,
        rom: {
          left_knee_angle_deg: roundN(leftKnee, 1),
          right_knee_angle_deg: roundN(rightKnee, 1),
          knee_angle_deg_avg: roundN(avg, 1),
          left_right_diff_deg: roundN(diff, 1),
        }
      };
    }

    case "single_leg_left":
    case "single_leg_right": {
      // Single-frame “stability” is limited. For v1: hip drop + knee wobble proxy
      const side = segmentType.endsWith("_left") ? "left" : "right";
      const pts = require(k, ["left_hip","right_hip", `${side}_knee`, `${side}_ankle` as any] as any);
      if (!pts) return { missing: true, quality: 0 };

      // Hip drop proxy: hip height difference
      const hipDropPx = Math.abs(pts.left_hip.y - pts.right_hip.y);

      const quality = minScore(pts.left_hip, pts.right_hip, pts[`${side}_knee`], pts[`${side}_ankle`]);

      return {
        quality,
        stability: {
          hip_drop_px: roundN(hipDropPx, 1),
        }
      };
    }

    case "turn": {
      // Trunk lean proxy from shoulders + hips line angle
      const pts = require(k, ["left_shoulder","right_shoulder","left_hip","right_hip"]);
      if (!pts) return { missing: true, quality: 0 };

      const shoulderMid = {
        x: (pts.left_shoulder.x + pts.right_shoulder.x)/2,
        y: (pts.left_shoulder.y + pts.right_shoulder.y)/2,
        score: Math.min(pts.left_shoulder.score ?? 0, pts.right_shoulder.score ?? 0),
      };
      const hipMid = {
        x: (pts.left_hip.x + pts.right_hip.x)/2,
        y: (pts.left_hip.y + pts.right_hip.y)/2,
        score: Math.min(pts.left_hip.score ?? 0, pts.right_hip.score ?? 0),
      };

      // Angle of torso vector relative to vertical
      const dx = shoulderMid.x - hipMid.x;
      const dy = hipMid.y - shoulderMid.y; // positive if shoulder above hip
      const angleFromVerticalDeg = Math.abs(Math.atan2(dx, dy) * 180 / Math.PI);

      const quality = minScore(pts.left_shoulder, pts.right_shoulder, pts.left_hip, pts.right_hip);

      return {
        quality,
        posture: {
          trunk_lean_deg: roundN(angleFromVerticalDeg, 1),
        }
      };
    }

    default:
      return { quality: 0, unsupported: true, segmentType };
  }
}
