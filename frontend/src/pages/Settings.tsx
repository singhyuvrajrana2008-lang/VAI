import { useQuery } from '@tanstack/react-query';
import { ArrowRight, KeyRound, LogIn, LogOut, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router';
import { api, API_BASE } from '../lib/api';
import { useAuth } from '../lib/auth';
import { PageHeader } from '../components/PageHeader';
import { ErrorPanel, LoadingPanel, Notice, Status } from '../components/Status';
import { formatTimestamp } from '../lib/format';

const MAPS_CONFIGURED = Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);

export function Settings() {
  const auth = useAuth();
  const health = useQuery({ queryKey: ['health'], queryFn: api.health, staleTime: 30_000 });
  const sources = useQuery({ queryKey: ['sources'], queryFn: api.sources, staleTime: 30_000 });

  return (
    <div className="page">
      <PageHeader
        eyebrow="ACCOUNT / CONFIGURATION"
        title="Settings and integrations"
        copy="Only controls that actually work appear here. Configuration status reports presence, never credential values."
      />

      {health.error ? (
        <ErrorPanel
          title="Configuration status unavailable"
          message={(health.error as Error).message}
          onRetry={() => void health.refetch()}
        />
      ) : null}
      {health.isLoading ? <LoadingPanel message="Checking configuration…" /> : null}

      <div className="settings-grid">
        <section className="settings-card" aria-labelledby="account-heading">
          <div className="settings-card__head">
            <ShieldCheck size={16} aria-hidden="true" />
            <h2 id="account-heading">Account</h2>
          </div>

          {!auth.configured ? (
            <>
              <p>
                Supabase Auth is not configured for this build. The dashboard is usable in
                demo mode; private history and subscriptions are unavailable.
              </p>
              <Notice tone="info" title="No simulated sign-in">
                <p>
                  RidgeWatch will never display a fake authenticated user. Configuration steps are
                  listed in the project README.
                </p>
              </Notice>
            </>
          ) : auth.loading ? (
            <LoadingPanel message="Checking your session…" />
          ) : auth.user ? (
            <>
              <dl className="meta-list">
                <dt>Email</dt>
                <dd>{auth.user.email ?? 'Not supplied by provider'}</dd>
                <dt>User ID</dt>
                <dd>
                  <code>{auth.user.id}</code>
                </dd>
                <dt>Last sign-in</dt>
                <dd>{formatTimestamp(auth.user.last_sign_in_at)}</dd>
                <dt>Email confirmed</dt>
                <dd>{auth.user.email_confirmed_at ? formatTimestamp(auth.user.email_confirmed_at) : 'Not confirmed'}</dd>
              </dl>
              <button type="button" className="ghost-button" onClick={() => void auth.signOut()}>
                <LogOut size={14} aria-hidden="true" /> Sign out
              </button>
              <p className="settings-card__note">
                Account-scoped history and subscriptions additionally require verified backend
                persistence; the History page reports its current state.
              </p>
            </>
          ) : (
            <>
              <p>You are not signed in. Public catchment and demo views remain available.</p>
              <Link to="/login" className="text-link">
                <LogIn size={14} aria-hidden="true" /> Sign in or create an account
              </Link>
            </>
          )}
        </section>

        <section className="settings-card" aria-labelledby="config-heading">
          <div className="settings-card__head">
            <KeyRound size={16} aria-hidden="true" />
            <h2 id="config-heading">Runtime configuration</h2>
          </div>
          <ul className="config-list">
            <li>
              <span>API base URL</span>
              <code>{API_BASE}</code>
            </li>
            <li>
              <span>API version</span>
              <code>{health.data?.version ?? 'Unavailable'}</code>
            </li>
            <li>
              <span>Service mode</span>
              <Status state={health.data?.config.demo_mode ? 'demo' : 'live'} />
            </li>
            <li>
              <span>Supabase Auth</span>
              <Status state={health.data?.authentication === 'unavailable' ? 'unavailable' : 'partial'} label={health.data?.authentication === 'unavailable' ? 'NOT CONFIGURED' : 'CONFIGURED, UNVERIFIED'} />
            </li>
            <li>
              <span>Supabase persistence</span>
              <Status state={health.data?.persistence === 'unavailable' ? 'unavailable' : 'partial'} label={health.data?.persistence === 'unavailable' ? 'NOT CONFIGURED' : 'CONFIGURED, UNVERIFIED'} />
            </li>
            <li>
              <span>Google Maps browser key</span>
              <Status state={MAPS_CONFIGURED ? 'partial' : 'unavailable'} label={MAPS_CONFIGURED ? 'CONFIGURED' : 'NOT CONFIGURED'} />
            </li>
          </ul>
          <p className="settings-card__note">
            A configured key does not prove a working provider: API enablement, billing, key
            restrictions and quotas are separate provider-console steps.
          </p>
        </section>

        <section className="settings-card" aria-labelledby="sources-heading">
          <h2 id="sources-heading">Source connections</h2>
          {sources.data ? (
            <ul className="config-list">
              {sources.data.items.map((source) => (
                <li key={source.capability}>
                  <span>{source.label}</span>
                  <Status state={source.state} />
                </li>
              ))}
            </ul>
          ) : (
            <LoadingPanel />
          )}
          <Link to="/data-health" className="text-link">
            Open source health <ArrowRight size={13} aria-hidden="true" />
          </Link>
        </section>

        <section className="settings-card" aria-labelledby="env-heading">
          <h2 id="env-heading">Where configuration belongs</h2>
          <ul className="plain-list">
            <li>
              Frontend public values: <code>frontend/.env.local</code> —{' '}
              <code>VITE_API_BASE_URL</code>, <code>VITE_GOOGLE_MAPS_API_KEY</code>,{' '}
              <code>VITE_SUPABASE_URL</code>, <code>VITE_SUPABASE_ANON_KEY</code>.
            </li>
            <li>
              Backend secrets: <code>backend/.env</code> — <code>SUPABASE_URL</code>,{' '}
              <code>SUPABASE_SERVICE_ROLE_KEY</code>, plus source credentials when a connector
              exists.
            </li>
            <li>
              Never place a service-role key in a <code>VITE_</code> variable or the browser
              bundle.
            </li>
            <li>
              Run the configuration doctor before starting: <code>python scripts/check_env.py</code>.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
