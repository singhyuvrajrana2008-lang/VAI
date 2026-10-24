# Figma Make Prompt — RidgeWatch Visual Design

You are the product designer for RidgeWatch, a catchment-level flash-flood risk decision-support prototype for hilly regions. Read docs/PRD.md and docs/ARCHITECTURE.md before designing.

## Design mandate
Do not generate a generic AI dashboard. Do not repeat the same grid of rounded cards on every page. Use distinct information architecture, layout density and typography per page.

## Visual direction
Create a field-operations and scientific-monitoring interface inspired by topographic maps, field notebooks and hydrology instruments:
- Warm chalk/off-white canvas.
- Basalt/charcoal text.
- Pine/forest green as the main UI accent.
- Burnt amber for caution.
- Deep red reserved for urgent source-backed official warnings.
- No generic blue-to-purple AI gradients, no glowing cards, no excessive glassmorphism.
Typography:
- Archivo for headings.
- IBM Plex Sans for body.
- IBM Plex Mono for timestamps, source identifiers and technical readouts.
Vary font size and weight intentionally. Do not render every label in the same size or colour. Ensure contrast and accessible colour use.

## Unique layouts, not repeated templates
- Dashboard: large geographic map as the dominant canvas; narrow operational sidebar; compact rainfall sparkline and a single status strip.
- Catchment detail: map plus elevation/terrain profile and rainfall timeline.
- Official warnings: chronological alert log with source and validity times.
- Source health: matrix/table showing provider, last fetch, observation age, coverage and status.
- Assessment detail: evidence-focused layout with feature contributions/reason codes and data-quality state.
- Methodology/evaluation: editorial report layout with plots and limitations, not KPI cards.
- Settings: plain, quiet form layout.

## Required screens
1. Overview/dashboard.
2. Catchment selection/detail.
3. Rainfall and observation timeline.
4. Official warning feed.
5. Experimental risk assessment with visible “EXPERIMENTAL” label.
6. Source health/data quality.
7. Assessment history/evidence.
8. Methodology/evaluation.
9. Settings and subscriptions.
10. DEMO state and no-data/unavailable states.

## Map requirements
Use Google Maps for map display and interaction only. Show validated catchment geometry, selected area, layer legend and data coverage. Do not draw decorative fake catchments or use fake gauges to look convincing. Distinguish actual layers from demo layers.

## Text and colour variation
- Every screen must have a distinct page heading and explanatory copy.
- Use Archivo, IBM Plex Sans and IBM Plex Mono consistently but at varied sizes and roles.
- Do not reuse generic placeholder paragraphs.
- Do not make all text grey. Use high-contrast primary text, secondary metadata and purposeful colour.
- Show observed time, fetched time and data freshness near values.
- Use a text label and icon in addition to colour for status.
- Official warnings must be visually separate from model-generated assessment.
- Use realistic layout variation and meaningful whitespace rather than repeated card grids.

## Interaction states
Design loading, empty, stale, partial-data, error, DEMO and LIVE states. A no-response state is not a “no warning” state.

## Handoff requirements
Create a usable design system with named tokens for colours, fonts, spacing, radii and component states. Document component variants and responsive breakpoints. Provide a page-by-page implementation note in the shared repo, preferably docs/FIGMA_HANDOFF.md. Do not commit images/assets with unknown licences.
