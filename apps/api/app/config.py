from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "GMFL"
    SECRET_KEY: str
    PORT: int = 8000
    DEBUG: bool = True
    DATABASE_URL: str

    class Config:
        env_file = "../../../.env"


settings = Settings()