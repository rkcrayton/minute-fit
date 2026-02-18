V1_SEGMENTS = [
    "neutral_front",
    "overhead_reach",
    "squat",
    "single_leg_left",
    "single_leg_right",
    "turn",
]

def allowed_segments(template_version: str) -> list[str]:
    return V1_SEGMENTS if template_version == "v1" else V1_SEGMENTS
