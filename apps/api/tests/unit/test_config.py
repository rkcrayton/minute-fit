from config import Settings


def test_database_url_cloud_sql():
    s = Settings(
        INSTANCE_CONNECTION_NAME="proj:region:instance",
        DB_USER="user",
        DB_PASS="pass",
        DB_NAME="mydb",
    )
    url = s.database_url
    assert "postgresql+pg8000" in url
    assert "unix_sock" in url
    assert "cloudsql/proj:region:instance" in url


def test_database_url_explicit():
    s = Settings(DATABASE_URL="postgresql://custom:pass@host:5432/db")
    assert s.database_url == "postgresql://custom:pass@host:5432/db"


def test_database_url_fallback(monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.delenv("INSTANCE_CONNECTION_NAME", raising=False)
    s = Settings(DATABASE_URL="", INSTANCE_CONNECTION_NAME="", DB_USER="user", DB_PASS="pass", DB_NAME="mydb")
    url = s.database_url
    assert url.startswith("postgresql://user:pass@localhost:5432/mydb")
