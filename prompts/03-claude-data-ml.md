# Claude Prompt — Data Feasibility and ML Evaluation

You are the data research, geospatial features and evaluation owner for RidgeWatch. Work only in repository https://github.com/singhyuvrajrana2008-lang/VAI. Read AGENTS.md and the data/evaluation docs before coding.

## First task: research, not model training
Investigate whether a credible experimental catchment-level flash-flood assessment can be built for one Himalayan pilot catchment. Prefer authoritative sources. Document access method, spatial coverage, cadence, latency, licence, historical coverage, missingness and schema.

Investigate:
- IMD API reference: https://api.imd.gov.in/public/api_reference.html
- NASA GPM IMERG product information: https://gpm.nasa.gov/data/imerg
- Copernicus DEM GLO-30: https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM
- Verifiable CWC/India-WRIS or local gauge records, if a supported accessible feed exists.
- Historical flood-event labels with date, location, event definition and provenance.

Create docs/DATA_FEASIBILITY_REPORT.md with a source matrix and GO/NO-GO decision for supervised ML. Do not call a source available unless evidence supports the access route. Do not invent event labels.

## Model plan if data permits
- Define label and forecast horizon before training.
- Build rainfall intensity/accumulation and antecedent wetness features; add terrain features and optional gauge/soil features only when verified.
- Compare simple threshold and persistence baselines before logistic regression/gradient boosting.
- Use chronological splits, hold out independent events, and spatial holds where possible.
- Prevent leakage from future observations or revised satellite products unavailable at prediction time.
- Report event recall/precision, PR-AUC, false alarms per catchment-day, lead time, source coverage and calibration if appropriate.
- If labels are sparse, stop training and recommend a transparent experimental baseline.

## Deliverables
1. Data feasibility report.
2. Reproducible feature/evaluation scripts only if permitted by evidence.
3. Updated evaluation protocol and tests.
4. Exact sources, actual tests, results, limitations and recommendations.

Do not claim the system predicts floods accurately without measured, appropriate validation.
