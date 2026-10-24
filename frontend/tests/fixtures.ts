const iso = '2026-06-15T06:00:00Z';

export const catchment = {
  id: 'demo-sector-a',
  slug: 'demo-sector-a',
  name: 'Demo sector A (synthetic)',
  region: 'Synthetic demo region — not a real location',
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [77.02, 31.88],
        [77.26, 31.88],
        [77.26, 32.04],
        [77.02, 32.04],
        [77.02, 31.88],
      ],
    ],
  },
  geometry_status: 'demo_synthetic',
  geometry_source: 'Synthetic demo rectangle; not a validated watershed boundary',
  validation_status: 'demo',
  is_demo: true,
  notes: 'Synthetic fixture.',
};

export const catchments = { items: [catchment], count: 1, is_demo: true, mode: 'demo' };

const observation = (value: number, offsetHours: number) => ({
  source_id: `demo-rainfall-${offsetHours}`,
  provider: 'RidgeWatch synthetic demo fixture',
  variable: 'rainfall',
  value,
  unit: 'mm',
  observed_at: `2026-06-15T0${5 + offsetHours}:00:00Z`,
  issued_at: null,
  fetched_at: iso,
  valid_from: null,
  valid_to: null,
  geographic_coverage: { kind: 'synthetic_demo_extent' },
  freshness: 'demo',
  source_state: 'demo',
  quality_flags: ['DEMO_FIXTURE'],
  is_demo: true,
});

const observed = [observation(9, 0), observation(26.4, 1), observation(31.2, 2)];

export const forecast = {
  ...observation(4, 3),
  source_id: 'demo-forecast-0',
  variable: 'forecast_rainfall',
  observed_at: null,
  issued_at: iso,
  valid_from: '2026-06-15T07:00:00Z',
  valid_to: '2026-06-15T08:00:00Z',
};

export const observations = {
  catchment_id: 'demo-sector-a',
  items: [...observed, forecast],
  observed,
  forecast: [forecast],
  source_state: 'demo',
  is_demo: true,
  message: 'Synthetic demo fixture values in millimetres per hour.',
  units: ['mm'],
};

export const warnings = {
  catchment_id: 'demo-sector-a',
  items: [
    {
      source_id: 'demo-warning-a-2',
      provider: 'RidgeWatch synthetic demo fixture',
      title: 'DEMO — Synthetic heavy-rain notice (not an official bulletin)',
      severity: 'demo_fixture',
      description: 'Synthetic fixture used to exercise the warning layout.',
      issued_at: '2026-06-15T01:00:00Z',
      valid_from: '2026-06-15T02:00:00Z',
      valid_to: '2026-06-15T08:00:00Z',
      geography: { name: 'Synthetic demo extent', is_demo: true },
      source_url: null,
      source_state: 'demo',
      is_demo: true,
    },
  ],
  source_state: 'demo',
  is_demo: true,
  provider_configured: false,
  message: 'No official warning provider is configured. Records are synthetic DEMO fixtures.',
};

export const warningsUnavailable = {
  catchment_id: 'demo-sector-a',
  items: [],
  source_state: 'unavailable',
  is_demo: false,
  provider_configured: false,
  message:
    'No official warning provider is configured. This response is not confirmation that no official warning exists.',
};

export const assessment = {
  assessment_id: '11111111-1111-4111-8111-111111111111',
  catchment_id: 'demo-sector-a',
  status: 'high',
  score: null,
  score_semantics: 'categorical_only_no_calibrated_index',
  model_version: 'rainfall-accumulation-baseline-v0.1',
  issued_at: iso,
  is_demo: true,
  data_coverage: {
    required_inputs: 1,
    available_inputs: 1,
    missing: [],
    stale: [],
    supporting_missing: ['river_stage', 'soil_moisture'],
  },
  reason_codes: ['RAINFALL_3H_AT_OR_ABOVE_60MM', 'DEMO_FIXTURE_INPUTS'],
  inputs: [
    {
      variable: 'rainfall',
      label: 'Observed rainfall',
      value: 31.2,
      unit: 'mm',
      provider: 'RidgeWatch synthetic demo fixture',
      source_id: 'demo-rainfall-2',
      observed_at: iso,
      source_state: 'demo',
      included: true,
      reason: 'DEMO_FIXTURE_INPUT',
    },
  ],
  sources: observed,
  warnings: [],
  persisted: false,
  persistence: 'memory',
  disclaimer:
    'Experimental research output. Not an official warning, forecast or evacuation instruction.',
};

export const assessmentsList = {
  items: [assessment],
  count: 1,
  persistence: 'memory',
  scope: 'api_process_not_user_owned',
  is_demo: true,
  message:
    'These records live in this API process only. They are not user-owned history, are not private, and disappear when the API restarts.',
};

const source = (
  capability: string,
  label: string,
  state: string,
  verification: string,
  message: string,
  demo: boolean,
) => ({
  capability,
  label,
  provider: demo ? 'RidgeWatch synthetic demo fixture' : 'No verified provider configured',
  configured: false,
  state,
  observation_or_issue_time: demo ? iso : null,
  fetched_at: iso,
  units: ['mm'],
  geographic_coverage: {},
  freshness: demo ? 'demo' : 'unknown',
  quality_flags: demo ? ['DEMO_FIXTURE'] : ['NO_VERIFIED_PROVIDER'],
  is_demo: demo,
  message,
  verification,
});

export const sources = {
  items: [
    source('rainfall', 'Observed rainfall', 'demo', 'demo_fixture', 'Synthetic demo fixture only.', true),
    source(
      'official_warnings',
      'Official warnings',
      'unavailable',
      'unconfigured',
      'No IMD/CWC warning feed is configured.',
      false,
    ),
    source(
      'persistence',
      'Database persistence',
      'unavailable',
      'unconfigured',
      'Supabase is not configured.',
      false,
    ),
  ],
  is_demo: true,
  mode: 'demo',
  checked_at: iso,
};

export const health = {
  status: 'ok',
  service: 'RidgeWatch API',
  version: '0.2.0',
  environment: 'test',
  is_demo: true,
  persistence: 'unavailable',
  authentication: 'unavailable',
  checked_at: iso,
  config: {
    demo_mode: true,
    demo_fixtures: true,
    persistence: 'unavailable',
    authentication: 'unavailable',
    maps_provider: 'frontend_configured_at_build_time',
    external_sources: { rainfall: 'unconfigured' },
  },
};

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
