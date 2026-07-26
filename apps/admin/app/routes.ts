import type { RouteConfig } from '@react-router/dev/routes';
import { index, layout, route } from '@react-router/dev/routes';

export default [
  route('login', 'routes/login.tsx'),
  layout('routes/admin.tsx', [
    index('routes/home.tsx'),
    route('users', 'routes/admin/users.tsx'),
    route('roles', 'routes/admin/roles.tsx'),
  ]),
  route('*', 'not-found.tsx'),
] satisfies RouteConfig;
