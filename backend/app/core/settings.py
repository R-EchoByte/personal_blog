from pydantic_settings import BaseSettings, SettingsConfigDict

from app.core.version import APP_VERSION


class Settings(BaseSettings):
    app_name: str = "Personal Blog API"
    app_version: str = APP_VERSION
    app_env: str = "dev"
    api_prefix: str = "/api/v1"
    host: str = "0.0.0.0"
    port: int = 7869
    admin_username: str = "admin"
    admin_password: str = "ChangeMe123!"
    admin_password_hash: str = ""
    admin_token_secret: str = "personal-blog-admin-secret"
    admin_token_ttl_hours: int = 24
    public_site_url: str = "https://resohub.top"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
