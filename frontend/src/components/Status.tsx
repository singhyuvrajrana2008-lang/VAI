import { AlertTriangle, CircleCheck, Info, LoaderCircle, CloudOff } from 'lucide-react';
import type { ReactNode } from 'react';
import { stateLabel } from '../lib/format';

const TONE: Record<string, string> = {
  live: 'ok',
  validated: 'ok',
  low: 'neutral',
  demo: 'demo',
  demo_synthetic: 'demo',
  stale: 'warn',
  partial: 'warn',
  moderate: 'warn',
  high: 'warn',
  very_high: 'alert',
  insufficient_data: 'warn',
  degraded: 'warn',
  unavailable: 'alert',
  error: 'alert',
};

export function Status({ state, label }: { state: string; label?: string }) {
  const tone = TONE[state] ?? 'neutral';
  return (
    <span className={`status status--${tone}`} title={`Source state: ${state}`}>
      <i aria-hidden="true" />
      {label ?? stateLabel(state)}
    </span>
  );
}

export function DemoTag({ children = 'DEMO' }: { children?: ReactNode }) {
  return <span className="demo-tag">{children}</span>;
}

export function LoadingPanel({ message = 'Requesting source-backed data…' }: { message?: string }) {
  return (
    <div className="state-panel" role="status" aria-live="polite">
      <LoaderCircle className="spin" size={20} aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

export function ErrorPanel({
  title = 'Request failed',
  message,
  onRetry,
  requestId,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
  requestId?: string;
}) {
  return (
    <div className="state-panel state-panel--error" role="alert">
      <CloudOff size={20} aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <p>{message}</p>
        {requestId ? <code>request {requestId}</code> : null}
      </div>
      {onRetry ? (
        <button type="button" className="ghost-button" onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  );
}

export function EmptyPanel({
  title,
  children,
  icon,
  action,
}: {
  title: string;
  children?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty-panel">
      {icon ?? <Info size={22} aria-hidden="true" />}
      <h2>{title}</h2>
      {children ? <div className="empty-panel__copy">{children}</div> : null}
      {action}
    </div>
  );
}

export function Notice({
  tone = 'info',
  title,
  children,
}: {
  tone?: 'info' | 'warn' | 'danger';
  title: string;
  children?: ReactNode;
}) {
  const Icon = tone === 'info' ? Info : tone === 'warn' ? AlertTriangle : CloudOff;
  return (
    <div className={`notice notice--${tone}`} role={tone === 'danger' ? 'alert' : undefined}>
      <Icon size={18} aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        {children ? <div className="notice__body">{children}</div> : null}
      </div>
    </div>
  );
}

export function CoverageBar({ available, required }: { available: number; required: number }) {
  const safeRequired = Math.max(required, 1);
  const percent = Math.min(100, Math.round((available / safeRequired) * 100));
  return (
    <div className="coverage" aria-label={`${available} of ${required} required inputs available`}>
      <div className="coverage__track">
        <span style={{ width: `${percent}%` }} />
      </div>
      <span className="coverage__label">
        {available}/{required} required
      </span>
    </div>
  );
}

export function VerifiedBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <span className="badge badge--ok">
      <CircleCheck size={13} aria-hidden="true" /> Verified
    </span>
  ) : (
    <span className="badge badge--warn">
      <AlertTriangle size={13} aria-hidden="true" /> Not verified
    </span>
  );
}
