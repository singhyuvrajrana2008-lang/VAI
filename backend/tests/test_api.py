from fastapi.testclient import TestClient

from app.api import routes
from app.config import get_settings
from app.main import app

client = TestClient(app)


def test_health_reports_demo_mode_and_no_secret_values():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["is_demo"] is True
    assert payload["persistence"] == "unavailable"
    assert payload["authentication"] == "unavailable"
    assert payload["config"]["demo_fixtures"] is True
    assert "SERVICE_ROLE" not in str(payload).upper()


def test_openapi_exposes_documented_routes():
    schema = client.get("/openapi.json").json()
    for path in (
        "/api/v1/health",
        "/api/v1/catchments",
        "/api/v1/catchments/{catchment_id}",
        "/api/v1/catchments/{catchment_id}/observations",
        "/api/v1/catchments/{catchment_id}/warnings",
        "/api/v1/catchments/{catchment_id}/assessments",
        "/api/v1/assessments/{assessment_id}",
        "/api/v1/sources/status",
        "/api/v1/history",
    ):
        assert path in schema["paths"], path


def test_demo_catchments_are_labelled_and_geometry_is_not_claimed_verified():
    payload = client.get("/api/v1/catchments").json()
    assert payload["count"] == 2
    assert payload["is_demo"] is True
    for item in payload["items"]:
        assert item["is_demo"] is True
        assert item["geometry_status"] == "demo_synthetic"
        assert item["validation_status"] == "demo"
        assert "not a validated watershed" in item["geometry_source"].lower()
        assert item["geometry"]["type"] == "Polygon"


def test_unknown_catchment_returns_controlled_404():
    assert client.get("/api/v1/catchments/does-not-exist").status_code == 404
    assert client.get("/api/v1/catchments/does-not-exist/observations").status_code == 404
    assert client.get("/api/v1/catchments/does-not-exist/warnings").status_code == 404
    assert (
        client.post("/api/v1/catchments/does-not-exist/assessments", json={}).status_code == 404
    )


def test_observations_separate_observed_and_forecast_and_stay_in_millimetres():
    payload = client.get("/api/v1/catchments/demo-sector-a/observations").json()
    assert payload["is_demo"] is True
    assert payload["source_state"] == "demo"
    assert payload["units"] == ["mm"]
    assert len(payload["observed"]) == 24
    assert len(payload["forecast"]) == 6
    assert {item["variable"] for item in payload["observed"]} == {"rainfall"}
    assert {item["variable"] for item in payload["forecast"]} == {"forecast_rainfall"}
    assert all(item["is_demo"] for item in payload["items"])
    assert all(item["unit"] == "mm" for item in payload["items"])
    assert all("DEMO_FIXTURE" in item["quality_flags"] for item in payload["items"])


def test_observations_are_deterministic_across_requests():
    first = client.get("/api/v1/catchments/demo-sector-a/observations").json()
    second = client.get("/api/v1/catchments/demo-sector-a/observations").json()
    assert first == second


def test_observation_date_filter_and_invalid_range():
    payload = client.get(
        "/api/v1/catchments/demo-sector-a/observations"
        "?from=2026-06-15T03:00:00Z&to=2026-06-15T06:00:00Z"
    ).json()
    assert 0 < len(payload["observed"]) < 24
    invalid = client.get(
        "/api/v1/catchments/demo-sector-a/observations"
        "?from=2026-06-16T00:00:00Z&to=2026-06-15T00:00:00Z"
    )
    assert invalid.status_code == 422
    assert client.get(
        "/api/v1/catchments/demo-sector-a/observations?from=not-a-date"
    ).status_code == 422


def test_warnings_are_demo_labelled_and_never_an_all_clear():
    payload = client.get("/api/v1/catchments/demo-sector-a/warnings").json()
    assert payload["source_state"] == "demo"
    assert payload["is_demo"] is True
    assert payload["provider_configured"] is False
    assert len(payload["items"]) == 2
    assert all("not an official bulletin" in item["title"] for item in payload["items"])
    assert all(item["is_demo"] for item in payload["items"])
    assert "not official bulletins" in payload["message"]


def test_live_mode_serves_no_fixtures_and_no_all_clear(monkeypatch):
    monkeypatch.setenv("RIDGEWATCH_MODE", "live")
    get_settings.cache_clear()

    assert client.get("/api/v1/catchments").json() == {
        "items": [],
        "count": 0,
        "is_demo": False,
        "mode": "live",
    }
    assert client.get("/api/v1/catchments/demo-sector-a").status_code == 404
    sources = client.get("/api/v1/sources/status").json()
    assert sources["is_demo"] is False
    assert all(item["configured"] is False for item in sources["items"])
    assert all(item["state"] == "unavailable" for item in sources["items"])


def test_demo_fixtures_can_be_disabled_without_leaving_demo_mode(monkeypatch):
    monkeypatch.setenv("RIDGEWATCH_DEMO_FIXTURES_ENABLED", "false")
    get_settings.cache_clear()
    payload = client.get("/api/v1/catchments").json()
    assert payload["count"] == 0
    assert payload["mode"] == "demo"


