import io
import pytest
from unittest.mock import patch, MagicMock
from fastapi import HTTPException

from routers.scan import _check_magic_bytes, _sanitize_image, _assess_health
import routers.scan as scan_module
from conftest import make_jpeg_bytes


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
    # Output should be a JPEG (starts with FF D8 FF)
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
        # Threshold shifts: athletic <= 17
        assert _assess_health(17.0, "male", 50)["category"] == "Athletic"
        assert _assess_health(18.0, "male", 50)["category"] == "Fit"

    def test_age_60plus_thresholds(self):
        assert _assess_health(20.0, "male", 65)["category"] == "Athletic"
        assert _assess_health(24.0, "male", 65)["category"] == "Fit"  # ≤25% threshold


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
    # neutral should use the else branch (same as female)
    r_neutral = _assess_health(20.0, "neutral", 28)
    r_female = _assess_health(20.0, "female", 28)
    assert r_neutral["category"] == r_female["category"]


def test_assess_health_has_recommendation():
    r = _assess_health(10.0, "male", 25)
    assert isinstance(r["recommendation"], str)
    assert len(r["recommendation"]) > 0


# ---------------------------------------------------------------------------
# Fake analysis result used by endpoint tests
# ---------------------------------------------------------------------------

FAKE_RESULT = {
    "session_id": "fake-session-id",
    "measurements": {
        "neck": 14.0, "shoulder_width": 16.0, "waist": 32.0,
        "abdomen": 32.0, "hip": 38.0, "thigh": 22.0,
        "knee": 14.0, "calf": 14.0, "ankle": 9.0,
    },
    "body_composition": {
        "bmi": 22.5,
        "body_fat_percentage": 14.0,
        "fat_mass_lbs": 25.0,
        "lean_mass_lbs": 150.0,
        "waist_to_hip_ratio": 0.84,
    },
    "health_assessment": {
        "category": "Fit",
        "risk_level": "low",
        "recommendation": "Good body composition.",
    },
}


def _jpeg_upload(filename="photo.jpg"):
    return (filename, io.BytesIO(make_jpeg_bytes()), "image/jpeg")


# ---------------------------------------------------------------------------
# POST /scan/analyze
# ---------------------------------------------------------------------------

def test_analyze_unauthenticated(client):
    r = client.post("/scan/analyze", files={
        "front": _jpeg_upload("front.jpg"),
        "side": _jpeg_upload("side.jpg"),
        "back": _jpeg_upload("back.jpg"),
    })
    assert r.status_code == 401


def test_analyze_incomplete_profile(client, auth_headers):
    # test_user has no height/weight/age
    r = client.post("/scan/analyze", headers=auth_headers, files={
        "front": _jpeg_upload("front.jpg"),
        "side": _jpeg_upload("side.jpg"),
        "back": _jpeg_upload("back.jpg"),
    })
    assert r.status_code == 400
    assert "incomplete" in r.json()["detail"].lower()


def test_analyze_invalid_extension(client, complete_auth_headers):
    r = client.post("/scan/analyze", headers=complete_auth_headers, files={
        "front": ("front.txt", io.BytesIO(b"not an image"), "text/plain"),
        "side": _jpeg_upload("side.jpg"),
        "back": _jpeg_upload("back.jpg"),
    })
    assert r.status_code == 400
    assert "jpg" in r.json()["detail"].lower() or "png" in r.json()["detail"].lower()


def test_analyze_file_too_large(client, complete_auth_headers):
    big_data = b'\xff\xd8\xff' + b'\x00' * (20 * 1024 * 1024 + 1)
    r = client.post("/scan/analyze", headers=complete_auth_headers, files={
        "front": ("front.jpg", io.BytesIO(big_data), "image/jpeg"),
        "side": _jpeg_upload("side.jpg"),
        "back": _jpeg_upload("back.jpg"),
    })
    assert r.status_code == 413


def test_analyze_bad_magic_bytes(client, complete_auth_headers):
    # Valid extension but content is a PDF
    r = client.post("/scan/analyze", headers=complete_auth_headers, files={
        "front": ("front.jpg", io.BytesIO(b'%PDF-1.4' + b'\x00' * 100), "image/jpeg"),
        "side": _jpeg_upload("side.jpg"),
        "back": _jpeg_upload("back.jpg"),
    })
    assert r.status_code == 400
    assert "format" in r.json()["detail"].lower()


def test_analyze_success(client, complete_auth_headers, mocker):
    mocker.patch("routers.scan._process_analysis_sync", return_value=FAKE_RESULT)
    mocker.patch("routers.scan.cv2.imread", return_value=MagicMock(shape=(100, 100, 3)))
    mocker.patch("routers.scan.cv2.imwrite")

    r = client.post("/scan/analyze", headers=complete_auth_headers, files={
        "front": _jpeg_upload("front.jpg"),
        "side": _jpeg_upload("side.jpg"),
        "back": _jpeg_upload("back.jpg"),
    })
    assert r.status_code == 200
    data = r.json()
    assert "measurements" in data
    assert "body_composition" in data
    assert "health_assessment" in data


