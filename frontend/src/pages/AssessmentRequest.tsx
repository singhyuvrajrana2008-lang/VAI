import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, FlaskConical } from 'lucide-react';
import { Link } from 'react-router';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { AssessmentPanel } from '../components/AssessmentPanel';
import { CatchmentSelect } from '../components/CatchmentSelect';
import { PageHeader } from '../components/PageHeader';
import { ErrorPanel, LoadingPanel, Notice, Status } from '../components/Status';
import { useSelectedCatchment } from '../lib/hooks';

const RULES = [
  {
    title: 'Eligibility first',
    copy: 'The baseline needs observed rainfall within the freshness window. Demo fixtures are exempt from wall-clock freshness but stay labelled DEMO.',
  },
  {
    title: 'No evidence, no band',
    copy: 'If rainfall is missing or stale the status is insufficient_data. A null score is returned and never treated as zero risk.',
  },
  {
    title: 'Band, not probability',
    copy: 'The 3-hour accumulation is mapped to a documented threshold band. No calibrated probability or numeric risk index exists.',
  },
];

export function AssessmentRequest() {
  const selection = useSelectedCatchment();
  const auth = useAuth();
  const accessToken = auth.session?.access_token;
  const mutation = useMutation({
    mutationFn: (id: string) => api.assess(id, accessToken),
  });
  const error = mutation.error instanceof ApiError ? mutation.error : null;

  return (
    <div className="page page--report">
      <PageHeader
        eyebrow="EXPERIMENTAL BASELINE / REQUEST"
        title="Request an assessment"
        copy="Assessments are produced only by the deterministic backend baseline. The interface never computes or upgrades a risk band, and an LLM is not used anywhere in this flow."
        aside={
          <div className="page-head__links">
            <Link to="/assessments" className="text-link">
              <ArrowLeft size={13} aria-hidden="true" /> All assessments
            </Link>
            <Link to="/methodology" className="text-link">
              Read the methodology <ArrowRight size={13} aria-hidden="true" />
            </Link>
          </div>
        }
      />

      <div className="rule-grid">
        {RULES.map((rule, index) => (
          <article key={rule.title} className="rule-card">
            <span className="rule-card__index">{String(index + 1).padStart(2, '0')}</span>
            <h2>{rule.title}</h2>
            <p>{rule.copy}</p>
          </article>
        ))}
      </div>

      <div className="ops-bar">
        <CatchmentSelect
          catchments={selection.catchments}
          value={selection.selectedId}
          onChange={selection.select}
          disabled={selection.isLoading}
        />
        <button
          type="button"
          className="primary primary--inline"
          onClick={() => selection.selectedId && mutation.mutate(selection.selectedId)}
          disabled={!selection.selectedId || mutation.isPending}
        >
          {mutation.isPending ? 'Running baseline…' : 'Run assessment'}
          <ArrowRight size={15} aria-hidden="true" />
        </button>
        {mutation.data ? <Status state={mutation.data.status} /> : null}
      </div>

      {selection.error ? <ErrorPanel message={(selection.error as Error).message} /> : null}
      {mutation.isPending ? <LoadingPanel message="Evaluating eligible inputs…" /> : null}
      {error ? (
        <ErrorPanel
          title={error.status === 429 ? 'Rate limited' : 'Assessment failed'}
          message={error.message}
          requestId={error.requestId}
          onRetry={() => selection.selectedId && mutation.mutate(selection.selectedId)}
        />
      ) : null}

      <div className="assessment-layout">
        <AssessmentPanel
          assessment={mutation.data}
          catchmentName={selection.selected?.name}
          onOpen={mutation.data ? `/assessments/${mutation.data.assessment_id}` : undefined}
        />

        <aside className="assessment-aside">
          <div className="assessment-aside__head">
            <FlaskConical size={16} aria-hidden="true" />
            <h2>What the backend evaluated</h2>
          </div>
          <ul className="plain-list">
            <li>Inputs are read from the catchment observation endpoint.</li>
            <li>Freshness windows: rainfall 3 h, forecast 6 h, river stage 2 h, soil moisture 24 h.</li>
            <li>Only observed rainfall changes the band in v0.1.</li>
            <li>Reason codes record which threshold or gap condition applied.</li>
            <li>Every production and response keeps its provider and time metadata.</li>
          </ul>
          {mutation.data ? (
            <p className="assessment-aside__note">
              Assessment <code>{mutation.data.assessment_id}</code> is{' '}
              {mutation.data.persisted ? 'stored in Supabase' : 'held in API process memory only'}.
              {!mutation.data.persisted
                ? ' It disappears on restart and is not private history.'
                : ' Owner-scoped history requires that persistence is verified.'}
            </p>
          ) : null}
          <Notice tone="info" title="Saved history depends on persistence">
            <p>
              Process-memory assessments are visible to anyone using this API instance. Signing in
              with configured Supabase persistence stores owner-scoped history instead.
            </p>
          </Notice>
          {mutation.data ? (
            <Link to="/assessments" className="text-link">
              View all assessments <ArrowRight size={13} aria-hidden="true" />
            </Link>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
