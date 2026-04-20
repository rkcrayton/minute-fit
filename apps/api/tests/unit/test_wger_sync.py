"""Unit tests for wger_sync helper functions."""

from services.wger_sync import (
    _normalize_equipment,
    _strip_html,
    _derive_difficulty,
    _extract_translation,
    _extract_muscles,
    _fetch_main_image,
    _http_get_json,
)


# ---------------------------------------------------------------------------
# _normalize_equipment
# ---------------------------------------------------------------------------

def test_normalize_equipment_none():
    assert _normalize_equipment(None) is None


def test_normalize_equipment_empty():
    assert _normalize_equipment("") is None


def test_normalize_equipment_known():
    assert _normalize_equipment("dumbbell") == "dumbbell"
    assert _normalize_equipment("Barbell") == "barbell"
    assert _normalize_equipment("none (bodyweight exercise)") == "bodyweight"
    assert _normalize_equipment("cable") == "machine"
    assert _normalize_equipment("resistance band") == "resistance-band"


def test_normalize_equipment_unknown():
    assert _normalize_equipment("foam roller") == "foam-roller"
    assert _normalize_equipment("  trx straps  ") == "trx-straps"


# ---------------------------------------------------------------------------
# _strip_html
# ---------------------------------------------------------------------------

def test_strip_html_none():
    assert _strip_html(None) is None


def test_strip_html_empty():
    assert _strip_html("") is None


def test_strip_html_plain_text():
    assert _strip_html("Good form required") == "Good form required"


def test_strip_html_with_tags():
    assert _strip_html("<p>Stand up <b>straight</b></p>") == "Stand up straight"


def test_strip_html_block_tags_become_newlines():
    result = _strip_html("<li>Step one</li><li>Step two</li>")
    assert "Step one" in result
    assert "Step two" in result


def test_strip_html_truncation():
    long_text = "a " * 1500  # 3000 chars, exceeds _DESCRIPTION_MAX of 2000
    result = _strip_html(long_text)
    assert result.endswith("…")
    assert len(result) <= 2001


# ---------------------------------------------------------------------------
# _derive_difficulty
# ---------------------------------------------------------------------------

def test_derive_difficulty_bodyweight_easy():
    assert _derive_difficulty("bodyweight", 1) == "easy"
    assert _derive_difficulty(None, 0) == "easy"


def test_derive_difficulty_bodyweight_medium():
    assert _derive_difficulty("bodyweight", 2) == "medium"


def test_derive_difficulty_dumbbell():
    assert _derive_difficulty("dumbbell", 1) == "medium"
    assert _derive_difficulty("kettlebell", 3) == "medium"
    assert _derive_difficulty("resistance-band", 0) == "medium"


def test_derive_difficulty_machine_hard():
    assert _derive_difficulty("machine", 3) == "hard"
    assert _derive_difficulty("barbell", 4) == "hard"


def test_derive_difficulty_machine_medium():
    assert _derive_difficulty("machine", 2) == "medium"
    assert _derive_difficulty("barbell", 1) == "medium"


# ---------------------------------------------------------------------------
# _extract_translation
# ---------------------------------------------------------------------------

def test_extract_translation_empty():
    assert _extract_translation({}) is None
    assert _extract_translation({"translations": []}) is None


def test_extract_translation_english():
    entry = {"translations": [
        {"language": 1, "name": "German"},
        {"language": 2, "name": "English"},
    ]}
    result = _extract_translation(entry)
    assert result["name"] == "English"


def test_extract_translation_fallback():
    entry = {"translations": [{"language": 5, "name": "French"}]}
    result = _extract_translation(entry)
    assert result["name"] == "French"


# ---------------------------------------------------------------------------
# _extract_muscles
# ---------------------------------------------------------------------------

def test_extract_muscles_empty():
    assert _extract_muscles({}) == []
    assert _extract_muscles({"muscles": []}) == []


def test_extract_muscles_primary():
    entry = {"muscles": [{"name_en": "Chest"}, {"name_en": "Triceps"}]}
    result = _extract_muscles(entry)
    assert result == ["Chest", "Triceps"]


def test_extract_muscles_with_secondary():
    entry = {
        "muscles": [{"name_en": "Chest"}],
        "muscles_secondary": [{"name_en": "Shoulders"}, {"name_en": "Triceps"}],
    }
    result = _extract_muscles(entry)
    assert "Chest" in result
    assert "Shoulders" in result
    assert "Triceps" in result


def test_extract_muscles_no_duplicates():
    entry = {
        "muscles": [{"name_en": "Chest"}],
        "muscles_secondary": [{"name_en": "Chest"}],
    }
    result = _extract_muscles(entry)
    assert result.count("Chest") == 1


def test_extract_muscles_fallback_to_name():
    entry = {"muscles": [{"name": "Pectoralis"}]}
    result = _extract_muscles(entry)
    assert result == ["Pectoralis"]


# ---------------------------------------------------------------------------
# _fetch_main_image
# ---------------------------------------------------------------------------

def test_fetch_main_image_exception(monkeypatch):
    """When the HTTP call fails, return None without crashing."""
    import services.wger_sync as mod
    monkeypatch.setattr(mod, "_http_get_json", lambda url: (_ for _ in ()).throw(Exception("fail")))
    assert _fetch_main_image(999) is None


def test_fetch_main_image_success(monkeypatch):
    import services.wger_sync as mod
    monkeypatch.setattr(mod, "_http_get_json", lambda url: {"results": [{"image": "http://img.png"}]})
    assert _fetch_main_image(1) == "http://img.png"


def test_fetch_main_image_no_results(monkeypatch):
    import services.wger_sync as mod
    monkeypatch.setattr(mod, "_http_get_json", lambda url: {"results": []})
    assert _fetch_main_image(1) is None