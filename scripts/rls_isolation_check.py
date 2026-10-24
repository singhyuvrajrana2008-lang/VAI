#!/usr/bin/env python3
"""Two-user RLS isolation check for the RidgeWatch Supabase schema.

This is the documented two-user test referenced in README.md. It creates two
temporary users in a **configured Supabase project**, writes an assessment as
user A using A's own access token, and then proves:

1. A can read the row A created.
2. B cannot read A's row (select is owner-scoped).
3. B cannot insert a row claiming to be owned by A (with check is enforced).
4. An anonymous caller cannot read private rows.

Every temporary user and row is deleted again, including on failure.

It never prints a credential, only variable names and PASS/FAIL/SKIP lines.
Without SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY it skips: that is the honest
state of this workspace, not a pass.

Usage:
    python3 scripts/rls_isolation_check.py           # skip if unconfigured
    python3 scripts/rls_isolation_check.py --require # exit 2 when unconfigured

Exit codes: 0 = pass or skipped, 1 = a check failed, 2 = required but unconfigured.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TIMEOUT = 15
TABLE = "assessments"


def parse_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.is_file():
        return values
    for raw in path.read_text(encoding="utf-8", errors="replace").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def load_config() -> dict[str, str]:
    merged: dict[str, str] = {}
    for path in (ROOT / ".env", ROOT / "backend" / ".env", ROOT / "frontend" / ".env.local"):
        merged.update(parse_env_file(path))
    merged.update(os.environ)
    return merged


class SupabaseError(RuntimeError):
    pass


def call(
    base: str,
    path: str,
    *,
    method: str = "GET",
    headers: dict[str, str] | None = None,
    payload: dict | None = None,
) -> tuple[int, str]:
    url = base.rstrip("/") + path
    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    request = urllib.request.Request(url, data=body, method=method)  # noqa: S310 - configured URL
    request.add_header("Content-Type", "application/json")
    for key, value in (headers or {}).items():
        request.add_header(key, value)
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT) as response:  # noqa: S310
            return response.status, response.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as error:
        return error.code, error.read().decode("utf-8", errors="replace")
    except (urllib.error.URLError, TimeoutError) as error:
        raise SupabaseError(f"request to {path} failed: {error.reason}") from error


class Runner:
    def __init__(self, base: str, service_key: str, anon_key: str) -> None:
        self.base = base
        self.service_key = service_key
        self.anon_key = anon_key
        self.failures: list[str] = []
        self.user_ids: list[str] = []

    def service_headers(self) -> dict[str, str]:
        return {"apikey": self.service_key, "Authorization": f"Bearer {self.service_key}"}

    def user_headers(self, token: str) -> dict[str, str]:
        return {"apikey": self.anon_key or self.service_key, "Authorization": f"Bearer {token}"}

    def check(self, name: str, ok: bool, detail: str = "") -> None:
        line = f"  {'PASS' if ok else 'FAIL'}  {name}"
        if detail and not ok:
            line += f" — {detail}"
        print(line)
        if not ok:
            self.failures.append(name)

    def create_user(self, email: str, password: str) -> str:
        status, text = call(
            self.base,
            "/auth/v1/admin/users",
            method="POST",
            headers=self.service_headers(),
            payload={"email": email, "password": password, "email_confirm": True},
        )
        if status not in (200, 201):
            raise SupabaseError(f"admin user creation returned {status}: {text[:160]}")
        user_id = json.loads(text).get("id")
        if not isinstance(user_id, str) or not user_id:
            raise SupabaseError("admin user creation returned no id")
        self.user_ids.append(user_id)
        return user_id

    def sign_in(self, email: str, password: str) -> str:
        status, text = call(
            self.base,
            "/auth/v1/token?grant_type=password",
            method="POST",
            headers={"apikey": self.anon_key or self.service_key},
            payload={"email": email, "password": password},
        )
        if status != 200:
            raise SupabaseError(f"password grant returned {status}: {text[:160]}")
        token = json.loads(text).get("access_token")
        if not isinstance(token, str) or not token:
            raise SupabaseError("password grant returned no access token")
        return token

    def insert_row(self, headers: dict[str, str], user_id: str) -> tuple[int, str]:
        return call(
            self.base,
            f"/rest/v1/{TABLE}",
            method="POST",
            headers={**headers, "Prefer": "return=representation"},
            payload={
                "requested_by": user_id,
                "status": "insufficient_data",
                "score": None,
                "score_semantics": "not_calibrated",
                "model_version": "rls-isolation-check",
                "reason_codes": ["rls_check"],
                "is_demo": True,
                "metadata": {"note": "temporary row created by scripts/rls_isolation_check.py"},
            },
        )

    def read_rows(self, headers: dict[str, str], row_id: str) -> tuple[int, int]:
        status, text = call(
            self.base,
            f"/rest/v1/{TABLE}?select=id&id=eq.{row_id}",
            method="GET",
            headers=headers,
        )
        if status != 200:
            return status, -1
        try:
            rows = json.loads(text)
        except ValueError:
            return status, -1
        return status, len(rows) if isinstance(rows, list) else -1

    def cleanup(self) -> None:
        for user_id in self.user_ids:
            status, _ = call(
                self.base,
                f"/auth/v1/admin/users/{user_id}",
                method="DELETE",
                headers=self.service_headers(),
            )
            if status not in (200, 204):
                print(f"  note: could not delete temporary user ({status}); remove it manually")


def main() -> int:
    parser = argparse.ArgumentParser(description="RidgeWatch two-user RLS isolation check")
    parser.add_argument(
        "--require",
        action="store_true",
        help="exit 2 instead of skipping when Supabase is not configured",
    )
    args = parser.parse_args()

    config = load_config()
    base = config.get("SUPABASE_URL", "").strip().rstrip("/")
    service_key = config.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    anon_key = config.get("SUPABASE_ANON_KEY", "").strip()

    if not base or not service_key:
        print("SKIP: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (backend/.env).")
        print("      This is not a pass: RLS has not been exercised against a live project.")
        return 2 if args.require else 0
    if not anon_key:
        print("note: SUPABASE_ANON_KEY is not set; using the service key as apikey only.")

    print("RidgeWatch two-user RLS isolation check")
    print("=" * 40)
    print("Temporary users are created and deleted by this run. No secrets are printed.")

    runner = Runner(base, service_key, anon_key)
    stamp = int(time.time())
    row_id: str | None = None
    password = f"RlsCheck!{stamp}x9"

    try:
        a_id = runner.create_user(f"ridgewatch-rls-a-{stamp}@example.invalid", password)
        b_id = runner.create_user(f"ridgewatch-rls-b-{stamp}@example.invalid", password)
        a_token = runner.sign_in(f"ridgewatch-rls-a-{stamp}@example.invalid", password)
        b_token = runner.sign_in(f"ridgewatch-rls-b-{stamp}@example.invalid", password)
        runner.check("two users created and signed in", True)

        status, text = runner.insert_row(runner.user_headers(a_token), a_id)
        runner.check(
            "user A can insert an assessment owned by A",
            status in (200, 201),
            f"status {status}: {text[:160]}",
        )
        if status not in (200, 201):
            raise SupabaseError("insert failed; nothing further can be proven")
        try:
            row_id = json.loads(text)[0]["id"]
        except (ValueError, KeyError, IndexError, TypeError):
            raise SupabaseError("insert returned no row id") from None

        status, count = runner.read_rows(runner.user_headers(a_token), row_id)
        runner.check("user A can read A's own row", status == 200 and count == 1, f"status {status}, rows {count}")

        status, count = runner.read_rows(runner.user_headers(b_token), row_id)
        runner.check("user B cannot read A's row", status == 200 and count == 0, f"status {status}, rows {count}")

        status, _ = runner.insert_row(runner.user_headers(b_token), a_id)
        runner.check(
            "user B cannot insert a row owned by A",
            status in (401, 403, 42501),
            f"insert as B with requested_by=A returned {status}",
        )

        anon_headers = {"apikey": runner.anon_key or runner.service_key}
        status, count = runner.read_rows(anon_headers, row_id)
        runner.check(
            "anonymous caller cannot read private rows",
            status in (401, 403) or (status == 200 and count == 0),
            f"status {status}, rows {count}",
        )
    except SupabaseError as error:
        runner.check("RLS check completed", False, str(error))
    finally:
        if row_id:
            call(
                runner.base,
                f"/rest/v1/{TABLE}?id=eq.{row_id}",
                method="DELETE",
                headers=runner.service_headers(),
            )
        runner.cleanup()

    if runner.failures:
        print(f"\nRESULT: FAIL ({len(runner.failures)} check(s)) — RLS is not enforcing ownership as written.")
        return 1
    print("\nRESULT: PASS — owner-scoped read/write held for two users in this project.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
