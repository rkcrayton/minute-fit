import io
from unittest.mock import MagicMock

import routers.scan as scan_module
from helpers import make_jpeg_bytes


# ---------------------------------------------------------------------------
# Shared helpers
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


# ---------------------------------------------------------------------------
# POST /scan/analyze
# ---------------------------------------------------------------------------

def test_analyze_unauthenticated(client):
    r = client.post("/scan/analyze", files={
        "front": _jpeg_upload("front.jpg"),
        "side":  _jpeg_upload("side.jpg"),
        "back":  _jpeg_upload("back.jpg"),
    })
    assert r.status_code == 401


def test_analyze_incomplete_profile(client, auth_headers):
    # test_user has no height/weight/age
    r = client.post("/scan/analyze", headers=auth_headers, files={
        "front": _jpeg_upload("front.jpg"),
        "side":  _jpeg_upload("side.jpg"),
        "back":  _jpeg_upload("back.jpg"),
    })
    assert r.status_code == 400
    assert "incomplete" in r.json()["detail"].lower()


def test_analyze_invalid_extension(client, complete_auth_headers):
    r = client.post("/scan/analyze", headers=complete_auth_headers, files={
        "front": ("front.txt", io.BytesIO(b"not an image"), "text/plain"),
        "side":  _jpeg_upload("side.jpg"),
        "back":  _jpeg_upload("back.jpg"),
    })
    assert r.status_code == 400
    assert "jpg" in r.json()["detail"].lower() or "png" in r.json()["detail"].lower()


def test_analyze_file_too_large(client, complete_auth_headers):
    big_data = b'\xff\xd8\xff' + b'\x00' * (20 * 1024 * 1024 + 1)
    r = client.post("/scan/analyze", headers=complete_auth_headers, files={
        "front": ("front.jpg", io.BytesIO(big_data), "image/jpeg"),
        "side":  _jpeg_upload("side.jpg"),
        "back":  _jpeg_upload("back.jpg"),
    })
    assert r.status_code == 413


def test_analyze_bad_magic_bytes(client, complete_auth_headers):
    r = client.post("/scan/analyze", headers=complete_auth_headers, files={
        "front": ("front.jpg", io.BytesIO(b'%PDF-1.4' + b'\x00' * 100), "image/jpeg"),
        "side":  _jpeg_upload("side.jpg"),
        "back":  _jpeg_upload("back.jpg"),
    })
    assert r.status_code == 400
    assert "format" in r.json()["detail"].lower()


def test_analyze_success(client, complete_auth_headers, mocker):
    mocker.patch("routers.scan._process_analysis_sync", return_value=FAKE_RESULT)
    mocker.patch("routers.scan.cv2.imread", return_value=MagicMock(shape=(100, 100, 3)))
    mocker.patch("routers.scan.cv2.imwrite")

    r = client.post("/scan/analyze", headers=complete_auth_headers, files={
        "front": _jpeg_upload("front.jpg"),
        "side":  _jpeg_upload("side.jpg"),
        "back":  _jpeg_upload("back.jpg"),
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
        "side":  _jpeg_upload("side.jpg"),
        "back":  _jpeg_upload("back.jpg"),
    })
    assert r.status_code == 422
    assert "bad pose" in r.json()["detail"]


def test_analyze_generic_exception(client, complete_auth_headers, mocker):
    mocker.patch("routers.scan._process_analysis_sync", side_effect=RuntimeError("unexpected"))
    mocker.patch("routers.scan.cv2.imread", return_value=MagicMock(shape=(100, 100, 3)))
    mocker.patch("routers.scan.cv2.imwrite")

    r = client.post("/scan/analyze", headers=complete_auth_headers, files={
        "front": _jpeg_upload("front.jpg"),
        "side":  _jpeg_upload("side.jpg"),
        "back":  _jpeg_upload("back.jpg"),
    })
    assert r.status_code == 500
    assert "Analysis failed" in r.json()["detail"]


# ---------------------------------------------------------------------------
# GET /scan/results/{session_id}
# ---------------------------------------------------------------------------

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
