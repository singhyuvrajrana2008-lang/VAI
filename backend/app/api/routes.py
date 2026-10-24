from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query

from app.config import get_settings
from app.providers.registry import registry
from app.schemas.api import (
    AssessmentRequest,
    AssessmentResponse,
    Catchment,
    CatchmentListResponse,
    HealthResponse,
    ObservationsResponse,
    SourceState,
    SourceStatus,
    SourcesStatusResponse,
    WarningsResponse,
)
from app.services.risk import evaluate_assessment

router = APIRouter(prefix="/api/v1")
DEMO_CATCHMENT_ID = "demo-catchment"
DEMO_CATCHMENT = Catchment(
    id=DEMO_CATCHMENT_ID,
    name="Example catchment (DEMO)",
    region="Example region (synthetic)",
    geometry=None,
    geometry_source=None,
    validation_status="demo",
    is_demo=True,
)
CAPABILITIES = {
    "rainfall": ("Rainfall", ["mm"], "Not configured; no live rainfall connector has been verified."),
    "forecast": ("Weather forecast", [], "Not configured; no live forecast connector has been verified."),
    "official_warnings": ("Official warnings", [], "Not configured; no authority warning connector has been verified."),
    "terrain": ("Terrain", ["m"], "Not configured; no validated terrain dataset has been loaded."),
    "hydrology": ("Hydrology", [], "Not configured; no verified hydrology connector has been loaded."),
}


def _catchment(catchment_id: str) -> Catchment:
    settings = get_settings()
    if settings.demo_mode and catchment_id == DEMO_CATCHMENT_ID:
        return DEMO_CATCHMENT
    raise HTTPException(status_code=404, detail="Catchment not found or not configured.")


def _is_demo() -> bool:
    return get_settings().demo_mode


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    settings = get_settings()
    return HealthResponse(
        status="ok",
        service=settings.app_name,
        environment=settings.environment,
        is_demo=settings.demo_mode,
        persistence="configured_but_not_connected" if settings.persistence_configured else "unavailable",
    )


@router.get("/catchments", response_model=CatchmentListResponse)
def list_catchments() -> CatchmentListResponse:
    items = [DEMO_CATCHMENT] if _is_demo() else []
    return CatchmentListResponse(items=items, count=len(items), is_demo=_is_demo())


@router.get("/catchments/{catchment_id}", response_model=Catchment)
def get_catchment(catchment_id: str) -> Catchment:
    return _catchment(catchment_id)


@router.get("/catchments/{catchment_id}/observations", response_model=ObservationsResponse)
def observations(
    catchment_id: str,
    from_time: datetime | None = Query(default=None, alias="from"),
    to_time: datetime | None = Query(default=None, alias="to"),
) -> ObservationsResponse:
    _catchment(catchment_id)
    if from_time and to_time and from_time > to_time:
        raise HTTPException(status_code=422, detail="'from' must be earlier than or equal to 'to'.")
    return ObservationsResponse(
        catchment_id=catchment_id,
        items=[],
        source_state=SourceState.DEMO if _is_demo() else SourceState.UNAVAILABLE,
        is_demo=_is_demo(),
    )


@router.get("/catchments/{catchment_id}/warnings", response_model=WarningsResponse)
def warnings(catchment_id: str) -> WarningsResponse:
    _catchment(catchment_id)
    return WarningsResponse(
        catchment_id=catchment_id,
        items=[],
        source_state=SourceState.UNAVAILABLE,
        is_demo=_is_demo(),
        message="No warning provider is configured; this is not confirmation that no official warning exists.",
    )


@router.post("/catchments/{catchment_id}/assessments", response_model=AssessmentResponse)
def assess(catchment_id: str, request: AssessmentRequest) -> AssessmentResponse:
    _catchment(catchment_id)
    return evaluate_assessment(
        catchment_id,
        observations=[],
        warnings=[],
        is_demo=_is_demo(),
        now=request.requested_at or datetime.now(timezone.utc),
    )


@router.get("/sources/status", response_model=SourcesStatusResponse)
def sources_status() -> SourcesStatusResponse:
    now = datetime.now(timezone.utc)
    items = [
        SourceStatus(
            provider="unconfigured",
            capability=capability,
            state=SourceState.UNAVAILABLE,
            observation_or_issue_time=None,
            fetched_at=now,
            units=units,
            geographic_coverage={},
            freshness="unknown",
            quality_flags=["NO_VERIFIED_PROVIDER_CONFIGURED"],
            is_demo=False,
            message=message,
        )
        for capability, (label, units, message) in CAPABILITIES.items()
    ]
    return SourcesStatusResponse(items=items, is_demo=False)
