import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Eye, EyeOff, KeyRound, ShieldAlert } from 'lucide-react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '../lib/auth';
import { safeRedirect } from '../lib/safeRedirect';
import { Notice, Status } from '../components/Status';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const MIN_PASSWORD_LENGTH = 8;

function AuthShell({
  eyebrow,
  title,
  copy,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  copy: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const auth = useAuth();
  return (
    <div className="auth-shell">
      <div className="auth-shell__brand">
        <Link to="/" className="brand brand--auth">
          <span className="mark" aria-hidden="true">RW</span>
          <span>
            <b>RidgeWatch</b>
            <small>CATCHMENT INTELLIGENCE</small>
          </span>
        </Link>
        <div>
          <p className="kicker">{eyebrow}</p>
          <h1>{title}</h1>
          <p>{copy}</p>
        </div>
        <div className="auth-shell__note">
          <ShieldAlert size={15} aria-hidden="true" />
          <p>
            Research prototype. Not an official warning service. Accounts protect private history
            and preferences only — never life-safety decisions.
          </p>
        </div>
      </div>

      <main className="auth-shell__main">
        <div className="auth-card">
          {!auth.configured ? (
            <Notice tone="warn" title="Authentication is not configured">
              <p>
                Supabase Auth credentials are absent, so this form cannot sign anyone in. Continue
                in demo mode to explore the public dashboard; no simulated account exists.
              </p>
            </Notice>
          ) : null}
          {children}
          <div className="auth-card__footer">
            <Link to="/" className="text-link">
              <ArrowLeft size={13} aria-hidden="true" /> Continue in demo mode
            </Link>
          </div>
          {footer}
        </div>
      </main>
    </div>
  );
}

function Field({
  id,
  label,
  type = 'text',
  value,
  onChange,
  autoComplete,
  error,
  description,
  disabled,
}: {
  id: string;
  label: string;
  type?: 'text' | 'email' | 'password';
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  error?: string;
  description?: string;
  disabled?: boolean;
}) {
  const [revealed, setRevealed] = useState(false);
  const describedBy = [description ? `${id}-description` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(' ');
  const isPassword = type === 'password';
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className={`field__control ${isPassword ? 'field__control--password' : ''}`}>
        <input
          id={id}
          name={id}
          type={isPassword && revealed ? 'text' : type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy || undefined}
          disabled={disabled}
          required
        />
        {isPassword ? (
          <button
            type="button"
            className="field__reveal"
            onClick={() => setRevealed((current) => !current)}
            aria-label={revealed ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
            aria-pressed={revealed}
          >
            {revealed ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}
          </button>
        ) : null}
      </div>
      {description ? (
        <p id={`${id}-description`} className="field__description">
          {description}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="field__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function Submit({ pending, disabled, children }: { pending: boolean; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      className="primary primary--inline auth-submit"
      disabled={pending || disabled}
    >
      {pending ? 'Working…' : children}
      <ArrowRight size={15} aria-hidden="true" />
    </button>
  );
}

export function Login() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [pending, setPending] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const redirect = safeRedirect(
    (location.state as { from?: string } | null)?.from ?? params.get('redirect'),
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending) return;
    const next: typeof errors = {};
    if (!EMAIL_PATTERN.test(email.trim())) next.email = 'Enter a valid email address.';
    if (password.length < 1) next.password = 'Enter your password.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setPending(true);
    const result = await auth.signIn(email.trim(), password);
    setPending(false);
    if (result.error) {
      setErrors({ form: result.error });
      setNeedsConfirmation(result.error.toLowerCase().includes('not confirmed'));
      return;
    }
    navigate(redirect, { replace: true });
  };

  if (auth.configured && auth.user) {
    return (
      <AuthShell eyebrow="ACCOUNT / SESSION ACTIVE" title="You are already signed in" copy="This session was restored from Supabase Auth.">
        <dl className="meta-list">
          <dt>Email</dt>
          <dd>{auth.user.email}</dd>
        </dl>
        <div className="auth-actions">
          <Link to="/" className="text-link">Continue to the dashboard</Link>
          <button type="button" className="ghost-button" onClick={() => void auth.signOut()}>
            Sign out
          </button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="ACCOUNT / SIGN IN"
      title="Sign in"
      copy="Accounts hold private history and catchment preferences. Public catchment and demo views stay available without an account."
      footer={
        <p className="auth-card__meta">
          No account? <Link to="/signup">Create one</Link>
        </p>
      }
    >
      <form onSubmit={submit} noValidate>
        <Field
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          error={errors.email}
          disabled={pending || !auth.configured}
        />
        <Field
          id="password"
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          error={errors.password}
          disabled={pending || !auth.configured}
        />
        {errors.form ? (
          <div role="alert" className="form-error">
            <Status state="error" label="SIGN-IN FAILED" />
            <p>{errors.form}</p>
            {needsConfirmation ? (
              <p className="form-error__hint">
                Confirm your email address using the link sent at sign-up, or request a new
                confirmation by signing up again with the same address.
              </p>
            ) : null}
          </div>
        ) : null}
        <Submit pending={pending} disabled={!auth.configured}>
          {auth.configured ? 'Sign in' : 'Sign-in unavailable'}
        </Submit>
      </form>
      <p className="auth-card__links">
        <Link to="/forgot-password">
          <KeyRound size={13} aria-hidden="true" /> Forgot your password?
        </Link>
      </p>
    </AuthShell>
  );
}

export function Signup() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirm?: string; form?: string }>({});
  const [pending, setPending] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending) return;
    const next: typeof errors = {};
    if (!EMAIL_PATTERN.test(email.trim())) next.email = 'Enter a valid email address.';
    if (password.length < MIN_PASSWORD_LENGTH) {
      next.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    if (confirm !== password) next.confirm = 'Passwords do not match.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setPending(true);
    const result = await auth.signUp(email.trim(), password);
    setPending(false);
    if (result.error) {
      setErrors({ form: result.error });
      return;
    }
    if (result.needsConfirmation) {
      setConfirmationSent(true);
      return;
    }
    navigate('/', { replace: true });
  };

  if (confirmationSent) {
    return (
      <AuthShell eyebrow="ACCOUNT / VERIFY EMAIL" title="Check your inbox" copy="A confirmation link was requested for your address.">
        <Notice tone="info" title="Email confirmation pending">
          <p>
            Your account is not active until the email address is confirmed. Follow the link in
            the email, which returns to <code>/auth/callback</code>. If it does not arrive, check
            spam or sign up again.
          </p>
        </Notice>
        <div className="auth-actions">
          <Link to="/login" className="text-link">Back to sign in</Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="ACCOUNT / CREATE"
      title="Create an account"
      copy="An account is required only for private history and subscriptions. Catchment and demo views stay public."
      footer={
        <p className="auth-card__meta">
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      }
    >
      <form onSubmit={submit} noValidate>
        <Field
          id="signup-email"
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          error={errors.email}
          disabled={pending || !auth.configured}
        />
        <Field
          id="signup-password"
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          description={`At least ${MIN_PASSWORD_LENGTH} characters. Your Supabase project may enforce extra rules.`}
          error={errors.password}
          disabled={pending || !auth.configured}
        />
        <Field
          id="signup-confirm"
          label="Confirm password"
          type="password"
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
          error={errors.confirm}
          disabled={pending || !auth.configured}
        />
        {errors.form ? (
          <div role="alert" className="form-error">
            <Status state="error" label="SIGN-UP FAILED" />
            <p>{errors.form}</p>
          </div>
        ) : null}
        <Submit pending={pending} disabled={!auth.configured}>
          {auth.configured ? 'Create account' : 'Sign-up unavailable'}
        </Submit>
      </form>
    </AuthShell>
  );
}

export function ForgotPassword() {
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending) return;
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    setError(null);
    setPending(true);
    const result = await auth.requestPasswordReset(email.trim());
    setPending(false);
    // Deliberately generic: never disclose whether the address is registered.
    setSent(true);
    if (result.error) setError(result.error);
  };

  return (
    <AuthShell
      eyebrow="ACCOUNT / RECOVERY"
      title="Reset your password"
      copy="Enter your account email and we will ask Supabase to send recovery instructions."
      footer={<p className="auth-card__meta"><Link to="/login">Back to sign in</Link></p>}
    >
      {sent ? (
        <Notice tone="info" title="Request received">
          <p>
            If an account exists for this address, a recovery email has been requested. The
            response is identical whether or not the address is registered.
          </p>
          {error ? <p role="alert">{error}</p> : null}
        </Notice>
      ) : (
        <form onSubmit={submit} noValidate>
          <Field
            id="recovery-email"
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
            error={error ?? undefined}
            disabled={pending || !auth.configured}
          />
          <Submit pending={pending} disabled={!auth.configured}>
            {auth.configured ? 'Request reset link' : 'Recovery unavailable'}
          </Submit>
        </form>
      )}
    </AuthShell>
  );
}

