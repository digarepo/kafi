import 'dotenv/config';
import { ulid } from 'ulid';
import argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import {
  permissions,
  roles,
  rolePermissions,
  userRoles,
  users,
  userStatuses,
} from '../schema/index.js';

/**
 * Reference data and root admin seed script for the Kafi database.
 *
 * Run with: npm run db:seed
 *
 * The script is idempotent and uses ON DUPLICATE KEY UPDATE for lookup rows.
 */

const USER_STATUS_CODES = [
  { status_code: 'ACTIVE', name: 'Active' },
  { status_code: 'INACTIVE', name: 'Inactive' },
  { status_code: 'SUSPENDED', name: 'Suspended' },
  { status_code: 'LOCKED', name: 'Locked' },
  { status_code: 'DELETED', name: 'Deleted' },
];

const ROLE_CODES = [
  { role_code: 'ADMIN', name: 'Administrator', is_system_role: true },
  { role_code: 'MANAGER', name: 'Manager', is_system_role: true },
  { role_code: 'AGENT', name: 'Agent', is_system_role: true },
];

const PERMISSION_CODES = [
  {
    permission_code: 'USER_CREATE',
    name: 'Create users',
    module: 'Users & Auth',
  },
  { permission_code: 'USER_VIEW', name: 'View users', module: 'Users & Auth' },
  { permission_code: 'USER_EDIT', name: 'Edit users', module: 'Users & Auth' },
  {
    permission_code: 'USER_DELETE',
    name: 'Delete users',
    module: 'Users & Auth',
  },
  {
    permission_code: 'AUTH_MANAGE',
    name: 'Manage authentication',
    module: 'Users & Auth',
  },
  {
    permission_code: 'TRAVELLER_CREATE',
    name: 'Create travellers',
    module: 'Travellers',
  },
  {
    permission_code: 'TRAVELLER_VIEW',
    name: 'View travellers',
    module: 'Travellers',
  },
  {
    permission_code: 'TRAVELLER_EDIT',
    name: 'Edit travellers',
    module: 'Travellers',
  },
  {
    permission_code: 'TRAVELLER_DELETE',
    name: 'Delete travellers',
    module: 'Travellers',
  },
  {
    permission_code: 'PACKAGE_CREATE',
    name: 'Create packages',
    module: 'Packages',
  },
  {
    permission_code: 'PACKAGE_VIEW',
    name: 'View packages',
    module: 'Packages',
  },
  {
    permission_code: 'PACKAGE_EDIT',
    name: 'Edit packages',
    module: 'Packages',
  },
  {
    permission_code: 'PACKAGE_DELETE',
    name: 'Delete packages',
    module: 'Packages',
  },
  {
    permission_code: 'REGISTRATION_CREATE',
    name: 'Create registrations',
    module: 'Registrations',
  },
  {
    permission_code: 'REGISTRATION_VIEW',
    name: 'View registrations',
    module: 'Registrations',
  },
  {
    permission_code: 'REGISTRATION_EDIT',
    name: 'Edit registrations',
    module: 'Registrations',
  },
  {
    permission_code: 'REGISTRATION_DELETE',
    name: 'Delete registrations',
    module: 'Registrations',
  },
  {
    permission_code: 'FINANCE_CREATE',
    name: 'Create finance records',
    module: 'Financial',
  },
  {
    permission_code: 'FINANCE_VIEW',
    name: 'View finance records',
    module: 'Financial',
  },
  {
    permission_code: 'FINANCE_EDIT',
    name: 'Edit finance records',
    module: 'Financial',
  },
  {
    permission_code: 'FINANCE_DELETE',
    name: 'Delete finance records',
    module: 'Financial',
  },
  { permission_code: 'VISA_MANAGE', name: 'Manage visas', module: 'Visa' },
  {
    permission_code: 'DOCUMENT_MANAGE',
    name: 'Manage documents',
    module: 'Documents',
  },
  {
    permission_code: 'ACCOMMODATION_MANAGE',
    name: 'Manage accommodation',
    module: 'Accommodation',
  },
  {
    permission_code: 'TRAVEL_GROUP_MANAGE',
    name: 'Manage travel groups',
    module: 'Travel Groups',
  },
];

