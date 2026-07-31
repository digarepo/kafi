import { Navigate } from 'react-router';

import { useAuth } from '../../auth';
import { usePermissions } from '../permissions.context';

type Props = {
  permissions: string[];
  mode?: 'any' | 'all';
  children: React.ReactNode;
};

export function RequirePermissions({
  permissions,
  mode = 'any',
  children,
}: Props) {
  const { isAuthenticated } = useAuth();
  const { canAny, canAll } = usePermissions();

  const allowed = mode === 'all' ? canAll(permissions) : canAny(permissions);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!allowed) {
    return <Navigate to="/forbidden" replace />;
  }

  return children;
}
