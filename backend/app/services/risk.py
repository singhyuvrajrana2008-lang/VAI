from datetime import datetime, timedelta, timezone
from uuid import uuid4

from app.schemas.api import AssessmentResponse, AssessmentStatus, DataCoverage, Observation, WarningItem

REQUIRED_INPUTS = ("rainfall", "forecast_rainfall", "river_stage", "soil_moisture")
MAX_AGE = {
    "rainfall": timedelta(hours=2),
    "forecast_rainfall": timedelta(hours=6),
    "river_stage": timedelta(hours=2),
    "soil_moisture": timedelta(hours=24),
}


def evaluate_assessment(
    catchment_id: str,
    observations: list[Observation],
    warnings: list[WarningItem] | None = None,
    *,
    is_demo: bool = False,
    now: datetime | None = None,
) -> AssessmentResponse:
    now = now or datetime.now(timezone.utc)
    found: dict[str, Observation] = {}
    stale: set[str] = set()
    for observation in observations:
        if observation.variable not in REQUIRED_INPUTS:
            continue
        timestamp = observation.observed_at or observation.issued_at
        if timestamp is None or timestamp.tzinfo is None or now - timestamp > MAX_AGE[observation.variable]:
            stale.add(observation.variable)
            continue
        found[observation.variable] = observation

    missing = [name for name in REQUIRED_INPUTS if name not in found and name not in stale]
    unavailable = [name for name in REQUIRED_INPUTS if name not in found]
    status = AssessmentStatus.INSUFFICIENT_DATA if unavailable else AssessmentStatus.DEGRADED
    reasons = []
    if missing:
        reasons.append("INSUFFICIENT_REQUIRED_INPUTS")
    if stale:
        reasons.append("STALE_REQUIRED_INPUTS")
    if not reasons:
        reasons.append("BASELINE_NOT_CONFIGURED")
    return AssessmentResponse(
        assessment_id=str(uuid4()),
        catchment_id=catchment_id,
        status=status,
        score=None,
        score_semantics="not_calibrated",
        model_version="baseline-v1",
        issued_at=now,
        is_demo=is_demo or any(record.is_demo for record in observations),
        data_coverage=DataCoverage(
            required_inputs=len(REQUIRED_INPUTS),
            available_inputs=len(found),
            missing=missing,
            stale=sorted(stale),
        ),
        reason_codes=reasons,
        sources=observations,
        warnings=warnings or [],
    )
