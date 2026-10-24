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


class HealthResponse(APIModel):
    status: str
    service: str
    environment: str
    is_demo: bool
    persistence: str


class Catchment(APIModel):
    id: str
    name: str
    region: str | None = None
    geometry: dict[str, Any] | None = None
    geometry_source: str | None = None
    validation_status: str
    is_demo: bool


class CatchmentListResponse(APIModel):
    items: list[Catchment]
    count: int
    is_demo: bool


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
    source_state: SourceState
    is_demo: bool


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
    source_state: SourceState
    is_demo: bool


class WarningsResponse(APIModel):
    catchment_id: str
    items: list[WarningItem]
    source_state: SourceState
    is_demo: bool
    message: str


class SourceStatus(APIModel):
    provider: str
    capability: str
    state: SourceState
    observation_or_issue_time: datetime | None = None
    fetched_at: datetime | None = None
    units: list[str] = Field(default_factory=list)
    geographic_coverage: dict[str, Any] = Field(default_factory=dict)
    freshness: str
    quality_flags: list[str] = Field(default_factory=list)
    is_demo: bool
    message: str


class SourcesStatusResponse(APIModel):
    items: list[SourceStatus]
    is_demo: bool


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


class AssessmentResponse(APIModel):
    assessment_id: str
    catchment_id: str
    status: AssessmentStatus
    score: float | None = None
    score_semantics: str = "not_calibrated"
    model_version: str = "baseline-v1"
    issued_at: datetime
    is_demo: bool
    data_coverage: DataCoverage
    reason_codes: list[str]
    sources: list[Observation]
    warnings: list[WarningItem]


class ErrorResponse(APIModel):
    detail: str
