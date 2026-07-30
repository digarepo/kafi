import type { RouteConfig } from '@react-router/dev/routes';
import { index, layout, route } from '@react-router/dev/routes';

export default [
  route('login', 'routes/login.tsx'),
  route('forgot-password', 'routes/forgot-password.tsx'),
  route('reset-password', 'routes/reset-password.tsx'),
  route('verify-email', 'routes/verify-email.tsx'),
  route('change-password', 'routes/change-password.tsx'),
  route('forbidden', 'routes/forbidden.tsx'),
  layout('routes/admin.tsx', [
    index('routes/home.tsx'),
    route('users', 'routes/admin/users.tsx'),
    route('roles', 'routes/admin/roles.tsx'),
  ]),
  route('*', 'not-found.tsx'),
] satisfies RouteConfig;