def test_assessment_returns_band_only_with_complete_rainfall_window():
    high = client.post("/api/v1/catchments/demo-sector-a/assessments", json={}).json()
    low = client.post("/api/v1/catchments/demo-sector-b/assessments", json={}).json()

    assert high["status"] in {"high", "very_high"}
    assert low["status"] in {"low", "moderate"}
    assert high["status"] != low["status"]
    assert high["score"] is None and low["score"] is None
    assert high["score_semantics"] == "categorical_only_no_calibrated_index"
    assert high["is_demo"] is True
    assert high["data_coverage"]["required_inputs"] == 1
    assert high["data_coverage"]["available_inputs"] == 1
    assert "DEMO_FIXTURE_INPUTS" in high["reason_codes"]
    assert "THRESHOLD_BASELINE_NOT_EVALUATED" in high["reason_codes"]
    assert any(reason.startswith("RAINFALL_3H_") for reason in high["reason_codes"])
    assert high["persisted"] is False and high["persistence"] == "memory"
    assert "not an official warning" in high["disclaimer"].lower()
    assert any(entry["variable"] == "rainfall" for entry in high["inputs"])
    assert high["warnings"], "eligible warnings are attached as evidence"


def test_assessment_can_be_read_back_and_unknown_id_is_404():
    created = client.post("/api/v1/catchments/demo-sector-b/assessments", json={}).json()
    fetched = client.get(f"/api/v1/assessments/{created['assessment_id']}")
    assert fetched.status_code == 200
    assert fetched.json()["assessment_id"] == created["assessment_id"]
    assert client.get("/api/v1/assessments/00000000-0000-0000-0000-000000000000").status_code == 404


def test_assessment_rejects_naive_timestamp_and_bad_json():
    assert (
        client.post(
            "/api/v1/catchments/demo-sector-a/assessments",
            json={"requested_at": "2025-02-01T00:00:00"},
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/api/v1/catchments/demo-sector-a/assessments",
            json={"requested_at": "yesterday"},
        ).status_code
        == 422
    )


def test_assessment_rate_limit_returns_429(monkeypatch):
    monkeypatch.setenv("RIDGEWATCH_ASSESSMENT_RATE_LIMIT_PER_MINUTE", "2")
    get_settings.cache_clear()
    for _ in range(2):
        assert (
            client.post("/api/v1/catchments/demo-sector-a/assessments", json={}).status_code
            == 200
        )
    limited = client.post("/api/v1/catchments/demo-sector-a/assessments", json={})
    assert limited.status_code == 429
    assert "retry" in limited.json()["detail"].lower()


def test_oversized_body_is_rejected():
    oversized = client.post(
        "/api/v1/catchments/demo-sector-a/assessments",
        content=b"{" + b'"pad":"' + b"x" * 70_000 + b'"}',
        headers={"Content-Type": "application/json"},
    )
    assert oversized.status_code == 413
    assert oversized.json()["code"] == "payload_too_large"


def test_request_id_is_returned_for_tracing():
    response = client.get("/api/v1/health", headers={"X-Request-ID": "trace-123"})
    assert response.headers["X-Request-ID"] == "trace-123"
    generated = client.get("/api/v1/health")
    assert len(generated.headers["X-Request-ID"]) >= 8


def test_sources_status_lists_unconfigured_and_demo_states():
    payload = client.get("/api/v1/sources/status").json()
    assert payload["is_demo"] is True
    by_capability = {item["capability"]: item for item in payload["items"]}
    assert by_capability["rainfall"]["state"] == "demo"
    assert by_capability["rainfall"]["configured"] is False
    assert by_capability["rainfall"]["verification"] == "demo_fixture"
    assert by_capability["river_stage"]["state"] == "unavailable"
    assert by_capability["persistence"]["state"] == "unavailable"
    assert all(item["configured"] is False for item in payload["items"])


def test_history_is_not_faked():
    response = client.get("/api/v1/history")
    assert response.status_code == 503
    assert "persistence" in response.json()["detail"]


def test_cors_does_not_allow_unknown_origin():
    allowed = client.options(
        "/api/v1/health",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert allowed.status_code == 200
    assert allowed.headers["access-control-allow-origin"] == "http://localhost:5173"
    denied = client.options(
        "/api/v1/health",
        headers={
            "Origin": "https://evil.example",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert denied.headers.get("access-control-allow-origin") is None


def test_store_is_bounded(monkeypatch):
    store = routes.AssessmentStore(capacity=2)
    from app.services.risk import evaluate_assessment

    for _ in range(3):
        store.save(evaluate_assessment("demo-sector-a", []))
    assert len(store) == 2


def test_missing_assessment_input_never_becomes_zero_rainfall():
    payload = client.post("/api/v1/catchments/demo-sector-a/assessments", json={}).json()
    assert payload["score"] is None
    assert payload["data_coverage"]["missing"] == []
    # Now simulate live mode with no providers at all through the service layer.
    from datetime import datetime, timezone

    from app.services.risk import evaluate_assessment

    empty = evaluate_assessment("c1", [], now=datetime.now(timezone.utc))
    assert empty.status == "insufficient_data"
    assert empty.score is None
    assert empty.data_coverage.missing == ["rainfall"]
    assert "INSUFFICIENT_REQUIRED_INPUTS" in empty.reason_codes
    assert empty.is_demo is False
