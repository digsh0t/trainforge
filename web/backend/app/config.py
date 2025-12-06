from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # GitHub App
    github_app_id: str
    github_app_client_id: str
    github_app_client_secret: str
    github_app_private_key: str
    github_webhook_secret: str = ""

    # Database
    database_url: str

    # URLs
    frontend_url: str = "http://localhost:3000"
    api_url: str = "http://localhost:8000"

    # Security
    secret_key: str

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
