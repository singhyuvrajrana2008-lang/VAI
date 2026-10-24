import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, BellRing, CloudRain, Gauge, RefreshCw, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatNumber, formatTimestamp, isExpired } from '../lib/format';
import { useObservations, useSelectedCatchment, useWarnings } from '../lib/hooks';
import { AssessmentPanel } from '../components/AssessmentPanel';
import { CatchmentSelect } from '../components/CatchmentSelect';
import { MapSurface } from '../components/MapSurface';
import { PageHeader } from '../components/PageHeader';
import { CoverageBar, EmptyPanel, ErrorPanel, LoadingPanel, Notice, Status } from '../components/Status';

export function Overview() {
  const selection = useSelectedCatchment();
  const { selected, selectedId } = selection;
  const observations = useObservations(selectedId);
  const warnings = useWarnings(selectedId);
  const queryClient = useQueryClient();
  const auth = useAuth();
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);
  const accessToken = auth.session?.access_token;

  const assessment = useMutation({
    // A signed-in user's token lets the API persist an owner-scoped record.
    mutationFn: (id: string) => api.assess(id, accessToken),
  });
  const resetAssessment = assessment.reset;

  // A catchment switch must never leave the previous catchment's result on screen.
  useEffect(() => {
    resetAssessment();
  }, [selectedId, resetAssessment]);

  const refresh = async () => {
    setRefreshedAt(null);
    await queryClient.invalidateQueries();
    setRefreshedAt(new Date().toISOString());
  };

  const observed = observations.data?.observed ?? [];
  const forecast = observations.data?.forecast ?? [];
  const latestObserved = observed.at(-1);
  const forecastTotal = forecast.reduce(
    (total, record) => total + (typeof record.value === 'number' ? record.value : 0),
    0,
  );
  const forecastHasNumeric = forecast.some((record) => typeof record.value === 'number');
  const latestWarning = warnings.data?.items[0];
  const assessmentError =
    assessment.error instanceof ApiError ? assessment.error : null;
  const resultStaleForSelection =
    assessment.data && assessment.data.catchment_id !== selectedId ? true : false;

  return (
    <div className="page page--overview">
      <PageHeader
        eyebrow="OPERATIONS OVERVIEW / CATCHMENT CONDITIONS"
        title="Conditions with the evidence attached"
        copy="Review source availability and experimental eligibility without mistaking missing data for low risk. Official warnings are shown separately from RidgeWatch estimates."
      />

      {selection.error ? (
        <ErrorPanel
          title="Catchment registry unavailable"
          message={selection.error.message}
          onRetry={() => void queryClient.invalidateQueries({ queryKey: ['catchments'] })}
        />
      ) : null}

      <div className="ops-bar">
        <CatchmentSelect
          catchments={selection.catchments}
          value={selectedId}
          onChange={selection.select}
          disabled={selection.isLoading}
        />
        <div className="ops-bar__meta">
          <span>
            <b>Mode</b> {selection.mode ?? '—'}
          </span>
          <span>
            <b>Refreshed</b> {refreshedAt ? formatTimestamp(refreshedAt) : 'Not yet this session'}
          </span>
        </div>
        <button type="button" className="ghost-button" onClick={() => void refresh()}>
          <RefreshCw size={14} aria-hidden="true" /> Refresh
        </button>
      </div>

      {selection.isLoading ? <LoadingPanel message="Loading catchment registry…" /> : null}

      {!selection.isLoading && !selection.error && selection.catchments.length === 0 ? (
        <EmptyPanel
          title="No catchment is configured"
          icon={<Gauge size={22} aria-hidden="true" />}
          action={
            <Link to="/data-health" className="text-link">
              Inspect source health <ArrowRight size={14} aria-hidden="true" />
            </Link>
          }
        >
          <p>
            The API is running but has no catchment registry entry. RidgeWatch does not draw an
            invented boundary or invent observations to fill this view. Enable demo fixtures
            (<code>RIDGEWATCH_MODE=demo</code>) or add a validated catchment.
          </p>
        </EmptyPanel>
      ) : null}

      {selected ? (
        <>
          <div className="dashboard-grid">
            <MapSurface catchment={selected} />
            <aside className="inspector" aria-label="Selected catchment inspector">
              <div className="inspector__head">
                <Status state={selected.is_demo ? 'demo' : selected.validation_status} />
                <h2>{selected.name}</h2>
                <p>{selected.region ?? 'Region not supplied'}</p>
              </div>

              <dl className="meta-list">
                <dt>Geometry</dt>
                <dd>
                  <Status state={selected.geometry_status} />
                </dd>
                <dt>Geometry source</dt>
                <dd>{selected.geometry_source ?? 'Not supplied'}</dd>
                <dt>Validation</dt>
                <dd>{selected.validation_status}</dd>
                <dt>Catchment ID</dt>
                <dd>
                  <code>{selected.id}</code>
                </dd>
              </dl>

              {selected.notes ? <p className="inspector__note">{selected.notes}</p> : null}

              <section className="readout" aria-labelledby="obs-readout">
                <p className="kicker" id="obs-readout">
                  OBSERVATION READOUT
                </p>
                {observations.isLoading ? (
                  <LoadingPanel message="Loading observations…" />
                ) : observations.error ? (
                  <ErrorPanel
                    message={(observations.error as Error).message}
                    onRetry={() => void observations.refetch()}
                  />
                ) : (
                  <>
                    <p className="readout__value">
                      {latestObserved
                        ? formatNumber(latestObserved.value, latestObserved.unit)
                        : 'No observation returned'}
                    </p>
                    <p className="readout__meta">
                      {latestObserved
                        ? `Latest record at ${formatTimestamp(latestObserved.observed_at)}`
                        : 'No zero value has been substituted.'}
                    </p>
                    <ul className="readout__counts">
                      <li>
                        <CloudRain size={14} aria-hidden="true" /> {observed.length} observed
                        records
                      </li>
                      <li>
                        <BellRing size={14} aria-hidden="true" /> {warnings.data?.items.length ?? 0}{' '}
                        warning records
                      </li>
                    </ul>
                  </>
                )}
              </section>

              <button
                type="button"
                className="primary"
                onClick={() => selectedId && assessment.mutate(selectedId)}
                disabled={assessment.isPending || !selectedId}
              >
                {assessment.isPending ? 'Checking eligible inputs…' : 'Run experimental assessment'}
                <ArrowRight size={15} aria-hidden="true" />
              </button>
              <p className="inspector__hint">
                The backend returns a band only when eligible rainfall evidence exists.
              </p>

              {assessmentError ? (
                <ErrorPanel
                  title="Assessment request failed"
                  message={assessmentError.message}
                  requestId={assessmentError.requestId}
                  onRetry={() => selectedId && assessment.mutate(selectedId)}
                />
              ) : null}
            </aside>
          </div>

          <div className="summary-strip">
            <article>
              <p className="kicker">LATEST OBSERVED RAINFALL</p>
              <b>{latestObserved ? formatNumber(latestObserved.value, latestObserved.unit) : 'Unavailable'}</b>
              <span>{latestObserved ? latestObserved.provider : 'No observation provider'}</span>
            </article>
            <article>
              <p className="kicker">FORECAST WINDOW (DEMO)</p>
              <b>{forecastHasNumeric ? `${forecastTotal.toFixed(1)} mm total` : 'Unavailable'}</b>
              <span>
                {forecast.length} forecast records · separate from observations
              </span>
            </article>
            <article>
              <p className="kicker">INPUT COVERAGE (BASELINE)</p>
              <b>
                {observations.data ? `${observed.length > 0 ? 1 : 0}/1 required` : 'Unknown'}
              </b>
              <span>Rainfall is the only required input for baseline v0.1</span>
            </article>
          </div>

          <div className="lower-grid">
            <section className="official" aria-labelledby="warnings-heading">
              <div className="official__head">
                <ShieldAlert size={16} aria-hidden="true" />
                <p className="kicker" id="warnings-heading">
                  OFFICIAL WARNINGS
                </p>
              </div>
              {warnings.isLoading ? (
                <LoadingPanel message="Querying official warning source…" />
              ) : warnings.error ? (
                <ErrorPanel
                  message={(warnings.error as Error).message}
                  onRetry={() => void warnings.refetch()}
                />
              ) : warnings.data ? (
                <>
                  <div className="official__status">
                    <Status state={warnings.data.source_state} />
                    <span>
                      {warnings.data.provider_configured
                        ? 'Provider configured'
                        : 'No verified provider configured'}
                    </span>
                  </div>
                  {warnings.data.items.length > 0 && latestWarning ? (
                    <article className="official__item">
                      <time>{formatTimestamp(latestWarning.issued_at)}</time>
                      <h2>{latestWarning.title}</h2>
                      <p>{latestWarning.provider}</p>
                      {latestWarning.valid_to ? (
                        <span className="official__validity">
                          Validity ended {formatTimestamp(latestWarning.valid_to)}
                          {isExpired(latestWarning.valid_to) ? ' · expired' : ' · within window'}
                        </span>
                      ) : null}
                    </article>
                  ) : (
                    <div className="official__empty">
                      <Status state={warnings.data.source_state} />
                      <h2>No warning response received</h2>
                      <p>{warnings.data.message}</p>
                      <strong>This is not an authoritative “no warning” result.</strong>
                    </div>
                  )}
                  <Link to={`/warnings?catchment=${encodeURIComponent(selected.id)}`} className="text-link">
                    Open warning log <ArrowRight size={13} aria-hidden="true" />
                  </Link>
                </>
              ) : (
                <p>Select a catchment to query the configured warning provider.</p>
              )}
            </section>

            <AssessmentPanel
              assessment={resultStaleForSelection ? undefined : assessment.data}
              catchmentName={selected.name}
              onOpen={assessment.data ? `/assessments/${assessment.data.assessment_id}` : undefined}
            />
          </div>

          {observations.data?.is_demo ? (
            <Notice tone="warn" title="Synthetic demo data in use">
              <p>
                Rainfall, forecast and warning records on this page are deterministic demo
                fixtures. They were not observed, forecast or issued by any provider, and the
                map outline is a synthetic rectangle rather than a verified watershed.
              </p>
            </Notice>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
