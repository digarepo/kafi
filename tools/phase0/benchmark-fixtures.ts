import 'dotenv/config';

import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import mysql from 'mysql2/promise';
import { ulid } from 'ulid';

type Tier = 'small' | 'medium' | 'large';

type TierSpec = {
  travellers: number;
  registrations: number;
  groups: number;
  documents: number;
  visas: number;
  flights: number;
  invoices: number;
  payments: number;
  expenses: number;
  hotelStays: number;
  rooms: number;
  transports: number;
};

const TIERS: Record<Tier, TierSpec> = {
  small: {
    travellers: 50,
    registrations: 100,
    groups: 10,
    documents: 100,
    visas: 50,
    flights: 50,
    invoices: 100,
    payments: 100,
    expenses: 100,
    hotelStays: 20,
    rooms: 100,
    transports: 50,
  },
  medium: {
    travellers: 500,
    registrations: 1000,
    groups: 50,
    documents: 1000,
    visas: 500,
    flights: 500,
    invoices: 1000,
    payments: 1000,
    expenses: 1000,
    hotelStays: 100,
    rooms: 500,
    transports: 250,
  },
  large: {
    travellers: 5000,
    registrations: 10000,
    groups: 250,
    documents: 10000,
    visas: 5000,
    flights: 5000,
    invoices: 10000,
    payments: 10000,
    expenses: 10000,
    hotelStays: 500,
    rooms: 2500,
    transports: 1250,
  },
};

const [, , requestedTier = 'small'] = process.argv;
const tier = requestedTier.toLowerCase() as Tier;
const reset = process.argv.includes('--reset');
const migrate = process.argv.includes('--migrate');
const seed = process.argv.includes('--seed');
const schemaSourceDatabase = process.env.KAFI_BENCHMARK_SCHEMA_SOURCE_DATABASE;
const benchmarkDatabase = process.env.KAFI_BENCHMARK_DATABASE;

if (!Object.hasOwn(TIERS, tier)) {
  throw new Error(`Tier must be one of: ${Object.keys(TIERS).join(', ')}`);
}
if (!benchmarkDatabase) {
  throw new Error('KAFI_BENCHMARK_DATABASE is required');
}
if (/^(kafi|kafi_dev|kafi_test|test)$/i.test(benchmarkDatabase)) {
  throw new Error(
    `Refusing to use normal development/test database: ${benchmarkDatabase}`,
  );
}
if (!reset) {
  throw new Error(
    'Benchmark fixtures are destructive by design. Re-run with --reset and an isolated KAFI_BENCHMARK_DATABASE.',
  );
}
if (migrate && schemaSourceDatabase) {
  throw new Error(
    'Choose one schema bootstrap mode: --migrate or KAFI_BENCHMARK_SCHEMA_SOURCE_DATABASE.',
  );
}
if (
  schemaSourceDatabase &&
  /^(kafi|kafi_dev|kafi_test|test)$/i.test(benchmarkDatabase)
) {
  throw new Error('Schema source must not be the benchmark target database');
}

const repoRoot = process.cwd();
const databaseOptions = {
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: Number(process.env.DATABASE_PORT ?? '3306'),
  user: process.env.DATABASE_USER ?? 'root',
  password: process.env.DATABASE_PASSWORD ?? '',
};
const databaseEnv = {
  ...process.env,
  DATABASE_NAME: benchmarkDatabase,
};

