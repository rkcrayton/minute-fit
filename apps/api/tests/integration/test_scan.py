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


def _insert_scan(db, user_id: int, session_id: str = "00000000-0000-4000-a000-000000000001"):
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
    assert "Photo processing failed" in r.json()["detail"]


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
    r = client.get("/scan/results/00000000-0000-4000-a000-000000000099")
    assert r.status_code == 401


def test_get_results_not_found(client, auth_headers):
    r = client.get("/scan/results/00000000-0000-4000-a000-000000000099", headers=auth_headers)
    assert r.status_code == 404


def test_get_results_invalid_session_id(client, auth_headers):
    r = client.get("/scan/results/not-a-valid-uuid", headers=auth_headers)
    assert r.status_code == 400
    assert "session" in r.json()["detail"].lower()


def test_get_results_success(client, auth_headers, db, test_user):
    sid = "10000000-0000-4000-a000-000000000001"
    _insert_scan(db, test_user.id, sid)
    r = client.get(f"/scan/results/{sid}", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["session_id"] == sid
    assert "body_composition" in data
    assert "health_assessment" in data
    assert "measurements" in data


def test_get_results_cannot_access_other_users_scan(client, auth_headers, db, complete_user):
    sid = "20000000-0000-4000-a000-000000000002"
    _insert_scan(db, complete_user.id, sid)
    r = client.get(f"/scan/results/{sid}", headers=auth_headers)
    assert r.status_code == 404


# ---------------------------------------------------------------------------
# GET /scan/images/{session_id}/{view}
# ---------------------------------------------------------------------------

def test_get_image_invalid_view(client, auth_headers, db, test_user):
    sid = "30000000-0000-4000-a000-000000000003"
    _insert_scan(db, test_user.id, sid)
    r = client.get(f"/scan/images/{sid}/diagonal", headers=auth_headers)
    assert r.status_code == 400
    assert "front" in r.json()["detail"].lower() or "view" in r.json()["detail"].lower()


def test_get_image_scan_not_found(client, auth_headers):
    r = client.get("/scan/images/00000000-0000-4000-a000-ffffffffffff/front", headers=auth_headers)
    assert r.status_code == 404


def test_get_image_file_not_on_disk(client, auth_headers, db, test_user):
    sid = "40000000-0000-4000-a000-000000000004"
    _insert_scan(db, test_user.id, sid)
    r = client.get(f"/scan/images/{sid}/front", headers=auth_headers)
    assert r.status_code == 404


def test_get_image_file_exists(client, auth_headers, db, test_user, mocker, tmp_path):
    sid = "50000000-0000-4000-a000-000000000005"
    _insert_scan(db, test_user.id, sid)
    fake_img = tmp_path / f"{sid}_front.jpg"
    fake_img.write_bytes(make_jpeg_bytes())

    mocker.patch.object(scan_module, "PROCESSED_DIR", tmp_path)
    r = client.get(f"/scan/images/{sid}/front", headers=auth_headers)
    assert r.status_code == 200


# ---------------------------------------------------------------------------
# GET /scan/measurement-images/{session_id}/{view}
# ---------------------------------------------------------------------------

def test_measurement_image_invalid_view(client, auth_headers, db, test_user):
    sid = "60000000-0000-4000-a000-000000000006"
    _insert_scan(db, test_user.id, sid)
    r = client.get(f"/scan/measurement-images/{sid}/top", headers=auth_headers)
    assert r.status_code == 400


def test_measurement_image_not_found(client, auth_headers, db, test_user):
    sid = "70000000-0000-4000-a000-000000000007"
    _insert_scan(db, test_user.id, sid)
    r = client.get(f"/scan/measurement-images/{sid}/front", headers=auth_headers)
    assert r.status_code == 404


def test_measurement_image_unauthenticated(client):
    r = client.get("/scan/measurement-images/some-sess/front")
    assert r.status_code == 401


# ---------------------------------------------------------------------------
# GET /scan/history
# ---------------------------------------------------------------------------

def test_get_history_unauthenticated(client):
    r = client.get("/scan/history")
    assert r.status_code == 401


def test_get_history_empty(client, auth_headers):
    r = client.get("/scan/history", headers=auth_headers)
    assert r.status_code == 200
    assert r.json() == []


def test_get_history_returns_own_scans(client, auth_headers, db, test_user):
    _insert_scan(db, test_user.id, "a0000000-0000-4000-a000-000000000001")
    _insert_scan(db, test_user.id, "a0000000-0000-4000-a000-000000000002")
    r = client.get("/scan/history", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 2
    session_ids = {item["session_id"] for item in data}
    assert "a0000000-0000-4000-a000-000000000001" in session_ids
    assert "a0000000-0000-4000-a000-000000000002" in session_ids


def test_get_history_response_shape(client, auth_headers, db, test_user):
    _insert_scan(db, test_user.id, "b0000000-0000-4000-a000-000000000001")
    r = client.get("/scan/history", headers=auth_headers)
    assert r.status_code == 200
    item = r.json()[0]
    assert "session_id" in item
    assert "created_at" in item
    assert "health_category" in item
    assert "health_risk_level" in item
    assert "body_fat_percentage" in item
    assert "bmi" in item


def test_get_history_excludes_other_users_scans(client, auth_headers, db, test_user, complete_user):
    _insert_scan(db, test_user.id, "c0000000-0000-4000-a000-000000000001")
    _insert_scan(db, complete_user.id, "c0000000-0000-4000-a000-000000000002")
    r = client.get("/scan/history", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 1
    assert data[0]["session_id"] == "c0000000-0000-4000-a000-000000000001"
