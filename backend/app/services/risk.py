"""Transparent rainfall-accumulation baseline.

This is deliberately simple and deliberately not a trained model. It answers one
question: given observed hourly rainfall for a catchment, which documented
accumulation band does the latest contiguous window fall into?

It never converts missing data into zero rainfall and never returns a risk band
without eligible rainfall evidence. There is no numeric risk index because none
has been evaluated or calibrated.
"""

from datetime import datetime, timedelta, timezone
from uuid import uuid4

from app.schemas.api import (
    AssessmentInput,
    AssessmentResponse,
    AssessmentStatus,
    DataCoverage,
    Observation,
    WarningItem,
)

BASELINE_VERSION = "rainfall-accumulation-baseline-v0.1"
SCORE_SEMANTICS = "categorical_only_no_calibrated_index"

# Primary input for this baseline. Supporting inputs are tracked for coverage
# but do not silently change the band when absent.
REQUIRED_INPUTS = ("rainfall",)
SUPPORTING_INPUTS = ("forecast_rainfall", "river_stage", "soil_moisture")
MAX_AGE = {
    "rainfall": timedelta(hours=3),
    "forecast_rainfall": timedelta(hours=6),
    "river_stage": timedelta(hours=2),
    "soil_moisture": timedelta(hours=24),
}
LABELS = {
    "rainfall": "Observed rainfall",
    "forecast_rainfall": "Forecast rainfall",
    "river_stage": "River stage",
    "soil_moisture": "Soil moisture",
}

# Illustrative, unvalidated thresholds for the 3-hour accumulation of observed
# hourly rainfall. Documented in docs/EVALUATION.md; not a safety standard.
ACCUMULATION_WINDOW_HOURS = 3
THRESHOLDS_MM_3H: tuple[tuple[AssessmentStatus, float], ...] = (
    (AssessmentStatus.VERY_HIGH, 100.0),
    (AssessmentStatus.HIGH, 60.0),
    (AssessmentStatus.MODERATE, 25.0),
)
DISCLAIMER = (
    "Experimental research output. Not an official warning, forecast or evacuation "
    "instruction. Bands come from documented, unvalidated accumulation thresholds and "
    "must not be used for life-safety decisions."
)


def _accumulate(observations: list[Observation], hours: int) -> tuple[float | None, list[Observation]]:
    """Sum the latest contiguous hourly rainfall run of at most ``hours`` samples.

    Gaps break contiguity, so missing hours are never treated as zero rainfall.
    Returns ``(None, [])`` when no complete window is available.
    """
    hourly = sorted(
        (obs for obs in observations if obs.observed_at is not None),
        key=lambda obs: obs.observed_at,  # type: ignore[arg-type,return-value]
    )
    if not hourly:
        return None, []
    window: list[Observation] = []
    expected = hourly[-1].observed_at
    for observation in reversed(hourly):
        observed_at = observation.observed_at
        if observed_at is None or expected is None:
            break
        if abs((expected - observed_at).total_seconds()) > 60 * 60 * 1.5:
            break
        if not isinstance(observation.value, (int, float)):
            break
        window.append(observation)
        expected = observed_at
        if len(window) == hours:
            break
    if len(window) < hours:
        return None, []
    window.reverse()
    total = sum(float(obs.value) for obs in window if isinstance(obs.value, (int, float)))
    return round(total, 1), window


def _band(total_mm: float) -> tuple[AssessmentStatus, str]:
    for status, threshold in THRESHOLDS_MM_3H:
        if total_mm >= threshold:
            return status, f"RAINFALL_3H_AT_OR_ABOVE_{int(threshold)}MM"
    return AssessmentStatus.LOW, "RAINFALL_3H_BELOW_25MM"


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
    available: set[str] = set()
    stale: set[str] = set()
    inputs: list[AssessmentInput] = []

    for observation in observations:
        if observation.variable not in REQUIRED_INPUTS + SUPPORTING_INPUTS:
            continue
        timestamp = observation.observed_at or observation.issued_at
        required = observation.variable in REQUIRED_INPUTS
        demo_record = observation.is_demo or observation.source_state == "demo"
        age_exceeded = (
            timestamp is None
            or timestamp.tzinfo is None
            or now - timestamp > MAX_AGE[observation.variable]
        )
        eligible = not age_exceeded or demo_record
        if eligible:
            available.add(observation.variable)
            found.setdefault(observation.variable, observation)
        elif required:
            stale.add(observation.variable)
        inputs.append(
            AssessmentInput(
                variable=observation.variable,
                label=LABELS[observation.variable],
                value=observation.value,
                unit=observation.unit,
                provider=observation.provider,
                source_id=observation.source_id,
                observed_at=observation.observed_at or observation.issued_at,
                source_state=observation.source_state,
                included=eligible,
                reason=(
                    "DEMO_FIXTURE_INPUT"
                    if demo_record
                    else (
                        "WITHIN_FRESHNESS_WINDOW"
                        if not age_exceeded
                        else "OUTSIDE_FRESHNESS_WINDOW"
                    )
                ),
            )
        )

    rainfall_records = [obs for obs in observations if obs.variable == "rainfall"]
    total_mm, window = (
        _accumulate(rainfall_records, ACCUMULATION_WINDOW_HOURS) if rainfall_records else (None, [])
    )
    # Demo fixtures bypass wall-clock freshness but must still form a complete,
    # contiguous window before a band is produced.
    demo_input = is_demo or any(obs.is_demo for obs in rainfall_records)
    rainfall_present = "rainfall" in available or bool(window)

    missing = [name for name in REQUIRED_INPUTS if name not in available and name not in stale]
    supporting_missing = [name for name in SUPPORTING_INPUTS if name not in available]
    reason_codes: list[str] = []

    if not rainfall_present and "rainfall" in stale:
        status = AssessmentStatus.INSUFFICIENT_DATA
        reason_codes.append("STALE_REQUIRED_INPUTS")
    elif not rainfall_present:
        status = AssessmentStatus.INSUFFICIENT_DATA
        reason_codes.append("INSUFFICIENT_REQUIRED_INPUTS")
    elif total_mm is None:
        status = AssessmentStatus.DEGRADED
        reason_codes.append("INCOMPLETE_ACCUMULATION_WINDOW")
    else:
        status, threshold_reason = _band(total_mm)
        reason_codes.append(threshold_reason)

    if window:
        reason_codes.append("ACCUMULATION_WINDOW_3H")
    if demo_input:
        reason_codes.append("DEMO_FIXTURE_INPUTS")
    reason_codes.append("THRESHOLD_BASELINE_NOT_EVALUATED")

    return AssessmentResponse(
        assessment_id=str(uuid4()),
        catchment_id=catchment_id,
        status=status,
        # No numeric risk index exists for this baseline; a null score is not zero risk.
        score=None,
        score_semantics=SCORE_SEMANTICS,
        model_version=BASELINE_VERSION,
        issued_at=now,
        is_demo=demo_input,
        data_coverage=DataCoverage(
            required_inputs=len(REQUIRED_INPUTS),
            available_inputs=len([name for name in REQUIRED_INPUTS if name in available]),
            missing=missing,
            stale=sorted(stale),
            supporting_missing=supporting_missing,
        ),
        reason_codes=reason_codes,
        inputs=inputs,
        sources=observations,
        warnings=warnings or [],
        disclaimer=DISCLAIMER,
    )
