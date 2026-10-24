import { useQuery } from '@tanstack/react-query';
import { ArrowRight, FileClock } from 'lucide-react';
import { Link } from 'react-router';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { PageHeader } from '../components/PageHeader';
import { RequireAuth } from '../components/RequireAuth';
import { EmptyPanel, ErrorPanel, LoadingPanel, Notice, Status } from '../components/Status';
import { formatTimestamp } from '../lib/format';

function HistoryContent() {
  const auth = useAuth();
  const token = auth.session?.access_token;
  const query = useQuery({
    queryKey: ['history', token],
    queryFn: () => api.history(token),
    enabled: Boolean(token),
    retry: false,
  });
  const error = query.error instanceof ApiError ? query.error : null;

  return (
    <div className="page page--report">
      <PageHeader
        eyebrow="PRIVATE RECORD / OWNER-SCOPED"
        title="Assessment history"
        copy="History belongs to the authenticated account. No other user's records are readable, and demo fixtures are never presented as saved private history."
      />

      {query.isLoading ? <LoadingPanel message="Requesting your history…" /> : null}

      {error ? (
        <ErrorPanel
          title={error.status === 503 ? 'Persistence is not available' : 'History request failed'}
          message={error.message}
          requestId={error.requestId}
          onRetry={() => void query.refetch()}
        />
      ) : null}

      {error?.status === 503 ? (
        <Notice tone="info" title="This is a server-side limitation, not an account problem">
          <p>
            Your session is valid, but the API could not read saved assessments. Supabase
            persistence is either not configured or has not been verified against a live project,
            so nothing is reported as saved.
          </p>
        </Notice>
      ) : null}

      {error?.status === 401 ? (
        <Notice tone="danger" title="Your session could not be verified">
          <p>
            The API rejected the access token. Sign out and sign in again to request a fresh
            session. No history is shown rather than falling back to an unauthenticated view.
          </p>
          <button type="button" className="ghost-button" onClick={() => void auth.signOut()}>
            Sign out
          </button>
        </Notice>
      ) : null}

      {!token ? (
        <ErrorPanel
          title="Session token unavailable"
          message="No access token is available, so authenticated history cannot be requested."
        />
      ) : null}

      {query.data && !error ? (
        query.data.items.length === 0 ? (
          <EmptyPanel
            title="No saved assessments yet"
            icon={<FileClock size={22} aria-hidden="true" />}
            action={
              <Link to="/assessments" className="text-link">
                Run an assessment <ArrowRight size={14} aria-hidden="true" />
              </Link>
            }
          >
            <p>No persisted record exists for this account. An empty list is not an error.</p>
          </EmptyPanel>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <caption className="sr-only">Your saved assessments</caption>
              <thead>
                <tr>
                  <th scope="col">Issued</th>
                  <th scope="col">Catchment</th>
                  <th scope="col">Status</th>
                  <th scope="col">Model</th>
                  <th scope="col">Demo</th>
                  <th scope="col"><span className="sr-only">Open</span></th>
                </tr>
              </thead>
              <tbody>
                {query.data.items.map((item) => (
                  <tr key={item.assessment_id}>
                    <td>{formatTimestamp(item.issued_at)}</td>
                    <td>{item.catchment_id}</td>
                    <td><Status state={item.status} /></td>
                    <td><code>{item.model_version}</code></td>
                    <td>{item.is_demo ? <Status state="demo" /> : 'No'}</td>
                    <td>
                      <Link to={`/assessments/${item.assessment_id}`} className="row-link">
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : null}
    </div>
  );
}

export function History() {
  return (
    <RequireAuth>
      <HistoryContent />
    </RequireAuth>
  );
}
