import { TypedId } from './typed-id.js';

/**
 * User identity attached to an authenticated request.
 */
export interface AuthenticatedUser {
  /** User primary key. */
  sub: TypedId<'User'>;

  /** Email address used for login. */
  email: string;

  /** Role codes assigned to the user. */
  roles: string[];

  /** Permission codes derived from those roles. */
  permissions: string[];

  /** True when the user must change their password on next login. */
  must_change_password: boolean;
}
