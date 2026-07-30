import { Navigate } from 'react-router';

import { useAuth } from '../../auth';
import { usePermissions } from '../permissions.context';

type Props = {
  permission: string;
  children: React.ReactNode;
};

export function RequirePermission({ permission, children }: Props) {
  const { isAuthenticated } = useAuth();
  const { can } = usePermissions();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!can(permission)) {
    return <Navigate to="/forbidden" replace />;
  }

  return children;
}
