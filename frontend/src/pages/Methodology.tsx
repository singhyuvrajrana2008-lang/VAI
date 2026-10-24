import { PageHeader } from '../components/PageHeader';
import { Notice, Status } from '../components/Status';

export function Methodology() {
  return (
    <article className="page methodology">
      <PageHeader
        eyebrow="TECHNICAL NOTE / EVALUATION STATUS"
        title="What RidgeWatch can, and cannot, say"
        copy="A transparent baseline comes before model complexity. No predictive metric is shown because no event-level evaluation has been completed."
      />

      <div className="editorial">
        <aside aria-label="Contents">
          <b>CONTENTS</b>
          <ol>
            <li><a href="#context">Decision context</a></li>
            <li><a href="#baseline">Baseline v0.1</a></li>
            <li><a href="#thresholds">Thresholds</a></li>
            <li><a href="#evaluation">Evaluation status</a></li>
            <li><a href="#sources">Data sources</a></li>
            <li><a href="#limitations">Limitations</a></li>
          </ol>
          <div className="aside-status">
            <Status state="insufficient_data" label="NOT EVALUATED" />
            <p>No historical event set has been validated.</p>
          </div>
        </aside>

        <div className="editorial__body">
          <section id="context">
            <h2>01 / Decision context</h2>
            <p>
              RidgeWatch is research decision support for hilly catchments. It is not an official
              warning service, does not issue evacuation instructions, and must not replace IMD,
              CWC, district administration or disaster-management guidance. Every displayed value
              remains traceable to a provider, a demo fixture or a documented computation.
            </p>
            <blockquote>
              A rule-based band is not a probability. Calling it one would overstate what has been
              measured.
            </blockquote>
          </section>

          <section id="baseline">
            <h2>02 / Transparent baseline v0.1</h2>
            <p>
              The only implemented assessment path is a rainfall-accumulation baseline. It reads
              observed hourly rainfall for a catchment, finds the latest contiguous 3-hour window,
              sums it in millimetres, and maps that sum to a band. Forecast rainfall, river stage
              and soil moisture are recorded as supporting inputs but are not yet used: no verified
              connector supplies them.
            </p>
            <ul>
              <li>Required input: observed rainfall, within a 3-hour freshness window.</li>
              <li>Missing input: status becomes <code>insufficient_data</code>, score stays <code>null</code>.</li>
              <li>Stale input: status becomes <code>insufficient_data</code> with a stale reason code.</li>
              <li>Gap in the series: status becomes <code>degraded</code>; gaps are not filled with zeros.</li>
              <li>Demo fixtures bypass wall-clock freshness but are always labelled and never called live.</li>
              <li>No numeric risk index is produced: <code>score</code> is null and semantics are categorical.</li>
            </ul>
          </section>

          <section id="thresholds">
            <h2>03 / Documented thresholds — illustrative, not validated</h2>
            <p>
              These thresholds exist to exercise the pipeline. They are not a safety standard and
              have not been evaluated against historical floods in any catchment.
            </p>
            <div className="table-scroll">
              <table className="data-table data-table--thresholds">
                <caption>3-hour observed rainfall accumulation thresholds used by baseline v0.1</caption>
                <thead>
                  <tr>
                    <th scope="col">Band</th>
                    <th scope="col">3-hour accumulation</th>
                    <th scope="col">Evidence basis</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><th scope="row">very_high</th><td>≥ 100 mm</td><td>Developer-set, unevaluated</td></tr>
                  <tr><th scope="row">high</th><td>≥ 60 mm</td><td>Developer-set, unevaluated</td></tr>
                  <tr><th scope="row">moderate</th><td>≥ 25 mm</td><td>Developer-set, unevaluated</td></tr>
                  <tr><th scope="row">low</th><td>&lt; 25 mm</td><td>Only when a complete window exists</td></tr>
                </tbody>
              </table>
            </div>
            <Notice tone="warn" title="Thresholds must be localised before any operational claim">
              <p>
                Real thresholds depend on catchment response, soil state, antecedent conditions and
                local authority practice. Replacing these values requires documented evidence.
              </p>
            </Notice>
          </section>

          <section id="evaluation">
            <h2>04 / Evaluation status</h2>
            <div className="not-evaluated">
              <div>
                <Status state="insufficient_data" label="NOT EVALUATED YET" />
                <h3>No metrics are reported</h3>
              </div>
              <p>
                There are no verified historical event labels, no defined catchment-level event
                definition, no confirmed feature cut-off and no chronological or spatial holdout.
                Reporting precision, recall, lead time or calibration would therefore be
                fabricated. None of those numbers appear anywhere in this product.
              </p>
            </div>
            <p>The planned protocol, recorded in <code>docs/EVALUATION.md</code>, requires:</p>
            <ol>
              <li>A validated pilot catchment with documented geometry provenance.</li>
              <li>Traceable event labels with dates, locations and a stated event definition.</li>
              <li>Features restricted to what would have been available at the prediction cut-off.</li>
              <li>Chronological and event-level holdout, with spatial holdout where feasible.</li>
              <li>Comparison against persistence and threshold baselines before any trained model.</li>
              <li>Reported sample counts, uncertainty, false alarms per unit time and coverage.</li>
            </ol>
          </section>

          <section id="sources">
            <h2>05 / Data sources and verified status</h2>
            <p>
              No external connector is implemented or verified in this build. Candidate sources are
              IMD products, NASA GPM IMERG, Copernicus DEM and CWC/India-WRIS gauges, but
              documentation is not evidence of access. Every capability is reported as
              unconfigured on the Data health page, and the interface never invents a value.
            </p>
            <p>
              Satellite products with processing latency are not represented as real-time
              observations. A regional rainfall product is never described as a catchment gauge
              measurement. A DEM alone does not produce a validated watershed boundary.
            </p>
          </section>

          <section id="limitations">
            <h2>06 / Known limitations</h2>
            <ul>
              <li>No live data; all current records are deterministic demo fixtures.</li>
              <li>No validated catchment geometry; demo outlines are synthetic rectangles.</li>
              <li>No trained model, no calibration, no evaluation metrics.</li>
              <li>No durable persistence, authenticated history or subscriptions.</li>
              <li>No terrain, gauge, soil-moisture or forecast integration.</li>
              <li>Assessment records are in API memory and disappear on restart.</li>
              <li>Map basemap requires a restricted Google Maps browser key.</li>
            </ul>
            <p>
              These limitations are shown in the interface rather than hidden, because a plausible
              dashboard is not evidence of reliability.
            </p>
          </section>
        </div>
      </div>
    </article>
  );
}