export function ResetPassword() {
  const auth = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirm?: string; form?: string }>({});
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending) return;
    const next: typeof errors = {};
    if (password.length < MIN_PASSWORD_LENGTH) next.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
    if (confirm !== password) next.confirm = 'Passwords do not match.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setPending(true);
    const result = await auth.updatePassword(password);
    setPending(false);
    if (result.error) {
      setErrors({ form: result.error });
      return;
    }
    setDone(true);
  };

  return (
    <AuthShell
      eyebrow="ACCOUNT / RECOVERY"
      title="Set a new password"
      copy="This page only works with a valid Supabase recovery session created by the email link."
      footer={<p className="auth-card__meta"><Link to="/login">Back to sign in</Link></p>}
    >
      {!auth.configured ? null : auth.loading ? (
        <Notice tone="info" title="Checking the recovery link">
          <p>Verifying your session with Supabase…</p>
        </Notice>
      ) : !auth.user ? (
        <Notice tone="danger" title="Recovery link invalid or expired">
          <p>
            No recovery session is active. Request a new reset email and open the newest link.
            RidgeWatch will not change a password without a verified session.
          </p>
          <p>
            <Link to="/forgot-password" className="text-link">Request a new link</Link>
          </p>
        </Notice>
      ) : done ? (
        <Notice tone="info" title="Password updated">
          <p>Your password has been changed for {auth.user.email}. You remain signed in on this device.</p>
          <p><Link to="/" className="text-link">Continue to the dashboard</Link></p>
        </Notice>
      ) : (
        <form onSubmit={submit} noValidate>
          <Field
            id="new-password"
            label="New password"
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            description={`At least ${MIN_PASSWORD_LENGTH} characters.`}
            error={errors.password}
            disabled={pending}
          />
          <Field
            id="new-password-confirm"
            label="Confirm new password"
            type="password"
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
            error={errors.confirm}
            disabled={pending}
          />
          {errors.form ? (
            <div role="alert" className="form-error">
              <Status state="error" label="RESET FAILED" />
              <p>{errors.form}</p>
            </div>
          ) : null}
          <Submit pending={pending}>Update password</Submit>
        </form>
      )}
    </AuthShell>
  );
}

