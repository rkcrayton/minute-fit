import random
from typing import Dict, Any

def _clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))

def mock_segment_metrics(segment_type: str) -> Dict[str, Any]:
    quality = _clamp(random.gauss(0.9, 0.08), 0.3, 1.0)

    if segment_type == "neutral_front":
        return {
            "quality": quality,
            "alignment": {
                "shoulder_height_diff": round(abs(random.gauss(0.8, 0.6)), 2),
                "hip_height_diff": round(abs(random.gauss(0.7, 0.6)), 2),
            }
        }

    if segment_type == "overhead_reach":
        l = _clamp(random.gauss(165, 10), 110, 180)
        r = _clamp(random.gauss(165, 10), 110, 180)
        return {
            "quality": quality,
            "mobility": {
                "shoulder_flex_left_deg": round(l, 1),
                "shoulder_flex_right_deg": round(r, 1),
                "symmetry_deg": round(abs(l - r), 1),
            }
        }

    if segment_type == "squat":
        knee_min = _clamp(random.gauss(92, 10), 60, 130)
        ecc_ms = max(400, int(random.gauss(950, 220)))
        return {
            "quality": quality,
            "rom": {"knee_min_deg_avg": round(knee_min, 1)},
            "tempo": {"ecc_ms_avg": ecc_ms},
            "symmetry": {"left_right_rom_diff_deg": round(abs(random.gauss(6.0, 4.0)), 1)},
            "flags": {"knee_valgus_rate": round(_clamp(random.gauss(0.12, 0.10), 0.0, 0.6), 2)},
        }

    if segment_type in ("single_leg_left", "single_leg_right"):
        return {
            "quality": quality,
            "stability": {"sway_score": round(_clamp(random.gauss(0.22, 0.12), 0.02, 0.8), 2)},
        }

    if segment_type == "turn":
        return {
            "quality": quality,
            "posture": {"trunk_lean_deg": round(_clamp(random.gauss(6, 5), 0, 25), 1)},
        }

    return {"quality": quality}