def test_analyze_value_error_from_processing(client, complete_auth_headers, mocker):
    mocker.patch("routers.scan._process_analysis_sync", side_effect=ValueError("Front photo: bad pose"))
    mocker.patch("routers.scan.cv2.imread", return_value=MagicMock(shape=(100, 100, 3)))
    mocker.patch("routers.scan.cv2.imwrite")

    r = client.post("/scan/analyze", headers=complete_auth_headers, files={
        "front": _jpeg_upload("front.jpg"),
        "side": _jpeg_upload("side.jpg"),
        "back": _jpeg_upload("back.jpg"),
    })
    assert r.status_code == 422
    assert "bad pose" in r.json()["detail"]


def test_analyze_generic_exception(client, complete_auth_headers, mocker):
    mocker.patch("routers.scan._process_analysis_sync", side_effect=RuntimeError("unexpected"))
    mocker.patch("routers.scan.cv2.imread", return_value=MagicMock(shape=(100, 100, 3)))
    mocker.patch("routers.scan.cv2.imwrite")

    r = client.post("/scan/analyze", headers=complete_auth_headers, files={
        "front": _jpeg_upload("front.jpg"),
        "side": _jpeg_upload("side.jpg"),
        "back": _jpeg_upload("back.jpg"),
    })
    assert r.status_code == 500
    assert "Analysis failed" in r.json()["detail"]


# ---------------------------------------------------------------------------
# GET /scan/results/{session_id}
# ---------------------------------------------------------------------------

def _insert_scan(db, user_id: int, session_id: str = "test-session-123"):
    from models.scan_result import ScanResult
    scan = ScanResult(
        session_id=session_id,
        user_id=user_id,
        bmi=22.5,
        body_fat_percentage=14.0,
        fat_mass_kg=25.0,
        lean_mass_kg=150.0,
        waist_to_hip_ratio=0.84,
        health_category="Fit",
        health_risk_level="low",
        health_recommendation="Good body composition.",
        measurements={"neck": 14.0, "waist": 32.0},
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)
    return scan


def test_get_results_unauthenticated(client):
    r = client.get("/scan/results/some-session")
    assert r.status_code == 401


def test_get_results_not_found(client, auth_headers):
    r = client.get("/scan/results/nonexistent-session", headers=auth_headers)
    assert r.status_code == 404


def test_get_results_success(client, auth_headers, db, test_user):
    _insert_scan(db, test_user.id, "sess-abc")
    r = client.get("/scan/results/sess-abc", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["session_id"] == "sess-abc"
    assert "body_composition" in data
    assert "health_assessment" in data
    assert "measurements" in data


def test_get_results_cannot_access_other_users_scan(client, auth_headers, db, complete_user):
    # Scan belongs to complete_user, but request uses test_user's token
    _insert_scan(db, complete_user.id, "sess-other")
    r = client.get("/scan/results/sess-other", headers=auth_headers)
    assert r.status_code == 404


# ---------------------------------------------------------------------------
# GET /scan/images/{session_id}/{view}
# ---------------------------------------------------------------------------

def test_get_image_invalid_view(client, auth_headers, db, test_user):
    _insert_scan(db, test_user.id, "sess-img")
    r = client.get("/scan/images/sess-img/diagonal", headers=auth_headers)
    assert r.status_code == 400
    assert "front" in r.json()["detail"].lower() or "view" in r.json()["detail"].lower()


def test_get_image_scan_not_found(client, auth_headers):
    r = client.get("/scan/images/no-such-session/front", headers=auth_headers)
    assert r.status_code == 404


def test_get_image_file_not_on_disk(client, auth_headers, db, test_user):
    _insert_scan(db, test_user.id, "sess-nofile")
    # No actual files on disk → should 404
    r = client.get("/scan/images/sess-nofile/front", headers=auth_headers)
    assert r.status_code == 404


def test_get_image_file_exists(client, auth_headers, db, test_user, mocker, tmp_path):
    _insert_scan(db, test_user.id, "sess-exists")
    fake_img = tmp_path / "sess-exists_front.jpg"
    fake_img.write_bytes(make_jpeg_bytes())

    mocker.patch.object(scan_module, "PROCESSED_DIR", tmp_path)
    r = client.get("/scan/images/sess-exists/front", headers=auth_headers)
    assert r.status_code == 200


# ---------------------------------------------------------------------------
# GET /scan/measurement-images/{session_id}/{view}
# ---------------------------------------------------------------------------

def test_measurement_image_invalid_view(client, auth_headers, db, test_user):
    _insert_scan(db, test_user.id, "sess-meas")
    r = client.get("/scan/measurement-images/sess-meas/top", headers=auth_headers)
    assert r.status_code == 400


def test_measurement_image_not_found(client, auth_headers, db, test_user):
    _insert_scan(db, test_user.id, "sess-measnf")
    r = client.get("/scan/measurement-images/sess-measnf/front", headers=auth_headers)
    assert r.status_code == 404


def test_measurement_image_unauthenticated(client):
    r = client.get("/scan/measurement-images/some-sess/front")
    assert r.status_code == 401
