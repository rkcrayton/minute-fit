from datetime import datetime, timezone


# ---------------------------------------------------------------------------
# POST /water/logs
# ---------------------------------------------------------------------------

def test_log_water_success(client, auth_headers):
    r = client.post("/water/logs", json={"amount_oz": 16.0}, headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["amount_oz"] == 16.0
    assert "id" in data
    assert "logged_at" in data


def test_log_water_with_explicit_timestamp(client, auth_headers):
    ts = "2025-01-15T10:00:00+00:00"
    r = client.post("/water/logs", json={"amount_oz": 8.0, "logged_at": ts}, headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["amount_oz"] == 8.0


def test_log_water_unauthenticated(client):
    r = client.post("/water/logs", json={"amount_oz": 8.0})
    assert r.status_code == 401


# ---------------------------------------------------------------------------
# GET /water/today
# ---------------------------------------------------------------------------

def test_today_summary_empty(client, auth_headers):
    r = client.get("/water/today", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["total_oz"] == 0.0
    assert "goal_oz" in data


def test_today_summary_accumulated(client, auth_headers):
    client.post("/water/logs", json={"amount_oz": 16.0}, headers=auth_headers)
    client.post("/water/logs", json={"amount_oz": 16.0}, headers=auth_headers)
    r = client.get("/water/today", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["total_oz"] == 32.0


def test_today_summary_goal_from_weight(client, complete_auth_headers):
    # complete_user has weight=170 lbs → goal = round(170/2) = 85
    r = client.get("/water/today", headers=complete_auth_headers)
    assert r.status_code == 200
    assert r.json()["goal_oz"] == 85.0


def test_today_summary_goal_default_no_weight(client, auth_headers):
    # test_user has no weight → default goal = 64
    r = client.get("/water/today", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["goal_oz"] == 64.0


def test_today_summary_unauthenticated(client):
    r = client.get("/water/today")
    assert r.status_code == 401


def test_old_log_not_counted_in_today(client, auth_headers):
    # Log water yesterday — should NOT appear in today's total
    yesterday = "2020-01-01T10:00:00+00:00"
    client.post("/water/logs", json={"amount_oz": 100.0, "logged_at": yesterday}, headers=auth_headers)
    r = client.get("/water/today", headers=auth_headers)
    assert r.json()["total_oz"] == 0.0
