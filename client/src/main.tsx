import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import {
  createBrowserRouter,
  RouterProvider,
} from 'react-router-dom';

import App from './App';
import Layout from './layouts/dashboard';
import DashboardPage from './pages';
import TasksPage from './pages/tasks';
import SignInPage from './pages/signin';
import GanttChartPage from './pages/ganttchart';
import ProgressPage from './pages/progress';
import NotificationsPage from './pages/notifications';
import SettingsPage from './pages/settings';

const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      {
        path: '/',
        element: <Layout />,
        children: [
          {
            index: true, // Equivalent to path: ""
            element: <DashboardPage />,
          },
          {
            path: 'tasks',
            element: <TasksPage />,
          },
          {
            path: 'ganttchart',
            element: <GanttChartPage />,
          },
          {
            path: 'progress',
            element: <ProgressPage />,
          },
          {
            path: 'notifications',
            element: <NotificationsPage />,
          },
          {
            path: 'settings',
            element: <SettingsPage />,
          },
        ],
      },
      {
        path: '/sign-in',
        element: <SignInPage />,
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
