import { useEffect, useRef, useState } from 'react';
import { Compass, MapPinned, TriangleAlert } from 'lucide-react';
import type { Catchment } from '../lib/schemas';
import { projectPolygon } from '../lib/geo';
import { Status } from './Status';

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
let mapsPromise: Promise<void> | undefined;

function loadMaps(key: string): Promise<void> {
  if (window.google?.maps) return Promise.resolve();
  if (mapsPromise) return mapsPromise;
  mapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google Maps failed to load'));
    document.head.appendChild(script);
  });
  return mapsPromise;
}

function Schematic({ catchment }: { catchment?: Catchment }) {
  const projection = catchment ? projectPolygon(catchment.geometry) : null;
  return (
    <div className="schematic" role="img" aria-label="Schematic diagram of the demo catchment outline; not a basemap">
      <div className="schematic__frame">
        <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
          <defs>
            <pattern id="grid-small" width="5" height="5" patternUnits="userSpaceOnUse">
              <path d="M 5 0 L 0 0 0 5" fill="none" stroke="#c9c7ba" strokeWidth="0.3" />
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#grid-small)" />
          {projection ? (
            projection.paths.map((path, index) => (
              <path
                key={index}
                d={path}
                fill="#245B4526"
                stroke="#245B45"
                strokeWidth="1.1"
                strokeDasharray="2 1.4"
              />
            ))
          ) : (
            <text x="50" y="51" textAnchor="middle" fontSize="3.4" fill="#667068">
              No geometry supplied
            </text>
          )}
        </svg>
        <span className="schematic__scale">Schematic / not to scale</span>
      </div>
      <div className="schematic__meta">
        <p className="kicker">SCHEMATIC VIEW</p>
        <h2>{projection ? 'Demo outline only' : 'No geometry available'}</h2>
        <p>
          {projection
            ? 'A synthetic demo outline is drawn for layout review. This is neither a basemap nor a verified watershed boundary.'
            : 'The API did not return geometry for this catchment, so no shape is drawn.'}
        </p>
        {projection ? (
          <code>
            {projection.bounds.minLon.toFixed(3)}–{projection.bounds.maxLon.toFixed(3)}°E ·{' '}
            {projection.bounds.minLat.toFixed(3)}–{projection.bounds.maxLat.toFixed(3)}°N
          </code>
        ) : null}
      </div>
    </div>
  );
}

export function MapSurface({ catchment }: { catchment?: Catchment }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!MAPS_KEY || !containerRef.current) return;
    let active = true;
    setMapError(null);
    loadMaps(MAPS_KEY)
      .then(() => {
        if (!active || !containerRef.current) return;
        const map = new google.maps.Map(containerRef.current, {
          center: { lat: 31.95, lng: 77.28 },
          zoom: 9,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        setMapReady(true);
        if (catchment?.geometry) {
          try {
            map.data.addGeoJson(
              catchment.geometry as Parameters<google.maps.Data['addGeoJson']>[0],
            );
            map.data.setStyle((feature) => ({
              fillColor: catchment.geometry_status === 'demo_synthetic' ? '#C77B25' : '#245B45',
              fillOpacity: 0.18,
              strokeColor: catchment.geometry_status === 'demo_synthetic' ? '#C77B25' : '#245B45',
              strokeWeight: 2,
            }));
            const bounds = new google.maps.LatLngBounds();
            map.data.forEach((feature) => {
              feature.getGeometry()?.forEachLatLng((position) => bounds.extend(position));
            });
            if (!bounds.isEmpty()) map.fitBounds(bounds);
          } catch {
            setMapError('The catchment geometry returned by the API could not be drawn.');
          }
        } else {
          map.setCenter({ lat: 31.95, lng: 77.28 });
        }
      })
      .catch(() => {
        if (active) {
          setMapError(
            'Google Maps could not be loaded. Check that the browser key is valid and restricted to this origin.',
          );
        }
      });
    return () => {
      active = false;
    };
  }, [catchment]);

  return (
    <section className="map" aria-label="Catchment map or schematic">
      <div className="map-tools">
        <span className="map-tools__mode">
          {catchment?.is_demo ? <Status state="demo" /> : null}
          {catchment ? <Status state={catchment.geometry_status} /> : null}
        </span>
        <span className="map-tools__label">
          {MAPS_KEY ? 'GOOGLE MAPS BASEMAP' : 'NO BASEMAP CONFIGURED'}
        </span>
      </div>

      {MAPS_KEY ? (
        <div ref={containerRef} className="map-canvas" />
      ) : (
        <Schematic catchment={catchment} />
      )}

      {!MAPS_KEY ? (
        <div className="map-config-note">
          <MapPinned size={15} aria-hidden="true" />
          <span>
            Add <code>VITE_GOOGLE_MAPS_API_KEY</code> to show a basemap. No substitute map or
            invented boundary is drawn.
          </span>
        </div>
      ) : null}

      {mapError ? (
        <div className="map-alert" role="alert">
          <TriangleAlert size={15} aria-hidden="true" />
          {mapError}
        </div>
      ) : null}

      <div className="legend">
        <b>{MAPS_KEY && mapReady ? 'Map layers' : 'Schematic key'}</b>
        <span>
          <i aria-hidden="true" />
          {catchment?.geometry_status === 'verified'
            ? 'Verified catchment outline'
            : 'Demo outline (synthetic)'}
        </span>
        <span className="muted">
          <Compass size={12} aria-hidden="true" /> WGS84 · [longitude, latitude]
        </span>
      </div>
    </section>
  );
}
