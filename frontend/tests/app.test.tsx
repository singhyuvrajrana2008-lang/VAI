// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryRouter } from 'react-router';
import type { ReactElement } from 'react';
import { AuthProvider } from '../src/lib/auth';
import { Layout } from '../src/components/Layout';
import { Overview } from '../src/pages/Overview';
import { Warnings } from '../src/pages/Warnings';
import { DataHealth } from '../src/pages/DataHealth';
import { AssessmentDetail } from '../src/pages/AssessmentDetail';
import { Login } from '../src/pages/Auth';
import { NotFound } from '../src/pages/NotFound';
import {
  assessment,
  catchments,
  health,
  jsonResponse,
  observations,
  sources,
  warnings,
  warningsUnavailable,
} from './fixtures';

function mockApi(overrides: { warnings?: unknown } = {}) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/catchments/demo-sector-a/assessments')) return jsonResponse(assessment);
    if (url.endsWith('/catchments')) return jsonResponse(catchments);
    if (url.includes('/observations')) return jsonResponse(observations);
    if (url.includes('/warnings')) return jsonResponse(overrides.warnings ?? warnings);
    if (url.includes('/sources/status')) return jsonResponse(sources);
    if (url.includes('/assessments/')) return jsonResponse(assessment);
    if (url.includes('/health')) return jsonResponse(health);
    throw new Error(`Unexpected request: ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderInShell(path: string, element: ReactElement, routePattern = '*') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: <Layout />,
        children: [
          { index: true, element },
          { path: routePattern, element },
        ],
      },
    ],
    { initialEntries: [path] },
  );
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('overview in demo mode', () => {
  it('renders demo labels and produces an assessed band on click', async () => {
    mockApi();
    renderInShell('/', <Overview />);

    expect((await screen.findAllByText('Demo sector A (synthetic)')).length).toBeGreaterThan(0);
    expect(screen.getByText(/DEMO DATA/)).toBeTruthy();
    expect(screen.getAllByText(/not a validated watershed boundary/i).length).toBeGreaterThan(0);
    expect((await screen.findAllByText(/No verified provider configured/i)).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /Run experimental assessment/i }));

    expect(await screen.findByText(/Band: high/i)).toBeTruthy();
    expect(screen.getByText(/categorical_only_no_calibrated_index/)).toBeTruthy();
    expect(screen.getAllByText(/1\/1 required/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Not an official warning/i).length).toBeGreaterThan(0);
  });
});

describe('warning feed semantics', () => {
  it('shows an unavailable warning source as not an all-clear', async () => {
    mockApi({ warnings: warningsUnavailable });
    renderInShell('/warnings', <Warnings />);

    expect(await screen.findByText(/No verified warning provider is configured/i)).toBeTruthy();
    expect(screen.getByText(/No warning records were returned/i)).toBeTruthy();
    expect(screen.getByText(/not an authoritative/i)).toBeTruthy();
  });

  it('renders demo warning records with an explicit synthetic label', async () => {
    mockApi();
    renderInShell('/warnings', <Warnings />);
    expect(
      await screen.findByText(/DEMO — Synthetic heavy-rain notice \(not an official bulletin\)/i),
    ).toBeTruthy();
    expect(screen.getByText(/RidgeWatch synthetic demo fixture/)).toBeTruthy();
  });
});

describe('data health', () => {
  it('separates demo capability rows from unavailable ones', async () => {
    mockApi();
    renderInShell('/data-health', <DataHealth />);

    expect(await screen.findByText('Observed rainfall')).toBeTruthy();
    expect(screen.getAllByText('DEMO').length).toBeGreaterThan(0);
    expect(screen.getAllByText('UNAVAILABLE').length).toBeGreaterThan(0);
    expect(screen.getByText(/0 verified/i)).toBeTruthy();
  });
});

describe('assessment evidence report', () => {
  it('traces inputs, reason codes and the disclaimer', async () => {
    mockApi();
    renderInShell(
      '/assessments/11111111-1111-4111-8111-111111111111',
      <AssessmentDetail />,
      'assessments/:assessmentId',
    );

    expect(await screen.findByText(/RAINFALL_3H_AT_OR_ABOVE_60MM/)).toBeTruthy();
    expect(screen.getByText('Assessment evidence report')).toBeTruthy();
    expect(screen.getAllByText(/DEMO_FIXTURE_INPUT/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/not an official warning/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/non-durable/)).toBeTruthy();
  });
});

describe('auth boundary without configuration', () => {
  it('explains that authentication is not configured and disables submission', () => {
    mockApi();
    const queryClient = new QueryClient();
    const router = createMemoryRouter([{ path: '/login', element: <Login /> }], {
      initialEntries: ['/login'],
    });
    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </QueryClientProvider>,
    );

    expect(screen.getAllByText(/Authentication is not configured/i).length).toBeGreaterThan(0);
    const submit = screen.getByRole('button', { name: /Sign-in unavailable/i });
    expect(submit).toHaveProperty('disabled', true);
    expect(screen.getByRole('link', { name: /Continue in demo mode/i })).toBeTruthy();
  });

  it('validates the email field without contacting a provider', async () => {
    mockApi();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AuthProvider>
          <RouterProvider
            router={createMemoryRouter([{ path: '/login', element: <Login /> }], {
              initialEntries: ['/login'],
            })}
          />
        </AuthProvider>
      </QueryClientProvider>,
    );
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'not-an-email' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret' } });
    fireEvent.submit(screen.getByRole('button', { name: /Sign-in unavailable/i }).closest('form')!);
    await waitFor(() => {
      expect(screen.getByText('Enter a valid email address.')).toBeTruthy();
    });
  });
});

describe('unknown route', () => {
  it('offers a safe route back to the dashboard', () => {
    mockApi();
    renderInShell('/does-not-exist', <NotFound />);
    expect(screen.getByText(/This route does not exist/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /Return to the overview/i })).toBeTruthy();
  });
});
