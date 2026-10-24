# RidgeWatch Product Requirements Document

## 1. Summary
RidgeWatch is a web-based, catchment-level flash-flood risk intelligence prototype for hilly regions. It combines verified rainfall/weather data, terrain characteristics and available hydrology/soil-wetness observations to produce a transparent experimental risk assessment. It also displays official warnings separately and records evidence behind each assessment.

This is decision support, not an operational emergency warning service. Until data coverage, event labels, model performance, false alarms and lead time have been evaluated for the pilot region, users must not rely on experimental scores for evacuation decisions.

## 2. Problem
Steep catchments can respond quickly to intense rainfall. Local gauges may be sparse, observations may be delayed, and users need an understandable view of conditions in individual catchments, the data supporting a risk assessment, and any available official warnings.

## 3. Target users
- District and local disaster-management analysts.
- Researchers and hydrology students.
- Local authority personnel reviewing conditions.
- Public-interest demonstrators evaluating multi-source environmental intelligence.

The MVP must not impersonate an official government alert service.

## 4. Product goals
- Show a map of a selected validated pilot catchment.
- Surface source-backed rainfall and environmental observations with timestamps and freshness.
- Generate an experimental risk band only when required inputs are sufficiently current and complete.
- Explain which features contributed to a risk assessment without allowing an LLM to invent facts.
- Keep official warnings visually and semantically separate from model outputs.
- Persist assessments and user subscriptions using Supabase, with access control.
- Support an explicitly labelled demonstration when live data is unavailable.
- Evaluate a baseline before claiming predictive value.

## 5. Non-goals for MVP
- National-scale operational flood forecasting.
- Certified public warnings or automatic evacuation advice.
- Claiming to predict every flash flood.
- Training an LSTM before data quality and baselines are established.
- Inventing stream gauges or simulating live telemetry without DEMO labels.
- Using Google Maps as a hydrology data source.
- Automatically sending life-safety alerts without clear source, consent, validation and appropriate governance.

## 6. Core user journeys
1. User opens the app and sees DEMO or LIVE status; they may sign in/create an account or continue in explicitly labelled demo mode.
2. An account user can sign in, register, request a password reset, complete recovery and sign out using Supabase Auth when configured.
3. Private history, subscriptions and profile preferences are available only to the authenticated owner; public/demo dashboard access does not invent a user identity.
4. User selects a catchment on the map.
5. UI fetches current observation summaries, source health and available official warnings.
4. User sees observed/forecast rainfall, timestamps, source freshness and missing-data notices.
5. If permitted by data policy, the backend returns an experimental risk assessment with reason codes and input coverage.
6. User opens evidence details to inspect data sources and calculation version.
7. User reviews separately listed official warnings and follows the official source for authoritative instructions.
8. User optionally subscribes to catchment changes and manages preferences.
9. User can distinguish live source records from demo fixtures at all times.

## 7. Functional requirements

### Map and catchments
- Display catchment geometry, labels and selection state.
- Support search/navigation, zoom, pan, legend and layer toggles.
- Show selected catchment metadata and source coverage.
- Never create decorative catchment boundaries and present them as validated geography.
- If the catchment data is demo-only, display DEMO at the map and detail level.

### Observations
- Show rainfall series and available forecast summary from configured sources.
- Include provider, units, observation/issue time, fetch time and freshness.
- Distinguish observed values from forecasts, estimates, reprocessed satellite data and missing values.
- Show explicit stale/unavailable states and source health.
- Do not aggregate incompatible units or resolutions without documented transformations.

### Risk assessment
- Start with a transparent rule-based baseline.
- Add a trained model only after the data feasibility report confirms sufficient labelled events and a valid evaluation plan.
- Return risk band/status, score semantics, model/baseline version, feature coverage, input freshness and reason codes.
- If critical inputs are missing/stale, return insufficient_data or degraded status; never coerce this to low risk.
- A numerical score is not a probability unless calibrated and documented.

### Official warnings
- Show source, issued time, valid period and coverage where available.
- Keep official warnings in their own section, distinct from RidgeWatch model outputs.
- Clearly display when no valid response was retrieved; this is not the same as an authoritative “no warning” result.

### AI explanation
- Optional Gemini integration may explain a backend-produced assessment from a bounded JSON payload.
- Never permit the LLM to modify the risk score, invent source values, create official alerts or provide unsupported evacuation instructions.
- Display the evidence and source records alongside any explanation.

### Accounts and persistence
- Implement login, sign-up, sign-out, forgot-password and password-reset screens/flows using Supabase Auth when configured.
- Use Supabase Auth for identity; never store raw passwords or invent a successful sign-in.
- Use row-level security and server-side authorization for user-specific settings, subscriptions and history.
- Persist assessment snapshots, source metadata and alert history where configured.
- Keep service-role/private keys server-side; only the Supabase URL and browser-safe anon/publishable key may be used by the frontend.
- Provide a clear Continue in Demo Mode path if Auth is not configured, and never imply demo mode has a real signed-in user or private persistence.

## 8. Non-functional requirements
- Responsive desktop-first operations console, usable on laptop/tablet.
- Explain loading, stale, unavailable, insufficient data and error states.
- Data connectors must time out gracefully and expose health/freshness.
- Use typed API schemas and automated validation.
- Preserve provenance through frontend, backend and database.
- Do not expose secrets in browser bundles or logs.
- Accessibility: don't rely on colour alone; add text labels, legends and keyboard support.
- Provide a reliable demo path independent of unverified external feeds, with explicit DEMO labels.

## 9. MVP acceptance criteria
- One catchment geometry has a documented source and validation state.
- At least one live source path has been successfully tested, or the entire workflow is clearly DEMO.
- Observation records include source and timestamps.
- Official warning and experimental risk panel are distinct.
- A missing/stale source cannot result in a falsely reassuring “low risk” state.
- Risk assessment includes input coverage, reason codes and version.
- Supabase access policies are configured and tested before storing private data.
- Model claims are limited to metrics from documented evaluation.
- README distinguishes configured services from placeholders.
- A reviewer can trace each displayed value to a provider, fixture or computation.
- Login, sign-up, password recovery and sign-out work with Supabase Auth when configured; otherwise the app clearly falls back to demo-only access without fake authentication.
- Login, sign-up, password recovery and sign-out work with Supabase Auth when configured; otherwise the app clearly falls back to demo-only access without fake authentication.

## 10. Open decisions
- Pilot catchment and verified polygon.
- Access/authentication for IMD endpoints and refresh cadence.
- Availability of historical flood event labels.
- Whether a trained ML model is justified for the initial demo.
- Whether Google Maps billing is acceptable or a MapLibre alternative is needed.
- Notification channels and consent/operational policy.

Open decisions must be settled in a short architecture decision record rather than guessed.