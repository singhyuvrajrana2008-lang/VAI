# Risk Model Evaluation Protocol

## Current implementation status (24 October 2026)

**No model has been trained and no metric has been computed.** The only implemented path is the deterministic rainfall-accumulation baseline v0.1, documented below in §"Implemented baseline v0.1".

- Historical event labels: **none available**. The supervised-training gate is therefore closed.
- Prediction horizon, event definition and feature cut-off: **not yet defined** (requires labels and authority input).
- Evaluation metrics reported by the application: **none**. Precision, recall, PR-AUC, false alarms per catchment-day, lead time and calibration are all absent by design.
- Thresholds in the baseline are developer-set illustrations, not validated local thresholds.
- No trained model is used for any output, so there is no leakage risk from post-event products in the current build. Any future training must satisfy the rules in this document.

This section must be replaced with measured results only when a valid, documented evaluation exists.

## Implemented baseline v0.1

Inputs: observed hourly rainfall (required), forecast rainfall / river stage / soil moisture (tracked as supporting, currently unavailable).

Procedure: find the latest contiguous 3-hour window of observed rainfall; gaps break the window and are never zero-filled; sum in millimetres; map to a band using ≥100 mm `very_high`, ≥60 mm `high`, ≥25 mm `moderate`, else `low`. Missing rainfall → `insufficient_data`; stale rainfall → `insufficient_data`; incomplete window → `degraded`. The numeric `score` is always `null` with semantics `categorical_only_no_calibrated_index`.

This baseline has **not** been compared with persistence, gauge thresholds or climatology on held-out events, because no verified event labels exist. Calling its output "skilful" would be unsupported.

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
