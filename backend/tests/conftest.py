import os
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.api import routes  # noqa: E402
from app.config import get_settings  # noqa: E402
from app.main import app  # noqa: E402
from app.services.supabase import reset_gateway_cache  # noqa: E402


@pytest.fixture(autouse=True)
def clean_settings(monkeypatch):
    """Reset cached settings and shared in-process state around every test."""
    for name in (
        "RIDGEWATCH_MODE",
        "RIDGEWATCH_DEMO_FIXTURES_ENABLED",
        "RIDGEWATCH_ASSESSMENT_RATE_LIMIT_PER_MINUTE",
        "CORS_ORIGINS",
        "RIDGEWATCH_CORS_ORIGINS",
        "SUPABASE_URL",
        "SUPABASE_ANON_KEY",
        "SUPABASE_SERVICE_ROLE_KEY",
    ):
        monkeypatch.delenv(name, raising=False)
    get_settings.cache_clear()
    reset_gateway_cache()
    app.dependency_overrides.clear()
    routes._request_times.clear()
    routes.assessment_store._items.clear()
    yield
    get_settings.cache_clear()
    reset_gateway_cache()
    app.dependency_overrides.clear()
    routes._request_times.clear()
    routes.assessment_store._items.clear()
