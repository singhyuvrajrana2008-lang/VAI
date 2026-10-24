# Visual Refinement Prompt — Avoid Repetitive AI UI

Refine the existing RidgeWatch interface, not the entire application. Follow docs/PRD.md and prompts/01-figma-design.md.

The current interface must not resemble a generic AI dashboard made from repeated rounded cards.

Required visual corrections:
- Archivo headings, IBM Plex Sans body text, IBM Plex Mono technical labels/timestamps.
- Warm chalk canvas and basalt/pine colour system; no default blue-purple gradient.
- Map dominates the main dashboard.
- Every page has a distinct composition: map console, rainfall timeline, chronological warning log, source-health matrix, evidence report or settings form.
- Remove duplicate KPI cards and generic placeholder text.
- Official warning and experimental model output use distinct labels and hierarchy.
- Show observed time, fetch time, freshness, data coverage and DEMO/LIVE status.
- Use text plus icon, not colour alone, for statuses.
- Implement loading, empty, stale, unavailable, partial-data and error states.
- No fake gauges, fabricated risk scores or decorative boundaries masquerading as actual data.
- Preserve working backend connections and navigation.

Submit a small focused diff and explain important choices. Do not rebuild the product from scratch.
