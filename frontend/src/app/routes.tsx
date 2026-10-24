import { createBrowserRouter } from 'react-router';
import { Layout } from '../components/Layout';
import { AssessmentDetail } from '../pages/AssessmentDetail';
import { AssessmentRequest } from '../pages/AssessmentRequest';
import { Assessments } from '../pages/Assessments';
import { AuthCallback, ForgotPassword, Login, ResetPassword, Signup } from '../pages/Auth';
import { CatchmentDetail } from '../pages/CatchmentDetail';
import { Catchments } from '../pages/Catchments';
import { DataHealth } from '../pages/DataHealth';
import { History } from '../pages/History';
import { Landing } from '../pages/Landing';
import { Methodology } from '../pages/Methodology';
import { NotFound, RouteError } from '../pages/NotFound';
import { Overview } from '../pages/Overview';
import { Rainfall } from '../pages/Rainfall';
import { Settings } from '../pages/Settings';
import { Warnings } from '../pages/Warnings';

export const router = createBrowserRouter([
  { path: '/', Component: Landing, ErrorBoundary: RouteError },
  { path: '/login', Component: Login, ErrorBoundary: RouteError },
  { path: '/signup', Component: Signup, ErrorBoundary: RouteError },
  { path: '/forgot-password', Component: ForgotPassword, ErrorBoundary: RouteError },
  { path: '/reset-password', Component: ResetPassword, ErrorBoundary: RouteError },
  { path: '/auth/callback', Component: AuthCallback, ErrorBoundary: RouteError },
  {
    // Pathless shell: every console route keeps a clean top-level path.
    element: <Layout />,
    ErrorBoundary: RouteError,
    children: [
      { path: '/overview', Component: Overview },
      { path: '/catchments', Component: Catchments },
      { path: '/catchments/:catchmentId', Component: CatchmentDetail },
      { path: '/rainfall', Component: Rainfall },
      { path: '/warnings', Component: Warnings },
      { path: '/assessments', Component: Assessments },
      { path: '/assessments/new', Component: AssessmentRequest },
      { path: '/assessments/:assessmentId', Component: AssessmentDetail },
      { path: '/data-health', Component: DataHealth },
      { path: '/methodology', Component: Methodology },
      { path: '/history', Component: History },
      { path: '/settings', Component: Settings },
    ],
  },
  { path: '*', Component: NotFound, ErrorBoundary: RouteError },
]);
