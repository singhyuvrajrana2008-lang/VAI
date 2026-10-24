"""API schemas shared with the typed frontend client.

The frontend validates every response against these shapes; changing a field
here is a contract change and must be reflected in
``frontend/src/lib/schemas.ts`` and ``docs/ARCHITECTURE.md`` together.
"""

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class SourceState(str, Enum):
    LIVE = "live"
    STALE = "stale"
    UNAVAILABLE = "unavailable"
    ERROR = "error"
    DEMO = "demo"
    PARTIAL = "partial"


class AssessmentStatus(str, Enum):
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    VERY_HIGH = "very_high"
    INSUFFICIENT_DATA = "insufficient_data"
    DEGRADED = "degraded"
    UNAVAILABLE = "unavailable"


class APIModel(BaseModel):
    model_config = ConfigDict(use_enum_values=True)


class ConfigStatus(APIModel):
    """Presence-only configuration report. Values are never included."""

    demo_mode: bool
    demo_fixtures: bool
    persistence: str
    authentication: str
    maps_provider: str = "frontend_configured_at_build_time"
    external_sources: dict[str, str] = Field(default_factory=dict)


class HealthResponse(APIModel):
    status: str
    service: str
    version: str
    environment: str
    is_demo: bool
    persistence: str
    authentication: str
    checked_at: datetime
    config: ConfigStatus


class Catchment(APIModel):
    id: str
    slug: str
    name: str
    region: str | None = None
    geometry: dict[str, Any] | None = None
    geometry_status: str
    geometry_source: str | None = None
    validation_status: str
    is_demo: bool
    notes: str | None = None


class CatchmentListResponse(APIModel):
    items: list[Catchment]
    count: int
    is_demo: bool
    mode: str


class Observation(APIModel):
    source_id: str
    provider: str
    variable: str
    value: float | str | None = None
    unit: str | None = None
    observed_at: datetime | None = None
    issued_at: datetime | None = None
    fetched_at: datetime
    valid_from: datetime | None = None
    valid_to: datetime | None = None
    geographic_coverage: dict[str, Any] = Field(default_factory=dict)
    freshness: str
    source_state: SourceState
    quality_flags: list[str] = Field(default_factory=list)
    is_demo: bool


class ObservationsResponse(APIModel):
    catchment_id: str
    items: list[Observation]
    observed: list[Observation]
    forecast: list[Observation]
    source_state: SourceState
    is_demo: bool
    message: str
    units: list[str] = Field(default_factory=list)


class WarningItem(APIModel):
    source_id: str
    provider: str
    title: str
    severity: str | None = None
    description: str | None = None
    issued_at: datetime | None = None
    valid_from: datetime | None = None
    valid_to: datetime | None = None
    geography: dict[str, Any] = Field(default_factory=dict)
    source_url: str | None = None
    source_state: SourceState
    is_demo: bool


class WarningsResponse(APIModel):
    catchment_id: str
    items: list[WarningItem]
    source_state: SourceState
    is_demo: bool
    provider_configured: bool
    message: str


class SourceStatus(APIModel):
    capability: str
    label: str
    provider: str
    configured: bool
    state: SourceState
    observation_or_issue_time: datetime | None = None
    fetched_at: datetime | None = None
    units: list[str] = Field(default_factory=list)
    geographic_coverage: dict[str, Any] = Field(default_factory=dict)
    freshness: str
    quality_flags: list[str] = Field(default_factory=list)
    is_demo: bool
    message: str
    verification: str


class SourcesStatusResponse(APIModel):
    items: list[SourceStatus]
    is_demo: bool
    mode: str
    checked_at: datetime


class AssessmentRequest(APIModel):
    requested_at: datetime | None = None

    @field_validator("requested_at")
    @classmethod
    def require_timezone(cls, value: datetime | None) -> datetime | None:
        if value is not None and value.tzinfo is None:
            raise ValueError("requested_at must include a timezone")
        return value


class DataCoverage(APIModel):
    required_inputs: int
    available_inputs: int
    missing: list[str]
    stale: list[str]
    supporting_missing: list[str] = Field(default_factory=list)


class AssessmentInput(APIModel):
    variable: str
    label: str
    value: float | str | None = None
    unit: str | None = None
    provider: str | None = None
    source_id: str | None = None
    observed_at: datetime | None = None
    source_state: str | None = None
    included: bool
    reason: str


class AssessmentResponse(APIModel):
    assessment_id: str
    catchment_id: str
    status: AssessmentStatus
    score: float | None = None
    score_semantics: str
    model_version: str
    issued_at: datetime
    is_demo: bool
    data_coverage: DataCoverage
    reason_codes: list[str]
    inputs: list[AssessmentInput]
    sources: list[Observation]
    warnings: list[WarningItem]
    persisted: bool = False
    persistence: str = "memory"
    disclaimer: str


class HistoryResponse(APIModel):
    items: list[AssessmentResponse]
    count: int
    is_demo: bool
    persistence: str


class UnavailableResponse(APIModel):
    detail: str
    code: str
    persistence: str | None = None


class ErrorResponse(APIModel):
    detail: str
    code: str
    request_id: str | None = None
