import 'dotenv/config';
import { ulid } from 'ulid';
import argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import {
  contactPersonStatuses,
  countries,
  currencies,
  languages,
  packageCategories,
  packageVersionStatuses,
  permissions,
  pilgrimageTypes,
  regions,
  registrationStatuses,
  relationshipTypes,
  roles,
  rolePermissions,
  seasons,
  travellerContactStatuses,
  travellerSources,
  travellerStatuses,
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
    permission_code: 'DASHBOARD_VIEW',
    name: 'View dashboard',
    module: 'General',
  },
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
    permission_code: 'TRAVEL_GROUP_VIEW',
    name: 'View travel groups',
    module: 'Travel Groups',
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
      !code.startsWith('USER_') &&
      !code.endsWith('_DELETE') &&
      code !== 'AUTH_MANAGE',
  ),
  AGENT: [
    'DASHBOARD_VIEW',
    'TRAVELLER_VIEW',
    'TRAVELLER_CREATE',
    'TRAVELLER_EDIT',
    'PACKAGE_VIEW',
    'REGISTRATION_VIEW',
    'REGISTRATION_CREATE',
    'FINANCE_VIEW',
    'VISA_MANAGE',
    'DOCUMENT_MANAGE',
    'TRAVEL_GROUP_VIEW',
  ],
};

const PACKAGE_VERSION_STATUS_CODES = [
  { status_code: 'DRAFT', name: 'Draft' },
  { status_code: 'PUBLISHED', name: 'Published' },
  { status_code: 'CLOSED', name: 'Closed' },
  { status_code: 'CANCELLED', name: 'Cancelled' },
];

const PACKAGE_CATEGORIES = [
  { category_code: 'ECONOMY', name: 'Economy' },
  { category_code: 'STANDARD', name: 'Standard' },
  { category_code: 'PREMIUM', name: 'Premium' },
  { category_code: 'VIP', name: 'VIP' },
];

const PILGRIMAGE_TYPES = [
  { pilgrimage_type_code: 'UMRAH', name: 'Umrah' },
  { pilgrimage_type_code: 'HAJJ', name: 'Hajj' },
  { pilgrimage_type_code: 'TOURISM', name: 'Tourism' },
];

const CURRENCY_CODES = [
  { currency_code: 'ETB', name: 'Ethiopian Birr', symbol: 'Br' },
  { currency_code: 'USD', name: 'US Dollar', symbol: '$' },
  { currency_code: 'SAR', name: 'Saudi Riyal', symbol: '﷼' },
];