const ROLE_PERMISSION_MAP: Record<string, string[]> = {
  ADMIN: PERMISSION_CODES.map((p) => p.permission_code),
  MANAGER: PERMISSION_CODES.map((p) => p.permission_code).filter(
    (code) =>
      ![
        'AUTH_MANAGE',
        'USER_DELETE',
        'TRAVELLER_DELETE',
        'PACKAGE_DELETE',
        'REGISTRATION_DELETE',
        'FINANCE_DELETE',
      ].includes(code),
  ),
  AGENT: [
    'USER_VIEW',
    'TRAVELLER_VIEW',
    'TRAVELLER_CREATE',
    'TRAVELLER_EDIT',
    'PACKAGE_VIEW',
    'REGISTRATION_VIEW',
    'REGISTRATION_CREATE',
    'FINANCE_VIEW',
    'VISA_MANAGE',
    'DOCUMENT_MANAGE',
  ],
};

/**
 * Ensures a database connection is available from environment variables.
 */
function getConnectionOptions(): mysql.ConnectionOptions {
  return {
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: Number(process.env.DATABASE_PORT ?? '3306'),
    user: process.env.DATABASE_USER ?? 'root',
    password: process.env.DATABASE_PASSWORD ?? '',
    database: process.env.DATABASE_NAME ?? 'kafi_dev',
  };
}

/**
 * Seeds lookup tables and the root admin user.
 */
async function seed() {
  const connection = await mysql.createConnection(getConnectionOptions());
  const db = drizzle(connection);

  try {
    // User statuses
    for (const status of USER_STATUS_CODES) {
      await db
        .insert(userStatuses)
        .values({
          id: ulid(),
          ...status,
          is_active: true,
        })
        .onDuplicateKeyUpdate({ set: { name: status.name, is_active: true } });
    }

    // Roles
    for (const role of ROLE_CODES) {
      await db
        .insert(roles)
        .values({
          id: ulid(),
          ...role,
          is_active: true,
        })
        .onDuplicateKeyUpdate({ set: { name: role.name, is_active: true } });
    }

    // Permissions
    for (const permission of PERMISSION_CODES) {
      await db
        .insert(permissions)
        .values({
          id: ulid(),
          ...permission,
        })
        .onDuplicateKeyUpdate({
          set: {
            name: permission.name,
            module: permission.module,
          },
        });
    }

    // Role permissions
    const roleRows = await db.select().from(roles);
    const permissionRows = await db.select().from(permissions);

    for (const role of roleRows) {
      const codes = ROLE_PERMISSION_MAP[role.role_code] ?? [];
      const permissionIds = permissionRows
        .filter((p) => codes.includes(p.permission_code))
        .map((p) => p.id);

      for (const permissionId of permissionIds) {
        await db
          .insert(rolePermissions)
          .values({
            id: ulid(),
            role_id: role.id,
            permission_id: permissionId,
          })
          .onDuplicateKeyUpdate({
            set: {
              role_id: role.id,
              permission_id: permissionId,
            },
          });
      }
    }

    // Root admin
    const activeStatus = await db
      .select()
      .from(userStatuses)
      .where(eq(userStatuses.status_code, 'ACTIVE'))
      .limit(1);

    if (activeStatus.length === 0) {
      throw new Error('ACTIVE user status must be seeded before root admin');
    }

    const adminRole = await db
      .select()
      .from(roles)
      .where(eq(roles.role_code, 'ADMIN'))
      .limit(1);

    if (adminRole.length === 0) {
      throw new Error('ADMIN role must be seeded before root admin');
    }

    const rootId = ulid();
    const email = process.env.ROOT_ADMIN_EMAIL ?? 'admin@kafitour.com';
    const password = process.env.ROOT_ADMIN_PASSWORD ?? 'Admin123!';
    const phone = (process.env.ROOT_ADMIN_PHONE ?? '251911000000').replace(
      /\D/g,
      '',
    );
    const passwordHash = await argon2.hash(password);

    await db
      .insert(users)
      .values({
        id: rootId,
        employee_number: 'EMP-0001',
        full_name: 'System Administrator',
        gender: 'Male',
        email_address: email,
        phone_number: phone,
        password_hash: passwordHash,
        must_change_password: true,
        user_status_id: activeStatus[0].id,
      })
      .onDuplicateKeyUpdate({
        set: {
          full_name: 'System Administrator',
          email_address: email,
          phone_number: phone,
          password_hash: passwordHash,
          must_change_password: true,
          user_status_id: activeStatus[0].id,
        },
      });

    await db
      .insert(userRoles)
      .values({
        id: ulid(),
        user_id: rootId,
        role_id: adminRole[0].id,
        is_active: true,
      })
      .onDuplicateKeyUpdate({ set: { is_active: true } });

    console.log('Database seeded successfully');
  } finally {
    await connection.end();
  }
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
