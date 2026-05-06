from pydantic_settings import BaseSettings, SettingsConfigDict

from app.core.version import APP_VERSION


class Settings(BaseSettings):
    app_name: str = "Personal Blog API"
    app_version: str = APP_VERSION
    app_env: str = "dev"
    api_prefix: str = "/api/v1"
    host: str = "0.0.0.0"
    port: int = 7869

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
