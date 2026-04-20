import json
import sys
from unittest.mock import MagicMock

import services.llm as llm_module
from services.llm import generate_scan_insights, generate_workout_plan


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


# ---------------------------------------------------------------------------
# generate_workout_plan
# ---------------------------------------------------------------------------

SAMPLE_EXERCISES = [
    {"id": 1, "name": "Push-Ups", "primary_muscle": "Chest", "equipment": "bodyweight", "difficulty": "easy"},
    {"id": 2, "name": "Squats", "primary_muscle": "Quads", "equipment": "bodyweight", "difficulty": "easy"},
]

SAMPLE_PREFS = {
    "days_per_week": 3,
    "minutes_per_session": 30,
    "equipment": ["bodyweight"],
    "avoid": None,
    "goal": "build muscle",
}

VALID_PLAN_JSON = json.dumps({
    "title": "Strength Builder",
    "subtitle": "3 days a week",
    "schedule": {
        "monday": [{"exercise_id": 1, "times_per_day": 3, "duration_seconds": 60, "order": 0}],
        "tuesday": [],
        "wednesday": [{"exercise_id": 2, "times_per_day": 2, "duration_seconds": 60, "order": 0}],
        "thursday": [],
        "friday": [{"exercise_id": 1, "times_per_day": 3, "duration_seconds": 60, "order": 0}],
        "saturday": [],
        "sunday": [],
    },
})


def test_generate_plan_no_api_key():
    result = generate_workout_plan(SAMPLE_USER, SAMPLE_PREFS, SAMPLE_EXERCISES)
    assert result is None


def test_generate_plan_success(monkeypatch):
    monkeypatch.setattr(llm_module.settings, "GEMINI_API_KEY", "fake-key")

    mock_genai = MagicMock()
    mock_genai.Client.return_value.models.generate_content.return_value.text = VALID_PLAN_JSON

    with __import__("unittest.mock", fromlist=["patch"]).patch.dict(
        sys.modules,
        {"google": MagicMock(genai=mock_genai), "google.genai": mock_genai},
    ):
        result = generate_workout_plan(SAMPLE_USER, SAMPLE_PREFS, SAMPLE_EXERCISES)

    assert result is not None
    assert result["title"] == "Strength Builder"
    assert "monday" in result["schedule"]


def test_generate_plan_empty_response(monkeypatch):
    monkeypatch.setattr(llm_module.settings, "GEMINI_API_KEY", "fake-key")

    mock_genai = MagicMock()
    mock_genai.Client.return_value.models.generate_content.return_value.text = ""

    with __import__("unittest.mock", fromlist=["patch"]).patch.dict(
        sys.modules,
        {"google": MagicMock(genai=mock_genai), "google.genai": mock_genai},
    ):
        result = generate_workout_plan(SAMPLE_USER, SAMPLE_PREFS, SAMPLE_EXERCISES)

    assert result is None


def test_generate_plan_non_dict_json(monkeypatch):
    monkeypatch.setattr(llm_module.settings, "GEMINI_API_KEY", "fake-key")

    mock_genai = MagicMock()
    mock_genai.Client.return_value.models.generate_content.return_value.text = '"just a string"'

    with __import__("unittest.mock", fromlist=["patch"]).patch.dict(
        sys.modules,
        {"google": MagicMock(genai=mock_genai), "google.genai": mock_genai},
    ):
        result = generate_workout_plan(SAMPLE_USER, SAMPLE_PREFS, SAMPLE_EXERCISES)

    assert result is None


def test_generate_plan_api_error(monkeypatch):
    monkeypatch.setattr(llm_module.settings, "GEMINI_API_KEY", "fake-key")

    mock_genai = MagicMock()
    mock_genai.Client.side_effect = Exception("API down")

    with __import__("unittest.mock", fromlist=["patch"]).patch.dict(
        sys.modules,
        {"google": MagicMock(genai=mock_genai), "google.genai": mock_genai},
    ):
        result = generate_workout_plan(SAMPLE_USER, SAMPLE_PREFS, SAMPLE_EXERCISES)

    assert result is None
