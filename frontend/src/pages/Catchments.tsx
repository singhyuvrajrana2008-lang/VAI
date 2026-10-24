import { useMemo, useState } from 'react';
import { ArrowRight, Gauge, Search } from 'lucide-react';
import { Link } from 'react-router';
import { PageHeader } from '../components/PageHeader';
import { EmptyPanel, ErrorPanel, LoadingPanel, Notice, Status } from '../components/Status';
import { useCatchments } from '../lib/hooks';
import { useQueryClient } from '@tanstack/react-query';

export function Catchments() {
  const query = useCatchments();
  const queryClient = useQueryClient();
  const [term, setTerm] = useState('');

  const filtered = useMemo(() => {
    const items = query.data?.items ?? [];
    const needle = term.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) =>
      [item.name, item.region ?? '', item.id, item.validation_status]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  }, [query.data, term]);

  return (
    <div className="page">
      <PageHeader
        eyebrow="CATCHMENT REGISTRY / GEOMETRY PROVENANCE"
        title="Catchments"
        copy="Every entry lists its geometry provenance and validation state. A catchment is not live until its boundary, input coverage and freshness have been verified for the pilot region."
        aside={
          <Link to="/methodology" className="text-link">
            How validation is defined <ArrowRight size={13} aria-hidden="true" />
          </Link>
        }
      />

      {query.isLoading ? <LoadingPanel message="Loading catchment registry…" /> : null}
      {query.error ? (
        <ErrorPanel
          title="Registry unavailable"
          message={(query.error as Error).message}
          onRetry={() => void queryClient.invalidateQueries({ queryKey: ['catchments'] })}
        />
      ) : null}

      {query.data && query.data.items.length === 0 ? (
        <EmptyPanel
          title="No catchments are configured"
          icon={<Gauge size={22} aria-hidden="true" />}
          action={
            <Link to="/data-health" className="text-link">
              See source status <ArrowRight size={14} aria-hidden="true" />
            </Link>
          }
        >
          <p>
            {query.data.mode === 'live'
              ? 'Live mode is active and no verified catchment geometry has been registered. Demo fixtures are intentionally not served in live mode.'
              : 'The registry is empty. RidgeWatch will not draw an unverified polygon to fill this list.'}
          </p>
        </EmptyPanel>
      ) : null}

      {query.data && query.data.items.length > 0 ? (
        <>
          {query.data.is_demo ? (
            <Notice tone="warn" title="Demo registry">
              <p>
                These entries are synthetic demo fixtures. Their rectangles are labelled
                <code> demo_synthetic</code> and are not watershed boundaries.
              </p>
            </Notice>
          ) : null}

          <div className="filter-bar">
            <label htmlFor="catchment-filter">Search catchments</label>
            <div className="filter-bar__control">
              <Search size={15} aria-hidden="true" />
              <input
                id="catchment-filter"
                type="search"
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                placeholder="Name, region, ID or validation state"
                autoComplete="off"
              />
            </div>
            <span role="status" className="filter-bar__count">
              {filtered.length} of {query.data.count}
            </span>
          </div>

          <div className="table-scroll">
            <table className="data-table data-table--catchments">
              <caption className="sr-only">Configured catchments with provenance and validation</caption>
              <thead>
                <tr>
                  <th scope="col">Catchment</th>
                  <th scope="col">Region</th>
                  <th scope="col">Geometry</th>
                  <th scope="col">Validation</th>
                  <th scope="col">Provenance</th>
                  <th scope="col">
                    <span className="sr-only">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((catchment) => (
                  <tr key={catchment.id}>
                    <th scope="row">
                      <Link to={`/catchments/${encodeURIComponent(catchment.id)}`}>
                        {catchment.name}
                      </Link>
                      <code>{catchment.id}</code>
                    </th>
                    <td>{catchment.region ?? 'Not supplied'}</td>
                    <td>
                      <Status state={catchment.geometry_status} />
                    </td>
                    <td>
                      <Status
                        state={
                          catchment.validation_status === 'validated' ? 'live' : catchment.validation_status
                        }
                        label={catchment.validation_status.toUpperCase()}
                      />
                    </td>
                    <td className="data-table__provenance">
                      {catchment.geometry_source ?? 'Not supplied'}
                    </td>
                    <td>
                      <Link
                        to={`/catchments/${encodeURIComponent(catchment.id)}`}
                        className="row-link"
                        aria-label={`Open ${catchment.name}`}
                      >
                        <ArrowRight size={15} aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 ? (
            <p className="inline-empty" role="status">
              No catchment matches “{term}”.
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
