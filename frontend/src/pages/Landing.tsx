import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  BellRing,
  ClipboardList,
  FlaskConical,
  MapPinned,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useDocumentTitle } from '../lib/hooks';
import { Status } from '../components/Status';

export function Landing() {
  useDocumentTitle('RidgeWatch — catchment rainfall intelligence');
  const auth = useAuth();
  const health = useQuery({ queryKey: ['health'], queryFn: api.health, staleTime: 60_000 });

  const apiReachable = !health.isError;
  const demo = health.data?.is_demo ?? true;

  return (
    <div className="landing">
      <header className="landing__nav">
        <Link to="/" className="brand brand--light" aria-label="RidgeWatch home">
          <span className="mark" aria-hidden="true">RW</span>
          <span>
            <b>RidgeWatch</b>
            <small>CATCHMENT INTELLIGENCE</small>
          </span>
        </Link>
        <nav aria-label="Public">
          <Link to="/methodology">Methodology</Link>
          <Link to="/data-health">Source status</Link>
          {auth.configured && auth.user ? (
            <Link to="/overview" className="landing__nav-cta">Open dashboard</Link>
          ) : (
            <>
              <Link to="/login">Sign in</Link>
              <Link to="/signup" className="landing__nav-cta">Create account</Link>
            </>
          )}
        </nav>
      </header>

      <main>
        <section className="landing__hero" aria-labelledby="landing-title">
          <div>
            <p className="kicker">EXPERIMENTAL DECISION SUPPORT / HILLY CATCHMENTS</p>
            <h1 id="landing-title">
              Rainfall conditions, with the evidence attached.
            </h1>
            <p className="landing__lede">
              RidgeWatch explores catchment-level flash-flood risk intelligence for hilly regions,
              starting with Himachal Pradesh. It shows what data exists, what is missing and which
              documented rule produced an experimental band — never a fabricated observation.
            </p>
            <div className="landing__actions">
              <Link to="/overview" className="primary primary--inline">
                Explore the demo <ArrowRight size={15} aria-hidden="true" />
              </Link>
              {auth.configured ? (
                <Link to={auth.user ? '/history' : '/login'} className="ghost-button">
                  {auth.user ? 'Your history' : 'Sign in'}
                </Link>
              ) : (
                <Link to="/login" className="ghost-button">
                  Authentication status
                </Link>
              )}
            </div>
            <div className="landing__status" role="status">
              <Status state={demo ? 'demo' : 'live'} />
              <span>
                {health.isLoading
                  ? 'Checking the API and configuration…'
                  : apiReachable
                    ? demo
                      ? 'Demo fixtures are served and labelled. No external provider is connected.'
                      : 'Live mode is active. No verified provider is configured, so data views report unavailability.'
                    : 'The API is not reachable from this page. Start the backend to explore the demo.'}
              </span>
            </div>
          </div>

          <aside className="landing__frame" aria-label="Prototype scope">
            <p className="kicker">PROTOTYPE SCOPE</p>
            <dl>
              <dt>Validated catchments</dt>
              <dd>None — demo outlines only</dd>
              <dt>Verified data providers</dt>
              <dd>0</dd>
              <dt>Model evaluation</dt>
              <dd>Not evaluated</dd>
              <dt>Official warnings</dt>
              <dd>Separate; no authority feed configured</dd>
              <dt>Baseline</dt>
              <dd>Rainfall accumulation v0.1</dd>
            </dl>
            <p className="landing__frame-note">
              These are limits, not achievements. See{' '}
              <Link to="/methodology">Methodology</Link> for the full record.
            </p>
          </aside>
        </section>

        <section className="landing__grid" aria-label="How RidgeWatch works">
          <article>
            <MapPinned size={20} aria-hidden="true" />
            <h2>Catchment first</h2>
            <p>
              Select a catchment to review its geometry provenance, observation coverage and
              freshness. A boundary is never drawn unless the API supplies it, and demo shapes are
              labelled as synthetic.
            </p>
          </article>
          <article>
            <BellRing size={20} aria-hidden="true" />
            <h2>Warnings stay separate</h2>
            <p>
              Authority notices keep their source, issue time and validity window. An unavailable
              feed is shown as unavailable — never as “no warnings”.
            </p>
          </article>
          <article>
            <FlaskConical size={20} aria-hidden="true" />
            <h2>Experimental by design</h2>
            <p>
              The deterministic baseline returns a band only when eligible evidence exists. A null
              score means insufficient data, never zero risk.
            </p>
          </article>
        </section>

        <section className="landing__split">
          <div>
            <h2>What this prototype will not do</h2>
            <ul className="landing__list">
              <li><ShieldAlert size={15} aria-hidden="true" /> Issue evacuation instructions or act as an official warning service.</li>
              <li><ShieldAlert size={15} aria-hidden="true" /> Invent rainfall, gauges, forecasts, warnings, flood events or model accuracy.</li>
              <li><ShieldAlert size={15} aria-hidden="true" /> Convert missing or stale inputs into a reassuring low-risk result.</li>
              <li><ShieldAlert size={15} aria-hidden="true" /> Let an LLM calculate or alter the risk band.</li>
            </ul>
          </div>
          <div>
            <h2>What is actually verified here</h2>
            <ul className="landing__list landing__list--ok">
              <li><ShieldCheck size={15} aria-hidden="true" /> Demo fixtures are deterministic, labelled and marked <code>is_demo</code>.</li>
              <li><ShieldCheck size={15} aria-hidden="true" /> Every observation keeps provider, unit and timestamps.</li>
              <li><ShieldCheck size={15} aria-hidden="true" /> Assessment evidence traces each input and reason code.</li>
              <li><ShieldCheck size={15} aria-hidden="true" /> Live data, persistence and model claims are reported as unverified until proven.</li>
            </ul>
          </div>
        </section>

        <section className="landing__cta" aria-labelledby="landing-cta">
          <div>
            <p className="kicker">NO CREDENTIALS REQUIRED</p>
            <h2 id="landing-cta">Open the demo console</h2>
            <p>
              The demo runs on two synthetic catchments. It is safe to explore every page,
              including the states where data is missing on purpose.
            </p>
          </div>
          <Link to="/overview" className="primary primary--inline">
            Explore the demo <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </section>
      </main>

      <footer className="landing__footer">
        <span>
          <ClipboardList size={13} aria-hidden="true" /> Research prototype — not an official
          warning service.
        </span>
        <span>Built on labelled demo data · API v{health.data?.version ?? '—'}</span>
      </footer>
    </div>
  );
}
