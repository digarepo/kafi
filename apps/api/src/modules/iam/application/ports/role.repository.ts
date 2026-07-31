import { TypedId } from '../../../../shared/kernel/typed-id.js';

/**
 * Role read model.
 */
export interface RoleView {
  id: TypedId<'Role'>;
  role_code: string;
  name: string;
  is_system_role: boolean;
  is_active: boolean;
}

/**
 * Repository interface for role lookups.
 */
export abstract class RoleRepository {
  /**
   * Finds a role by its typed id.
   *
   * @param id - Role id.
   * @returns Role view or undefined.
   */
  abstract findById(id: TypedId<'Role'>): Promise<RoleView | undefined>;

  /**
   * Finds roles by their typed ids.
   *
   * @param ids - Role ids.
   * @returns Array of role views.
   */
  abstract findByIds(ids: TypedId<'Role'>[]): Promise<RoleView[]>;

  /**
   * Lists all active roles.
   *
   * @returns Array of role views.
   */
  abstract list(): Promise<RoleView[]>;
}
