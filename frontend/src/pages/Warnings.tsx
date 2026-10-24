import { AlertTriangle, ExternalLink, ShieldAlert } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { CatchmentSelect } from '../components/CatchmentSelect';
import { EmptyPanel, ErrorPanel, LoadingPanel, Notice, Status } from '../components/Status';
import { formatTimestamp, isExpired } from '../lib/format';
import { useSelectedCatchment, useWarnings } from '../lib/hooks';

export function Warnings() {
  const selection = useSelectedCatchment();
  const query = useWarnings(selection.selectedId);

  return (
    <div className="page">
      <PageHeader
        eyebrow="AUTHORITATIVE SOURCES / CHRONOLOGICAL LOG"
        title="Official warning feed"
        copy="Authority notices remain separate from RidgeWatch estimates. Each record keeps its provider, issue time, validity window and geography. An unavailable feed is never presented as an all-clear."
        aside={
          <span className="source-note">
            <ShieldAlert size={14} aria-hidden="true" /> Always follow IMD / CWC / district
            instructions for safety decisions.
          </span>
        }
      />

      <div className="ops-bar">
        <CatchmentSelect
          catchments={selection.catchments}
          value={selection.selectedId}
          onChange={selection.select}
          disabled={selection.isLoading}
        />
        {query.data ? <Status state={query.data.source_state} /> : null}
        {query.data ? (
          <span className="ops-bar__units">
            Provider {query.data.provider_configured ? 'configured' : 'not configured'}
          </span>
        ) : null}
      </div>

      {selection.isLoading || query.isLoading ? <LoadingPanel message="Querying warning source…" /> : null}
      {query.error ? (
        <ErrorPanel
          title="Warning source request failed"
          message={(query.error as Error).message}
          onRetry={() => void query.refetch()}
        />
      ) : null}

      {!selection.isLoading && !selection.error && selection.catchments.length === 0 ? (
        <EmptyPanel
          title="No catchment configured"
          icon={<ShieldAlert size={22} aria-hidden="true" />}
        >
          <p>Warning records are requested per catchment. No catchment exists in the registry.</p>
        </EmptyPanel>
      ) : null}

      {query.data ? (
        <>
          {query.data.is_demo ? (
            <Notice tone="warn" title="Demo warning records">
              <p>{query.data.message}</p>
            </Notice>
          ) : null}

          {!query.data.provider_configured ? (
            <Notice
              tone={query.data.source_state === 'unavailable' || query.data.source_state === 'error' ? 'danger' : 'warn'}
              title="No verified warning provider is configured"
            >
              <p>
                RidgeWatch did not receive an authoritative response. This page therefore cannot
                tell you that no warning exists. Check the official IMD/CWC/district channels
                directly.
              </p>
            </Notice>
          ) : null}

          {query.data.items.length === 0 ? (
            <EmptyPanel
              title="No warning records were returned"
              icon={<AlertTriangle size={22} aria-hidden="true" />}
            >
              <p>{query.data.message}</p>
              <strong>This is not an authoritative “no warning” result.</strong>
            </EmptyPanel>
          ) : (
            <ol className="warning-log">
              {query.data.items.map((warning) => {
                const expired = isExpired(warning.valid_to);
                return (
                  <li key={warning.source_id} className="warning-log__row">
                    <div className="warning-log__time">
                      <time dateTime={warning.issued_at ?? undefined}>
                        {formatTimestamp(warning.issued_at)}
                      </time>
                      <Status state={warning.source_state} />
                    </div>
                    <div className="warning-log__body">
                      <p className="kicker">{warning.provider}</p>
                      <h2>{warning.title}</h2>
                      {warning.description ? <p>{warning.description}</p> : null}
                      <dl className="meta-list meta-list--inline">
                        <dt>Severity</dt>
                        <dd>{warning.severity ?? 'Not supplied'}</dd>
                        <dt>Valid from</dt>
                        <dd>{formatTimestamp(warning.valid_from)}</dd>
                        <dt>Valid to</dt>
                        <dd>
                          {formatTimestamp(warning.valid_to)}
                          {expired === true ? ' · expired' : expired === false ? ' · current window' : ''}
                        </dd>
                        <dt>Geography</dt>
                        <dd>
                          {typeof warning.geography.name === 'string'
                            ? warning.geography.name
                            : 'Not supplied'}
                        </dd>
                      </dl>
                      {warning.source_url ? (
                        <a
                          href={warning.source_url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="text-link"
                        >
                          Open source bulletin <ExternalLink size={13} aria-hidden="true" />
                        </a>
                      ) : (
                        <span className="muted">No source URL supplied</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </>
      ) : null}
    </div>
  );
}
