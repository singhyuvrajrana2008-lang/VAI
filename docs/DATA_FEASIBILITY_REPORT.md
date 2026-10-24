# Data Feasibility Report

Last reviewed: 24 October 2026. This report separates **documentation available** from **connector tested**. Nothing here is an integration claim.

## How to read the source states

| State | Meaning |
| --- | --- |
| **VERIFIED LIVE** | A real request returned data in this environment, with recorded units, timings and coverage. |
| **PARTIAL** | Some capability works; coverage, latency, history or an important field is missing. |
| **DEMO** | Deterministic synthetic fixture, labelled `is_demo=true`. Not a provider response. |
| **UNAVAILABLE** | No connector and no credentials; the API reports the capability unavailable. |
| **NOT TESTED** | Documentation exists, but no request was made (usually because credentials are required or access terms are unresolved). |

**Current totals:** 0 VERIFIED LIVE, 0 PARTIAL, 3 DEMO capabilities (rainfall, forecast, warnings), 4 UNAVAILABLE, 2 NOT TESTED.

## Evidence gathered in this pass

| Check | Result |
| --- | --- |
| `GET https://api.imd.gov.in/public/api_reference.html` | HTTP 200 (documentation page only; no API request attempted) |
| `GET https://gpm.nasa.gov/data/imerg` | HTTP 200; product page states IMERG Early Run lowest latency is 4 hours, half-hourly data available, values may be mm/hr **or** mm depending on product, and NASA Earthdata / PPS registration is required for downloads |
| `GET https://dataspace.copernicus.eu/.../COP-DEM` | HTTP 200 (collection description reachable) |
| `GET https://indiawris.gov.in/` | No response within 12 s from this environment (`000`) — access undetermined |

No credentialed request was made to any provider. No endpoint URL was guessed. No API response was fabricated.

## Connector matrix

### IMD (India Meteorological Department)

| Field | Value |
| --- | --- |
| Product / endpoint | Public API reference at `https://api.imd.gov.in/public/api_reference.html`; specific product endpoints not selected |
| Intended variable | District rainfall, nowcast, warnings, AWS/ARG observations (per published reference) |
| Access | Authentication requirements undocumented in this repo; must be confirmed with IMD |
| Units | Unknown until a real response is inspected |
| Resolution / coverage | District / station products; not catchment-specific |
| Latency | Not recorded; nowcast and observation products differ |
| Licence / terms | Must be confirmed before use or redistribution |
| State | **NOT TESTED** |
| Why not | No credentials and no confirmed access terms; scraping was not attempted |
| Blocker to unblock | Written access confirmation, endpoint + auth details, quota, attribution terms, and a recorded sample response |

### NASA GPM IMERG

| Field | Value |
| --- | --- |
| Product / endpoint | IMERG Early / Late / Final (GPM data directory; PPS download requires registration) |
| Intended variable | Satellite precipitation rate / accumulation |
| Access | NASA Earthdata + PPS registration required (documented on the IMERG page) |
| Units | Page explicitly notes products use either **mm/hr** or **mm** — connector must read the product definition rather than infer from a filename |
| Resolution | Half-hourly / 3-hourly / daily products; 0.1° grid (verify per product before relying on it) |
| Latency | Early Run ≈ 4 hours per provider documentation. **This is not real-time.** |
| Licence / attribution | NASA open data, subject to NASA usage policy; confirm attribution text |
| State | **NOT TESTED** |
| Why not | No Earthdata credentials; adding a 4-hour-latency product would not support minute-scale local warning claims |
| Constraint | Must never be presented as a catchment gauge or as a real-time observation. Final Run is reprocessed and unsuitable as a proxy for data available at prediction time. |

### Copernicus DEM GLO-30

| Field | Value |
| --- | --- |
| Product / endpoint | Copernicus DEM collection description (dataspace.copernicus.eu) |
| Intended variable | Static elevation → slope, relief, flow accumulation (after hydrological preprocessing) |
| Access | Copernicus Data Space account; licence and attribution per product terms |
| Resolution | 30 m global DSM (verify the exact product variant used) |
| Timing | Static dataset — no observation time, must never be labelled live weather |
| State | **NOT TESTED / UNAVAILABLE as a feature source** |
| Constraint | A DEM alone does not produce a **validated** watershed boundary. Deriving geometry requires documented hydrological processing, outlet selection and independent validation. Until that exists, RidgeWatch refuses to draw a "validated" polygon. |

