/**
 * Display formatting. RidgeWatch stores UTC timestamps and never converts a
 * source-native timestamp in place; the UI states its display timezone.
 */
export const DISPLAY_TIMEZONE = 'UTC';

const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const clockFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export const MISSING_TIMESTAMP = 'Timestamp unavailable';

function parse(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatTimestamp(value: string | null | undefined): string {
  const date = parse(value);
  return date ? `${dateTimeFormatter.format(date)} UTC` : MISSING_TIMESTAMP;
}

export function formatDate(value: string | null | undefined): string {
  const date = parse(value);
  return date ? dateFormatter.format(date) : MISSING_TIMESTAMP;
}

export function formatClock(value: string | null | undefined): string {
  const date = parse(value);
  return date ? `${clockFormatter.format(date)}Z` : '—';
}

export function formatNumber(
  value: number | string | null | undefined,
  unit?: string | null,
): string {
  if (value === null || value === undefined || value === '') return 'Not supplied';
  if (typeof value === 'string') return value;
  const rounded = Number.isInteger(value) ? value.toString() : value.toFixed(1);
  return unit ? `${rounded} ${unit}` : rounded;
}

export function isExpired(validTo: string | null | undefined, now = Date.now()): boolean | null {
  const date = parse(validTo);
  if (!date) return null;
  return date.getTime() < now;
}

const STATE_LABELS: Record<string, string> = {
  live: 'LIVE',
  stale: 'STALE',
  unavailable: 'UNAVAILABLE',
  error: 'ERROR',
  demo: 'DEMO',
  partial: 'PARTIAL',
  low: 'LOW',
  moderate: 'MODERATE',
  high: 'HIGH',
  very_high: 'VERY HIGH',
  insufficient_data: 'INSUFFICIENT DATA',
  degraded: 'DEGRADED',
  demo_synthetic: 'DEMO SYNTHETIC',
};

export function stateLabel(state: string): string {
  return STATE_LABELS[state] ?? state.replace(/_/g, ' ').toUpperCase();
}

export function variableLabel(variable: string): string {
  const labels: Record<string, string> = {
    rainfall: 'Observed rainfall',
    forecast_rainfall: 'Forecast rainfall',
    river_stage: 'River stage',
    soil_moisture: 'Soil moisture',
  };
  return labels[variable] ?? variable.replace(/_/g, ' ');
}

/** Latest record by observation/issue time, without inventing missing values. */
export function latestRecord<T extends { observed_at: string | null; issued_at: string | null }>(
  records: T[],
): T | null {
  let latest: T | null = null;
  let latestTime = Number.NEGATIVE_INFINITY;
  for (const record of records) {
    const stamp = record.observed_at ?? record.issued_at;
    if (!stamp) continue;
    const time = new Date(stamp).getTime();
    if (Number.isNaN(time)) continue;
    if (time > latestTime) {
      latest = record;
      latestTime = time;
    }
  }
  return latest;
}
