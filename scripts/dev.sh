#!/usr/bin/env bash
# RidgeWatch local development starter (macOS/Linux).
# Starts the FastAPI backend and the Vite frontend, waits for readiness and
# forwards logs. Never writes or overwrites an env file.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"
API_PORT="${API_PORT:-8000}"
WEB_PORT="${WEB_PORT:-3000}"
MODE="${RIDGEWATCH_MODE:-demo}"

cleanup() {
  if [[ -n "${API_PID:-}" ]] && kill -0 "$API_PID" 2>/dev/null; then
    kill "$API_PID" 2>/dev/null || true
  fi
  if [[ -n "${WEB_PID:-}" ]] && kill -0 "$WEB_PID" 2>/dev/null; then
    kill "$WEB_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

if [[ ! -d "$BACKEND/.venv" ]]; then
  echo "Creating backend virtual environment…"
  python3 -m venv "$BACKEND/.venv"
fi
# shellcheck disable=SC1091
source "$BACKEND/.venv/bin/activate"
python -m pip install -q -r "$BACKEND/requirements.txt"

if [[ ! -d "$FRONTEND/node_modules" ]]; then
  echo "Installing frontend dependencies…"
  (cd "$FRONTEND" && npm install --no-audit --no-fund)
fi

python "$ROOT/scripts/check_env.py" --check-api || true

echo
echo "Starting API on http://127.0.0.1:$API_PORT (mode=$MODE)"
(
  cd "$BACKEND"
  exec env RIDGEWATCH_MODE="$MODE" RIDGEWATCH_ENVIRONMENT=local \
    uvicorn app.main:app --host 127.0.0.1 --port "$API_PORT"
) &
API_PID=$!

for attempt in $(seq 1 40); do
  if curl -fsS "http://127.0.0.1:$API_PORT/api/v1/health" >/dev/null 2>&1; then
    echo "API ready after ${attempt} attempt(s)."
    break
  fi
  if ! kill -0 "$API_PID" 2>/dev/null; then
    echo "API process exited during startup. Check the log above." >&2
    exit 1
  fi
  sleep 0.5
done

if ! curl -fsS "http://127.0.0.1:$API_PORT/api/v1/health" >/dev/null 2>&1; then
  echo "API did not become ready. Stop and inspect the output above." >&2
  exit 1
fi

echo "Starting web app on http://localhost:$WEB_PORT"
(
  cd "$FRONTEND"
  exec npm run dev -- --port "$WEB_PORT"
) &
WEB_PID=$!

wait "$WEB_PID"
