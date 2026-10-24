import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError } from '../src/lib/api';

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('api client', () => {
  it('returns typed data for a valid response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        items: [],
        count: 0,
        is_demo: true,
        mode: 'demo',
        checked_at: '2026-06-15T06:00:00Z',
        is_demo_unused: false,
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const result = await api.catchments();
    expect(result.mode).toBe('demo');
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('surfaces the API detail and request id on failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(
          { detail: 'Catchment not found in the configured registry.', code: 'not_found' },
          404,
          { 'X-Request-ID': 'req-42' },
        ),
      ),
    );
    await expect(api.catchment('nope')).rejects.toMatchObject({
      message: 'Catchment not found in the configured registry.',
      status: 404,
      requestId: 'req-42',
    });
  });

  it('normalizes rate limits and validation errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, 429)));
    await expect(api.sources()).rejects.toMatchObject({
      status: 429,
      message: expect.stringContaining('Too many requests'),
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({ detail: [{ msg: 'field required' }] }, 422),
      ),
    );
    await expect(api.sources()).rejects.toMatchObject({
      status: 422,
      message: 'field required',
      code: 'validation_error',
    });
  });

  it('rejects response shapes that do not match the contract', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ unexpected: true })));
    await expect(api.sources()).rejects.toMatchObject({
      code: 'schema_mismatch',
    });
  });

  it('reports invalid JSON and network failures safely', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('<html>oops</html>', { status: 200 })),
    );
    await expect(api.sources()).rejects.toMatchObject({
      message: expect.stringContaining('not valid JSON'),
    });

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const error = await api.sources().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).message).toContain('could not be reached');
  });

  it('sends a POST body for assessments and encodes identifiers', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        {
          assessment_id: 'a1',
          catchment_id: 'demo-sector-a',
          status: 'low',
          score: null,
          score_semantics: 'categorical_only_no_calibrated_index',
          model_version: 'rainfall-accumulation-baseline-v0.1',
          issued_at: '2026-06-15T06:00:00Z',
          is_demo: true,
          data_coverage: {
            required_inputs: 1,
            available_inputs: 1,
            missing: [],
            stale: [],
            supporting_missing: [],
          },
          reason_codes: ['RAINFALL_3H_BELOW_25MM'],
          inputs: [],
          sources: [],
          warnings: [],
          persisted: false,
          persistence: 'memory',
          disclaimer: 'Experimental research output.',
        },
        200,
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const result = await api.assess('demo sector/a');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/catchments/demo%20sector%2Fa/assessments');
    expect(init.method).toBe('POST');
    expect(init.body).toBe('{}');
    expect(result.status).toBe('low');
  });
});

describe('authenticated history requests', () => {
  it('sends the Supabase access token as a bearer header', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ items: [], count: 0, is_demo: false, persistence: 'supabase' }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const result = await api.history('access-token-123');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url.endsWith('/history')).toBe(true);
    expect((init.headers as Record<string, string>).Authorization).toBe(
      'Bearer access-token-123',
    );
    expect(result.persistence).toBe('supabase');
  });

  it('does not send an Authorization header without a token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ items: [], count: 0, is_demo: true, persistence: 'memory' }),
    );
    vi.stubGlobal('fetch', fetchMock);
    await api.history();
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it('forwards a token when requesting a persisted assessment', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        assessment_id: 'a1',
        catchment_id: 'demo-sector-a',
        status: 'low',
        score: null,
        score_semantics: 'categorical_only_no_calibrated_index',
        model_version: 'rainfall-accumulation-baseline-v0.1',
        issued_at: '2026-06-15T06:00:00Z',
        is_demo: true,
        data_coverage: {
          required_inputs: 1,
          available_inputs: 1,
          missing: [],
          stale: [],
          supporting_missing: [],
        },
        reason_codes: [],
        inputs: [],
        sources: [],
        warnings: [],
        persisted: true,
        persistence: 'supabase',
        disclaimer: 'Experimental research output.',
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    await api.assess('demo-sector-a', 'token-9');
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer token-9');
    expect(init.method).toBe('POST');
  });
});