async function createDatabase() {
  const admin = await mysql.createConnection(databaseOptions);
  try {
    await admin.query(`DROP DATABASE IF EXISTS \`${benchmarkDatabase}\``);
    await admin.query(
      `CREATE DATABASE \`${benchmarkDatabase}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
  } finally {
    await admin.end();
  }
}

function run(command: string, args: string[], cwd = repoRoot) {
  execFileSync(command, args, {
    cwd,
    env: databaseEnv,
    stdio: 'inherit',
  });
}

async function copySchemaFromDatabase() {
  if (!schemaSourceDatabase) return;
  const dump = spawnSync(
    'mysqldump',
    [
      '--no-data',
      '--skip-comments',
      `--host=${databaseOptions.host}`,
      `--port=${databaseOptions.port}`,
      `--user=${databaseOptions.user}`,
      `--password=${databaseOptions.password}`,
      schemaSourceDatabase,
    ],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
  if (dump.status !== 0) {
    throw new Error(
      `Schema copy failed from ${schemaSourceDatabase}: ${dump.stderr || 'mysqldump failed'}`,
    );
  }
  const restore = spawnSync(
    'mysql',
    [
      `--host=${databaseOptions.host}`,
      `--port=${databaseOptions.port}`,
      `--user=${databaseOptions.user}`,
      `--password=${databaseOptions.password}`,
      benchmarkDatabase,
    ],
    { input: dump.stdout, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
  if (restore.status !== 0) {
    throw new Error(
      `Schema restore failed into ${benchmarkDatabase}: ${restore.stderr || 'mysql restore failed'}`,
    );
  }
}

async function ensureCity(
  connection: mysql.Connection,
  countryId: string,
): Promise<string> {
  const [rows] = await connection.query<mysql.RowDataPacket[]>(
    'SELECT id FROM cities WHERE is_active = 1 ORDER BY id LIMIT 1',
  );
  if (rows[0]?.id) return rows[0].id as string;
  const id = ulid();
  await connection.query(
    'INSERT INTO cities (id, country_id, geoname_id, name, population, is_active) VALUES (?, ?, ?, ?, ?, ?)',
    [id, countryId, 900000001, 'Phase 0 Benchmark City', 0, true],
  );
  return id;
}

async function firstId(
  connection: mysql.Connection,
  table: string,
  column?: string,
  value?: string,
): Promise<string> {
  const where = column && value ? ` WHERE \`${column}\` = ?` : '';
  const [rows] = await connection.query<mysql.RowDataPacket[]>(
    `SELECT id FROM \`${table}\`${where} ORDER BY id LIMIT 1`,
    column && value ? [value] : [],
  );
  const id = rows[0]?.id as string | undefined;
  if (!id) throw new Error(`Missing required benchmark reference: ${table}`);
  return id;
}

async function insertRows(
  connection: mysql.Connection,
  table: string,
  rows: Record<string, unknown>[],
) {
  if (rows.length === 0) return;
  const columns = Object.keys(rows[0]);
  const placeholders = `(${columns.map(() => '?').join(', ')})`;
  const values = rows.flatMap((row) => columns.map((column) => row[column]));
  await connection.query(
    `INSERT INTO \`${table}\` (${columns.map((column) => `\`${column}\``).join(', ')}) VALUES ${rows.map(() => placeholders).join(', ')}`,
    values,
  );
}

function pad(value: number, width = 6) {
  return String(value).padStart(width, '0');
}

async function main() {
  const spec = TIERS[tier];
  await createDatabase();

  if (migrate) {
    run(
      'npx',
      ['drizzle-kit', 'migrate', '--config=drizzle.config.ts'],
      resolve(repoRoot, 'database'),
    );
  } else if (schemaSourceDatabase) {
    console.warn(
      `Using explicit schema-copy mode from ${schemaSourceDatabase}; this is a Phase 0 migration-drift fallback and is not migration verification.`,
    );
    await copySchemaFromDatabase();
  } else {
    throw new Error(
      'Pass --migrate or set KAFI_BENCHMARK_SCHEMA_SOURCE_DATABASE explicitly',
    );
  }
  if (seed) run('npm', ['run', 'db:seed']);

  const connection = await mysql.createConnection({
    ...databaseOptions,
    database: benchmarkDatabase,
  });
  const tag = `${tier}-${ulid().slice(-8)}`;
  const now = new Date();

  try {
    const countryId = await firstId(connection, 'countries');
    const refs = {
      systemUser: await firstId(connection, 'users'),
      country: countryId,
      language: await firstId(connection, 'languages'),
      travellerStatus: await firstId(
        connection,
        'traveller_statuses',
        'status_code',
        'ACTIVE',
      ),
      travellerSource: await firstId(connection, 'traveller_sources'),
      registrationDraft: await firstId(
        connection,
        'registration_statuses',
        'status_code',
        'DRAFT',
      ),
      registrationReady: await firstId(
        connection,
        'registration_statuses',
        'status_code',
        'READY_FOR_TRAVEL',
      ),
      groupPlanning: await firstId(
        connection,
        'travel_group_statuses',
        'status_code',
        'PLANNING',
      ),
      membershipActive: await firstId(
        connection,
        'group_membership_statuses',
        'status_code',
        'ACTIVE',
      ),
      templateActive: await firstId(
        connection,
        'package_template_statuses',
        'status_code',
        'ACTIVE',
      ),
      versionPublished: await firstId(
        connection,
        'package_version_statuses',
        'status_code',
        'PUBLISHED',
      ),
      pilgrimageType: await firstId(connection, 'pilgrimage_types'),
      packageCategory: await firstId(connection, 'package_categories'),
      currency: await firstId(connection, 'currencies', 'currency_code', 'ETB'),
      season: await firstId(connection, 'seasons'),
      documentType: await firstId(connection, 'document_types'),
      documentStatus: await firstId(connection, 'document_statuses'),
      verificationStatus: await firstId(connection, 'verification_statuses'),
      visaStatus: await firstId(connection, 'visa_application_statuses'),
      flightStatus: await firstId(connection, 'flight_booking_statuses'),
      invoiceStatus: await firstId(
        connection,
        'invoice_statuses',
        'status_code',
        'SENT',
      ),
      paymentStatus: await firstId(
        connection,
        'payment_statuses',
        'status_code',
        'COMPLETED',
      ),
      payerType: await firstId(
        connection,
        'payer_types',
        'type_code',
        'INDIVIDUAL',
      ),
      payerStatus: await firstId(
        connection,
        'payer_statuses',
        'status_code',
        'ACTIVE',
      ),
      paymentMethod: await firstId(
        connection,
        'payment_methods',
        'method_code',
        'CASH',
      ),
      lineItemType: await firstId(connection, 'invoice_line_item_types'),
      expenseStatus: await firstId(
        connection,
        'expense_statuses',
        'status_code',
        'CONFIRMED',
      ),
      expenseCategory: await firstId(connection, 'expense_categories'),
      expenseSource: await firstId(connection, 'expense_sources'),
      stayStatus: await firstId(
        connection,
        'group_hotel_stay_statuses',
        'status_code',
        'CONFIRMED',
      ),
      roomStatus: await firstId(
        connection,
        'room_statuses',
        'status_code',
        'AVAILABLE',
      ),
      assignmentStatus: await firstId(
        connection,
        'room_assignment_statuses',
        'status_code',
        'ASSIGNED',
      ),
      transportStatus: await firstId(
        connection,
        'transport_segment_statuses',
        'status_code',
        'CONFIRMED',
      ),
      city: await ensureCity(connection, countryId),
    };

    const templateId = ulid();
    await insertRows(connection, 'package_templates', [
      {
        id: templateId,
        package_template_code: `BT-${tag}`,
        name: `Benchmark ${tier} Template`,
        short_name: `BM-${tier}`,
        description: 'Isolated Phase 0 benchmark template',
        pilgrimage_type_id: refs.pilgrimageType,
        package_category_id: refs.packageCategory,
        default_duration_days: 14,
        package_template_status_id: refs.templateActive,
        created_by: refs.systemUser,
        updated_by: refs.systemUser,
      },
    ]);

    const versionCount = Math.max(5, Math.ceil(spec.groups / 10));
    const packageVersionIds = Array.from({ length: versionCount }, () =>
      ulid(),
    );
    await insertRows(
      connection,
      'package_versions',
      packageVersionIds.map((id, index) => ({
        id,
        package_version_code: `BV-${tag}-${pad(index + 1, 3)}`,
        package_template_id: templateId,
        version_name: `Benchmark ${tier} Version ${index + 1}`,
        version_number: index + 1,
        slug: `benchmark-${tag}-${index + 1}`,
        sort_order: index + 1,
        season_id: refs.season,
        year: 2027,
        departure_date: '2027-01-10',
        return_date: '2027-01-24',
        base_price: '100000.00',
        currency_id: refs.currency,
        max_capacity: 50,
        published_at: now,
        sales_start_date: '2026-01-01',
        sales_end_date: '2027-01-05',
        package_version_status_id: refs.versionPublished,
        created_by: refs.systemUser,
        updated_by: refs.systemUser,
      })),
    );

    const travellerIds = Array.from({ length: spec.travellers }, () => ulid());
    await insertRows(
      connection,
      'travellers',
      travellerIds.map((id, index) => ({
        id,
        traveller_number: `BT-${tag}-${pad(index + 1)}`,
        first_name: 'Benchmark',
        last_name: `Traveller ${index + 1}`,
        gender: index % 2 === 0 ? 'Male' : 'Female',
        date_of_birth: '1985-01-01',
        phone_number: `2519${String(index).padStart(8, '0')}`,
        email_address: `benchmark-${tag}-${index}@example.test`,
        country_id: refs.country,
        preferred_language_id: refs.language,
        traveller_source_id: refs.travellerSource,
        traveller_status_id: refs.travellerStatus,
        created_by: refs.systemUser,
        updated_by: refs.systemUser,
      })),
    );

    const registrationIds = Array.from({ length: spec.registrations }, () =>
      ulid(),
    );
    await insertRows(
      connection,
      'registrations',
      registrationIds.map((id, index) => ({
        id,
        registration_number: `BR-${tag}-${pad(index + 1)}`,
        traveller_id: travellerIds[index % travellerIds.length],
        package_version_id: packageVersionIds[index % packageVersionIds.length],
        registration_date: now,
        expected_departure_date: '2027-01-10',
        expected_return_date: '2027-01-24',
        registration_status_id:
          index % 3 === 0 ? refs.registrationReady : refs.registrationDraft,
        created_by: refs.systemUser,
        updated_by: refs.systemUser,
      })),
    );

    const groupIds = Array.from({ length: spec.groups }, () => ulid());
    await insertRows(
      connection,
      'travel_groups',
      groupIds.map((id, index) => ({
        id,
        group_number: `BG-${tag}-${pad(index + 1)}`,
        package_version_id: packageVersionIds[index % packageVersionIds.length],
        name: `Benchmark Group ${index + 1}`,
        departure_date: '2027-01-10',
        return_date: '2027-01-24',
        maximum_capacity: 50,
        travel_group_status_id: refs.groupPlanning,
        created_by: refs.systemUser,
        updated_by: refs.systemUser,
      })),
    );

    const membershipCount = Math.min(
      registrationIds.length,
      groupIds.length * 10,
    );
    const membershipIds = Array.from({ length: membershipCount }, () => ulid());
    await insertRows(
      connection,
      'group_memberships',
      membershipIds.map((id, index) => ({
        id,
        travel_group_id: groupIds[index % groupIds.length],
        registration_id: registrationIds[index],
        group_membership_status_id: refs.membershipActive,
        joined_at: now,
        guarantee_required: true,
        guarantee_waived: false,
        created_by: refs.systemUser,
        updated_by: refs.systemUser,
      })),
    );

    const documentIds = Array.from({ length: spec.documents }, () => ulid());
    await insertRows(
      connection,
      'documents',
      documentIds.map((id, index) => ({
        id,
        document_number: `BD-${tag}-${pad(index + 1)}`,
        display_name: `Benchmark Document ${index + 1}`,
        traveller_id: travellerIds[index % travellerIds.length],
        registration_id: registrationIds[index % registrationIds.length],
        document_type_id: refs.documentType,
        original_filename: `benchmark-${index + 1}.pdf`,
        stored_filename: `benchmark-${tag}-${index + 1}.pdf`,
        mime_type: 'application/pdf',
        file_size: 1024,
        storage_path: `benchmark/${tag}/${index + 1}.pdf`,
        verification_status_id: refs.verificationStatus,
        document_status_id: refs.documentStatus,
        created_by: refs.systemUser,
        updated_by: refs.systemUser,
      })),
    );

    const visaIds = Array.from({ length: spec.visas }, () => ulid());
    await insertRows(
      connection,
      'visa_applications',
      visaIds.map((id, index) => ({
        id,
        application_number: `BVISA-${tag}-${pad(index + 1)}`,
        registration_id: registrationIds[index % registrationIds.length],
        submission_date: '2026-12-01',
        visa_application_status_id: refs.visaStatus,
        visa_cost: '5000.00',
        created_by: refs.systemUser,
        updated_by: refs.systemUser,
      })),
    );

    const flightIds = Array.from({ length: spec.flights }, () => ulid());
    await insertRows(
      connection,
      'flight_bookings',
      flightIds.map((id, index) => ({
        id,
        booking_number: `BF-${tag}-${pad(index + 1)}`,
        registration_id: registrationIds[index % registrationIds.length],
        flight_booking_status_id: refs.flightStatus,
        pnr: `P${tag.slice(-5)}${pad(index + 1, 3)}`,
        departure_flight_number: 'BM100',
        departure_date: '2027-01-10',
        return_flight_number: 'BM101',
        return_date: '2027-01-24',
        supplier_cost: '25000.00',
        created_by: refs.systemUser,
        updated_by: refs.systemUser,
      })),
    );

    const payerId = ulid();
    await insertRows(connection, 'payers', [
      {
        id: payerId,
        payer_number: `BP-${tag}`,
        payer_type_id: refs.payerType,
        traveller_id: travellerIds[0],
        payer_status_id: refs.payerStatus,
        contact_name: 'Benchmark Payer',
        phone_number: '251911000000',
        created_by: refs.systemUser,
        updated_by: refs.systemUser,
      },
    ]);

    const invoiceIds = Array.from({ length: spec.invoices }, () => ulid());
    await insertRows(
      connection,
      'invoices',
      invoiceIds.map((id, index) => ({
        id,
        invoice_number: `BI-${tag}-${pad(index + 1)}`,
        registration_id: registrationIds[index % registrationIds.length],
        invoice_date: now,
        subtotal: '100000.00',
        discount_amount: '0.00',
        total_amount: '100000.00',
        currency_id: refs.currency,
        invoice_status_id: refs.invoiceStatus,
        created_by: refs.systemUser,
        updated_by: refs.systemUser,
      })),
    );

    await insertRows(
      connection,
      'invoice_line_items',
      invoiceIds.map((id, index) => ({
        id: ulid(),
        invoice_id: id,
        line_item_type_id: refs.lineItemType,
        description: `Benchmark package charge ${index + 1}`,
        quantity: '1',
        unit_price: '100000.00',
        total_price: '100000.00',
        created_by: refs.systemUser,
        updated_by: refs.systemUser,
      })),
    );

    const paymentIds = Array.from({ length: spec.payments }, () => ulid());
    await insertRows(
      connection,
      'payments',
      paymentIds.map((id, index) => ({
        id,
        payment_number: `BPAY-${tag}-${pad(index + 1)}`,
        payer_id: payerId,
        payment_method_id: refs.paymentMethod,
        payment_date: now,
        original_amount: '100000.00',
        original_currency_id: refs.currency,
        exchange_rate: '1.000000',
        amount: '100000.00',
        received_by: refs.systemUser,
        payment_status_id: refs.paymentStatus,
        created_by: refs.systemUser,
        updated_by: refs.systemUser,
      })),
    );

    await insertRows(
      connection,
      'payment_allocations',
      paymentIds.map((id, index) => ({
        id: ulid(),
        payment_id: id,
        invoice_id: invoiceIds[index % invoiceIds.length],
        allocated_amount: '100000.00',
        allocation_date: now,
        created_by: refs.systemUser,
        updated_by: refs.systemUser,
      })),
    );

    const expenseIds = Array.from({ length: spec.expenses }, () => ulid());
    await insertRows(
      connection,
      'expenses',
      expenseIds.map((id, index) => ({
        id,
        expense_number: `BE-${tag}-${pad(index + 1)}`,
        expense_category_id: refs.expenseCategory,
        expense_source_id: refs.expenseSource,
        expense_status_id: refs.expenseStatus,
        amount: '1000.00',
        original_amount: '1000.00',
        original_currency_id: refs.currency,
        exchange_rate: '1.000000',
        expense_date: now,
        description: `Benchmark expense ${index + 1}`,
        attribution_scope: index % 2 === 0 ? 'GROUP' : 'TRAVELER',
        traveller_id: travellerIds[index % travellerIds.length],
        registration_id: registrationIds[index % registrationIds.length],
        travel_group_id: groupIds[index % groupIds.length],
        package_version_id: packageVersionIds[index % packageVersionIds.length],
        created_by: refs.systemUser,
        updated_by: refs.systemUser,
      })),
    );

    const stayIds = Array.from({ length: spec.hotelStays }, () => ulid());
    await insertRows(
      connection,
      'group_hotel_stays',
      stayIds.map((id, index) => ({
        id,
        stay_number: `BS-${tag}-${pad(index + 1)}`,
        travel_group_id: groupIds[index % groupIds.length],
        hotel_name: `Benchmark Hotel ${index + 1}`,
        sequence_order: Math.floor(index / groupIds.length) + 1,
        city_id: refs.city,
        check_in_date: '2027-01-10',
        check_out_date: '2027-01-14',
        group_hotel_stay_status_id: refs.stayStatus,
        accommodation_cost: '10000.00',
        created_by: refs.systemUser,
        updated_by: refs.systemUser,
      })),
    );

    const roomIds = Array.from({ length: spec.rooms }, () => ulid());
    await insertRows(
      connection,
      'rooms',
      roomIds.map((id, index) => ({
        id,
        room_code: `BROOM-${tag}-${pad(index + 1)}`,
        group_hotel_stay_id: stayIds[index % stayIds.length],
        room_number: `R-${index + 1}`,
        capacity: 4,
        room_status_id: refs.roomStatus,
        created_by: refs.systemUser,
        updated_by: refs.systemUser,
      })),
    );

    const assignmentCount = Math.min(membershipIds.length, roomIds.length);
    await insertRows(
      connection,
      'room_assignments',
      Array.from({ length: assignmentCount }, (_, index) => ({
        id: ulid(),
        room_id: roomIds[index],
        group_hotel_stay_id: stayIds[index % stayIds.length],
        group_membership_id: membershipIds[index],
        assigned_at: now,
        room_assignment_status_id: refs.assignmentStatus,
        is_active_assignment: true,
        active_membership_stay_key: `${membershipIds[index]}|${stayIds[index % stayIds.length]}`,
        created_by: refs.systemUser,
        updated_by: refs.systemUser,
      })),
    );

    await insertRows(
      connection,
      'transport_segments',
      Array.from({ length: spec.transports }, (_, index) => ({
        id: ulid(),
        transport_segment_number: `BT-${tag}-${pad(index + 1)}`,
        travel_group_id: groupIds[index % groupIds.length],
        segment_order: Math.floor(index / groupIds.length) + 1,
        origin_location: 'Benchmark Airport',
        destination_location: 'Benchmark Hotel',
        transport_segment_status_id: refs.transportStatus,
        transport_cost: '5000.00',
        created_by: refs.systemUser,
        updated_by: refs.systemUser,
      })),
    );

    const metadata = {
      benchmark_run_id: tag,
      database: benchmarkDatabase,
      schema_bootstrap: migrate
        ? { mode: 'drizzle-migrations' }
        : { mode: 'database-copy', source: schemaSourceDatabase },
      tier,
      generated_at: now.toISOString(),
      counts: spec,
      created_ids: {
        package_template_id: templateId,
        package_version_count: packageVersionIds.length,
        traveller_count: travellerIds.length,
        registration_count: registrationIds.length,
        group_count: groupIds.length,
        membership_count: membershipIds.length,
        invoice_count: invoiceIds.length,
        payment_count: paymentIds.length,
        expense_count: expenseIds.length,
        stay_count: stayIds.length,
        room_count: roomIds.length,
      },
    };
    const outputDir = resolve(repoRoot, 'tmp/phase0-fixtures');
    mkdirSync(outputDir, { recursive: true });
    const outputPath = resolve(outputDir, `${tag}.json`);
    writeFileSync(outputPath, `${JSON.stringify(metadata, null, 2)}\n`);
    console.log(
      JSON.stringify({ ...metadata, metadata_path: outputPath }, null, 2),
    );
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
