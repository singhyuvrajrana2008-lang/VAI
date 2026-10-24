import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, FileSearch, ShieldAlert } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { api, ApiError } from '../lib/api';
import { PageHeader } from '../components/PageHeader';
import { CoverageBar, EmptyPanel, ErrorPanel, LoadingPanel, Notice, Status } from '../components/Status';
import { formatNumber, formatTimestamp, stateLabel, variableLabel } from '../lib/format';

export function AssessmentDetail() {
  const { assessmentId = '' } = useParams();
  const query = useQuery({
    queryKey: ['assessment', assessmentId],
    queryFn: () => api.assessment(assessmentId),
    enabled: Boolean(assessmentId),
    retry: false,
  });
  const notFound = query.error instanceof ApiError && query.error.status === 404;

  return (
    <div className="page page--report">
      <PageHeader
        eyebrow="ASSESSMENT EVIDENCE / TRACEABILITY"
        title="Assessment evidence report"
        copy="Every included input, missing input and reason code is listed with its provider and timestamps. Observations, deterministic computation and interpretation are separated."
        aside={
          <Link to="/assessments" className="text-link">
            <ArrowLeft size={13} aria-hidden="true" /> Back to assessments
          </Link>
        }
      />

      {query.isLoading ? <LoadingPanel message="Loading assessment record…" /> : null}
      {query.error && !notFound ? (
        <ErrorPanel
          title="Assessment unavailable"
          message={(query.error as Error).message}
          onRetry={() => void query.refetch()}
        />
      ) : null}
      {notFound ? (
        <EmptyPanel
          title="Assessment not found"
          icon={<FileSearch size={22} aria-hidden="true" />}
          action={
            <Link to="/assessments" className="text-link">
              Request a new assessment <ArrowRight size={14} aria-hidden="true" />
            </Link>
          }
        >
          <p>
            No record exists for <code>{assessmentId}</code>. Assessments live in API process
            memory only and are lost when the backend restarts; persisted history is not
            configured.
          </p>
        </EmptyPanel>
      ) : null}

      {query.data ? (
        <article className="evidence-report">
          <header className="evidence-report__head">
            <div>
              <div className="evidence-report__tags">
                <span className="experiment">EXPERIMENTAL</span>
                <Status state={query.data.status} />
                {query.data.is_demo ? <Status state="demo" /> : null}
              </div>
              <h2>{query.data.status === 'insufficient_data' ? 'Insufficient eligible evidence' : `Band: ${stateLabel(query.data.status).toLowerCase()}`}</h2>
              <p>{query.data.disclaimer}</p>
            </div>
            <dl className="meta-list meta-list--tight">
              <dt>Assessment</dt>
              <dd>
                <code>{query.data.assessment_id}</code>
              </dd>
              <dt>Catchment</dt>
              <dd>
                <code>{query.data.catchment_id}</code>
              </dd>
              <dt>Model version</dt>
              <dd>
                <code>{query.data.model_version}</code>
              </dd>
              <dt>Issued</dt>
              <dd>{formatTimestamp(query.data.issued_at)}</dd>
              <dt>Score</dt>
              <dd>{query.data.score === null ? 'null (no numeric index)' : query.data.score}</dd>
              <dt>Semantics</dt>
              <dd>
                <code>{query.data.score_semantics}</code>
              </dd>
              <dt>Storage</dt>
              <dd>{query.data.persisted ? query.data.persistence : `${query.data.persistence} (non-durable)`}</dd>
            </dl>
          </header>

          <section className="evidence-section" aria-labelledby="coverage-heading">
            <h3 id="coverage-heading">1 · Input coverage</h3>
            <CoverageBar
              available={query.data.data_coverage.available_inputs}
              required={query.data.data_coverage.required_inputs}
            />
            <div className="coverage-lists">
              <div>
                <h4>Missing required</h4>
                <p>
                  {query.data.data_coverage.missing.length > 0
                    ? query.data.data_coverage.missing.join(', ')
                    : 'None reported'}
                </p>
              </div>
              <div>
                <h4>Stale required</h4>
                <p>
                  {query.data.data_coverage.stale.length > 0
                    ? query.data.data_coverage.stale.join(', ')
                    : 'None reported'}
                </p>
              </div>
              <div>
                <h4>Supporting inputs absent</h4>
                <p>
                  {query.data.data_coverage.supporting_missing.length > 0
                    ? query.data.data_coverage.supporting_missing.join(', ')
                    : 'None reported'}
                </p>
              </div>
            </div>
          </section>

          <section className="evidence-section" aria-labelledby="inputs-heading">
            <h3 id="inputs-heading">2 · Inputs considered</h3>
            {query.data.inputs.length === 0 ? (
              <p className="muted">
                No input records were returned with this assessment. That is why no band could be
                produced.
              </p>
            ) : (
              <div className="table-scroll">
                <table className="data-table data-table--inputs">
                  <caption className="sr-only">Inputs considered by the baseline</caption>
                  <thead>
                    <tr>
                      <th scope="col">Variable</th>
                      <th scope="col">Value</th>
                      <th scope="col">Provider</th>
                      <th scope="col">Observed / issued</th>
                      <th scope="col">Included</th>
                      <th scope="col">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {query.data.inputs.map((input) => (
                      <tr key={input.source_id ?? `${input.variable}-${input.reason}`}>
                        <th scope="row">
                          {input.label}
                          <code>{variableLabel(input.variable)}</code>
                        </th>
                        <td>{formatNumber(input.value, input.unit)}</td>
                        <td>{input.provider ?? 'Not supplied'}</td>
                        <td>{formatTimestamp(input.observed_at)}</td>
                        <td>{input.included ? 'Yes' : 'No'}</td>
                        <td>
                          <code>{input.reason}</code>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="evidence-section" aria-labelledby="reasons-heading">
            <h3 id="reasons-heading">3 · Reason codes</h3>
            <ul className="reason-list">
              {query.data.reason_codes.map((code) => (
                <li key={code}>
                  <code>{code}</code>
                </li>
              ))}
            </ul>
          </section>

          <section className="evidence-section" aria-labelledby="warnings-heading">
            <h3 id="warnings-heading">4 · Official warning records attached</h3>
            {query.data.warnings.length === 0 ? (
              <p className="muted">
                No warning records were attached. That is not evidence that no official warning
                exists.
              </p>
            ) : (
              <ul className="evidence-warnings">
                {query.data.warnings.map((warning) => (
                  <li key={warning.source_id}>
                    <div>
                      <Status state={warning.source_state} />
                      <time>{formatTimestamp(warning.issued_at)}</time>
                    </div>
                    <h4>{warning.title}</h4>
                    <p>{warning.provider}</p>
                    <p className="muted">
                      Valid {formatTimestamp(warning.valid_from)} — {formatTimestamp(warning.valid_to)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <Notice tone="info" title="Warnings are context, not model inputs">
              <p>
                Warning text never changes the RidgeWatch band. These records are displayed
                alongside the assessment and must be read from the issuing authority.
              </p>
            </Notice>
          </section>

          <section className="evidence-section" aria-labelledby="sources-heading">
            <h3 id="sources-heading">5 · Source records</h3>
            <div className="table-scroll">
              <table className="data-table data-table--provenance">
                <caption className="sr-only">Source observation records attached to this assessment</caption>
                <thead>
                  <tr>
                    <th scope="col">Variable</th>
                    <th scope="col">Provider</th>
                    <th scope="col">Observed</th>
                    <th scope="col">Fetched</th>
                    <th scope="col">State</th>
                    <th scope="col">Flags</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.sources.map((source) => (
                    <tr key={source.source_id}>
                      <td>{variableLabel(source.variable)}</td>
                      <td>{source.provider}</td>
                      <td>{formatTimestamp(source.observed_at ?? source.issued_at)}</td>
                      <td>{formatTimestamp(source.fetched_at)}</td>
                      <td>
                        <Status state={source.source_state} />
                      </td>
                      <td>{source.quality_flags.join(', ') || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <footer className="evidence-report__foot">
            <ShieldAlert size={16} aria-hidden="true" />
            <p>
              This report is a record of an experimental computation on the data shown. It is not
              an official warning, forecast or evacuation instruction.
            </p>
          </footer>
        </article>
      ) : null}
    </div>
  );
}
