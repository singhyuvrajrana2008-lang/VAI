from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app

client = TestClient(app)


def setup_function() -> None:
    get_settings.cache_clear()


def teardown_function() -> None:
    get_settings.cache_clear()


def test_health_and_openapi_schema() -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["persistence"] == "unavailable"
    schema = client.get("/openapi.json").json()
    assert "/api/v1/catchments/{catchment_id}/assessments" in schema["paths"]


def test_no_demo_fixture_by_default_and_unknown_catchment() -> None:
    assert client.get("/api/v1/catchments").json() == {"items": [], "count": 0, "is_demo": False}
    assert client.get("/api/v1/catchments/demo-catchment").status_code == 404


def test_demo_fixture_and_assessment_are_explicitly_labeled(monkeypatch) -> None:
    monkeypatch.setenv("RIDGEWATCH_MODE", "demo")
    get_settings.cache_clear()
    catchments = client.get("/api/v1/catchments").json()
    assert catchments["is_demo"] is True
    assert catchments["items"][0]["is_demo"] is True
    assert catchments["items"][0]["geometry"] is None
    result = client.post("/api/v1/catchments/demo-catchment/assessments", json={})
    assert result.status_code == 200
    payload = result.json()
    assert payload["is_demo"] is True
    assert payload["status"] == "insufficient_data"
    assert payload["score"] is None
    assert payload["data_coverage"]["missing"] == ["rainfall", "forecast_rainfall", "river_stage", "soil_moisture"]


def test_malformed_assessment_and_invalid_time_range(monkeypatch) -> None:
    monkeypatch.setenv("RIDGEWATCH_MODE", "demo")
    get_settings.cache_clear()
    assert client.post("/api/v1/catchments/demo-catchment/assessments", json={"requested_at": "yesterday"}).status_code == 422
    assert client.post("/api/v1/catchments/demo-catchment/assessments", json={"requested_at": "2025-02-01T00:00:00"}).status_code == 422
    assert client.get("/api/v1/catchments/demo-catchment/observations?from=2025-02-02T00:00:00Z&to=2025-02-01T00:00:00Z").status_code == 422


def test_warning_unavailable_is_not_an_all_clear(monkeypatch) -> None:
    monkeypatch.setenv("RIDGEWATCH_MODE", "demo")
    get_settings.cache_clear()
    payload = client.get("/api/v1/catchments/demo-catchment/warnings").json()
    assert payload["items"] == []
    assert payload["source_state"] == "unavailable"
    assert "not confirmation" in payload["message"]


def test_source_status_lists_unconfigured_providers() -> None:
    payload = client.get("/api/v1/sources/status").json()
    assert payload["is_demo"] is False
    assert all(item["state"] == "unavailable" for item in payload["items"])
