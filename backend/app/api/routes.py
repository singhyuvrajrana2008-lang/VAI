"""HTTP routes.

All external data is absent by design: no connector is configured or verified in
this build. Demo mode serves explicitly labelled synthetic fixtures. Live mode
returns empty, unavailable states rather than substituting values.
"""

from collections import OrderedDict, deque
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from app import fixtures
from app.config import Settings, get_settings
from app.schemas.api import (
    AssessmentRequest,
    AssessmentResponse,
    Catchment,
    CatchmentListResponse,
    ConfigStatus,
    HealthResponse,
    HistoryResponse,
    Observation,
    ObservationsResponse,
    SourceState,
    SourcesStatusResponse,
    WarningItem,
    WarningsResponse,
)
from app.services.risk import evaluate_assessment
from app.services.sources import build_sources_status

router = APIRouter(prefix="/api/v1")

API_VERSION = "0.2.0"
MAX_STORED_ASSESSMENTS = 200
OBSERVATION_UNAVAILABLE_MESSAGE = (
    "No observation provider is configured or verified. No rainfall value has been "
    "invented or substituted."
)
WARNING_UNAVAILABLE_MESSAGE = (
    "No official warning provider is configured. This response is not confirmation "
    "that no official warning exists; consult IMD, CWC and district authorities."
)


class AssessmentStore:
    """Bounded in-process store. Explicitly non-durable and reported as such."""

    def __init__(self, capacity: int = MAX_STORED_ASSESSMENTS) -> None:
        self._items: OrderedDict[str, AssessmentResponse] = OrderedDict()
        self._capacity = capacity

    def save(self, assessment: AssessmentResponse) -> None:
        self._items[assessment.assessment_id] = assessment
        while len(self._items) > self._capacity:
            self._items.popitem(last=False)

    def get(self, assessment_id: str) -> AssessmentResponse | None:
        return self._items.get(assessment_id)

    def __len__(self) -> int:
        return len(self._items)


assessment_store = AssessmentStore()
_request_times: dict[str, deque[float]] = {}


def settings_dep() -> Settings:
    return get_settings()


def _enforce_rate_limit(request: Request, settings: Settings) -> None:
    client = request.client.host if request.client else "unknown"
    now = datetime.now(timezone.utc).timestamp()
    window = _request_times.setdefault(client, deque())
    while window and now - window[0] > 60:
        window.popleft()
    if len(window) >= settings.assessment_rate_limit_per_minute:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many assessment requests. Wait a minute and retry.",
        )
    window.append(now)


def _to_catchment(record: dict) -> Catchment:
    return Catchment(
        id=record["id"],
        slug=record["slug"],
        name=record["name"],
        region=record.get("region"),
        geometry=record.get("geometry"),
        geometry_status=record["geometry_status"],
        geometry_source=record.get("geometry_source"),
        validation_status=record["validation_status"],
        is_demo=record["is_demo"],
        notes=record.get("notes"),
    )


def _demo_catchments(settings: Settings) -> list[dict]:
    return fixtures.DEMO_CATCHMENTS if settings.demo_active else []


def _catchment_or_404(catchment_id: str, settings: Settings) -> dict:
    for record in _demo_catchments(settings):
        if record["id"] == catchment_id or record["slug"] == catchment_id:
            return record
    raise HTTPException(status_code=404, detail="Catchment not found in the configured registry.")


def _observations(catchment_id: str, settings: Settings) -> list[dict]:
    if not settings.demo_active:
        return []
    return fixtures.rainfall_series(catchment_id) + fixtures.forecast_series(catchment_id)


def _config_status(settings: Settings) -> ConfigStatus:
    external = {
        "rainfall": "unconfigured",
        "forecast_rainfall": "unconfigured",
        "official_warnings": "unconfigured",
        "river_stage": "unconfigured",
        "soil_moisture": "unconfigured",
        "terrain": "unconfigured",
    }
    return ConfigStatus(
        demo_mode=settings.demo_mode,
        demo_fixtures=settings.demo_active,
        persistence="configured_not_connected" if settings.persistence_configured else "unavailable",
        authentication="configured_not_verified" if settings.auth_configured else "unavailable",
        external_sources=external,
    )


@router.get("/health", response_model=HealthResponse, summary="Service and configuration health")
def health(settings: Settings = Depends(settings_dep)) -> HealthResponse:
    return HealthResponse(
        status="ok",
        service=settings.app_name,
        version=API_VERSION,
        environment=settings.environment,
        is_demo=settings.demo_active,
        persistence=(
            "configured_not_connected" if settings.persistence_configured else "unavailable"
        ),
        authentication=(
            "configured_not_verified" if settings.auth_configured else "unavailable"
        ),
        checked_at=datetime.now(timezone.utc),
        config=_config_status(settings),
    )


@router.get("/catchments", response_model=CatchmentListResponse, summary="List catchments")
def list_catchments(settings: Settings = Depends(settings_dep)) -> CatchmentListResponse:
    items = [_to_catchment(record) for record in _demo_catchments(settings)]
    return CatchmentListResponse(
        items=items, count=len(items), is_demo=settings.demo_active, mode=settings.mode
    )


