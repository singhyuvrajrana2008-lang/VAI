import json

import httpx
import pytest

from app.config import Settings
from app.schemas.api import AssessmentResponse
from app.services.risk import evaluate_assessment
from app.services.supabase import (
    SupabaseAuthError,
    SupabaseGateway,
    SupabaseServiceError,
)


def make_settings() -> Settings:
    return Settings(
        _env_file=None,
        supabase_url="https://project.supabase.co",
        supabase_anon_key="anon-placeholder",
        supabase_service_role_key="service-placeholder",
    )


def make_assessment() -> AssessmentResponse:
    return evaluate_assessment("demo-sector-a", [], is_demo=True)


def gateway_with(handler) -> SupabaseGateway:
    return SupabaseGateway(make_settings(), transport=httpx.MockTransport(handler))


def test_verify_user_resolves_identity_from_the_auth_service():
    seen: dict[str, str] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["path"] = request.url.path
        seen["authorization"] = request.headers.get("authorization", "")
        seen["apikey"] = request.headers.get("apikey", "")
        return httpx.Response(200, json={"id": "user-123", "email": "a@example.test"})

    assert gateway_with(handler).verify_user("caller-token") == "user-123"
    assert seen["path"] == "/auth/v1/user"
    assert seen["authorization"] == "Bearer caller-token"
    assert seen["apikey"] == "anon-placeholder"


@pytest.mark.parametrize("status_code", [401, 403])
def test_rejected_tokens_raise_auth_error(status_code: int):
    gateway = gateway_with(lambda request: httpx.Response(status_code))
    with pytest.raises(SupabaseAuthError):
        gateway.verify_user("bad-token")


def test_auth_service_failures_raise_service_error_and_do_not_leak_detail():
    gateway = gateway_with(
        lambda request: httpx.Response(500, json={"message": "secret internal detail"})
    )
    with pytest.raises(SupabaseServiceError) as caught:
        gateway.verify_user("token")
    assert "secret internal detail" not in str(caught.value)


def test_unreachable_auth_service_maps_to_service_error():
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("connection refused", request=request)

    with pytest.raises(SupabaseServiceError):
        gateway_with(handler).verify_user("token")


def test_save_assessment_writes_owner_and_full_metadata():
    captured: dict[str, object] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["path"] = request.url.path
        captured["prefer"] = request.headers.get("prefer")
        captured["body"] = json.loads(request.content)
        return httpx.Response(201)

    assessment = make_assessment()
    gateway_with(handler).save_assessment("user-123", assessment)
    body = captured["body"]
    assert captured["path"] == "/rest/v1/assessments"
    assert captured["prefer"] == "return=minimal"
    assert body["id"] == assessment.assessment_id
    assert body["requested_by"] == "user-123"
    assert body["catchment_id"] is None
    assert body["is_demo"] is True
    assert body["score"] is None
    assert body["metadata"]["assessment"]["assessment_id"] == assessment.assessment_id
    assert body["metadata"]["catchment_slug"] == "demo-sector-a"


def test_save_assessment_reports_rejection_without_echoing_upstream_text():
    gateway = gateway_with(
        lambda request: httpx.Response(400, json={"message": "permission denied for table x"})
    )
    with pytest.raises(SupabaseServiceError) as caught:
        gateway.save_assessment("user-123", make_assessment())
    assert "permission denied" not in str(caught.value)


def test_list_history_returns_only_well_formed_rows():
    assessment = make_assessment()

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/rest/v1/assessments"
        assert request.url.params["requested_by"] == "eq.user-123"
        assert request.url.params["order"] == "issued_at.desc"
        return httpx.Response(
            200,
            json=[
                {"metadata": {"assessment": assessment.model_dump(mode="json")}},
                {"metadata": {}},
                {"metadata": None},
                {"unexpected": True},
            ],
        )

    items = gateway_with(handler).list_history("user-123")
    assert len(items) == 1
    assert items[0].assessment_id == assessment.assessment_id
    assert items[0].is_demo is True


def test_list_history_rejects_unexpected_shape():
    gateway = gateway_with(lambda request: httpx.Response(200, json={"items": []}))
    with pytest.raises(SupabaseServiceError):
        gateway.list_history("user-123")


def test_list_history_never_exceeds_the_hard_limit():
    seen: dict[str, str] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["limit"] = request.url.params["limit"]
        return httpx.Response(200, json=[])

    gateway_with(handler).list_history("user-123", limit=10_000)
    assert seen["limit"] == "100"
