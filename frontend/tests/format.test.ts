import { describe, expect, it } from 'vitest';
import {
  MISSING_TIMESTAMP,
  formatNumber,
  formatTimestamp,
  isExpired,
  latestRecord,
  stateLabel,
} from '../src/lib/format';
import { safeRedirect } from '../src/lib/safeRedirect';
import { extractPolygonRings, projectPolygon } from '../src/lib/geo';

describe('timestamp formatting', () => {
  it('labels the display timezone explicitly', () => {
    expect(formatTimestamp('2026-06-15T06:00:00Z')).toBe('15 Jun 2026, 06:00 UTC');
  });

  it('handles missing and invalid timestamps without throwing', () => {
    expect(formatTimestamp(null)).toBe(MISSING_TIMESTAMP);
    expect(formatTimestamp(undefined)).toBe(MISSING_TIMESTAMP);
    expect(formatTimestamp('not-a-date')).toBe(MISSING_TIMESTAMP);
    expect(formatTimestamp('')).toBe(MISSING_TIMESTAMP);
  });

  it('labels neutrality and explicit state text', () => {
    expect(stateLabel('insufficient_data')).toBe('INSUFFICIENT DATA');
    expect(stateLabel('very_high')).toBe('VERY HIGH');
    expect(stateLabel('demo_synthetic')).toBe('DEMO SYNTHETIC');
    expect(stateLabel('custom_state')).toBe('CUSTOM STATE');
  });

  it('never converts null values into zero', () => {
    expect(formatNumber(null, 'mm')).toBe('Not supplied');
    expect(formatNumber(undefined)).toBe('Not supplied');
    expect(formatNumber(0, 'mm')).toBe('0 mm');
    expect(formatNumber(12.345, 'mm')).toBe('12.3 mm');
    expect(formatNumber('trace', 'mm')).toBe('trace');
  });

  it('reports unknown expiry instead of guessing', () => {
    expect(isExpired(null)).toBeNull();
    expect(isExpired('2026-01-01T00:00:00Z', Date.parse('2026-06-01T00:00:00Z'))).toBe(true);
    expect(isExpired('2026-07-01T00:00:00Z', Date.parse('2026-06-01T00:00:00Z'))).toBe(false);
  });

  it('ignores records without timestamps when finding the latest', () => {
    const records = [
      { observed_at: null, issued_at: null, id: 'none' },
      { observed_at: '2026-06-15T05:00:00Z', issued_at: null, id: 'newer' },
      { observed_at: '2026-06-15T01:00:00Z', issued_at: null, id: 'older' },
      { observed_at: 'bad-date', issued_at: null, id: 'invalid' },
    ];
    expect(latestRecord(records)?.id).toBe('newer');
    expect(latestRecord([])).toBeNull();
  });
});

describe('safe redirects', () => {
  it('accepts internal paths only', () => {
    expect(safeRedirect('/catchments/demo-sector-a')).toBe('/catchments/demo-sector-a');
    expect(safeRedirect('/history?tab=recent')).toBe('/history?tab=recent');
  });

  it('rejects absolute, protocol-relative and backslash redirects', () => {
    expect(safeRedirect('https://evil.example')).toBe('/overview');
    expect(safeRedirect('//evil.example')).toBe('/overview');
    expect(safeRedirect('/\\evil.example')).toBe('/overview');
    expect(safeRedirect('/path\\to')).toBe('/overview');
    expect(safeRedirect('javascript:alert(1)')).toBe('/overview');
  });

  it('avoids auth redirect loops', () => {
    expect(safeRedirect('/login')).toBe('/overview');
    expect(safeRedirect('/signup?x=1')).toBe('/overview');
    expect(safeRedirect('/auth/callback')).toBe('/overview');
    expect(safeRedirect(null)).toBe('/overview');
  });
});

describe('GeoJSON projection', () => {
  const polygon = {
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
  };

  it('projects a valid polygon into the viewbox', () => {
    const projected = projectPolygon(polygon);
    expect(projected).not.toBeNull();
    expect(projected?.paths).toHaveLength(1);
    expect(projected?.paths[0]?.startsWith('M')).toBe(true);
    expect(projected?.bounds.minLon).toBeCloseTo(77.02);
    expect(projected?.bounds.maxLat).toBeCloseTo(32.04);
  });

  it('returns null rather than drawing an invented shape', () => {
    expect(projectPolygon(null)).toBeNull();
    expect(projectPolygon({})).toBeNull();
    expect(projectPolygon({ type: 'Point', coordinates: [77, 31] })).toBeNull();
    expect(
      projectPolygon({ type: 'Polygon', coordinates: [[[999, 999], ['a', 'b']]] }),
    ).toBeNull();
  });

  it('handles MultiPolygon and ignores malformed rings', () => {
    const rings = extractPolygonRings({
      type: 'MultiPolygon',
      coordinates: [
        [[[77, 31], [77.2, 31], [77.2, 31.2], [77, 31]]],
        [[['bad', 31], [77, 31], [77.1, 31.1], [77, 31]]],
      ],
    });
    expect(rings).toHaveLength(2);
    const onlyValid = extractPolygonRings({
      type: 'Polygon',
      coordinates: [[['bad', 31], [77.1, 31.1]]],
    });
    expect(onlyValid).toHaveLength(0);
  });
});
