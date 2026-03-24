import pytest
from utils.volume_calculation import navy_body_fat


# ---------------------------------------------------------------------------
# Normal value ranges
# ---------------------------------------------------------------------------

def test_male_normal_values():
    # Healthy male: height=177cm, neck=38cm, abdomen=85cm
    result = navy_body_fat("male", height_cm=177, neck_cm=38, abdomen_cm=85)
    assert 10.0 <= result <= 25.0


def test_female_normal_values():
    # height=165, neck=36, abdomen=78, hip=55 → formula gives ~29.3%
    result = navy_body_fat("female", height_cm=165, neck_cm=36, abdomen_cm=78, hip_cm=55)
    assert 15.0 <= result <= 40.0


def test_neutral_uses_female_formula():
    # "neutral" should produce same result as "female"
    kwargs = dict(height_cm=165, neck_cm=36, abdomen_cm=78, hip_cm=55)
    assert navy_body_fat("neutral", **kwargs) == navy_body_fat("female", **kwargs)


# ---------------------------------------------------------------------------
# Clamping
# ---------------------------------------------------------------------------

def test_male_clamped_to_minimum():
    # Very low abdomen relative to neck → would compute negative → clamp to 3.0
    result = navy_body_fat("male", height_cm=180, neck_cm=40, abdomen_cm=40)
    assert result == 3.0


def test_male_clamped_to_maximum():
    # Extreme abdomen → would compute > 50 → clamp to 50.0
    result = navy_body_fat("male", height_cm=150, neck_cm=10, abdomen_cm=200)
    assert result == 50.0


def test_female_clamped_to_maximum():
    result = navy_body_fat("female", height_cm=150, neck_cm=5, abdomen_cm=200, hip_cm=200)
    assert result == 50.0


# ---------------------------------------------------------------------------
# Zero / negative guard
# ---------------------------------------------------------------------------

def test_male_zero_diff_no_crash():
    # abdomen == neck → diff would be 0 → guarded to 0.1
    result = navy_body_fat("male", height_cm=170, neck_cm=50, abdomen_cm=50)
    assert isinstance(result, float)
    assert result == 3.0  # log10(0.1) is negative → clamped


def test_female_zero_total_no_crash():
    # abdomen + hip - neck == 0 → guarded to 0.1
    result = navy_body_fat("female", height_cm=170, neck_cm=100, abdomen_cm=50, hip_cm=50)
    assert isinstance(result, float)
    assert result == 3.0


# ---------------------------------------------------------------------------
# Return type / precision
# ---------------------------------------------------------------------------

def test_returns_float():
    result = navy_body_fat("male", height_cm=177, neck_cm=38, abdomen_cm=85)
    assert isinstance(result, float)


def test_one_decimal_place():
    result = navy_body_fat("male", height_cm=177, neck_cm=38, abdomen_cm=85)
    # round(x, 1) means at most one decimal place
    assert result == round(result, 1)
