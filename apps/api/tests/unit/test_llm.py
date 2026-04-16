import sys
from unittest.mock import MagicMock

import services.llm as llm_module
from services.llm import generate_scan_insights


SAMPLE_SCAN = {
    "body_composition": {
        "bmi": 22.5,
        "body_fat_percentage": 14.0,
        "fat_mass_lbs": 25.0,
        "lean_mass_lbs": 150.0,
        "waist_to_hip_ratio": 0.84,
    },
    "health_assessment": {"category": "Fit", "risk_level": "low"},
    "measurements": {"neck": 14.0, "waist": 32.0},
}

SAMPLE_USER = {
    "age": 25,
    "gender": "male",
    "height": 70.0,
    "weight": 170.0,
    "fitness_goal": "build muscle",
}


def test_generate_insights_no_api_key():
    # GEMINI_API_KEY is empty in the test environment — should return None immediately
    result = generate_scan_insights(SAMPLE_SCAN, SAMPLE_USER)
    assert result is None


def test_generate_insights_success(monkeypatch):
    monkeypatch.setattr(llm_module.settings, "GEMINI_API_KEY", "fake-key")

    mock_genai = MagicMock()
    mock_genai.Client.return_value.models.generate_content.return_value.text = "Great fitness!"

    with __import__("unittest.mock", fromlist=["patch"]).patch.dict(
        sys.modules,
        {"google": MagicMock(genai=mock_genai), "google.genai": mock_genai},
    ):
        result = generate_scan_insights(SAMPLE_SCAN, SAMPLE_USER)

    assert result == "Great fitness!"


def test_generate_insights_api_error(monkeypatch):
    monkeypatch.setattr(llm_module.settings, "GEMINI_API_KEY", "fake-key")

    mock_genai = MagicMock()
    mock_genai.Client.side_effect = Exception("API down")

    with __import__("unittest.mock", fromlist=["patch"]).patch.dict(
        sys.modules,
        {"google": MagicMock(genai=mock_genai), "google.genai": mock_genai},
    ):
        result = generate_scan_insights(SAMPLE_SCAN, SAMPLE_USER)

    assert result is None
