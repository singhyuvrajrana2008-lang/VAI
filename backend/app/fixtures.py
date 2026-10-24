"""Deterministic DEMO fixtures.

Every record here is synthetic. It exists so the interface can be exercised
without credentials, and it must always be served with ``is_demo=True``.

Rules enforced by this module:
* Timestamps are fixed constants, never "now". Demo values must not drift into
  looking like current observations.
* The geometry is a synthetic rectangle pair, labelled as such. It is not a
  watershed boundary and must never be presented as validated geography.
* No external provider is implied: providers are named as RidgeWatch fixtures.
"""

from datetime import datetime, timedelta, timezone

# Fixed fixture anchor (UTC). All demo timestamps derive from this constant.
DEMO_ANCHOR = datetime(2026, 6, 15, 6, 0, tzinfo=timezone.utc)
DEMO_FETCHED_AT = DEMO_ANCHOR + timedelta(minutes=10)
DEMO_PROVIDER = "RidgeWatch synthetic demo fixture"
DEMO_GEOMETRY_SOURCE = "Synthetic demo rectangle; not a validated watershed boundary"

# Hourly observed rainfall (mm/h), oldest -> newest, ending at DEMO_ANCHOR.
_DEMO_RAINFALL: dict[str, list[float]] = {
    "demo-sector-a": [
        0.0, 0.6, 1.2, 0.0, 2.4, 3.1, 1.8, 0.0,
        2.2, 4.6, 6.1, 8.4, 11.2, 14.6, 18.3, 21.1,
        12.7, 6.2, 3.4, 1.1, 0.2, 9.0, 26.4, 31.2,
    ],
    "demo-sector-b": [
        0.0, 0.0, 0.3, 0.2, 0.0, 0.0, 0.1, 0.4,
        0.8, 1.1, 0.6, 0.0, 0.2, 0.5, 0.9, 1.4,
        2.1, 1.8, 0.7, 0.3, 0.0, 0.0, 0.1, 0.0,
    ],
}

# Hourly forecast rainfall (mm/h) for the six hours after the anchor.
_DEMO_FORECAST: dict[str, list[float]] = {
    "demo-sector-a": [4.0, 3.2, 2.1, 1.4, 0.8, 0.0],
    "demo-sector-b": [0.4, 0.3, 0.2, 0.0, 0.0, 0.0],
}

DEMO_CATCHMENTS: list[dict] = [
    {
        "id": "demo-sector-a",
        "slug": "demo-sector-a",
        "name": "Demo sector A (synthetic)",
        "region": "Synthetic demo region — not a real location",
        "geometry_status": "demo_synthetic",
        "geometry_source": DEMO_GEOMETRY_SOURCE,
        "validation_status": "demo",
        "is_demo": True,
        "notes": (
            "Synthetic rectangular sample used to exercise the interface. It is not a "
            "verified catchment boundary and no real place is represented."
        ),
        "geometry": {
            "type": "Polygon",
            "coordinates": [
                [
                    [77.02, 31.88],
                    [77.26, 31.88],
                    [77.26, 32.04],
                    [77.02, 32.04],
                    [77.02, 31.88],
                ]
            ],
        },
    },
    {
        "id": "demo-sector-b",
        "slug": "demo-sector-b",
        "name": "Demo sector B (synthetic)",
        "region": "Synthetic demo region — not a real location",
        "geometry_status": "demo_synthetic",
        "geometry_source": DEMO_GEOMETRY_SOURCE,
        "validation_status": "demo",
        "is_demo": True,
        "notes": (
            "Second synthetic sample with lighter rainfall, used to compare data "
            "eligibility states. Not a real location."
        ),
        "geometry": {
            "type": "Polygon",
            "coordinates": [
                [
                    [77.30, 31.86],
                    [77.54, 31.86],
                    [77.54, 32.02],
                    [77.30, 32.02],
                    [77.30, 31.86],
                ]
            ],
        },
    },
]

