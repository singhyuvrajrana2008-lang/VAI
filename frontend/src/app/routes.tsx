import { createBrowserRouter } from 'react-router';
import { Layout } from '../components/Layout';
import { AssessmentPage, Dashboard, DataHealth, Methodology, Placeholder, RouteError, Warnings } from '../pages/pages';
export const router=createBrowserRouter([{path:'/',Component:Layout,ErrorBoundary:RouteError,children:[{index:true,Component:Dashboard},{path:'catchments',element:<Placeholder kind="Catchments"/>},{path:'rainfall',element:<Placeholder kind="Rainfall"/>},{path:'warnings',Component:Warnings},{path:'assessments',Component:AssessmentPage},{path:'data-health',Component:DataHealth},{path:'methodology',Component:Methodology},{path:'history',element:<Placeholder kind="History"/>},{path:'settings',element:<Placeholder kind="Settings"/>},{path:'*',Component:RouteError}]}]);
