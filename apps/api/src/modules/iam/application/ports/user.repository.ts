import { TypedId } from '../../../../shared/kernel/typed-id.js';

/**
 * Read-model view of a user and their role/permission data.
 */
export interface UserWithRoles {
  id: TypedId<'User'>;
  employee_number: string;
  full_name: string;
  gender: string;
  email_address: string;
  phone_number: string;
  job_title: string | null;
  password_hash: string;
  must_change_password: boolean;
  is_email_verified: boolean;
  user_status_id: TypedId<'UserStatus'>;
  status_code: string;
  created_at: Date;
  last_login_at: Date | null;
  roles: { id: TypedId<'Role'>; role_code: string; name: string }[];
}

/**
 * Repository interface for user lookups.
 */
export abstract class UserRepository {
  /**
   * Finds an active user by email address, including role and status data.
   *
   * @param email - Normalized email address.
   * @returns User view or undefined if not found.
   */
  abstract findActiveByEmail(email: string): Promise<UserWithRoles | undefined>;

  /**
   * Finds a user by their id, including role and status data.
   *
   * @param id - User typed id.
   * @returns User view or undefined if not found.
   */
  abstract findById(id: TypedId<'User'>): Promise<UserWithRoles | undefined>;

  /**
   * Lists users with optional pagination.
   *
   * @param limit - Maximum number of users to return.
   * @param offset - Number of users to skip.
   * @returns Array of user views.
   */
  abstract list(limit: number, offset: number): Promise<UserWithRoles[]>;

  /**
   * Inserts a new user and returns the generated id.
   *
   * @param input - User creation data.
   * @returns New user typed id.
   */
  abstract create(input: CreateUserInput): Promise<TypedId<'User'>>;

  /**
   * Updates a user's fields and role assignments.
   *
   * @param id - User typed id.
   * @param input - Update data.
   */
  abstract update(id: TypedId<'User'>, input: UpdateUserInput): Promise<void>;

  /**
   * Soft-deletes a user by setting their status to DELETED.
   *
   * @param id - User typed id.
   */
  abstract delete(id: TypedId<'User'>): Promise<void>;

  /**
   * Updates the password hash and must_change_password flag.
   *
   * @param id - User typed id.
   * @param password_hash - New Argon2id hash.
   * @param must_change_password - Whether the user must reset on next login.
   */
  abstract updatePassword(
    id: TypedId<'User'>,
    password_hash: string,
    must_change_password: boolean,
  ): Promise<void>;

  /**
   * Updates the user's last login timestamp.
   *
   * @param id - User typed id.
   */
  abstract updateLastLogin(id: TypedId<'User'>): Promise<void>;

  /**
   * Marks the user's email address as verified.
   *
   * @param id - User typed id.
   */
  abstract verifyEmail(id: TypedId<'User'>): Promise<void>;
}

/**
 * Input data for creating a user.
 */
export interface CreateUserInput {
  employee_number: string;
  full_name: string;
  gender: string;
  email_address: string;
  phone_number: string;
  job_title?: string | null;
  password_hash: string;
  must_change_password: boolean;
  user_status_id: TypedId<'UserStatus'>;
  role_ids: TypedId<'Role'>[];
}

/**
 * Input data for updating a user.
 */
export interface UpdateUserInput {
  full_name?: string;
  gender?: string;
  email_address?: string;
  phone_number?: string;
  job_title?: string | null;
  user_status_id?: TypedId<'UserStatus'>;
  role_ids?: TypedId<'Role'>[];
}
