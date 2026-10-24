#!/usr/bin/env python3
"""RidgeWatch configuration doctor.

Reports which variables are present or missing. It never prints a value, never
writes an env file and never claims an integration is verified: presence is not
connectivity, and connectivity is not a verified data source.

Usage:
    python scripts/check_env.py
    python scripts/check_env.py --check-api
    python scripts/check_env.py --strict-live
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

FRONTEND_FILE = ROOT / "frontend" / ".env.local"
BACKEND_FILE = ROOT / "backend" / ".env"
ROOT_FILE = ROOT / ".env"

FRONTEND_VARS = (
    "VITE_API_BASE_URL",
    "VITE_GOOGLE_MAPS_API_KEY",
    "VITE_SUPABASE_URL",
    "VITE_SUPABASE_ANON_KEY",
)
BACKEND_VARS = (
    "RIDGEWATCH_MODE",
    "CORS_ORIGINS",
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
)
FORBIDDEN_FRONTEND_VARS = ("VITE_SUPABASE_SERVICE_ROLE_KEY", "VITE_SUPABASE_SERVICE_KEY")


def parse_env_file(path: Path) -> dict[str, str]:
    """Read simple KEY=VALUE lines. Comments and blank lines are ignored."""
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
    for path in (ROOT_FILE, BACKEND_FILE, FRONTEND_FILE):
        merged.update(parse_env_file(path))
    merged.update(os.environ)
    return merged


def present(config: dict[str, str], name: str) -> bool:
    return bool(config.get(name, "").strip())


def mark(ok: bool) -> str:
    return "SET    " if ok else "MISSING"


def render(title: str, rows: list[tuple[str, bool, str]]) -> str:
    width = max(len(name) for name, _, _ in rows) if rows else 10
    lines = [title, "-" * len(title)]
    for name, ok, note in rows:
        lines.append(f"  {name:<{width}}  {mark(ok)}  {note}")
    return "\n".join(lines)


def check_api(base_url: str) -> int:
    url = base_url.rstrip("/") + "/health"
    try:
        with urllib.request.urlopen(url, timeout=5) as response:  # noqa: S310 - configured URL
            payload = json.loads(response.read().decode("utf-8"))
        print(f"\nAPI probe: reachable at {base_url}")
        print(
            "  status={status} version={version} demo={is_demo} persistence={persistence} "
            "auth={authentication}".format(
                status=payload.get("status"),
                version=payload.get("version"),
                is_demo=payload.get("is_demo"),
                persistence=payload.get("persistence"),
                authentication=payload.get("authentication"),
            )
        )
        return 0
    except urllib.error.URLError as error:
        print(f"\nAPI probe: NOT reachable at {base_url} ({error.reason})")
        return 1
    except (ValueError, TimeoutError) as error:
        print(f"\nAPI probe: invalid response from {base_url} ({error})")
        return 1


def main() -> int:
    parser = argparse.ArgumentParser(description="RidgeWatch configuration doctor")
    parser.add_argument("--check-api", action="store_true", help="probe a running API health endpoint")
    parser.add_argument(
        "--strict-live",
        action="store_true",
        help="exit non-zero when live mode is requested without persistence credentials",
    )
    args = parser.parse_args()

    config = load_config()
    mode = config.get("RIDGEWATCH_MODE", "demo").strip() or "demo"
    demo = mode != "live"

    print("RidgeWatch configuration doctor")
    print("=" * 32)
    print("No secret values are printed. SET means a non-empty value exists.\n")

    frontend_notes = {
        "VITE_API_BASE_URL": "optional: defaults to /api/v1",
        "VITE_GOOGLE_MAPS_API_KEY": "optional: schematic fallback",
        "VITE_SUPABASE_URL": "optional: required for auth",
        "VITE_SUPABASE_ANON_KEY": "optional: required for auth",
    }
    backend_notes = {
        "RIDGEWATCH_MODE": "optional: defaults to demo",
        "CORS_ORIGINS": "optional: localhost defaults",
        "SUPABASE_URL": "optional: required for persistence",
        "SUPABASE_ANON_KEY": "optional: auth indicator",
        "SUPABASE_SERVICE_ROLE_KEY": "optional server-only secret",
    }
    print(
        render(
            "Frontend (frontend/.env.local)",
            [(name, present(config, name), frontend_notes[name]) for name in FRONTEND_VARS],
        )
    )
    print()
    print(
        render(
            "Backend (backend/.env)",
            [(name, present(config, name), backend_notes[name]) for name in BACKEND_VARS],
        )
    )

    leaked = [name for name in FORBIDDEN_FRONTEND_VARS if present(config, name)]
    print()
    if leaked:
        print("DANGEROUS: service-role style variables found with a VITE_ prefix:")
        for name in leaked:
            print(f"  - {name} must be removed from the frontend configuration.")
    else:
        print("Frontend secret check: no service-role variable is exposed with a VITE_ prefix.")

    auth = present(config, "VITE_SUPABASE_URL") and present(config, "VITE_SUPABASE_ANON_KEY")
    persistence = present(config, "SUPABASE_URL") and present(config, "SUPABASE_SERVICE_ROLE_KEY")
    maps = present(config, "VITE_GOOGLE_MAPS_API_KEY")

    print("\nDerived status")
    print("-" * 14)
    print(f"  Mode                    {'DEMO (synthetic fixtures, labelled)' if demo else 'LIVE (no providers verified)'}")
    print(f"  Map basemap             {'CONFIGURED (verify key restrictions in Google Cloud)' if maps else 'NOT CONFIGURED (schematic fallback)'}")
    print(f"  Supabase Auth           {'CONFIGURED (sign-in not verified by this script)' if auth else 'NOT CONFIGURED (demo access only)'}")
    print(f"  Supabase persistence    {'CREDENTIALS PRESENT (backend wiring not verified)' if persistence else 'NOT CONFIGURED (memory only)'}")
    print("  External data sources   0 configured, 0 verified. See docs/DATA_FEASIBILITY_REPORT.md.")

    print("\nRun order: python scripts/check_env.py --check-api, then open http://localhost:3000")

    status = 0
    if args.check_api:
        base = config.get("VITE_API_BASE_URL", "http://localhost:8000/api/v1")
        if base.startswith("/"):
            base = "http://localhost:8000" + base
        status = check_api(base)

    if args.strict_live and not demo and not persistence:
        print("\nSTRICT LIVE: live mode requires Supabase persistence credentials.")
        status = 1
    return status


if __name__ == "__main__":
    sys.exit(main())
