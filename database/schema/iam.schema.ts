import { sql, relations } from 'drizzle-orm';
import {
  boolean,
  datetime,
  int,
  mysqlTable,
  text,
  unique,
  index,
  varchar,
} from 'drizzle-orm/mysql-core';
import {
  actorMetadata,
  auditMetadata,
  codeColumn,
  fkUuid,
  idColumn,
  nameColumn,
  softDeleteMetadata,
} from './common.schema.js';

/**
 * Lifecycle states for system users (ACTIVE, INACTIVE, SUSPENDED, LOCKED, DELETED).
 */
export const userStatuses = mysqlTable('user_statuses', {
  id: idColumn,
  status_code: codeColumn('status_code'),
  name: nameColumn(),
  is_active: boolean('is_active').notNull().default(true),
  ...auditMetadata,
  ...softDeleteMetadata,
});

/**
 * Staff roles such as ADMIN, MANAGER, and AGENT.
 */
export const roles = mysqlTable('roles', {
  id: idColumn,
  role_code: codeColumn('role_code'),
  name: nameColumn(),
  description: text('description'),
  is_system_role: boolean('is_system_role').notNull().default(false),
  is_active: boolean('is_active').notNull().default(true),
  ...auditMetadata,
  ...softDeleteMetadata,
});

/**
 * Granular permission codes (e.g. USER_CREATE, USER_VIEW).
 */
export const permissions = mysqlTable('permissions', {
  id: idColumn,
  permission_code: codeColumn('permission_code'),
  name: nameColumn(),
  description: text('description'),
  module: varchar('module', { length: 100 }),
  ...auditMetadata,
  ...softDeleteMetadata,
});

/**
 * Staff user accounts. Authentication is email + password.
 */
export const users = mysqlTable('users', {
  id: idColumn,
  employee_number: varchar('employee_number', { length: 30 })
    .notNull()
    .unique(),
  full_name: varchar('full_name', { length: 255 }).notNull(),
  gender: varchar('gender', { length: 10 }).notNull(),
  email_address: varchar('email_address', { length: 255 }).notNull().unique(),
  phone_number: varchar('phone_number', { length: 30 }).notNull().unique(),
  password_hash: text('password_hash').notNull(),
  job_title: varchar('job_title', { length: 100 }),
  last_login_at: datetime('last_login_at', { mode: 'date' }),
  password_changed_at: datetime('password_changed_at', { mode: 'date' }),
  must_change_password: boolean('must_change_password').notNull().default(true),
  is_email_verified: boolean('is_email_verified').notNull().default(false),
  is_phone_verified: boolean('is_phone_verified').notNull().default(false),
  failed_login_attempts: int('failed_login_attempts').notNull().default(0),
  locked_until: datetime('locked_until', { mode: 'date' }),
  user_status_id: fkUuid('user_status_id').notNull(),
  ...auditMetadata,
  ...actorMetadata,
  ...softDeleteMetadata,
});

/**
 * Many-to-many link between users and roles.
 */
export const userRoles = mysqlTable(
  'user_roles',
  {
    id: idColumn,
    user_id: fkUuid('user_id').notNull(),
    role_id: fkUuid('role_id').notNull(),
    assigned_at: datetime('assigned_at', { mode: 'date' })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    is_active: boolean('is_active').notNull().default(true),
    ...auditMetadata,
    ...actorMetadata,
    ...softDeleteMetadata,
  },
  (table) => [
    unique('user_roles_user_id_role_id_unique').on(
      table.user_id,
      table.role_id,
    ),
  ],
);

/**
 * Many-to-many link between roles and permissions.
 */
export const rolePermissions = mysqlTable(
  'role_permissions',
  {
    id: idColumn,
    role_id: fkUuid('role_id').notNull(),
    permission_id: fkUuid('permission_id').notNull(),
    ...auditMetadata,
    ...softDeleteMetadata,
  },
  (table) => [
    unique('role_permissions_role_id_permission_id_unique').on(
      table.role_id,
      table.permission_id,
    ),
  ],
);

/**
 * Revoked refresh tokens that can no longer be used for token refresh.
 */
export const refreshTokenBlocklist = mysqlTable(
  'refresh_token_blocklist',
  {
    id: idColumn,
    token_hash: varchar('token_hash', { length: 64 }).notNull(),
    user_id: fkUuid('user_id').notNull(),
    expires_at: datetime('expires_at', { mode: 'date' }).notNull(),
    created_at: datetime('created_at', { mode: 'date' })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    unique('refresh_token_blocklist_token_hash_unique').on(table.token_hash),
    index('refresh_token_blocklist_expires_at_idx').on(table.expires_at),
  ],
);

/**
 * Authentication and authorization audit events.
 */
export const authAuditLogs = mysqlTable('auth_audit_logs', {
  id: idColumn,
  user_id: fkUuid('user_id'),
  event_type: varchar('event_type', { length: 50 }).notNull(),
  ip_address: varchar('ip_address', { length: 45 }),
  user_agent: varchar('user_agent', { length: 255 }),
  success: boolean('success').notNull().default(true),
  details: text('details'),
  created_at: datetime('created_at', { mode: 'date' })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

/**
 * One-time tokens used for email address verification.
 */
export const emailVerificationTokens = mysqlTable(
  'email_verification_tokens',
  {
    id: idColumn,
    user_id: fkUuid('user_id').notNull(),
    token_hash: varchar('token_hash', { length: 64 }).notNull(),
    expires_at: datetime('expires_at', { mode: 'date' }).notNull(),
    created_at: datetime('created_at', { mode: 'date' })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    unique('email_verification_tokens_token_hash_unique').on(table.token_hash),
    index('email_verification_tokens_user_id_idx').on(table.user_id),
    index('email_verification_tokens_expires_at_idx').on(table.expires_at),
  ],
);

/**
 * One-time tokens used for password reset flows.
 */
export const passwordResetTokens = mysqlTable(
  'password_reset_tokens',
  {
    id: idColumn,
    user_id: fkUuid('user_id').notNull(),
    token_hash: varchar('token_hash', { length: 64 }).notNull(),
    expires_at: datetime('expires_at', { mode: 'date' }).notNull(),
    used_at: datetime('used_at', { mode: 'date' }),
    created_at: datetime('created_at', { mode: 'date' })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    unique('password_reset_tokens_token_hash_unique').on(table.token_hash),
    index('password_reset_tokens_user_id_idx').on(table.user_id),
    index('password_reset_tokens_expires_at_idx').on(table.expires_at),
  ],
);

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  status: one(userStatuses, {
    fields: [users.user_status_id],
    references: [userStatuses.id],
  }),
  userRoles: many(userRoles),
}));

export const userStatusesRelations = relations(userStatuses, ({ many }) => ({
  users: many(users),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  userRoles: many(userRoles),
  rolePermissions: many(rolePermissions),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, { fields: [userRoles.user_id], references: [users.id] }),
  role: one(roles, { fields: [userRoles.role_id], references: [roles.id] }),
}));

export const rolePermissionsRelations = relations(
  rolePermissions,
  ({ one }) => ({
    role: one(roles, {
      fields: [rolePermissions.role_id],
      references: [roles.id],
    }),
    permission: one(permissions, {
      fields: [rolePermissions.permission_id],
      references: [permissions.id],
    }),
  }),
);
