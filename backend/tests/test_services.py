import asyncio
from datetime import datetime, timedelta, timezone

from app.providers.base import Provider
from app.schemas.api import Observation
from app.services.risk import evaluate_assessment


class SlowProvider(Provider[dict]):
    provider_id = "test-slow"
    capability = "test"

    async def fetch(self, catchment_id: str) -> list[dict]:
        await asyncio.sleep(0.05)
        return []


def test_stale_required_input_is_not_treated_as_missing_or_low_risk() -> None:
    now = datetime.now(timezone.utc)
    stale = Observation(
        source_id="test-source",
        provider="test",
        variable="rainfall",
        value=0.0,
        unit="mm",
        observed_at=now - timedelta(hours=3),
        fetched_at=now,
        freshness="stale",
        source_state="stale",
        is_demo=True,
    )
    result = evaluate_assessment("c1", [stale], is_demo=True, now=now)
    assert result.status == "insufficient_data"
    assert result.score is None
    assert result.data_coverage.available_inputs == 0
    assert "rainfall" in result.data_coverage.stale
    assert "STALE_REQUIRED_INPUTS" in result.reason_codes
    assert result.is_demo is True


def test_provider_timeout_returns_error_state_and_quality_flag() -> None:
    result = asyncio.run(SlowProvider().fetch_safely("c1", timeout_seconds=0.001))
    assert result.state == "error"
    assert result.items == []
    assert result.quality_flags == ["PROVIDER_TIMEOUT"]
    assert "timed out" in result.message


def test_missing_required_data_does_not_produce_zero_risk() -> None:
    result = evaluate_assessment("c1", [], now=datetime.now(timezone.utc))
    assert result.status == "insufficient_data"
    assert result.score is None
    assert result.data_coverage.available_inputs == 0
    assert result.reason_codes == ["INSUFFICIENT_REQUIRED_INPUTS"]
    assert result.is_demo is False