### CWC / India-WRIS / state gauges

| Field | Value |
| --- | --- |
| Product / endpoint | None confirmed. `https://indiawris.gov.in/` did not respond from this environment. |
| Intended variable | River stage / discharge at a station |
| Access | Unknown; no public, stable, documented API confirmed |
| State | **UNAVAILABLE / NOT TESTED** |
| Constraint | Station coordinates, datum, update cadence, quality flags and historical coverage all unknown. River stage remains a **missing** assessment input rather than an invented value. |

### Soil moisture

| Field | Value |
| --- | --- |
| Product / endpoint | Not selected |
| Intended variable | Root-zone or surface soil moisture |
| Constraint | Coarse satellite products are not local ground truth for a small mountain catchment; resolution and latency must be documented first |
| State | **UNAVAILABLE** |

### Historical flood-event labels

| Field | Value |
| --- | --- |
| Requirement | Traceable event date, catchment/location, event definition, source document |
| Candidates | Government incident/disaster-management reports, scientific catalogues |
| Constraint | News mentions alone are too noisy for ground truth |
| State | **NOT AVAILABLE** — this is the gate that blocks supervised training |

### IMD / CWC official warnings

| Field | Value |
| --- | --- |
| Product / endpoint | None configured |
| State | **UNAVAILABLE** |
| Constraint | The API must return `source_state=unavailable` with an explicit message. An empty list is never presented as "no warning exists". Demo warning fixtures are labelled "not an official bulletin". |

## Demo fixtures (clearly not data)

| Capability | Fixture | Labelling |
| --- | --- | --- |
| Catchments | Two synthetic rectangles near lon 77.0–77.5, lat 31.8–32.0 | `geometry_status=demo_synthetic`, `validation_status=demo`, text states "not a validated watershed boundary" |
| Rainfall | 24 hourly values per catchment, fixed anchor `2026-06-15T06:00Z` | `is_demo=true`, `source_state=demo`, `quality_flags` includes `DEMO_FIXTURE` and `NOT_OBSERVED` |
| Forecast | 6 hourly values after the anchor | `NOT_A_FORECAST` flag, separated from observations in the API response |
| Warnings | 1–2 synthetic notices per catchment | Title begins `DEMO —`, provider `RidgeWatch synthetic demo fixture`, "not an official bulletin" |

Demo timestamps are constants, never "now", so fixtures cannot drift into looking current. Demo records bypass wall-clock freshness for eligibility **only because they are labelled demo**, and the assessment keeps `is_demo=true`.

## Verification limits

- Browser rendering is now verified: headless Chromium (`scripts/browser_qa.mjs`) walked 17 routes at 1440 px and 360 px, confirmed document titles, `<h1>`s, genuine absence of horizontal page scrolling, a visible keyboard focus ring, the end-to-end assessment flow through to the evidence report, and recoverable error panels under a simulated API outage and API 500 — 0 defects after three fixes. It runs against local demo data only; no provider-backed page could be exercised because no provider is configured. Live Supabase sign-in is still unverified (no credentials), as are any flows that require paid provider access.
- Supabase Auth and persistence were implemented against documented endpoints but **not executed against a live project**. The gateway is tested only with mocked HTTP. Do not call it verified.
- No deployment was performed.
- `indiawris.gov.in` failure may be a network restriction of this environment rather than the service being down.

## What unlocks each capability

1. **Provider access confirmed** (credentials, quota, licence, attribution).
2. **Connector implemented** with timeouts, bounded retries, caching consistent with source cadence, and preserved native units/timestamps.
3. **Real response recorded** with request time, unit, coverage and latency in this document.
4. **State updated** to VERIFIED LIVE or PARTIAL, and the frontend/README changed together.

Until all four steps are complete, the capability stays `unavailable` and the interface says so.
