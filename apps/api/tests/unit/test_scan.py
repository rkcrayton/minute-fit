import pytest
from fastapi import HTTPException

from routers.scan import _check_magic_bytes, _sanitize_image, _assess_health
import routers.scan as scan_module
from helpers import make_jpeg_bytes


# ---------------------------------------------------------------------------
# _check_magic_bytes
# ---------------------------------------------------------------------------

def test_check_magic_bytes_jpeg():
    assert _check_magic_bytes(b'\xff\xd8\xff' + b'\x00' * 20) is True


def test_check_magic_bytes_png():
    assert _check_magic_bytes(b'\x89PNG\r\n\x1a\n' + b'\x00' * 20) is True


def test_check_magic_bytes_heic():
    # HEIC: 4-byte length + 'ftyp' at bytes 4-8
    data = b'\x00\x00\x00\x18' + b'ftyp' + b'\x00' * 20
    assert _check_magic_bytes(data) is True


def test_check_magic_bytes_invalid():
    assert _check_magic_bytes(b'%PDF-1.4' + b'\x00' * 20) is False


def test_check_magic_bytes_empty():
    assert _check_magic_bytes(b'') is False


# ---------------------------------------------------------------------------
# _sanitize_image
# ---------------------------------------------------------------------------

def test_sanitize_image_valid_jpeg():
    raw = make_jpeg_bytes(10, 10)
    result = _sanitize_image(raw, "test")
    assert isinstance(result, bytes)
    assert result[:3] == b'\xff\xd8\xff'


def test_sanitize_image_invalid_data_raises_400():
    with pytest.raises(HTTPException) as exc:
        _sanitize_image(b'not an image at all', "test")
    assert exc.value.status_code == 400


def test_sanitize_image_oversized_dimension_raises_400(monkeypatch):
    monkeypatch.setattr(scan_module, "MAX_IMAGE_DIMENSION", 5)
    raw = make_jpeg_bytes(10, 10)  # 10x10 > 5px limit
    with pytest.raises(HTTPException) as exc:
        _sanitize_image(raw, "test")
    assert exc.value.status_code == 400


# ---------------------------------------------------------------------------
# _assess_health
# ---------------------------------------------------------------------------

class TestAssessHealthMale:
    def test_under40_athletic(self):
        r = _assess_health(10.0, "male", 30)
        assert r["category"] == "Athletic"
        assert r["risk_level"] == "low"

    def test_under40_fit(self):
        r = _assess_health(16.0, "male", 30)
        assert r["category"] == "Fit"
        assert r["risk_level"] == "low"

    def test_under40_acceptable(self):
        r = _assess_health(22.0, "male", 30)
        assert r["category"] == "Acceptable"
        assert r["risk_level"] == "moderate"

    def test_under40_obese(self):
        r = _assess_health(30.0, "male", 30)
        assert r["category"] == "Obese"
        assert r["risk_level"] == "high"

    def test_age_40_59_thresholds(self):
        assert _assess_health(17.0, "male", 50)["category"] == "Athletic"
        assert _assess_health(18.0, "male", 50)["category"] == "Fit"

    def test_age_60plus_thresholds(self):
        assert _assess_health(20.0, "male", 65)["category"] == "Athletic"
        assert _assess_health(24.0, "male", 65)["category"] == "Fit"


class TestAssessHealthFemale:
    def test_under40_athletic(self):
        r = _assess_health(20.0, "female", 28)
        assert r["category"] == "Athletic"

    def test_under40_fit(self):
        r = _assess_health(24.0, "female", 28)
        assert r["category"] == "Fit"

    def test_under40_obese(self):
        r = _assess_health(35.0, "female", 28)
        assert r["category"] == "Obese"


def test_assess_health_neutral_uses_female_thresholds():
    r_neutral = _assess_health(20.0, "neutral", 28)
    r_female  = _assess_health(20.0, "female",  28)
    assert r_neutral["category"] == r_female["category"]


def test_assess_health_has_recommendation():
    r = _assess_health(10.0, "male", 25)
    assert isinstance(r["recommendation"], str)
    assert len(r["recommendation"]) > 0
