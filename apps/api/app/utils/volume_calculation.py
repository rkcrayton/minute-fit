import math


def navy_body_fat(
    gender: str,
    height_cm: float,
    neck_cm: float,
    abdomen_cm: float,
    hip_cm: float = 0.0,
) -> float:
    """
    US Navy Body Fat Formula (public domain).

    Men:   %BF = 86.010 * log10(abdomen - neck) - 70.041 * log10(height) + 36.76
    Women: %BF = 163.205 * log10(waist + hip - neck) - 97.684 * log10(height) - 78.387

    All inputs in centimeters.
    Returns body fat percentage clamped to [3.0, 50.0].
    """
    if gender == 'male':
        diff = abdomen_cm - neck_cm
        if diff <= 0:
            diff = 0.1
        bf = 86.010 * math.log10(diff) - 70.041 * math.log10(height_cm) + 36.76
    else:
        # female / neutral
        total = abdomen_cm + hip_cm - neck_cm
        if total <= 0:
            total = 0.1
        bf = 163.205 * math.log10(total) - 97.684 * math.log10(height_cm) - 78.387

    return max(3.0, min(50.0, round(bf, 1)))
