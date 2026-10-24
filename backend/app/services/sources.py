"""Source capability registry.

Only capabilities that genuinely exist are reported as anything other than
unavailable. No external connector is configured in this build, so live mode
always reports ``unavailable`` for external sources. Demo mode reports
``demo`` for the synthetic fixtures and keeps ``configured`` false.
"""

from datetime import datetime, timezone

from app.config import Settings
from app.fixtures import DEMO_ANCHOR, DEMO_FETCHED_AT
from app.schemas.api import SourceState, SourceStatus, SourcesStatusResponse

CAPABILITIES: tuple[dict, ...] = (
    {
        "capability": "rainfall",
        "label": "Observed rainfall",
        "provider": "No verified provider configured",
        "units": ["mm"],
        "message": "No rainfall connector is implemented or verified. Add a provider "
        "connector and credentials before any live rainfall can be shown.",
    },
    {
        "capability": "forecast_rainfall",
        "label": "Forecast rainfall",
        "provider": "No verified provider configured",
        "units": ["mm"],
        "message": "No numerical weather forecast connector is implemented or verified.",
    },
    {
        "capability": "official_warnings",
        "label": "Official warnings",
        "provider": "No verified provider configured",
        "units": [],
        "message": "No IMD/CWC warning feed is configured. An empty list is never "
        "evidence that no warning exists.",
    },
    {
        "capability": "river_stage",
        "label": "River stage",
        "provider": "No verified provider configured",
        "units": ["m"],
        "message": "No verified gauge or India-WRIS connector is available.",
    },
    {
        "capability": "soil_moisture",
        "label": "Soil moisture",
        "provider": "No verified provider configured",
        "units": [],
        "message": "No soil-moisture connector is available; the variable stays missing.",
    },
    {
        "capability": "terrain",
        "label": "Terrain / DEM",
        "provider": "No verified provider configured",
        "units": ["m"],
        "message": "No DEM-derived terrain features are loaded for any catchment.",
    },
)


def build_sources_status(settings: Settings, is_demo: bool) -> SourcesStatusResponse:
    now = datetime.now(timezone.utc)
    items: list[SourceStatus] = []
    for capability in CAPABILITIES:
        demo = settings.demo_active and capability["capability"] in {
            "rainfall",
            "forecast_rainfall",
            "official_warnings",
        }
        items.append(
            SourceStatus(
                capability=capability["capability"],
                label=capability["label"],
                provider="RidgeWatch synthetic demo fixture" if demo else capability["provider"],
                configured=False,
                state=SourceState.DEMO if demo else SourceState.UNAVAILABLE,
                observation_or_issue_time=DEMO_ANCHOR if demo else None,
                fetched_at=DEMO_FETCHED_AT if demo else now,
                units=capability["units"],
                geographic_coverage=(
                    {"kind": "synthetic_demo_extent", "is_demo": True} if demo else {}
                ),
                freshness="demo" if demo else "unknown",
                quality_flags=["DEMO_FIXTURE"] if demo else ["NO_VERIFIED_PROVIDER"],
                is_demo=demo,
                message=(
                    "Synthetic demo fixture only; no external provider request was made."
                    if demo
                    else capability["message"]
                ),
                verification="demo_fixture" if demo else "unconfigured",
            )
        )
    items.append(
        SourceStatus(
            capability="persistence",
            label="Database persistence",
            provider="Supabase (not connected)" if not settings.persistence_configured else "Supabase",
            configured=settings.persistence_configured,
            state=SourceState.UNAVAILABLE,
            observation_or_issue_time=None,
            fetched_at=now,
            units=[],
            geographic_coverage={},
            freshness="unknown",
            quality_flags=(
                ["CREDENTIALS_PRESENT_BUT_WIRING_NOT_VERIFIED"]
                if settings.persistence_configured
                else ["NOT_CONFIGURED"]
            ),
            is_demo=False,
            message=(
                "Supabase credentials are present, but persistence is not wired or "
                "verified in this build. Assessments are kept in process memory only."
                if settings.persistence_configured
                else "Supabase is not configured. Assessments are kept in process memory "
                "and are lost on restart."
            ),
            verification="unverified" if settings.persistence_configured else "unconfigured",
        )
    )
    return SourcesStatusResponse(
        items=items, is_demo=is_demo, mode=settings.mode, checked_at=now
    )
