import { CloudRain, CloudSun } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { CatchmentSelect } from '../components/CatchmentSelect';
import { RainfallChart } from '../components/RainfallChart';
import { EmptyPanel, ErrorPanel, LoadingPanel, Notice, Status } from '../components/Status';
import { formatNumber, formatTimestamp } from '../lib/format';
import { useObservations, useSelectedCatchment } from '../lib/hooks';
import type { Observation } from '../lib/schemas';

function ProvenanceTable({ records, caption }: { records: Observation[]; caption: string }) {
  if (records.length === 0) return null;
  return (
    <details className="provenance">
      <summary>{caption} ({records.length})</summary>
      <div className="table-scroll">
        <table className="data-table data-table--provenance">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              <th scope="col">Valid / observed</th>
              <th scope="col">Value</th>
              <th scope="col">Provider</th>
              <th scope="col">Fetched</th>
              <th scope="col">State</th>
              <th scope="col">Flags</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.source_id}>
                <td>{formatTimestamp(record.observed_at ?? record.valid_from ?? record.issued_at)}</td>
                <td>{formatNumber(record.value, record.unit)}</td>
                <td>{record.provider}</td>
                <td>{formatTimestamp(record.fetched_at)}</td>
                <td>
                  <Status state={record.source_state} />
                </td>
                <td>
                  {record.quality_flags.length > 0 ? (
                    <span className="flag-list">
                      {record.quality_flags.map((flag) => (
                        <code key={flag}>{flag}</code>
                      ))}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

export function Rainfall() {
  const selection = useSelectedCatchment();
  const query = useObservations(selection.selectedId);

  return (
    <div className="page">
      <PageHeader
        eyebrow="RAINFALL / OBSERVED VERSUS FORECAST"
        title="Rainfall and observation freshness"
        copy="Observed records and forecast records are kept separate, each with provider, unit, times and quality flags. Missing hours are shown as gaps, not as zero rainfall."
      />

      <div className="ops-bar">
        <CatchmentSelect
          catchments={selection.catchments}
          value={selection.selectedId}
          onChange={selection.select}
          disabled={selection.isLoading}
        />
        {query.data ? <Status state={query.data.source_state} /> : null}
        {query.data ? <span className="ops-bar__units">Units: {query.data.units.join(', ') || 'not stated'}</span> : null}
      </div>

      {selection.error ? <ErrorPanel message={(selection.error as Error).message} /> : null}
      {selection.isLoading || query.isLoading ? <LoadingPanel message="Loading rainfall records…" /> : null}
      {query.error ? (
        <ErrorPanel
          title="Rainfall records unavailable"
          message={(query.error as Error).message}
          onRetry={() => void query.refetch()}
        />
      ) : null}

      {!selection.isLoading && !selection.error && selection.catchments.length === 0 ? (
        <EmptyPanel title="No catchment configured">
          <p>Rainfall is requested per catchment. No catchment registry entry exists yet.</p>
        </EmptyPanel>
      ) : null}

      {query.data ? (
        <>
          {query.data.is_demo ? (
            <Notice tone="warn" title="Synthetic demo rainfall">
              <p>{query.data.message}</p>
            </Notice>
          ) : null}
          {!query.data.is_demo && query.data.items.length === 0 ? (
            <Notice tone="danger" title="No observation provider is configured">
              <p>{query.data.message}</p>
            </Notice>
          ) : null}

          <RainfallChart observed={query.data.observed} forecast={query.data.forecast} />

          <div className="split-figures">
            <section className="figure-card" aria-labelledby="observed-heading">
              <div className="figure-card__head">
                <CloudRain size={16} aria-hidden="true" />
                <h2 id="observed-heading">Observed records</h2>
                <Status state={query.data.source_state} />
              </div>
              <p>
                Measurements attributed to a provider. Values are hourly millimetres and are never
                aggregated across units or resolutions here.
              </p>
              <dl className="meta-list">
                <dt>Records</dt>
                <dd>{query.data.observed.length}</dd>
                <dt>Latest observation</dt>
                <dd>{formatTimestamp(query.data.observed.at(-1)?.observed_at)}</dd>
                <dt>Provider</dt>
                <dd>{query.data.observed[0]?.provider ?? 'Not supplied'}</dd>
                <dt>Freshness</dt>
                <dd>{query.data.observed[0]?.freshness ?? 'unknown'}</dd>
              </dl>
              <ProvenanceTable records={query.data.observed} caption="Observed record provenance" />
            </section>

            <section className="figure-card" aria-labelledby="forecast-heading">
              <div className="figure-card__head">
                <CloudSun size={16} aria-hidden="true" />
                <h2 id="forecast-heading">Forecast records</h2>
                <Status state={query.data.source_state} />
              </div>
              <p>
                Forecast records are shown separately and are never merged into observed totals or
                presented as measurements.
              </p>
              <dl className="meta-list">
                <dt>Records</dt>
                <dd>{query.data.forecast.length}</dd>
                <dt>Issued</dt>
                <dd>{formatTimestamp(query.data.forecast[0]?.issued_at)}</dd>
                <dt>Coverage window</dt>
                <dd>
                  {formatTimestamp(query.data.forecast[0]?.valid_from)} —{' '}
                  {formatTimestamp(query.data.forecast.at(-1)?.valid_to)}
                </dd>
                <dt>Units</dt>
                <dd>{query.data.forecast[0]?.unit ?? 'not stated'}</dd>
              </dl>
              <ProvenanceTable records={query.data.forecast} caption="Forecast record provenance" />
            </section>
          </div>

          <Notice tone="info" title="How to read this page">
            <p>
              No terrain, river-gauge or soil-moisture values are shown because no verified
              connector supplies them. The Data health page reports each of those capabilities as
              unconfigured.
            </p>
          </Notice>
        </>
      ) : null}
    </div>
  );
}
