"""Runtime configuration for the RidgeWatch API.

Defaults are deliberately demo-first: the API must boot and serve a coherent,
clearly-labelled demo experience with no credentials present. Nothing in this
module may contain secret values, and the settings are never serialised.
"""

from functools import lru_cache
from typing import Literal

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_CORS_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173"


class Settings(BaseSettings):
    app_name: str = "RidgeWatch API"
    environment: str = "development"
    # demo: serve labelled synthetic fixtures. live: serve only verified connectors
    # (none are currently verified, so live mode returns explicit unavailable states).
    mode: Literal["demo", "live"] = "demo"
    demo_fixtures_enabled: bool = True
    provider_timeout_seconds: float = Field(default=5.0, gt=0, le=30)
    assessment_rate_limit_per_minute: int = Field(default=30, ge=1, le=600)

    cors_origins: str = Field(
        default=DEFAULT_CORS_ORIGINS,
        validation_alias=AliasChoices("CORS_ORIGINS", "RIDGEWATCH_CORS_ORIGINS"),
    )
    # Presence checks only. A configured value is never returned by any endpoint.
    supabase_url: str | None = Field(
        default=None,
        validation_alias=AliasChoices("SUPABASE_URL", "RIDGEWATCH_SUPABASE_URL"),
    )
    supabase_anon_key: str | None = Field(
        default=None,
        validation_alias=AliasChoices("SUPABASE_ANON_KEY", "RIDGEWATCH_SUPABASE_ANON_KEY"),
    )
    supabase_service_role_key: str | None = Field(
        default=None,
        validation_alias=AliasChoices(
            "SUPABASE_SERVICE_ROLE_KEY", "RIDGEWATCH_SUPABASE_SERVICE_ROLE_KEY"
        ),
    )

    model_config = SettingsConfigDict(
        env_file=".env", env_prefix="RIDGEWATCH_", extra="ignore"
    )

    @property
    def demo_mode(self) -> bool:
        return self.mode == "demo"

    @property
    def demo_active(self) -> bool:
        """Demo fixtures are served only when the demo mode is explicitly on."""
        return self.demo_mode and self.demo_fixtures_enabled

    @property
    def cors_origin_list(self) -> list[str]:
        raw = self.cors_origins.strip()
        if raw.startswith("["):
            # Tolerate JSON-array style configuration without importing json here.
            raw = raw.strip("[]")
        return [origin.strip().strip('"') for origin in raw.split(",") if origin.strip()]

    @property
    def persistence_configured(self) -> bool:
        return bool(self.supabase_url and self.supabase_service_role_key)

    @property
    def auth_configured(self) -> bool:
        return bool(self.supabase_url and (self.supabase_anon_key or self.supabase_service_role_key))


@lru_cache
def get_settings() -> Settings:
    return Settings()
