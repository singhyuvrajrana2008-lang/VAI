"""Exercises scripts/rls_isolation_check.py against a fake Supabase.

The real two-user RLS check needs a configured project, which this workspace
does not have. These tests prove the script itself works: its pass path, its
failure path when owner scoping is broken, and its skip path when no
credentials exist. Live RLS remains NOT TESTED until
``scripts/rls_isolation_check.py`` is run against a real project.
"""

from __future__ import annotations

import json
import subprocess
import sys
import threading
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

REPO_ROOT = Path(__file__).resolve().parents[2]
SCRIPT = REPO_ROOT / "scripts" / "rls_isolation_check.py"
SERVICE_KEY = "service-key-for-tests"
ANON_KEY = "anon-key-for-tests"


class FakeSupabase:
    """In-memory subset of Supabase Auth + PostgREST with RLS semantics."""

    def __init__(self, enforce_rls: bool = True) -> None:
        self.enforce_rls = enforce_rls
        self.users: dict[str, tuple[str, str]] = {}
        self.rows: dict[str, dict] = {}

    def handler_class(self) -> type[BaseHTTPRequestHandler]:
        state = self

        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *args: object) -> None:  # keep test output quiet
                pass

            def _json(self, code: int, payload: object) -> None:
                body = json.dumps(payload).encode("utf-8")
                self.send_response(code)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)

            def _body(self) -> dict:
                length = int(self.headers.get("Content-Length") or 0)
                raw = self.rfile.read(length) if length else b"{}"
                try:
                    parsed = json.loads(raw or b"{}")
                except ValueError:
                    return {}
                return parsed if isinstance(parsed, dict) else {}

            def _bearer(self) -> str | None:
                value = self.headers.get("Authorization") or ""
                return value[7:] if value.startswith("Bearer ") else None

            def do_POST(self) -> None:  # noqa: N802
                path = urlparse(self.path).path
                payload = self._body()
                if path == "/auth/v1/admin/users":
                    if self.headers.get("apikey") != SERVICE_KEY:
                        return self._json(401, {"message": "service key required"})
                    user_id = str(uuid.uuid4())
                    state.users[user_id] = (str(payload.get("email", "")), str(payload.get("password", "")))
                    return self._json(200, {"id": user_id})
                if path == "/auth/v1/token":
                    email, password = payload.get("email"), payload.get("password")
                    for user_id, (stored_email, stored_password) in state.users.items():
                        if stored_email == email and stored_password == password:
                            return self._json(200, {"access_token": f"tok-{user_id}", "user": {"id": user_id}})
                    return self._json(400, {"message": "invalid credentials"})
                if path.startswith("/rest/v1/assessments"):
                    token = self._bearer()
                    if not token or not token.startswith("tok-"):
                        return self._json(401, {"message": "anonymous access denied"})
                    actor = token[4:]
                    owner = payload.get("requested_by")
                    if state.enforce_rls and owner != actor:
                        return self._json(403, {"message": "new row violates row-level security policy"})
                    row_id = str(uuid.uuid4())
                    state.rows[row_id] = {"id": row_id, "requested_by": owner}
                    return self._json(201, [state.rows[row_id]])
                return self._json(404, {"message": "not found"})

            def do_GET(self) -> None:  # noqa: N802
                parsed = urlparse(self.path)
                if not parsed.path.startswith("/rest/v1/assessments"):
                    return self._json(404, {"message": "not found"})
                token = self._bearer()
                row_id = parsed.query.split("id=eq.")[-1] if "id=eq." in parsed.query else ""
                row = state.rows.get(row_id)
                if not token or not token.startswith("tok-"):
                    return self._json(401, {"message": "anonymous access denied"})
                actor = token[4:]
                if not row:
                    return self._json(200, [])
                if not state.enforce_rls or row.get("requested_by") == actor:
                    return self._json(200, [{"id": row["id"]}])
                return self._json(200, [])

            def do_DELETE(self) -> None:  # noqa: N802
                path = urlparse(self.path).path
                if self.headers.get("apikey") != SERVICE_KEY:
                    return self._json(401, {"message": "service key required"})
                if path.startswith("/auth/v1/admin/users/"):
                    state.users.pop(path.rsplit("/", 1)[-1], None)
                    return self._json(200, {})
                if path.startswith("/rest/v1/assessments"):
                    row_id = urlparse(self.path).query.split("id=eq.")[-1]
                    state.rows.pop(row_id, None)
                    return self._json(204, {})
                return self._json(404, {"message": "not found"})

        return Handler


def run_script(base_url: str, *, require: bool = False, extra_env: dict[str, str] | None = None) -> subprocess.CompletedProcess[str]:
    env = {
        "PATH": "/usr/bin:/bin",
        "PYTHONPATH": "",
        "SUPABASE_URL": base_url,
        "SUPABASE_SERVICE_ROLE_KEY": SERVICE_KEY,
        "SUPABASE_ANON_KEY": ANON_KEY,
    }
    env.update(extra_env or {})
    command = [sys.executable, str(SCRIPT)]
    if require:
        command.append("--require")
    return subprocess.run(  # noqa: S603 - fixed command, no shell
        command, capture_output=True, text=True, env=env, cwd=str(REPO_ROOT), timeout=60, check=False
    )


def start_server(fake: FakeSupabase) -> tuple[ThreadingHTTPServer, str]:
    server = ThreadingHTTPServer(("127.0.0.1", 0), fake.handler_class())
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server, f"http://127.0.0.1:{server.server_address[1]}"


def test_rls_script_passes_against_enforcing_fake() -> None:
    server, base = start_server(FakeSupabase(enforce_rls=True))
    try:
        result = run_script(base)
    finally:
        server.shutdown()

    assert result.returncode == 0, result.stdout + result.stderr
    assert "RESULT: PASS" in result.stdout
    assert "user B cannot read A's row" in result.stdout
    # Temporary users must be cleaned up.
    assert not any("rls-a-" in line for line in result.stdout.splitlines() if "PASS" not in line and "FAIL" not in line)


def test_rls_script_fails_when_owner_scoping_is_broken() -> None:
    server, base = start_server(FakeSupabase(enforce_rls=False))
    try:
        result = run_script(base)
    finally:
        server.shutdown()

    assert result.returncode == 1, result.stdout + result.stderr
    assert "RESULT: FAIL" in result.stdout
    assert "user B cannot read A's row" in result.stdout


def test_rls_script_skips_without_credentials() -> None:
    result = subprocess.run(  # noqa: S603 - fixed command, no shell
        [sys.executable, str(SCRIPT), "--require"],
        capture_output=True,
        text=True,
        env={"PATH": "/usr/bin:/bin", "SUPABASE_URL": "", "SUPABASE_SERVICE_ROLE_KEY": ""},
        cwd=str(REPO_ROOT),
        timeout=60,
        check=False,
    )
    assert result.returncode == 2, result.stdout + result.stderr
    assert "SKIP" in result.stdout
    assert "not a pass" in result.stdout
