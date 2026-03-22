import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "GMFL"
    SECRET_KEY: str = "change-me-in-production"
    PORT: int = 8080
    DEBUG: bool = False

    # Database — either provide a full DATABASE_URL or individual components
    DATABASE_URL: str = ""
    DB_USER: str = "postgres"
    DB_PASS: str = ""
    DB_NAME: str = "gotta_minute_fitness"

    # Cloud SQL instance connection name (e.g. "project:region:instance")
    # When set, the app connects via Unix socket at /cloudsql/<name>
    INSTANCE_CONNECTION_NAME: str = ""

    # CORS — comma-separated list of allowed origins
    ALLOWED_ORIGINS: str = "*"

    @property
    def database_url(self) -> str:
        """Build the effective database URL."""
        # Cloud SQL Unix socket takes top priority
        if self.INSTANCE_CONNECTION_NAME:
            socket_path = f"/cloudsql/{self.INSTANCE_CONNECTION_NAME}"
            return (
                f"postgresql+pg8000://{self.DB_USER}:{self.DB_PASS}"
                f"@/{self.DB_NAME}"
                f"?unix_sock={socket_path}/.s.PGSQL.5432"
            )
        # Explicit DATABASE_URL (local dev with Docker Compose)
        if self.DATABASE_URL:
            return self.DATABASE_URL
        # Fallback for local development
        return (
            f"postgresql://{self.DB_USER}:{self.DB_PASS}"
            f"@localhost:5432/{self.DB_NAME}"
        )

    class Config:
        env_file = ".env" if os.path.exists(".env") else None
        extra = "ignore"


settings = Settings()

# Log the connection target on startup (hide password)
import logging
_log = logging.getLogger(__name__)
_db_url = settings.database_url
_safe_url = _db_url.split("@")[-1] if "@" in _db_url else _db_url
_log.info(f"Database target: ...@{_safe_url}")
_log.info(f"INSTANCE_CONNECTION_NAME: '{settings.INSTANCE_CONNECTION_NAME}'")