export function AuthCallback() {
  const auth = useAuth();

  return (
    <AuthShell
      eyebrow="ACCOUNT / CALLBACK"
      title="Finishing sign-in"
      copy="Supabase returns here after email confirmation or a magic link."
    >
      {!auth.configured ? null : auth.loading ? (
        <Notice tone="info" title="Completing authentication">
          <p>Waiting for Supabase to establish the session…</p>
        </Notice>
      ) : auth.user ? (
        <div className="auth-callback">
          <Status state="live" label="SESSION ACTIVE" />
          <h2>Signed in as {auth.user.email}</h2>
          <p>Email confirmed: {auth.user.email_confirmed_at ? 'yes' : 'not yet reported'}.</p>
          <div className="auth-actions">
            <Link to="/" className="text-link">Continue to the dashboard <ArrowRight size={13} aria-hidden="true" /></Link>
            <button type="button" className="ghost-button" onClick={() => void auth.signOut()}>Sign out</button>
          </div>
        </div>
      ) : (
        <Notice tone="danger" title="This link could not be completed">
          <p>
            No session was created. The link may have expired or already been used. Request a new
            email or sign in again.
          </p>
          <p><Link to="/login" className="text-link">Go to sign in</Link></p>
        </Notice>
      )}
    </AuthShell>
  );
}
