import { Activity, Bell, BookOpen, CloudRain, Database, FileClock, Gauge, LogIn, Map, Settings, ShieldAlert, Waves } from 'lucide-react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Status } from './Status';

const OPERATIONS = [
  ['/', 'Overview', Map],
  ['/catchments', 'Catchments', Gauge],
  ['/rainfall', 'Rainfall', CloudRain],
  ['/warnings', 'Official warnings', Bell],
  ['/assessments', 'Assessments', Activity],
] as const;

const EVIDENCE = [
  ['/data-health', 'Data health', Database],
  ['/methodology', 'Methodology', BookOpen],
] as const;

const ACCOUNT = [
  ['/history', 'History', FileClock],
  ['/settings', 'Settings', Settings],
] as const;

export function Layout() {
  const auth = useAuth();
  const location = useLocation();
  const health = useQuery({ queryKey: ['health'], queryFn: api.health, staleTime: 60_000 });
  const isDemo = health.data?.is_demo ?? health.data?.config.demo_fixtures;

  return (
    <div className="shell">
      <aside className="rail">
        <Link to="/" className="brand" aria-label="RidgeWatch overview">
          <span className="mark" aria-hidden="true">RW</span>
          <span>
            <b>RidgeWatch</b>
            <small>CATCHMENT INTELLIGENCE</small>
          </span>
        </Link>

        <nav aria-label="Operations">
          <p className="rail__section">OPERATIONS</p>
          {OPERATIONS.map(([to, label, Icon]) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'active' : undefined)}>
              <Icon size={15} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
          <p className="rail__section">EVIDENCE</p>
          {EVIDENCE.map(([to, label, Icon]) => (
            <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : undefined)}>
              <Icon size={15} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
          <p className="rail__section">ACCOUNT</p>
          {ACCOUNT.map(([to, label, Icon]) => (
            <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : undefined)}>
              <Icon size={15} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="rail__account">
          {auth.configured ? (
            auth.user ? (
              <>
                <span className="rail__email" title={auth.user.email ?? ''}>
                  {auth.user.email}
                </span>
                <button type="button" onClick={() => void auth.signOut()} className="rail__link">
                  Sign out
                </button>
              </>
            ) : (
              <Link to="/login" state={{ from: location.pathname }} className="rail__link">
                <LogIn size={14} aria-hidden="true" /> Sign in
              </Link>
            )
          ) : (
            <span className="rail__email">Auth not configured</span>
          )}
        </div>

        <div className="rail-note">
          <ShieldAlert size={16} aria-hidden="true" />
          <b>Research prototype</b>
          <p>Not an official warning service and not evacuation guidance.</p>
        </div>
      </aside>

      <div className="content">
        <div className={`mode-strip ${isDemo ? 'mode-strip--demo' : ''}`} role="status">
          <Status state={isDemo ? 'demo' : 'live'} />
          <span>
            {isDemo
              ? 'DEMO DATA — synthetic fixtures. No live provider is configured; values are not observations.'
              : 'LIVE MODE — no verified provider is configured yet, so data views report unavailability.'}
          </span>
          <span className="mode-strip__api">
            <Waves size={13} aria-hidden="true" />
            {health.isError ? 'API unreachable' : health.isLoading ? 'Checking API…' : `API v${health.data?.version ?? '—'}`}
          </span>
        </div>
        <main>
          <Outlet />
        </main>
        <footer className="site-footer">
          <span>RidgeWatch · experimental decision-support prototype</span>
          <span>Times shown in UTC unless a record states otherwise.</span>
        </footer>
      </div>
    </div>
  );
}
