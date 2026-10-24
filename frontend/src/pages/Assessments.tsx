import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, FlaskConical, Plus, RefreshCw } from 'lucide-react';
import { Link } from 'react-router';
import { api } from '../lib/api';
import { PageHeader } from '../components/PageHeader';
import { EmptyPanel, ErrorPanel, LoadingPanel, Notice, Status } from '../components/Status';
import { formatTimestamp } from '../lib/format';

export function Assessments() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['assessments'],
    queryFn: api.assessments,
    staleTime: 0,
  });

  return (
    <div className="page page--report">
      <PageHeader
        eyebrow="EXPERIMENTAL ASSESSMENTS / RECORDS"
        title="Assessments"
        copy="Every assessment records its status, catchment, coverage, reason codes and evidence. Process-memory records are shown separately from authenticated history."
        aside={
          <div className="page-head__links">
            <Link to="/assessments/new" className="primary primary--inline">
              <Plus size={14} aria-hidden="true" /> New assessment
            </Link>
            <Link to="/history" className="text-link">
              Authenticated history <ArrowRight size={13} aria-hidden="true" />
            </Link>
          </div>
        }
      />

      {query.data ? (
        <Notice tone="warn" title="These records are not private history">
          <p>{query.data.message}</p>
        </Notice>
      ) : null}

      <div className="health-toolbar">
        <span>
          {query.data
            ? `${query.data.count} record${query.data.count === 1 ? '' : 's'} in this API process`
            : 'Loading records…'}
        </span>
        {query.data ? <span>Storage {query.data.persistence}</span> : null}
        <button
          type="button"
          className="ghost-button"
          onClick={() => void queryClient.invalidateQueries({ queryKey: ['assessments'] })}
        >
          <RefreshCw size={14} aria-hidden="true" /> Refresh
        </button>
      </div>

      {query.isLoading ? <LoadingPanel message="Loading assessments…" /> : null}
      {query.error ? (
        <ErrorPanel
          title="Assessments unavailable"
          message={(query.error as Error).message}
          onRetry={() => void query.refetch()}
        />
      ) : null}

      {query.data && query.data.items.length === 0 ? (
        <EmptyPanel
          title="No assessments in this API process"
          icon={<FlaskConical size={22} aria-hidden="true" />}
          action={
            <Link to="/assessments/new" className="text-link">
              Request an assessment <ArrowRight size={14} aria-hidden="true" />
            </Link>
          }
        >
          <p>
            Nothing has been assessed since this API started. An empty list is not a low-risk
            result, and a restart clears process-memory records.
          </p>
        </EmptyPanel>
      ) : null}

      {query.data && query.data.items.length > 0 ? (
        <div className="table-scroll">
          <table className="data-table data-table--assessments">
            <caption className="sr-only">Assessments issued by this API process</caption>
            <thead>
              <tr>
                <th scope="col">Issued</th>
                <th scope="col">Catchment</th>
                <th scope="col">Status</th>
                <th scope="col">Model</th>
                <th scope="col">Source</th>
                <th scope="col">Storage</th>
                <th scope="col">
                  <span className="sr-only">Open evidence</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {query.data.items.map((assessment) => (
                <tr key={assessment.assessment_id}>
                  <th scope="row">
                    <time dateTime={assessment.issued_at}>
                      {formatTimestamp(assessment.issued_at)}
                    </time>
                    <code>{assessment.assessment_id.slice(0, 8)}</code>
                  </th>
                  <td>{assessment.catchment_id}</td>
                  <td>
                    <Status state={assessment.status} />
                  </td>
                  <td>
                    <code>{assessment.model_version}</code>
                  </td>
                  <td>{assessment.is_demo ? <Status state="demo" /> : 'Live inputs'}</td>
                  <td>
                    {assessment.persisted
                      ? assessment.persistence
                      : `${assessment.persistence} (not durable)`}
                  </td>
                  <td>
                    <Link
                      to={`/assessments/${assessment.assessment_id}`}
                      className="row-link"
                      aria-label={`Open evidence for assessment ${assessment.assessment_id}`}
                    >
                      <ArrowRight size={15} aria-hidden="true" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <Notice tone="info" title="How to get durable, private records">
        <p>
          Configure Supabase Auth and persistence, sign in, and request an assessment. The API
          verifies your access token before writing, then returns only your own records through{' '}
          <code>/api/v1/history</code>. This path is implemented but unverified against a live
          project in this environment.
        </p>
      </Notice>
    </div>
  );
}
