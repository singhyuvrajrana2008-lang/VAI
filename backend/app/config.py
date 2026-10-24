from functools import lru_cache
from typing import Literal

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "RidgeWatch API"
    environment: str = "development"
    mode: Literal["demo", "live"] = "live"
    provider_timeout_seconds: float = 5.0
    supabase_url: str | None = Field(default=None, validation_alias=AliasChoices("SUPABASE_URL", "RIDGEWATCH_SUPABASE_URL"))
    supabase_service_role_key: str | None = Field(default=None, validation_alias=AliasChoices("SUPABASE_SERVICE_ROLE_KEY", "RIDGEWATCH_SUPABASE_SERVICE_ROLE_KEY"))

    model_config = SettingsConfigDict(env_file=".env", env_prefix="RIDGEWATCH_", extra="ignore")

    @property
    def demo_mode(self) -> bool:
        return self.mode == "demo"

    @property
    def persistence_configured(self) -> bool:
        return bool(self.supabase_url and self.supabase_service_role_key)


@lru_cache
def get_settings() -> Settings:
    return Settings()