@router.get("/catchments/{catchment_id}", response_model=Catchment, summary="Catchment detail")
def get_catchment(catchment_id: str, settings: Settings = Depends(settings_dep)) -> Catchment:
    return _to_catchment(_catchment_or_404(catchment_id, settings))


@router.get(
    "/catchments/{catchment_id}/observations",
    response_model=ObservationsResponse,
    summary="Observed and forecast records for a catchment",
)
def observations(
    catchment_id: str,
    from_time: datetime | None = Query(default=None, alias="from"),
    to_time: datetime | None = Query(default=None, alias="to"),
    settings: Settings = Depends(settings_dep),
) -> ObservationsResponse:
    _catchment_or_404(catchment_id, settings)
    if from_time and to_time and from_time > to_time:
        raise HTTPException(
            status_code=422,
            detail="'from' must be earlier than or equal to 'to'.",
        )
    records = _observations(catchment_id, settings)
    if from_time or to_time:
        records = [
            record
            for record in records
            if _within_window(record, from_time, to_time)
        ]
    observed = [Observation(**record) for record in records if record["variable"] == "rainfall"]
    forecast = [
        Observation(**record) for record in records if record["variable"] == "forecast_rainfall"
    ]
    state = SourceState.DEMO if settings.demo_active else SourceState.UNAVAILABLE
    if settings.demo_active:
        message = (
            "Synthetic demo fixture values in millimetres per hour. They were not "
            "observed or forecast by any provider and are not current."
        )
    else:
        message = OBSERVATION_UNAVAILABLE_MESSAGE
    return ObservationsResponse(
        catchment_id=catchment_id,
        items=observed + forecast,
        observed=observed,
        forecast=forecast,
        source_state=state,
        is_demo=settings.demo_active,
        message=message,
        units=["mm"],
    )


def _within_window(record: dict, from_time: datetime | None, to_time: datetime | None) -> bool:
    stamp = record.get("observed_at") or record.get("valid_from") or record.get("issued_at")
    if stamp is None:
        return False
    if from_time and stamp < from_time:
        return False
    if to_time and stamp > to_time:
        return False
    return True


@router.get(
    "/catchments/{catchment_id}/warnings",
    response_model=WarningsResponse,
    summary="Official warnings, kept separate from experimental assessments",
)
def warnings(catchment_id: str, settings: Settings = Depends(settings_dep)) -> WarningsResponse:
    _catchment_or_404(catchment_id, settings)
    if settings.demo_active:
        items = fixtures.warnings(catchment_id)
        return WarningsResponse(
            catchment_id=catchment_id,
            items=items,
            source_state=SourceState.DEMO,
            is_demo=True,
            provider_configured=False,
            message=(
                "No official warning provider is configured. The records below are "
                "synthetic DEMO fixtures for layout testing and are not official "
                "bulletins."
            ),
        )
    return WarningsResponse(
        catchment_id=catchment_id,
        items=[],
        source_state=SourceState.UNAVAILABLE,
        is_demo=False,
        provider_configured=False,
        message=WARNING_UNAVAILABLE_MESSAGE,
    )


@router.post(
    "/catchments/{catchment_id}/assessments",
    response_model=AssessmentResponse,
    summary="Request an experimental assessment",
)
def assess(
    catchment_id: str,
    payload: AssessmentRequest,
    request: Request,
    settings: Settings = Depends(settings_dep),
) -> AssessmentResponse:
    _catchment_or_404(catchment_id, settings)
    _enforce_rate_limit(request, settings)
    records = _observations(catchment_id, settings)
    observations = [Observation(**record) for record in records]
    warning_items = (
        [WarningItem(**item) for item in fixtures.warnings(catchment_id)]
        if settings.demo_active
        else []
    )
    result = evaluate_assessment(
        catchment_id,
        observations=observations,
        warnings=warning_items,
        is_demo=settings.demo_active,
        now=payload.requested_at or datetime.now(timezone.utc),
    )
    assessment_store.save(result)
    return result


@router.get(
    "/assessments/{assessment_id}",
    response_model=AssessmentResponse,
    summary="Retrieve an assessment from the in-process store",
)
def get_assessment(assessment_id: str) -> AssessmentResponse:
    stored = assessment_store.get(assessment_id)
    if stored is None:
        raise HTTPException(
            status_code=404,
            detail="Assessment not found. Assessments are held in process memory only "
            "and are lost when the API restarts.",
        )
    return stored


@router.get(
    "/sources/status",
    response_model=SourcesStatusResponse,
    summary="Connector and provenance status",
)
def sources_status(settings: Settings = Depends(settings_dep)) -> SourcesStatusResponse:
    return build_sources_status(settings, is_demo=settings.demo_active)


@router.get(
    "/history",
    response_model=HistoryResponse,
    summary="Authenticated assessment history (requires verified persistence)",
)
def history(settings: Settings = Depends(settings_dep)) -> HistoryResponse:
    raise HTTPException(
        status_code=503,
        detail=(
            "Assessment history requires a verified Supabase persistence and auth "
            "connection. No durable private history is stored by this build."
        ),
        headers={"X-RidgeWatch-Status": "persistence_unavailable"},
    )
