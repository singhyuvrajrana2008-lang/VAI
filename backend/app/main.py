"""FastAPI application entry point.

Adds request correlation IDs, sanitised error responses, CORS from configuration
and a bounded request body guard. Secrets never appear in responses or logs.
"""

import logging
import uuid
from datetime import datetime, timezone

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import router
from app.config import get_settings

logger = logging.getLogger("ridgewatch.api")
settings = get_settings()

MAX_BODY_BYTES = 64 * 1024

app = FastAPI(
    title=settings.app_name,
    description=(
        "RidgeWatch catchment-level decision-support API. Experimental outputs are "
        "not official warnings or evacuation guidance. Demo mode serves labelled "
        "synthetic fixtures; no external data provider is configured in this build."
    ),
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
    expose_headers=["X-Request-ID"],
)

app.include_router(router)


@app.middleware("http")
async def request_context(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    content_length = request.headers.get("content-length")
    if content_length and content_length.isdigit() and int(content_length) > MAX_BODY_BYTES:
        return JSONResponse(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            content={
                "detail": "Request body is too large.",
                "code": "payload_too_large",
                "request_id": request_id,
            },
            headers={"X-Request-ID": request_id},
        )
    try:
        response = await call_next(request)
    except Exception:  # pragma: no cover - exercised through the error handler path
        logger.exception("Unhandled error request_id=%s path=%s", request_id, request.url.path)
        return JSONResponse(
            status_code=500,
            content={
                "detail": "The server could not complete this request. No status has been inferred.",
                "code": "internal_error",
                "request_id": request_id,
            },
            headers={"X-Request-ID": request_id},
        )
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


@app.get("/", include_in_schema=False)
def root() -> dict:
    return {
        "service": settings.app_name,
        "docs": "/docs",
        "health": "/api/v1/health",
        "mode": settings.mode,
        "note": "Experimental decision-support prototype. Not an official warning service.",
        "checked_at": datetime.now(timezone.utc).isoformat(),
    }
