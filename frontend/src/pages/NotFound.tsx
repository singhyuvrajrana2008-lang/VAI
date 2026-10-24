import { ArrowLeft, MapPinned, TriangleAlert } from 'lucide-react';
import { Link, useRouteError } from 'react-router';
import { EmptyPanel } from '../components/Status';

export function NotFound() {
  return (
    <div className="page">
      <EmptyPanel
        title="This route does not exist"
        icon={<MapPinned size={22} aria-hidden="true" />}
        action={
          <Link to="/" className="text-link">
            <ArrowLeft size={14} aria-hidden="true" /> Return to the overview
          </Link>
        }
      >
        <p>
          The address you opened is not part of RidgeWatch. No data has been inferred from the
          missing route.
        </p>
      </EmptyPanel>
    </div>
  );
}

export function RouteError() {
  const error = useRouteError();
  const isApi = error instanceof Error;
  return (
    <div className="route-error">
      <TriangleAlert size={28} aria-hidden="true" />
      <h1>RidgeWatch could not open this view</h1>
      <p>
        The request failed safely. No risk status has been inferred from the failure, and no
        internal details are shown here.
      </p>
      {isApi ? <code className="route-error__code">{error.name}</code> : null}
      <div className="route-error__actions">
        <Link to="/" className="text-link">
          Return to the overview
        </Link>
        <button type="button" className="ghost-button" onClick={() => window.location.reload()}>
          Reload the application
        </button>
      </div>
    </div>
  );
}
