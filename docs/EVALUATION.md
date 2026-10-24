# Risk Model Evaluation Protocol

## Purpose
Evaluate whether an experimental catchment-level flash-flood risk assessment adds value beyond simple baselines. No model is considered operationally reliable without region-specific validation and appropriate authority review.

## Stage 0 — data feasibility
Before model training, document:
- Pilot catchment geometry and provenance.
- Source coverage, units, cadence and latency.
- Historical event labels and the definition of an event.
- Number of independent events and non-event periods.
- Missingness and distribution changes.
- Whether each input would have been available at prediction time.

If labels are too sparse or inconsistent, stop supervised training and present a transparent experimental baseline.

## Baselines
Compare against at least:
1. Naive persistence or current-condition baseline.
2. A documented rainfall threshold/accumulation heuristic.
3. Logistic regression if labels permit.
4. Gradient boosting only if there is sufficient verified data.
LSTM is not the default. More complex models must demonstrate improvement on held-out events, not just a random split.

## Leakage prevention
- Split chronologically.
- Hold out complete flood events and, if feasible, separate catchments.
- Make input cut-off time explicit for every prediction.
- Never use future observations, revised/final satellite products unavailable at prediction time, post-event measurements or warning text that leaks the label.
- Group repeated windows from one event to avoid train/test contamination.
- Fit imputers, scalers and feature selection on training data only.

## Metrics
Report where supported:
- Event-level recall.
- Event-level precision.
- Precision-recall AUC for rare events.
- False alarms per catchment-day or other clearly defined operational unit.
- Lead time between first qualifying alert and event onset.
- Calibration metrics only if probability outputs are calibrated.
- Coverage of required inputs.
- Performance by catchment, season, intensity and source availability.
- Latency and end-to-end source freshness.

Always show sample counts and uncertainty. Do not choose a single accuracy number as proof of safety.

## Risk semantics
A rule-based band or model score is not a calibrated probability. Name it “experimental risk score” unless calibration is complete. Define thresholds and version them. If critical inputs are stale or missing, return insufficient_data/degraded rather than low risk.

## Safety acceptance checks
- No missing provider response is interpreted as zero rainfall.
- No stale official warning is presented as current.
- Official warnings remain separate from RidgeWatch predictions.
- No fabricated event labels or metrics.
- Any DEMO mode is visibly labelled in the UI and response.
- A model must outperform or offer a clearly described benefit over a simple baseline on held-out data before claiming predictive value.

## Reporting template
Record dataset version, geographic coverage, time period, event counts, label definition, split strategy, feature cut-off, baselines, metrics, threshold selection, missingness, latency, calibration status, known failure modes and conclusion. Include exact commands and environment used.
