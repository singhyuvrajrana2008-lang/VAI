import { z } from 'zod';

export const sourceStateSchema = z.enum([
  'live',
  'stale',
  'unavailable',
  'error',
  'demo',
  'partial',
]);

export const assessmentStatusSchema = z.enum([
  'low',
  'moderate',
  'high',
  'very_high',
  'insufficient_data',
  'degraded',
  'unavailable',
]);

const timestamp = z.string().nullable();

export const catchmentSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  region: z.string().nullable(),
  geometry: z.record(z.unknown()).nullable(),
  geometry_status: z.string(),
  geometry_source: z.string().nullable(),
  validation_status: z.string(),
  is_demo: z.boolean(),
  notes: z.string().nullable(),
});

export const catchmentsResponseSchema = z.object({
  items: z.array(catchmentSchema),
  count: z.number(),
  is_demo: z.boolean(),
  mode: z.string(),
});

export const observationSchema = z.object({
  source_id: z.string(),
  provider: z.string(),
  variable: z.string(),
  value: z.union([z.number(), z.string()]).nullable(),
  unit: z.string().nullable(),
  observed_at: timestamp,
  issued_at: timestamp,
  fetched_at: z.string(),
  valid_from: timestamp,
  valid_to: timestamp,
  geographic_coverage: z.record(z.unknown()),
  freshness: z.string(),
  source_state: sourceStateSchema,
  quality_flags: z.array(z.string()),
  is_demo: z.boolean(),
});

export const observationsResponseSchema = z.object({
  catchment_id: z.string(),
  items: z.array(observationSchema),
  observed: z.array(observationSchema),
  forecast: z.array(observationSchema),
  source_state: sourceStateSchema,
  is_demo: z.boolean(),
  message: z.string(),
  units: z.array(z.string()),
});

export const warningSchema = z.object({
  source_id: z.string(),
  provider: z.string(),
  title: z.string(),
  severity: z.string().nullable(),
  description: z.string().nullable(),
  issued_at: timestamp,
  valid_from: timestamp,
  valid_to: timestamp,
  geography: z.record(z.unknown()),
  source_url: z.string().nullable(),
  source_state: sourceStateSchema,
  is_demo: z.boolean(),
});

export const warningsResponseSchema = z.object({
  catchment_id: z.string(),
  items: z.array(warningSchema),
  source_state: sourceStateSchema,
  is_demo: z.boolean(),
  provider_configured: z.boolean(),
  message: z.string(),
});

export const sourceStatusSchema = z.object({
  capability: z.string(),
  label: z.string(),
  provider: z.string(),
  configured: z.boolean(),
  state: sourceStateSchema,
  observation_or_issue_time: timestamp,
  fetched_at: timestamp,
  units: z.array(z.string()),
  geographic_coverage: z.record(z.unknown()),
  freshness: z.string(),
  quality_flags: z.array(z.string()),
  is_demo: z.boolean(),
  message: z.string(),
  verification: z.string(),
});

export const sourcesResponseSchema = z.object({
  items: z.array(sourceStatusSchema),
  is_demo: z.boolean(),
  mode: z.string(),
  checked_at: z.string(),
});

export const dataCoverageSchema = z.object({
  required_inputs: z.number(),
  available_inputs: z.number(),
  missing: z.array(z.string()),
  stale: z.array(z.string()),
  supporting_missing: z.array(z.string()),
});

export const assessmentInputSchema = z.object({
  variable: z.string(),
  label: z.string(),
  value: z.union([z.number(), z.string()]).nullable(),
  unit: z.string().nullable(),
  provider: z.string().nullable(),
  source_id: z.string().nullable(),
  observed_at: timestamp,
  source_state: z.string().nullable(),
  included: z.boolean(),
  reason: z.string(),
});

export const assessmentSchema = z.object({
  assessment_id: z.string(),
  catchment_id: z.string(),
  status: assessmentStatusSchema,
  score: z.number().nullable(),
  score_semantics: z.string(),
  model_version: z.string(),
  issued_at: z.string(),
  is_demo: z.boolean(),
  data_coverage: dataCoverageSchema,
  reason_codes: z.array(z.string()),
  inputs: z.array(assessmentInputSchema),
  sources: z.array(observationSchema),
  warnings: z.array(warningSchema),
  persisted: z.boolean(),
  persistence: z.string(),
  disclaimer: z.string(),
});

export const historyResponseSchema = z.object({
  items: z.array(assessmentSchema),
  count: z.number(),
  is_demo: z.boolean(),
  persistence: z.string(),
});

export const healthResponseSchema = z.object({
  status: z.string(),
  service: z.string(),
  version: z.string(),
  environment: z.string(),
  is_demo: z.boolean(),
  persistence: z.string(),
  authentication: z.string(),
  checked_at: z.string(),
  config: z.object({
    demo_mode: z.boolean(),
    demo_fixtures: z.boolean(),
    persistence: z.string(),
    authentication: z.string(),
    maps_provider: z.string(),
    external_sources: z.record(z.string()),
  }),
});

export type Catchment = z.infer<typeof catchmentSchema>;
export type CatchmentsResponse = z.infer<typeof catchmentsResponseSchema>;
export type Observation = z.infer<typeof observationSchema>;
export type ObservationsResponse = z.infer<typeof observationsResponseSchema>;
export type WarningItem = z.infer<typeof warningSchema>;
export type WarningsResponse = z.infer<typeof warningsResponseSchema>;
export type SourceStatus = z.infer<typeof sourceStatusSchema>;
export type SourcesResponse = z.infer<typeof sourcesResponseSchema>;
export type Assessment = z.infer<typeof assessmentSchema>;
export type HistoryResponse = z.infer<typeof historyResponseSchema>;
export type AssessmentInput = z.infer<typeof assessmentInputSchema>;
export type HealthResponse = z.infer<typeof healthResponseSchema>;
export type SourceState = z.infer<typeof sourceStateSchema>;
export type AssessmentStatus = z.infer<typeof assessmentStatusSchema>;
