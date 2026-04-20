from unittest.mock import MagicMock, patch


def test_root(client):
    r = client.get("/")
    assert r.status_code == 200
    assert "message" in r.json()


def test_health_check_healthy(client):
    # The test engine is SQLite in-memory — the SELECT 1 always succeeds.
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "healthy"


def test_health_check_unhealthy(client, mocker):
    mocker.patch("main.engine.connect", side_effect=Exception("DB down"))
    r = client.get("/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "unhealthy"
    assert "detail" not in data
