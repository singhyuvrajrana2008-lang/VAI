import { createBrowserRouter } from 'react-router';
import { Layout } from '../components/Layout';
import { AssessmentDetail } from '../pages/AssessmentDetail';
import { Assessments } from '../pages/Assessments';
import { AuthCallback, ForgotPassword, Login, ResetPassword, Signup } from '../pages/Auth';
import { CatchmentDetail } from '../pages/CatchmentDetail';
import { Catchments } from '../pages/Catchments';
import { DataHealth } from '../pages/DataHealth';
import { History } from '../pages/History';
import { Methodology } from '../pages/Methodology';
import { NotFound, RouteError } from '../pages/NotFound';
import { Overview } from '../pages/Overview';
import { Rainfall } from '../pages/Rainfall';
import { Settings } from '../pages/Settings';
import { Warnings } from '../pages/Warnings';

export const router = createBrowserRouter([
  { path: '/login', Component: Login, ErrorBoundary: RouteError },
  { path: '/signup', Component: Signup, ErrorBoundary: RouteError },
  { path: '/forgot-password', Component: ForgotPassword, ErrorBoundary: RouteError },
  { path: '/reset-password', Component: ResetPassword, ErrorBoundary: RouteError },
  { path: '/auth/callback', Component: AuthCallback, ErrorBoundary: RouteError },
  {
    path: '/',
    Component: Layout,
    ErrorBoundary: RouteError,
    children: [
      { index: true, Component: Overview },
      { path: 'catchments', Component: Catchments },
      { path: 'catchments/:catchmentId', Component: CatchmentDetail },
      { path: 'rainfall', Component: Rainfall },
      { path: 'warnings', Component: Warnings },
      { path: 'assessments', Component: Assessments },
      { path: 'assessments/:assessmentId', Component: AssessmentDetail },
      { path: 'data-health', Component: DataHealth },
      { path: 'methodology', Component: Methodology },
      { path: 'history', Component: History },
      { path: 'settings', Component: Settings },
      { path: '*', Component: NotFound },
    ],
  },
]);
