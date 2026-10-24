# RidgeWatch frontend

React/Vite operations UI for the RidgeWatch research prototype. It uses the FastAPI contract from `origin/feat/backend-foundation`; no live values or geometry are bundled.

## Setup

```bash
cd frontend
cp .env.example .env
pnpm install
pnpm dev
```

Set `VITE_API_BASE_URL` to the API root including `/api/v1`. `VITE_GOOGLE_MAPS_API_KEY` is optional; when absent the UI shows an honest map configuration state. If supplied, use a Google Maps JavaScript API browser key restricted by allowed web referrer. Never use `GOOGLE_MAPS_SERVER_KEY` in the frontend.

## Checks

```bash
pnpm typecheck
pnpm build
```

The current backend foundation provides no verified live providers or geometry. Start it with `RIDGEWATCH_MODE=demo` to expose its deliberately empty, visibly labelled demo catchment.
