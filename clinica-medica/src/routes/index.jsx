// rotas da API deste recurso

import { createBrowserRouter, Navigate } from 'react-router-dom';
import App from '../App.jsx';
import AuthPreview from '../pages/AuthPreview.jsx';
import DashboardPage from '../pages/DashboardPage.jsx';
import { ProtectedRoute, PublicRoute } from './routeGuards.jsx';

const protectedRoutes = [
  '/dashboard',
  '/pacientes',
  '/medicos',
  '/especialidades',
  '/consultas',
  '/calendario',
  '/conta',
];

export const appRouter = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <Navigate to="/login" replace />,
      },
      {
        path: 'login',
        element: (
          <PublicRoute>
            <AuthPreview />
          </PublicRoute>
        ),
      },
      {
        path: 'cadastro',
        element: (
          <PublicRoute>
            <AuthPreview />
          </PublicRoute>
        ),
      },
      ...protectedRoutes.map((path) => ({
        path: path.slice(1),
        element: (
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        ),
      })),
      {
        path: '*',
        element: <Navigate to="/login" replace />,
      },
    ],
  },
]);