const SEASON_CODES = [
  { season_code: 'RAMADAN_2027', name: 'Ramadan 2027' },
  { season_code: 'HAJJ_2027', name: 'Hajj 2027' },
];

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
    await db.delete(rolePermissions);

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

    // Package reference data
    for (const status of PACKAGE_VERSION_STATUS_CODES) {
      await db
        .insert(packageVersionStatuses)
        .values({
          id: ulid(),
          ...status,
          is_active: true,
        })
        .onDuplicateKeyUpdate({
          set: { name: status.name, is_active: true },
        });
    }

    for (const category of PACKAGE_CATEGORIES) {
      await db
        .insert(packageCategories)
        .values({
          id: ulid(),
          ...category,
          is_active: true,
        })
        .onDuplicateKeyUpdate({
          set: { name: category.name, is_active: true },
        });
    }

    for (const type of PILGRIMAGE_TYPES) {
      await db
        .insert(pilgrimageTypes)
        .values({
          id: ulid(),
          ...type,
          is_active: true,
        })
        .onDuplicateKeyUpdate({
          set: { name: type.name, is_active: true },
        });
    }

    for (const currency of CURRENCY_CODES) {
      await db
        .insert(currencies)
        .values({
          id: ulid(),
          ...currency,
          is_active: true,
        })
        .onDuplicateKeyUpdate({
          set: {
            name: currency.name,
            symbol: currency.symbol,
            is_active: true,
          },
        });
    }

    for (const season of SEASON_CODES) {
      await db
        .insert(seasons)
        .values({
          id: ulid(),
          ...season,
          is_active: true,
        })
        .onDuplicateKeyUpdate({
          set: { name: season.name, is_active: true },
        });
    }

    // Traveller reference data
    const TRAVELLER_STATUS_CODES = [
      { status_code: 'ACTIVE', name: 'Active' },
      { status_code: 'INACTIVE', name: 'Inactive' },
      { status_code: 'BLACKLISTED', name: 'Blacklisted' },
    ];

    const TRAVELLER_SOURCE_CODES = [
      { source_code: 'WALK_IN', name: 'Walk in' },
      { source_code: 'REFERRAL', name: 'Referral' },
      { source_code: 'SOCIAL_MEDIA', name: 'Social Media' },
      { source_code: 'AGENT', name: 'Agent' },
    ];

    const RELATIONSHIP_TYPE_CODES = [
      { relationship_code: 'SIBLINGS', name: 'Siblings' },
      { relationship_code: 'CHILD', name: 'Child' },
      { relationship_code: 'PARENT', name: 'Parent' },
      { relationship_code: 'SPOUSE', name: 'Spouse' },
      { relationship_code: 'FRIEND', name: 'Friend' },
      { relationship_code: 'GUARDIAN', name: 'Guardian' },
      { relationship_code: 'OTHER', name: 'Other' },
    ];

    const CONTACT_PERSON_STATUS_CODES = [
      { status_code: 'PENDING_VERIFICATION', name: 'Pending Verification' },
      { status_code: 'INACTIVE', name: 'Inactive' },
      { status_code: 'ACTIVE', name: 'Active' },
      { status_code: 'ARCHIVED', name: 'Archived' },
    ];

    const TRAVELLER_CONTACT_STATUS_CODES = [
      { status_code: 'REMOVED', name: 'Removed' },
      { status_code: 'ACTIVE', name: 'Active' },
      { status_code: 'INACTIVE', name: 'Inactive' },
      { status_code: 'UNVERIFIED', name: 'Unverified' },
    ];

    const REGISTRATION_STATUS_CODES = [
      { status_code: 'DRAFT', name: 'Draft' },
      { status_code: 'PENDING_PAYMENT', name: 'Pending Payment' },
      { status_code: 'CONFIRMED', name: 'Confirmed' },
      { status_code: 'DOCUMENT_PENDING', name: 'Document Pending' },
      { status_code: 'READY_FOR_TRAVEL', name: 'Ready for Travel' },
      { status_code: 'COMPLETED', name: 'Completed' },
      { status_code: 'CANCELLED', name: 'Cancelled' },
    ];

    const COUNTRY_CODES = [
      { iso_code: 'SA', name: 'Saudi Arabia' },
      { iso_code: 'ET', name: 'Ethiopia' },
      { iso_code: 'US', name: 'United States' },
    ];

    const REGION_CODES = [
      { country_iso_code: 'SA', region_code: 'MAKKAH', name: 'Makkah' },
      { country_iso_code: 'SA', region_code: 'RIYADH', name: 'Riyadh' },
      {
        country_iso_code: 'ET',
        region_code: 'ADDIS_ABABA',
        name: 'Addis Ababa',
      },
      { country_iso_code: 'ET', region_code: 'OROMIA', name: 'Oromia' },
      { country_iso_code: 'ET', region_code: 'AMHARA', name: 'Amhara' },
      { country_iso_code: 'US', region_code: 'NEW_YORK', name: 'New York' },
      { country_iso_code: 'US', region_code: 'CALIFORNIA', name: 'California' },
    ];

    const LANGUAGE_CODES = [
      { language_code: 'AMHARIC', name: 'Amharic' },
      { language_code: 'OROMO', name: 'Oromo' },
      { language_code: 'ENGLISH', name: 'English' },
      { language_code: 'ARABIC', name: 'Arabic' },
    ];

    for (const status of TRAVELLER_STATUS_CODES) {
      await db
        .insert(travellerStatuses)
        .values({ id: ulid(), ...status, is_active: true })
        .onDuplicateKeyUpdate({
          set: { name: status.name, is_active: true },
        });
    }

    for (const source of TRAVELLER_SOURCE_CODES) {
      await db
        .insert(travellerSources)
        .values({ id: ulid(), ...source, is_active: true })
        .onDuplicateKeyUpdate({
          set: { name: source.name, is_active: true },
        });
    }

    for (const type of RELATIONSHIP_TYPE_CODES) {
      await db
        .insert(relationshipTypes)
        .values({ id: ulid(), ...type, is_active: true })
        .onDuplicateKeyUpdate({
          set: { name: type.name, is_active: true },
        });
    }

    for (const status of CONTACT_PERSON_STATUS_CODES) {
      await db
        .insert(contactPersonStatuses)
        .values({ id: ulid(), ...status, is_active: true })
        .onDuplicateKeyUpdate({
          set: { name: status.name, is_active: true },
        });
    }

    for (const status of TRAVELLER_CONTACT_STATUS_CODES) {
      await db
        .insert(travellerContactStatuses)
        .values({ id: ulid(), ...status, is_active: true })
        .onDuplicateKeyUpdate({
          set: { name: status.name, is_active: true },
        });
    }

    for (const status of REGISTRATION_STATUS_CODES) {
      await db
        .insert(registrationStatuses)
        .values({ id: ulid(), ...status, is_active: true })
        .onDuplicateKeyUpdate({
          set: { name: status.name, is_active: true },
        });
    }

    for (const country of COUNTRY_CODES) {
      await db
        .insert(countries)
        .values({ id: ulid(), ...country, is_active: true })
        .onDuplicateKeyUpdate({
          set: { name: country.name, is_active: true },
        });
    }

    const countryRows = await db
      .select({ id: countries.id, iso_code: countries.iso_code })
      .from(countries);

    const countryIdByIso = new Map(countryRows.map((c) => [c.iso_code, c.id]));

    for (const region of REGION_CODES) {
      const countryId = countryIdByIso.get(region.country_iso_code);
      if (!countryId) continue;
      await db
        .insert(regions)
        .values({
          id: ulid(),
          country_id: countryId,
          region_code: region.region_code,
          name: region.name,
          is_active: true,
        })
        .onDuplicateKeyUpdate({
          set: {
            country_id: countryId,
            name: region.name,
            is_active: true,
          },
        });
    }

    for (const language of LANGUAGE_CODES) {
      await db
        .insert(languages)
        .values({ id: ulid(), ...language, is_active: true })
        .onDuplicateKeyUpdate({
          set: { name: language.name, is_active: true },
        });
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
        must_change_password: false,
        user_status_id: activeStatus[0].id,
      })
      .onDuplicateKeyUpdate({
        set: {
          full_name: 'System Administrator',
          email_address: email,
          phone_number: phone,
          password_hash: passwordHash,
          must_change_password: false,
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
