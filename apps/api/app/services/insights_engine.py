from typing import Dict, Any, List, Tuple

def build_scan_report(template_version: str, segments: Dict[str, Dict[str, Any]]) -> Tuple[float, Dict[str, Any], List[Dict[str, Any]]]:
    insights: List[Dict[str, Any]] = []
    score = 100.0

    # Example rules (simple V1)
    oh = segments.get("overhead_reach", {}).get("mobility", {})
    sym = oh.get("symmetry_deg")
    if isinstance(sym, (int, float)) and sym > 10:
        insights.append({
            "message": "Overhead reach is noticeably uneven left vs right.",
            "severity": "med",
            "tag": "symmetry",
            "evidence": {"overhead_symmetry_deg": sym},
        })
        score -= 8

    sq = segments.get("squat", {})
    knee_min = sq.get("rom", {}).get("knee_min_deg_avg")
    ecc = sq.get("tempo", {}).get("ecc_ms_avg")
    valgus = sq.get("flags", {}).get("knee_valgus_rate")

    if isinstance(knee_min, (int, float)) and knee_min > 95:
        insights.append({
            "message": "Squat depth looks a bit high. Try a slightly deeper squat with control.",
            "severity": "med",
            "tag": "depth",
            "evidence": {"knee_min_deg_avg": knee_min},
        })
        score -= 12

    if isinstance(ecc, (int, float)) and ecc < 900:
        insights.append({
            "message": "You’re dropping fast in the squat—slow the way down for better control.",
            "severity": "med",
            "tag": "tempo",
            "evidence": {"ecc_ms_avg": int(ecc)},
        })
        score -= 8

    if isinstance(valgus, (int, float)) and valgus >= 0.25:
        insights.append({
            "message": "Knees may be caving inward during squats. Think “knees out” and keep feet rooted.",
            "severity": "high",
            "tag": "stability",
            "evidence": {"knee_valgus_rate": valgus},
        })
        score -= 18

    score = max(0.0, min(100.0, score))
    summary = {"template_version": template_version, "segment_count": len(segments)}
    return score, summary, insights
