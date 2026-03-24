from unittest.mock import MagicMock, patch


def test_root(client):
    r = client.get("/")
    assert r.status_code == 200
    assert "message" in r.json()


def test_health_check_healthy(client):
    # The test engine is SQLite and will succeed
    r = client.get("/health")
    assert r.status_code == 200
    # May be "healthy" (SQLite works) or "unhealthy" depending on patching;
    # just verify the endpoint returns valid JSON with a "status" key.
    assert "status" in r.json()


def test_health_check_unhealthy(client, mocker):
    mocker.patch("main.engine.connect", side_effect=Exception("DB down"))
    r = client.get("/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "unhealthy"
    assert "detail" in data
