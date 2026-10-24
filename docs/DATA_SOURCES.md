# Data Source Feasibility and Provenance

This document records candidate sources and the verification work required. A source is not considered integrated merely because its documentation exists.

## Candidate source matrix

### India Meteorological Department (IMD)
Reference: https://api.imd.gov.in/public/api_reference.html
Potential use: district warnings, district rainfall, nowcast, AWS/ARG observations and river-basin quantitative precipitation forecasts, according to the published API reference.
Before integration:
- Verify endpoint access and authentication from the actual deployment environment.
- Record request/response schema, status codes, rate limits, terms and uptime behaviour.
- Verify the time and geography semantics of every field.
- Store observation/issue time separately from fetch time.
- Do not scrape or bypass access controls if a supported API route is unavailable.

### NASA GPM IMERG
Reference: https://gpm.nasa.gov/data/imerg
Potential use: satellite-based precipitation context and temporal accumulation features.
Important limitation: product latency and spatial/temporal resolution may be unsuitable for minute-scale local flash-flood warnings. Early Run has been described as roughly four-hour latency; verify current product details before making claims.
Before integration:
- Choose the exact Early, Late or Final product and document its latency.
- Confirm access/authentication, download path, licence/attribution and spatial resolution.
- Never use a reprocessed Final product as if it were available at real-time prediction time.
- Track granule time, version and acquisition/processing metadata.

### Copernicus DEM GLO-30
Reference: https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM
Potential use: static elevation, slope, relief, flow accumulation and catchment terrain features.
Before integration:
- Validate the study-area coverage, resolution and licence/attribution requirements.
- Use appropriate hydrological preprocessing and verify catchment boundaries.
- Distinguish static terrain context from live flood observations.

### Gauge and river stage
Candidate routes: CWC, India-WRIS, state/local authority feeds.
Do not assume a stable open API. Determine whether public access exists for the selected catchment, including update cadence, quality, station coordinates and historical coverage. If unavailable, mark the feature missing rather than inventing gauge values.

### Soil moisture
Candidate auxiliary feature only after the exact source, spatial resolution, time cadence, access and local relevance are verified. Coarse satellite soil moisture is not local ground truth for an individual small mountain catchment.

### Historical flood events
Needed for supervised training and evaluation. Require traceable event date, location/catchment, label definition and source. Government incident reports, disaster-management records and scientific catalogues may be candidates; validate each record. News mentions alone may be too noisy for ground-truth labels.

## Source registry requirements
For each connector document:
- source name and owner
- endpoint/product and access mode
- credentials required, stored only server-side
- variable, unit and spatial/temporal resolution
- observation or issue timestamp meaning
- expected latency/update cadence
- licence/attribution and caching policy
- validated geography
- sample response fixture with sensitive data removed
- health/freshness rules
- retry/timeout policy and known gaps

## Go/no-go gate
Before calling any source LIVE:
1. Execute a real test request or documented data download.
2. Save a small non-sensitive fixture and schema test.
3. Verify timestamps, units and geographic coverage.
4. Record source latency, error behaviour and licensing.
5. Add freshness limits and explicit stale/unavailable states.
6. Link the connector to a health/status endpoint.

Until these checks pass, the UI should state “not configured” or use an unmistakably labelled DEMO fixture.