DEMO_WARNINGS: dict[str, list[dict]] = {
    "demo-sector-a": [
        {
            "source_id": "demo-warning-a-2",
            "provider": "RidgeWatch synthetic demo fixture",
            "title": "DEMO — Synthetic heavy-rain notice (not an official bulletin)",
            "severity": "demo_fixture",
            "description": (
                "Synthetic fixture used to exercise the official-warning layout. No "
                "authority issued this text. Always consult IMD/CWC/district sources."
            ),
            "issued_at": DEMO_ANCHOR - timedelta(hours=5),
            "valid_from": DEMO_ANCHOR - timedelta(hours=4),
            "valid_to": DEMO_ANCHOR + timedelta(hours=2),
            "geography": {"name": "Synthetic demo extent", "is_demo": True},
            "source_url": None,
            "source_state": "demo",
            "is_demo": True,
        },
        {
            "source_id": "demo-warning-a-1",
            "provider": "RidgeWatch synthetic demo fixture",
            "title": "DEMO — Synthetic advisory example (not an official bulletin)",
            "severity": "demo_fixture",
            "description": (
                "Older synthetic fixture demonstrating chronological ordering and "
                "validity periods. This is not a real advisory."
            ),
            "issued_at": DEMO_ANCHOR - timedelta(hours=20),
            "valid_from": DEMO_ANCHOR - timedelta(hours=19),
            "valid_to": DEMO_ANCHOR - timedelta(hours=9),
            "geography": {"name": "Synthetic demo extent", "is_demo": True},
            "source_url": None,
            "source_state": "demo",
            "is_demo": True,
        },
    ],
    "demo-sector-b": [
        {
            "source_id": "demo-warning-b-1",
            "provider": "RidgeWatch synthetic demo fixture",
            "title": "DEMO — Synthetic routine conditions note (not an official bulletin)",
            "severity": "demo_fixture",
            "description": (
                "Synthetic fixture for layout testing only. Demonstrates that an old "
                "validity period is shown as expired rather than current."
            ),
            "issued_at": DEMO_ANCHOR - timedelta(hours=30),
            "valid_from": DEMO_ANCHOR - timedelta(hours=29),
            "valid_to": DEMO_ANCHOR - timedelta(hours=18),
            "geography": {"name": "Synthetic demo extent", "is_demo": True},
            "source_url": None,
            "source_state": "demo",
            "is_demo": True,
        }
    ],
}


def rainfall_series(catchment_id: str) -> list[dict]:
    """Observed hourly rainfall as normalised records (oldest first)."""
    values = _DEMO_RAINFALL.get(catchment_id, [])
    count = len(values)
    return [
        {
            "source_id": f"demo-rainfall-{catchment_id}-{index}",
            "provider": DEMO_PROVIDER,
            "variable": "rainfall",
            "value": value,
            "unit": "mm",
            "observed_at": DEMO_ANCHOR - timedelta(hours=count - 1 - index),
            "issued_at": None,
            "fetched_at": DEMO_FETCHED_AT,
            "valid_from": DEMO_ANCHOR - timedelta(hours=count - 1 - index),
            "valid_to": DEMO_ANCHOR - timedelta(hours=count - 2 - index),
            "geographic_coverage": {
                "kind": "synthetic_demo_extent",
                "catchment_id": catchment_id,
                "is_demo": True,
            },
            "freshness": "demo",
            "source_state": "demo",
            "quality_flags": ["DEMO_FIXTURE", "NOT_OBSERVED"],
            "is_demo": True,
        }
        for index, value in enumerate(values)
    ]


def forecast_series(catchment_id: str) -> list[dict]:
    """Demo forecast rainfall; kept separate from observations in every response."""
    values = _DEMO_FORECAST.get(catchment_id, [])
    return [
        {
            "source_id": f"demo-forecast-{catchment_id}-{index}",
            "provider": DEMO_PROVIDER,
            "variable": "forecast_rainfall",
            "value": value,
            "unit": "mm",
            "observed_at": None,
            "issued_at": DEMO_ANCHOR,
            "fetched_at": DEMO_FETCHED_AT,
            "valid_from": DEMO_ANCHOR + timedelta(hours=index),
            "valid_to": DEMO_ANCHOR + timedelta(hours=index + 1),
            "geographic_coverage": {
                "kind": "synthetic_demo_extent",
                "catchment_id": catchment_id,
                "is_demo": True,
            },
            "freshness": "demo",
            "source_state": "demo",
            "quality_flags": ["DEMO_FIXTURE", "NOT_A_FORECAST"],
            "is_demo": True,
        }
        for index, value in enumerate(values)
    ]


def warnings(catchment_id: str) -> list[dict]:
    return list(DEMO_WARNINGS.get(catchment_id, []))
