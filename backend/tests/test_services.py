import asyncio
from datetime import datetime, timedelta, timezone

from app.config import Settings
from app.providers.base import Provider
from app.schemas.api import Observation
from app.services.risk import evaluate_assessment


class SlowProvider(Provider[dict]):
    provider_id = "test-slow"
    capability = "test"

    async def fetch(self, catchment_id: str) -> list[dict]:
        await asyncio.sleep(0.05)
        return []


class BrokenProvider(Provider[dict]):
    provider_id = "test-broken"
    capability = "test"

    async def fetch(self, catchment_id: str) -> list[dict]:
        raise RuntimeError("upstream failed with secret-token-abc")


def _observation(minutes_ago: int, value: float = 12.0, **overrides) -> Observation:
    now = datetime(2026, 6, 15, 12, 0, tzinfo=timezone.utc)
    payload = {
        "source_id": "test-source",
        "provider": "test-provider",
        "variable": "rainfall",
        "value": value,
        "unit": "mm",
        "observed_at": now - timedelta(minutes=minutes_ago),
        "fetched_at": now,
        "freshness": "live",
        "source_state": "live",
        "is_demo": False,
    }
    payload.update(overrides)
    return Observation(**payload)


NOW = datetime(2026, 6, 15, 12, 0, tzinfo=timezone.utc)


def test_missing_required_data_does_not_produce_zero_risk():
    result = evaluate_assessment("c1", [], now=NOW)
    assert result.status == "insufficient_data"
    assert result.score is None
    assert result.data_coverage.available_inputs == 0
    assert result.reason_codes == [
        "INSUFFICIENT_REQUIRED_INPUTS",
        "THRESHOLD_BASELINE_NOT_EVALUATED",
    ]
    assert result.is_demo is False


def test_stale_required_input_is_not_treated_as_missing_or_low_risk():
    stale = _observation(240, source_state="stale", freshness="stale")
    result = evaluate_assessment("c1", [stale], now=NOW)
    assert result.status == "insufficient_data"
    assert result.score is None
    assert result.data_coverage.available_inputs == 0
    assert result.data_coverage.stale == ["rainfall"]
    assert "STALE_REQUIRED_INPUTS" in result.reason_codes
    assert result.status != "low"


def test_complete_window_produces_documented_band():
    observations = [_observation(120, 10.0), _observation(60, 20.0), _observation(0, 30.0)]
    result = evaluate_assessment("c1", observations, now=NOW)
    assert result.status == "high"
    assert "RAINFALL_3H_AT_OR_ABOVE_60MM" in result.reason_codes
    assert result.data_coverage.available_inputs == 1
    assert result.score is None


def test_gap_in_series_degrades_instead_of_assuming_zero_rainfall():
    observations = [_observation(240, 10.0), _observation(60, 20.0), _observation(0, 30.0)]
    result = evaluate_assessment("c1", observations, now=NOW)
    assert result.status == "degraded"
    assert "INCOMPLETE_ACCUMULATION_WINDOW" in result.reason_codes
    assert result.score is None


def test_non_numeric_value_breaks_window_rather_than_counting_as_zero():
    observations = [
        _observation(60, None),
        _observation(0, 30.0),
        _observation(120, 30.0),
    ]
    result = evaluate_assessment("c1", observations, now=NOW)
    assert result.status == "degraded"
    assert result.score is None


def test_supporting_inputs_tracked_as_missing_but_do_not_hide_band():
    observations = [
        _observation(60, 10.0),
        _observation(0, 10.0),
        _observation(120, 10.0),
    ]
    result = evaluate_assessment("c1", observations, now=NOW)
    assert result.status == "moderate"
    assert set(result.data_coverage.supporting_missing) == {
        "forecast_rainfall",
        "river_stage",
        "soil_moisture",
    }


def test_demo_input_is_flagged_and_not_stale():
    now = datetime(2026, 6, 15, 12, 0, tzinfo=timezone.utc)
    demo = [
        Observation(
            source_id=f"demo-{hours}",
            provider="RidgeWatch synthetic demo fixture",
            variable="rainfall",
            value=20.0,
            unit="mm",
            observed_at=now - timedelta(hours=hours),
            fetched_at=now,
            freshness="demo",
            source_state="demo",
            is_demo=True,
        )
        for hours in (2, 1, 0)
    ]
    result = evaluate_assessment("c1", demo, now=now + timedelta(days=120))
    assert result.is_demo is True
    assert result.status == "high"
    assert result.data_coverage.stale == []
    assert "DEMO_FIXTURE_INPUTS" in result.reason_codes


def test_provider_timeout_returns_error_state_and_quality_flag():
    result = asyncio.run(SlowProvider().fetch_safely("c1", timeout_seconds=0.001))
    assert result.state == "error"
    assert result.items == []
    assert result.quality_flags == ["PROVIDER_TIMEOUT"]
    assert "timed out" in result.message


def test_provider_exception_is_sanitised():
    result = asyncio.run(BrokenProvider().fetch_safely("c1", timeout_seconds=1))
    assert result.state == "error"
    assert result.quality_flags == ["PROVIDER_ERROR"]
    assert "secret-token" not in result.message


def test_default_settings_are_demo_first():
    settings = Settings(_env_file=None)
    assert settings.mode == "demo"
    assert settings.demo_active is True
    assert settings.persistence_configured is False
    assert settings.auth_configured is False
    assert "http://localhost:5173" in settings.cors_origin_list


def test_cors_origins_parse_comma_separated_values():
    settings = Settings(_env_file=None, cors_origins="https://a.example, https://b.example")
    assert settings.cors_origin_list == ["https://a.example", "https://b.example"]


def test_configured_supabase_flags_do_not_enable_persistence_claims():
    settings = Settings(
        _env_file=None,
        supabase_url="https://example.supabase.co",
        supabase_service_role_key="placeholder",
        supabase_anon_key="placeholder",
    )
    assert settings.persistence_configured is True
    assert settings.auth_configured is True
