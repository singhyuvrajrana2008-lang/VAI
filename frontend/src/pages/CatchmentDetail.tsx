import { ArrowLeft, ArrowRight, CloudRain, ShieldAlert } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { api, ApiError } from '../lib/api';
import { PageHeader } from '../components/PageHeader';
import { MapSurface } from '../components/MapSurface';
import { EmptyPanel, ErrorPanel, LoadingPanel, Notice, Status } from '../components/Status';
import { formatTimestamp } from '../lib/format';
import { useObservations, useWarnings } from '../lib/hooks';

export function CatchmentDetail() {
  const { catchmentId = '' } = useParams();
  const catchment = useQuery({
    queryKey: ['catchment', catchmentId],
    queryFn: () => api.catchment(catchmentId),
    enabled: Boolean(catchmentId),
    retry: false,
  });
  const observations = useObservations(catchmentId || null);
  const warnings = useWarnings(catchmentId || null);
  const notFound = catchment.error instanceof ApiError && catchment.error.status === 404;

  if (!catchmentId) {
    return (
      <div className="page">
        <EmptyPanel title="No catchment selected">
          <p>Choose a catchment from the registry to inspect its provenance.</p>
        </EmptyPanel>
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="CATCHMENT RECORD / PROVENANCE"
        title={catchment.data?.name ?? 'Catchment detail'}
        copy="Geometry provenance, validation state and the source records attached to this catchment. Terrain and hydrology fields appear only when a verified source exists."
        aside={
          <Link to="/catchments" className="text-link">
            <ArrowLeft size={13} aria-hidden="true" /> Back to registry
          </Link>
        }
      />

      {catchment.isLoading ? <LoadingPanel message="Loading catchment record…" /> : null}
      {catchment.error && !notFound ? (
        <ErrorPanel
          title="Catchment unavailable"
          message={(catchment.error as Error).message}
          onRetry={() => void catchment.refetch()}
        />
      ) : null}
      {notFound ? (
        <EmptyPanel title="Catchment not found">
          <p>
            The API returned 404 for <code>{catchmentId}</code>. It is not in the configured
            registry; no placeholder catchment is shown.
          </p>
          <Link to="/catchments" className="text-link">
            Return to the registry <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </EmptyPanel>
      ) : null}

      {catchment.data ? (
        <>
          <div className="detail-grid">
            <MapSurface catchment={catchment.data} />
            <section className="detail-panel" aria-labelledby="record-heading">
              <h2 id="record-heading">Registry record</h2>
              <dl className="meta-list">
                <dt>Status</dt>
                <dd>
                  <Status state={catchment.data.is_demo ? 'demo' : catchment.data.validation_status} />
                </dd>
                <dt>Region</dt>
                <dd>{catchment.data.region ?? 'Not supplied'}</dd>
                <dt>Geometry state</dt>
                <dd>
                  <Status state={catchment.data.geometry_status} />
                </dd>
                <dt>Geometry source</dt>
                <dd>{catchment.data.geometry_source ?? 'Not supplied'}</dd>
                <dt>Validation</dt>
                <dd>{catchment.data.validation_status}</dd>
                <dt>Catchment ID</dt>
                <dd>
                  <code>{catchment.data.id}</code>
                </dd>
              </dl>
              {catchment.data.notes ? <p className="detail-panel__note">{catchment.data.notes}</p> : null}
            </section>
          </div>

          <div className="detail-columns">
            <section className="detail-block" aria-labelledby="obs-summary">
              <div className="detail-block__head">
                <CloudRain size={16} aria-hidden="true" />
                <h2 id="obs-summary">Rainfall evidence</h2>
              </div>
              {observations.isLoading ? (
                <LoadingPanel />
              ) : observations.error ? (
                <ErrorPanel message={(observations.error as Error).message} onRetry={() => void observations.refetch()} />
              ) : observations.data ? (
                <>
                  <div className="detail-block__status">
                    <Status state={observations.data.source_state} />
                    <span>{observations.data.observed.length} observed records</span>
                  </div>
                  <p>{observations.data.message}</p>
                  {observations.data.observed.length > 0 ? (
                    <dl className="meta-list">
                      <dt>First record</dt>
                      <dd>{formatTimestamp(observations.data.observed[0]?.observed_at)}</dd>
                      <dt>Latest record</dt>
                      <dd>
                        {formatTimestamp(
                          observations.data.observed[observations.data.observed.length - 1]?.observed_at,
                        )}
                      </dd>
                      <dt>Units</dt>
                      <dd>{observations.data.units.join(', ') || 'Not stated'}</dd>
                    </dl>
                  ) : null}
                  <Link to={`/rainfall?catchment=${encodeURIComponent(catchment.data.id)}`} className="text-link">
                    Open rainfall view <ArrowRight size={13} aria-hidden="true" />
                  </Link>
                </>
              ) : null}
            </section>

            <section className="detail-block" aria-labelledby="warn-summary">
              <div className="detail-block__head">
                <ShieldAlert size={16} aria-hidden="true" />
                <h2 id="warn-summary">Official warnings</h2>
              </div>
              {warnings.isLoading ? (
                <LoadingPanel />
              ) : warnings.error ? (
                <ErrorPanel message={(warnings.error as Error).message} onRetry={() => void warnings.refetch()} />
              ) : warnings.data ? (
                <>
                  <div className="detail-block__status">
                    <Status state={warnings.data.source_state} />
                    <span>
                      {warnings.data.provider_configured ? 'Provider configured' : 'No verified provider'}
                    </span>
                  </div>
                  <p>{warnings.data.message}</p>
                  <strong className="detail-block__warning">
                    An unavailable feed is not an authoritative “no warning” result.
                  </strong>
                  <Link to={`/warnings?catchment=${encodeURIComponent(catchment.data.id)}`} className="text-link">
                    Open warning log <ArrowRight size={13} aria-hidden="true" />
                  </Link>
                </>
              ) : null}
            </section>
          </div>

          <Notice tone="info" title="Subscriptions and saved history require verified persistence">
            <p>
              This build has no durable persistence or authenticated history. No subscribe control
              is shown because it could not save anything. Wiring Supabase Auth and the prepared
              migration would unlock owner-scoped subscriptions and history.
            </p>
          </Notice>

          {catchment.data.is_demo ? (
            <Notice tone="warn" title="Demo catchment">
              <p>
                This record and its geometry are synthetic fixtures. Any values shown here are
                deterministic demo data, not observations for a real place.
              </p>
            </Notice>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
