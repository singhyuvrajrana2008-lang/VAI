import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Database, RefreshCw } from 'lucide-react';
import { Link } from 'react-router';
import { api } from '../lib/api';
import { PageHeader } from '../components/PageHeader';
import { ErrorPanel, LoadingPanel, Notice, Status } from '../components/Status';
import { formatTimestamp } from '../lib/format';
import { useQueryClient } from '@tanstack/react-query';

export function DataHealth() {
  const queryClient = useQueryClient();
  const sources = useQuery({ queryKey: ['sources'], queryFn: api.sources, staleTime: 30_000 });
  const health = useQuery({ queryKey: ['health'], queryFn: api.health, staleTime: 30_000 });

  return (
    <div className="page">
      <PageHeader
        eyebrow="PROVENANCE / CONNECTOR MATRIX"
        title="Source health and data quality"
        copy="Each capability reports its own state, verification level and timestamps so an old value cannot appear current. Unconfigured sources stay unavailable; nothing is inferred from silence."
        aside={
          <Link to="/methodology" className="text-link">
            Evaluation limits <ArrowRight size={13} aria-hidden="true" />
          </Link>
        }
      />

      <div className="health-toolbar">
        <span>
          Checked {formatTimestamp(sources.data?.checked_at ?? health.data?.checked_at)}
        </span>
        <span>Mode {sources.data?.mode ?? (health.data?.config.demo_mode ? 'demo' : 'live')}</span>
        <button
          type="button"
          className="ghost-button"
          onClick={() => {
            void queryClient.invalidateQueries({ queryKey: ['sources'] });
            void queryClient.invalidateQueries({ queryKey: ['health'] });
          }}
        >
          <RefreshCw size={14} aria-hidden="true" /> Re-check
        </button>
      </div>

      {sources.isLoading ? <LoadingPanel message="Checking source capabilities…" /> : null}
      {sources.error ? (
        <ErrorPanel
          title="Source status unavailable"
          message={(sources.error as Error).message}
          onRetry={() => void sources.refetch()}
        />
      ) : null}

      {sources.data ? (
        <>
          <div className="table-scroll">
            <table className="data-table data-table--health">
              <caption className="sr-only">
                Source capabilities with provider, state, verification and freshness
              </caption>
              <thead>
                <tr>
                  <th scope="col">Capability</th>
                  <th scope="col">Provider</th>
                  <th scope="col">State</th>
                  <th scope="col">Verification</th>
                  <th scope="col">Observation / issue</th>
                  <th scope="col">Last fetch</th>
                  <th scope="col">Units</th>
                  <th scope="col">Details</th>
                </tr>
              </thead>
              <tbody>
                {sources.data.items.map((source) => (
                  <tr key={source.capability}>
                    <th scope="row">
                      {source.label}
                      <code>{source.capability}</code>
                    </th>
                    <td data-label="Provider">
                      {source.provider}
                      <span className="cell-sub">
                        {source.configured ? 'Credentials present' : 'Not configured'}
                      </span>
                    </td>
                    <td data-label="State">
                      <Status state={source.state} />
                      <span className="cell-sub">{source.is_demo ? 'DEMO fixture' : 'No demo data'}</span>
                    </td>
                    <td data-label="Verification">
                      <code>{source.verification}</code>
                    </td>
                    <td data-label="Observation / issue">
                      {formatTimestamp(source.observation_or_issue_time)}
                    </td>
                    <td data-label="Last fetch">{formatTimestamp(source.fetched_at)}</td>
                    <td data-label="Units">{source.units.length > 0 ? source.units.join(', ') : '—'}</td>
                    <td data-label="Details">
                      <span className="cell-detail">{source.message}</span>
                      {source.quality_flags.length > 0 ? (
                        <span className="flag-list">
                          {source.quality_flags.map((flag) => (
                            <code key={flag}>{flag}</code>
                          ))}
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="config-grid">
            <section className="config-card" aria-labelledby="config-app">
              <div className="config-card__head">
                <Database size={16} aria-hidden="true" />
                <h2 id="config-app">Application configuration</h2>
              </div>
              <ul className="config-list">
                <li>
                  <span>Demo mode</span>
                  <b>{health.data?.config.demo_mode ? 'Enabled' : 'Disabled'}</b>
                </li>
                <li>
                  <span>Demo fixtures</span>
                  <b>{health.data?.config.demo_fixtures ? 'Served (labelled)' : 'Not served'}</b>
                </li>
                <li>
                  <span>Database persistence</span>
                  <b>{health.data?.persistence === 'unavailable' ? 'Unavailable' : 'Configured, not verified'}</b>
                </li>
                <li>
                  <span>Authentication</span>
                  <b>
                    {health.data?.authentication === 'unavailable'
                      ? 'Unavailable (demo access only)'
                      : 'Configured, sign-in not verified here'}
                  </b>
                </li>
                <li>
                  <span>External data sources</span>
                  <b>0 verified</b>
                </li>
              </ul>
              <p className="config-card__note">
                Values of credentials are never exposed. Presence is reported only. See{' '}
                <code>docs/DATA_FEASIBILITY_REPORT.md</code> for what each source needs.
              </p>
            </section>

            <section className="config-card" aria-labelledby="config-enable">
              <h2 id="config-enable">What unlocks a live source</h2>
              <ol className="config-steps">
                <li>Confirm access, licence, quotas and the exact product/endpoint.</li>
                <li>Implement a connector that preserves provider, unit and source timings.</li>
                <li>Put credentials in the backend environment only, then restart the API.</li>
                <li>Verify a real response, then record the evidence in the feasibility report.</li>
              </ol>
              <p className="config-card__note">
                Documentation alone does not count as an integrated source. Until every step is
                done, RidgeWatch reports unavailable and keeps demo data visibly separate.
              </p>
            </section>
          </div>

          {sources.data.is_demo ? (
            <Notice tone="warn" title="Demo capability rows">
              <p>
                Rows marked DEMO are synthetic fixtures served for interface testing. They are not
                fetches from a provider, and their timestamps are fixed fixture values.
              </p>
            </Notice>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
