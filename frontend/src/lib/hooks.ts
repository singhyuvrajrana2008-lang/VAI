import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { api } from './api';
import type { Catchment } from './schemas';

export function useDocumentTitle(title: string) {
  useEffect(() => {
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);
}

export function useCatchments() {
  return useQuery({
    queryKey: ['catchments'],
    queryFn: api.catchments,
    staleTime: 60_000,
  });
}

export interface CatchmentSelection {
  catchments: Catchment[];
  selected: Catchment | null;
  selectedId: string | null;
  select: (id: string) => void;
  isLoading: boolean;
  error: Error | null;
  isDemo: boolean;
  mode: string | null;
}

/**
 * Catchment selection is stored in the URL so a view can be shared and survives a
 * reload. Queries downstream are keyed by the id, so switching catchments cannot
 * reuse another catchment's cached response.
 */
export function useSelectedCatchment(): CatchmentSelection {
  const query = useCatchments();
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('catchment');
  const items = query.data?.items ?? [];

  const requestedMatch = requested ? items.find((item) => item.id === requested) : undefined;
  const selected = requestedMatch ?? items[0] ?? null;

  const select = useCallback(
    (id: string) => {
      const next = new URLSearchParams(searchParams);
      next.set('catchment', id);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  return {
    catchments: items,
    selected,
    selectedId: selected?.id ?? null,
    select,
    isLoading: query.isLoading,
    error: (query.error as Error | null) ?? null,
    isDemo: query.data?.is_demo ?? false,
    mode: query.data?.mode ?? null,
  };
}

export function useObservations(catchmentId: string | null) {
  return useQuery({
    queryKey: ['observations', catchmentId],
    queryFn: () => api.observations(catchmentId as string),
    enabled: Boolean(catchmentId),
  });
}

export function useWarnings(catchmentId: string | null) {
  return useQuery({
    queryKey: ['warnings', catchmentId],
    queryFn: () => api.warnings(catchmentId as string),
    enabled: Boolean(catchmentId),
  });
}
