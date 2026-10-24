import { useMemo } from 'react';
import type { Observation } from '../lib/schemas';
import { formatClock, formatTimestamp } from '../lib/format';

const WIDTH = 860;
const HEIGHT = 268;
const PADDING = { top: 18, right: 16, bottom: 42, left: 58 };

interface Bar {
  key: string;
  time: number;
  value: number;
  kind: 'observed' | 'forecast';
  record: Observation;
}

function toBars(records: Observation[], kind: Bar['kind']): Bar[] {
  return records
    .map((record): Bar | null => {
      const stamp = kind === 'observed' ? record.observed_at : record.valid_from ?? record.issued_at;
      if (!stamp || typeof record.value !== 'number' || !Number.isFinite(record.value)) return null;
      const time = new Date(stamp).getTime();
      if (Number.isNaN(time)) return null;
      return { key: `${kind}-${record.source_id}`, time, value: record.value, kind, record };
    })
    .filter((bar): bar is Bar => bar !== null)
    .sort((a, b) => a.time - b.time);
}

export function RainfallChart({
  observed,
  forecast,
}: {
  observed: Observation[];
  forecast: Observation[];
}) {
  const bars = useMemo(
    () => [...toBars(observed, 'observed'), ...toBars(forecast, 'forecast')],
    [observed, forecast],
  );

  if (bars.length === 0) {
    return (
      <div className="chart-empty">
        <p className="kicker">RAINFALL SERIES</p>
        <h2>No rainfall records returned</h2>
        <p>
          Nothing is plotted because no record carried a numeric value and a timestamp. No zero
          rainfall has been substituted for missing data.
        </p>
      </div>
    );
  }

  const times = bars.map((bar) => bar.time);
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const span = Math.max(maxTime - minTime, 60 * 60 * 1000);
  const maxValue = Math.max(...bars.map((bar) => bar.value), 1);
  const plotWidth = WIDTH - PADDING.left - PADDING.right;
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const scaleX = (time: number) => PADDING.left + ((time - minTime) / span) * plotWidth;
  const scaleY = (value: number) => PADDING.top + plotHeight - (value / maxValue) * plotHeight;
  const barWidth = Math.max(3, Math.min(26, (plotWidth / bars.length) * 0.62));

  const observedTimes = bars
    .filter((bar) => bar.kind === 'observed')
    .map((bar) => bar.time)
    .sort((a, b) => a - b);
  const gaps: Array<[number, number]> = [];
  for (let index = 1; index < observedTimes.length; index += 1) {
    if (observedTimes[index] - observedTimes[index - 1] > 90 * 60 * 1000) {
      gaps.push([observedTimes[index - 1], observedTimes[index]]);
    }
  }

  const ticks = [0, 0.5, 1];
  const xTickTimes = [minTime, minTime + span / 2, maxTime];
  const unit = observed[0]?.unit ?? forecast[0]?.unit ?? 'mm';

  return (
    <figure className="chart">
      <figcaption>
        <div>
          <p className="kicker">RAINFALL SERIES</p>
          <h2>
            Hourly rainfall, {unit} per hour
          </h2>
        </div>
        <ul className="chart__legend" aria-label="Chart legend">
          <li>
            <i className="swatch swatch--observed" aria-hidden="true" /> Observed record
          </li>
          <li>
            <i className="swatch swatch--forecast" aria-hidden="true" /> Forecast record
          </li>
        </ul>
      </figcaption>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`Rainfall chart in ${unit} per hour from ${formatTimestamp(
          new Date(minTime).toISOString(),
        )} to ${formatTimestamp(new Date(maxTime).toISOString())}. ${bars.length} records.`}
        className="chart__svg"
      >
        {ticks.map((fraction) => {
          const value = maxValue * fraction;
          return (
            <g key={fraction}>
              <line
                x1={PADDING.left}
                x2={WIDTH - PADDING.right}
                y1={scaleY(value)}
                y2={scaleY(value)}
                className="chart__grid"
              />
              <text x={PADDING.left - 8} y={scaleY(value) + 4} textAnchor="end" className="chart__tick">
                {value.toFixed(1)}
              </text>
            </g>
          );
        })}

        {gaps.map(([start, end]) => (
          <g key={`${start}-${end}`}>
            <rect
              x={scaleX(start) + barWidth / 2}
              y={PADDING.top}
              width={Math.max(2, scaleX(end) - scaleX(start) - barWidth)}
              height={plotHeight}
              className="chart__gap"
            />
            <text
              x={(scaleX(start) + scaleX(end)) / 2}
              y={PADDING.top + 12}
              textAnchor="middle"
              className="chart__gap-label"
            >
              gap (not filled)
            </text>
          </g>
        ))}

        {bars.map((bar) => {
          const x = scaleX(bar.time) - barWidth / 2;
          const y = scaleY(bar.value);
          const height = Math.max(PADDING.top + plotHeight - y, 0);
          return (
            <rect
              key={bar.key}
              x={x}
              y={bar.value === 0 ? PADDING.top + plotHeight - 1.5 : y}
              width={barWidth}
              height={bar.value === 0 ? 1.5 : height}
              className={bar.kind === 'observed' ? 'chart__bar' : 'chart__bar chart__bar--forecast'}
            >
              <title>
                {`${bar.kind === 'observed' ? 'Observed' : 'Forecast'} ${bar.value} ${unit}/h at ${formatTimestamp(
                  new Date(bar.time).toISOString(),
                )}`}
              </title>
            </rect>
          );
        })}

        <line
          x1={PADDING.left}
          x2={WIDTH - PADDING.right}
          y1={PADDING.top + plotHeight}
          y2={PADDING.top + plotHeight}
          className="chart__axis"
        />
        <line
          x1={PADDING.left}
          x2={PADDING.left}
          y1={PADDING.top}
          y2={PADDING.top + plotHeight}
          className="chart__axis"
        />
        <text x={PADDING.left - 8} y={PADDING.top - 6} textAnchor="end" className="chart__axis-unit">
          {unit}/h
        </text>
        {xTickTimes.map((time, index) => (
          <text
            key={time}
            x={scaleX(time)}
            y={HEIGHT - 14}
            textAnchor={index === 0 ? 'start' : index === xTickTimes.length - 1 ? 'end' : 'middle'}
            className="chart__tick"
          >
            {formatClock(new Date(time).toISOString())}
          </text>
        ))}
        <text
          x={WIDTH - PADDING.right}
          y={HEIGHT - 2}
          textAnchor="end"
          className="chart__axis-unit"
        >
          time (UTC)
        </text>
      </svg>

      <p className="chart__note">
        Bars are placed at their recorded timestamps. Missing hours are never interpolated or
        filled with zero. Hover a bar for its exact timestamp and value.
      </p>

      <details className="chart__table">
        <summary>View the underlying records</summary>
        <div className="table-scroll">
          <table>
            <caption>Rainfall records plotted above</caption>
            <thead>
              <tr>
                <th scope="col">Kind</th>
                <th scope="col">Timestamp</th>
                <th scope="col">Value</th>
                <th scope="col">Provider</th>
              </tr>
            </thead>
            <tbody>
              {bars.map((bar) => (
                <tr key={bar.key}>
                  <td>{bar.kind === 'observed' ? 'Observed' : 'Forecast'}</td>
                  <td>{formatTimestamp(new Date(bar.time).toISOString())}</td>
                  <td>
                    {bar.value} {bar.record.unit ?? unit}/h
                  </td>
                  <td>{bar.record.provider}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
