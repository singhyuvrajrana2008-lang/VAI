import { ArrowRight, FlaskConical } from 'lucide-react';
import { Link } from 'react-router';
import type { Assessment } from '../lib/schemas';
import { formatTimestamp } from '../lib/format';
import { CoverageBar, Status } from './Status';

export function AssessmentPanel({
  assessment,
  catchmentName,
  onOpen,
}: {
  assessment?: Assessment;
  catchmentName?: string;
  onOpen?: string;
}) {
  if (!assessment) {
    return (
      <section className="assessment-panel assessment-panel--empty" aria-labelledby="assessment-empty">
        <div className="assessment-panel__head">
          <span className="experiment">
            <FlaskConical size={12} aria-hidden="true" /> EXPERIMENTAL
          </span>
          <Status state="unavailable" label="NOT RUN" />
        </div>
        <h2 id="assessment-empty">No assessment requested</h2>
        <p>
          Run an assessment to see whether the backend has eligible evidence. A missing result is
          not a low-risk signal. No score is invented for display.
        </p>
        <ul className="plain-list">
          <li>Baseline: rainfall accumulation, version v0.1</li>
          <li>Required input: observed rainfall only</li>
          <li>Not evaluated against historical flood events</li>
        </ul>
      </section>
    );
  }

  return (
    <section className="assessment-panel" aria-labelledby="assessment-heading">
      <div className="assessment-panel__head">
        <span className="experiment">
          <FlaskConical size={12} aria-hidden="true" /> EXPERIMENTAL
        </span>
        <Status state={assessment.status} />
      </div>
      <div className="assessment-panel__body">
        <div>
          <p className="kicker">ASSESSMENT RESULT</p>
          <h2 id="assessment-heading">
            {assessment.status === 'insufficient_data'
              ? 'Insufficient eligible evidence'
              : assessment.status === 'degraded'
                ? 'Evidence incomplete — degraded'
                : `Band: ${assessment.status.replace('_', ' ')}`}
          </h2>
          <p>
            {assessment.score === null
              ? 'No numeric risk index is returned. A null score is not zero risk.'
              : 'A numeric score was returned; check its semantics before interpretation.'}
          </p>
          <p className="assessment-panel__semantics">
            Score semantics: <code>{assessment.score_semantics}</code>
          </p>
        </div>
        <dl className="meta-list meta-list--tight">
          <dt>Catchment</dt>
          <dd>{catchmentName ?? assessment.catchment_id}</dd>
          <dt>Model</dt>
          <dd>
            <code>{assessment.model_version}</code>
          </dd>
          <dt>Issued</dt>
          <dd>{formatTimestamp(assessment.issued_at)}</dd>
          <dt>Storage</dt>
          <dd>{assessment.persisted ? assessment.persistence : `${assessment.persistence} (not durable)`}</dd>
        </dl>
      </div>

      <CoverageBar
        available={assessment.data_coverage.available_inputs}
        required={assessment.data_coverage.required_inputs}
      />

      <div className="reason-codes" aria-label="Reason codes">
        {assessment.reason_codes.map((code) => (
          <code key={code}>{code}</code>
        ))}
      </div>

      {assessment.data_coverage.missing.length > 0 || assessment.data_coverage.stale.length > 0 ? (
        <ul className="assessment-gaps">
          {assessment.data_coverage.missing.map((name) => (
            <li key={`missing-${name}`}>
              <b>Missing</b> {name}
            </li>
          ))}
          {assessment.data_coverage.stale.map((name) => (
            <li key={`stale-${name}`}>
              <b>Stale</b> {name}
            </li>
          ))}
        </ul>
      ) : null}

      <p className="disclaimer">{assessment.disclaimer}</p>

      {onOpen ? (
        <Link to={onOpen} className="text-link">
          Open evidence report <ArrowRight size={13} aria-hidden="true" />
        </Link>
      ) : null}
    </section>
  );
}
