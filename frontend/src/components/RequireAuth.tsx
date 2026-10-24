import type { ReactNode } from 'react';
import { ArrowRight, LogIn, ShieldQuestion } from 'lucide-react';
import { Link, Navigate, useLocation } from 'react-router';
import { useAuth } from '../lib/auth';
import { EmptyPanel, LoadingPanel, Notice } from './Status';
import { PageHeader } from './PageHeader';

export function AuthNotConfigured({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="page">
      <PageHeader eyebrow="ACCOUNT / CONFIGURATION REQUIRED" title={title} copy={copy} />
      <EmptyPanel
        title="Authentication is not configured"
        icon={<ShieldQuestion size={22} aria-hidden="true" />}
        action={
          <Link to="/" className="text-link">
            Continue in demo mode <ArrowRight size={14} aria-hidden="true" />
          </Link>
        }
      >
        <p>
          No Supabase credentials are present at build time, so RidgeWatch cannot create or verify
          an account. There is no simulated login and no demo user identity.
        </p>
      </EmptyPanel>
      <Notice tone="info" title="What unlocks this page">
        <p>
          Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> for the
          frontend, plus <code>SUPABASE_URL</code> and <code>SUPABASE_SERVICE_ROLE_KEY</code> for
          the API. Then apply the migration in <code>supabase/migrations/</code> and configure the
          auth redirect URLs described in <code>README.md</code>.
        </p>
      </Notice>
    </div>
  );
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const location = useLocation();

  if (!auth.configured) {
    return (
      <AuthNotConfigured
        title="Account access requires configuration"
        copy="Private history and subscriptions are only available to a verified Supabase user. Without configuration, the public dashboard stays usable in demo mode."
      />
    );
  }
  if (auth.loading) return <LoadingPanel message="Checking your session…" />;
  if (!auth.user) {
    return (
      <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />
    );
  }
  return <>{children}</>;
}

export function SignedOutPrompt({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="page">
      <PageHeader eyebrow="ACCOUNT REQUIRED" title={title} copy={copy} />
      <EmptyPanel title="Sign in to continue" icon={<LogIn size={22} aria-hidden="true" />} action={<Link to="/login" className="text-link">Go to sign in <ArrowRight size={14} aria-hidden="true" /></Link>}>
        <p>This view is scoped to the authenticated owner. RidgeWatch does not invent a user.</p>
      </EmptyPanel>
    </div>
  );
}
