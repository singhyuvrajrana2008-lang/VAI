import { z } from 'zod';
import {
  assessmentSchema,
  catchmentsResponseSchema,
  catchmentSchema,
  healthResponseSchema,
  historyResponseSchema,
  observationsResponseSchema,
  sourcesResponseSchema,
  warningsResponseSchema,
  type Assessment,
  type Catchment,
  type CatchmentsResponse,
  type HealthResponse,
  type HistoryResponse,
  type ObservationsResponse,
  type SourcesResponse,
  type WarningsResponse,
} from './schemas';

/**
 * Relative by default so the Vite dev proxy (and same-origin deployments) keep
 * browser requests on the page origin. Set VITE_API_BASE_URL for split hosting.
 */
export const API_BASE = (
  (import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api/v1'
).replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly code?: string,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const DEFAULT_TIMEOUT_MS = 12_000;

function normalizeDetail(body: unknown): { detail?: string; code?: string } {
  if (!body || typeof body !== 'object') return {};
  const record = body as { detail?: unknown; code?: unknown };
  if (typeof record.detail === 'string') {
    return {
      detail: record.detail,
      code: typeof record.code === 'string' ? record.code : undefined,
    };
  }
  if (Array.isArray(record.detail)) {
    const first = record.detail[0] as { msg?: unknown } | undefined;
    if (first && typeof first.msg === 'string') {
      return { detail: first.msg, code: 'validation_error' };
    }
  }
  return {};
}

async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  init?: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(
        `The RidgeWatch API did not respond within ${Math.round(timeoutMs / 1000)} seconds.`,
      );
    }
    throw new ApiError(
      'The RidgeWatch API could not be reached. Confirm the backend is running and the API base URL is correct.',
    );
  } finally {
    clearTimeout(timer);
  }

  const requestId = response.headers.get('X-Request-ID') ?? undefined;
  if (!response.ok) {
    let parsed: unknown;
    try {
      parsed = await response.json();
    } catch {
      parsed = null;
    }
    const { detail, code } = normalizeDetail(parsed);
    const fallback =
      response.status === 429
        ? 'Too many requests. Wait a moment and try again.'
        : `The API returned ${response.status}.`;
    throw new ApiError(detail ?? fallback, response.status, code, requestId);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError('The API returned a response that was not valid JSON.', response.status);
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new ApiError(
      'The API response did not match the documented RidgeWatch contract.',
      response.status,
      'schema_mismatch',
      requestId,
    );
  }
  return parsed.data;
}

export const api = {
  health: (): Promise<HealthResponse> => request('/health', healthResponseSchema),
  catchments: (): Promise<CatchmentsResponse> =>
    request('/catchments', catchmentsResponseSchema),
  catchment: (id: string): Promise<Catchment> =>
    request(`/catchments/${encodeURIComponent(id)}`, catchmentSchema),
  observations: (id: string): Promise<ObservationsResponse> =>
    request(`/catchments/${encodeURIComponent(id)}/observations`, observationsResponseSchema),
  warnings: (id: string): Promise<WarningsResponse> =>
    request(`/catchments/${encodeURIComponent(id)}/warnings`, warningsResponseSchema),
  sources: (): Promise<SourcesResponse> => request('/sources/status', sourcesResponseSchema),
  assess: (id: string): Promise<Assessment> =>
    request(`/catchments/${encodeURIComponent(id)}/assessments`, assessmentSchema, {
      method: 'POST',
      body: '{}',
    }),
  assessment: (id: string): Promise<Assessment> =>
    request(`/assessments/${encodeURIComponent(id)}`, assessmentSchema),
  history: (): Promise<HistoryResponse> => request('/history', historyResponseSchema),
};
