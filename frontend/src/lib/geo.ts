/**
 * Minimal, defensive GeoJSON polygon projection for the schematic fallback.
 *
 * GeoJSON coordinates are [longitude, latitude] in WGS84. Nothing here verifies a
 * boundary; it only draws what the API returned, and the UI labels demo geometry
 * as a schematic rather than a map.
 */
export type Ring = Array<[number, number]>;

const VIEWBOX = 100;
const PADDING = 8;

function isValidPosition(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number' &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1]) &&
    value[0] >= -180 &&
    value[0] <= 180 &&
    value[1] >= -90 &&
    value[1] <= 90
  );
}

export function extractPolygonRings(geometry: unknown): Ring[] {
  if (!geometry || typeof geometry !== 'object') return [];
  const record = geometry as { type?: unknown; coordinates?: unknown };
  const rings: Ring[] = [];

  const pushRing = (ring: unknown) => {
    if (!Array.isArray(ring)) return;
    const positions = ring.filter(isValidPosition).map(
      ([lon, lat]) => [lon, lat] as [number, number],
    );
    if (positions.length >= 3) rings.push(positions);
  };

  if (record.type === 'Polygon' && Array.isArray(record.coordinates)) {
    record.coordinates.forEach(pushRing);
  } else if (record.type === 'MultiPolygon' && Array.isArray(record.coordinates)) {
    for (const polygon of record.coordinates) {
      if (Array.isArray(polygon)) polygon.forEach(pushRing);
    }
  }
  return rings;
}

export interface SchematicBounds {
  minLon: number;
  maxLon: number;
  minLat: number;
  maxLat: number;
}

export interface SchematicGeometry {
  paths: string[];
  bounds: SchematicBounds;
}

export function projectPolygon(geometry: unknown): SchematicGeometry | null {
  const rings = extractPolygonRings(geometry);
  if (rings.length === 0) return null;
  const all = rings.flat();
  const minLon = Math.min(...all.map(([lon]) => lon));
  const maxLon = Math.max(...all.map(([lon]) => lon));
  const minLat = Math.min(...all.map(([, lat]) => lat));
  const maxLat = Math.max(...all.map(([, lat]) => lat));
  const spanLon = Math.max(maxLon - minLon, 0.0001);
  const spanLat = Math.max(maxLat - minLat, 0.0001);
  const scale = Math.min((VIEWBOX - PADDING * 2) / spanLon, (VIEWBOX - PADDING * 2) / spanLat);
  const offsetX = (VIEWBOX - spanLon * scale) / 2;
  const offsetY = (VIEWBOX - spanLat * scale) / 2;

  const paths = rings.map((ring) =>
    ring
      .map(([lon, lat], index) => {
        const x = offsetX + (lon - minLon) * scale;
        const y = offsetY + (maxLat - lat) * scale;
        return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ') + ' Z',
  );

  return { paths, bounds: { minLon, maxLon, minLat, maxLat } };
}
