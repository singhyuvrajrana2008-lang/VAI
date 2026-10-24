"""Isolated Supabase access for authenticated history.

Status: **implemented, not verified against a live Supabase project.** No
credentials exist in this environment, so every failure path here is exercised
by mocked tests only. The privileged service-role key never leaves the server,
is never logged, and is never returned by an endpoint.

Design notes:
* Caller identity is resolved by asking Supabase Auth (`/auth/v1/user`) with the
  caller's access token. A user id is never accepted from the request body.
* Persistence uses PostgREST with the service-role key only after that check.
* The full assessment contract is stored in the ``metadata`` JSONB column as
  well as in typed columns, so history returns exactly what was issued.
* Failures are mapped to small exception types so routes can return sanitised
  responses instead of leaking upstream detail.
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.config import Settings
from app.schemas.api import AssessmentResponse

logger = logging.getLogger("ridgewatch.supabase")

HISTORY_SELECT = "metadata"
MAX_HISTORY = 100


class SupabaseAuthError(Exception):
    """The supplied caller token is missing, invalid or expired."""


class SupabaseServiceError(Exception):
    """Supabase could not be reached or returned an unusable response."""


class SupabaseGateway:
    def __init__(
        self,
        settings: Settings,
        transport: httpx.BaseTransport | None = None,
    ) -> None:
        if not settings.supabase_url:
            raise ValueError("Supabase URL is required to build the gateway")
        self._url = settings.supabase_url.rstrip("/")
        self._anon_key = settings.supabase_anon_key
        self._service_key = settings.supabase_service_role_key
        self._timeout = settings.supabase_timeout_seconds
        self._transport = transport

    def _client(self) -> httpx.Client:
        return httpx.Client(
            base_url=self._url, timeout=self._timeout, transport=self._transport
        )

    def _public_headers(self, token: str) -> dict[str, str]:
        api_key = self._anon_key or self._service_key or ""
        return {
            "apikey": api_key,
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

    def _service_headers(self) -> dict[str, str]:
        key = self._service_key or ""
        return {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        }

    def verify_user(self, token: str) -> str:
        """Resolve the caller's user id. Any ambiguity is an auth failure."""
        if not token:
            raise SupabaseAuthError("missing access token")
        try:
            with self._client() as client:
                response = client.get("/auth/v1/user", headers=self._public_headers(token))
        except httpx.HTTPError as error:
            logger.warning("Supabase auth request failed: %s", type(error).__name__)
            raise SupabaseServiceError("auth service unreachable") from error

        if response.status_code in (401, 403):
            raise SupabaseAuthError("access token rejected")
        if response.status_code != 200:
            logger.warning("Supabase auth returned status %s", response.status_code)
            raise SupabaseServiceError("auth service returned an unexpected status")
        try:
            payload = response.json()
        except ValueError as error:
            raise SupabaseServiceError("auth service returned invalid JSON") from error
        user_id = payload.get("id")
        if not isinstance(user_id, str) or not user_id:
            raise SupabaseServiceError("auth service response had no user id")
        return user_id

    def save_assessment(self, user_id: str, assessment: AssessmentResponse) -> None:
        """Persist an assessment for a verified owner.

        ``catchment_id`` is written as null because demo catchments are slugs, not
        UUID rows. The slug remains in metadata for traceability.
        """
        if not self._service_key:
            raise SupabaseServiceError("persistence is not configured")
        row: dict[str, Any] = {
            "id": assessment.assessment_id,
            "requested_by": user_id,
            "catchment_id": None,
            "status": assessment.status,
            "score": assessment.score,
            "score_semantics": assessment.score_semantics,
            "model_version": assessment.model_version,
            "issued_at": assessment.issued_at.isoformat(),
            "data_coverage": assessment.data_coverage.model_dump(mode="json"),
            "reason_codes": assessment.reason_codes,
            "is_demo": assessment.is_demo,
            "metadata": {
                "assessment": assessment.model_dump(mode="json"),
                "catchment_slug": assessment.catchment_id,
                "source": "ridgewatch-api",
            },
        }
        try:
            with self._client() as client:
                response = client.post(
                    "/rest/v1/assessments",
                    headers={**self._service_headers(), "Prefer": "return=minimal"},
                    json=row,
                )
        except httpx.HTTPError as error:
            logger.warning("Supabase assessment write failed: %s", type(error).__name__)
            raise SupabaseServiceError("persistence unreachable") from error
        if response.status_code not in (200, 201, 204):
            logger.warning("Supabase assessment write status %s", response.status_code)
            raise SupabaseServiceError("persistence rejected the record")

    def list_history(self, user_id: str, limit: int = 50) -> list[AssessmentResponse]:
        limit = max(1, min(limit, MAX_HISTORY))
        try:
            with self._client() as client:
                response = client.get(
                    "/rest/v1/assessments",
                    headers=self._service_headers(),
                    params={
                        "select": HISTORY_SELECT,
                        "requested_by": f"eq.{user_id}",
                        "order": "issued_at.desc",
                        "limit": str(limit),
                    },
                )
        except httpx.HTTPError as error:
            logger.warning("Supabase history read failed: %s", type(error).__name__)
            raise SupabaseServiceError("persistence unreachable") from error

        if response.status_code != 200:
            logger.warning("Supabase history read status %s", response.status_code)
            raise SupabaseServiceError("persistence rejected the query")
        try:
            rows = response.json()
        except ValueError as error:
            raise SupabaseServiceError("persistence returned invalid JSON") from error
        if not isinstance(rows, list):
            raise SupabaseServiceError("persistence returned an unexpected shape")

        items: list[AssessmentResponse] = []
        for row in rows:
            metadata = row.get("metadata") if isinstance(row, dict) else None
            stored = metadata.get("assessment") if isinstance(metadata, dict) else None
            if not isinstance(stored, dict):
                continue
            try:
                items.append(AssessmentResponse.model_validate(stored))
            except Exception:
                # A malformed row must not break the whole history response.
                logger.warning("Skipping malformed persisted assessment row")
        return items


_gateway: SupabaseGateway | None = None
_gateway_settings: tuple[str, str, str, float] | None = None


def get_gateway() -> SupabaseGateway | None:
    """Return a configured gateway, or None when persistence is not configured.

    The instance is cached per settings tuple so tests and restarts pick up
    configuration changes without leaking clients across requests.
    """
    global _gateway, _gateway_settings
    from app.config import get_settings

    settings = get_settings()
    if not settings.persistence_configured:
        return None
    fingerprint = (
        settings.supabase_url or "",
        settings.supabase_anon_key or "",
        settings.supabase_service_role_key or "",
        settings.supabase_timeout_seconds,
    )
    if _gateway is None or _gateway_settings != fingerprint:
        _gateway = SupabaseGateway(settings)
        _gateway_settings = fingerprint
    return _gateway


def reset_gateway_cache() -> None:
    global _gateway, _gateway_settings
    _gateway = None
    _gateway_settings = None
