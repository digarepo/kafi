import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { MySql2Database } from 'drizzle-orm/mysql2';
import { eq, and, or, like, desc, asc, max, sql, not } from 'drizzle-orm';
import { ulid } from 'ulid';
import { DATABASE } from '../../../../shared/infrastructure/database/database.provider.js';
import * as schema from '@kafi/database';
import {
  CreatePackageTemplateDto,
  UpdatePackageTemplateDto,
  CreatePackageVersionDto,
  UpdatePackageVersionDto,
  PackageVersionInclusionDto,
} from '../dto/packages.dto.js';

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 200);
}

function toDateOrNull(value: string | undefined | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function dateKey(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

export interface PackageVersionValidationIssue {
  code: string;
  field: string;
  message: string;
}

export function getPackageVersionPublicationIssues(version: {
  version_name?: string | null;
  slug?: string | null;
  departure_date?: Date | string | null;
  return_date?: Date | string | null;
  base_price?: number | string | null;
  currency_id?: string | null;
  max_capacity?: number | null;
  sales_start_date?: Date | string | null;
  sales_end_date?: Date | string | null;
  template_status?: string | null;
}): PackageVersionValidationIssue[] {
  const issues: PackageVersionValidationIssue[] = [];
  const departure = dateKey(version.departure_date);
  const returnDate = dateKey(version.return_date);
  const salesStart = dateKey(version.sales_start_date);
  const salesEnd = dateKey(version.sales_end_date);

  if (!version.version_name?.trim()) {
    issues.push({
      code: 'VERSION_NAME_REQUIRED',
      field: 'version_name',
      message: 'Version name is required.',
    });
  }
  if (!version.slug?.trim()) {
    issues.push({
      code: 'SLUG_REQUIRED',
      field: 'slug',
      message: 'A URL slug is required before publishing.',
    });
  }
  if (!departure || !returnDate) {
    issues.push({
      code: 'TRAVEL_DATES_REQUIRED',
      field: 'departure_date',
      message: 'Departure and return dates are required.',
    });
  } else if (departure > returnDate) {
    issues.push({
      code: 'INVALID_TRAVEL_DATE_ORDER',
      field: 'return_date',
      message: 'Return date must be on or after departure date.',
    });
  }
  if (!salesStart || !salesEnd) {
    issues.push({
      code: 'REGISTRATION_WINDOW_REQUIRED',
      field: 'sales_start_date',
      message: 'Registration start and end dates are required.',
    });
  } else if (salesStart > salesEnd) {
    issues.push({
      code: 'INVALID_REGISTRATION_WINDOW',
      field: 'sales_end_date',
      message: 'Registration end date must be on or after start date.',
    });
  } else if (departure && salesEnd && salesEnd > departure) {
    issues.push({
      code: 'REGISTRATION_WINDOW_AFTER_DEPARTURE',
      field: 'sales_end_date',
      message:
        'Registration window must close on or before the departure date.',
    });
  }

  const price = Number(version.base_price);
  if (
    version.base_price === null ||
    version.base_price === undefined ||
    !Number.isFinite(price) ||
    price < 0
  ) {
    issues.push({
      code: 'INVALID_PRICE',
      field: 'base_price',
      message: 'Base price must be a valid non-negative amount.',
    });
  }
  if (!version.currency_id) {
    issues.push({
      code: 'CURRENCY_REQUIRED',
      field: 'currency_id',
      message: 'Currency is required.',
    });
  }
  if (
    version.max_capacity === null ||
    version.max_capacity === undefined ||
    !Number.isInteger(version.max_capacity) ||
    version.max_capacity < 1
  ) {
    issues.push({
      code: 'INVALID_CAPACITY',
      field: 'max_capacity',
      message: 'Maximum capacity must be a positive whole number.',
    });
  }
  if (version.template_status && version.template_status !== 'ACTIVE') {
    issues.push({
      code: 'TEMPLATE_NOT_ACTIVE',
      field: 'package_template_id',
      message: 'The package template must be active before publication.',
    });
  }

  return issues;
}

export function isWithinRegistrationWindow(
  salesStart: Date | string | null | undefined,
  salesEnd: Date | string | null | undefined,
  now = new Date(),
): boolean {
  const start = dateKey(salesStart);
  const end = dateKey(salesEnd);
  const today = dateKey(now);
  return !!start && !!end && !!today && start <= today && today <= end;
}

@Injectable()
export class PackagesService {
  constructor(
    @Inject(DATABASE)
    private readonly db: MySql2Database<typeof schema>,
  ) {}

  // ---- Reference data ----

  async listCategories() {
    return this.db
      .select()
      .from(schema.packageCategories)
      .where(eq(schema.packageCategories.is_active, true));
  }

  async listPilgrimageTypes() {
    return this.db
      .select()
      .from(schema.pilgrimageTypes)
      .where(eq(schema.pilgrimageTypes.is_active, true));
  }

  async listCurrencies() {
    return this.db
      .select()
      .from(schema.currencies)
      .where(eq(schema.currencies.is_active, true));
  }

  async listSeasons() {
    return this.db
      .select()
      .from(schema.seasons)
      .where(eq(schema.seasons.is_active, true));
  }

  // ---- Package templates ----

  async listTemplates(page = 1, pageSize = 25, search?: string) {
    const where = and(
      eq(schema.packageTemplates.is_deleted, false),
      search
        ? or(
            like(schema.packageTemplates.name, `%${search}%`),
            like(schema.packageTemplates.package_template_code, `%${search}%`),
          )
        : undefined,
    );

    const [rows, count] = await Promise.all([
      this.db
        .select()
        .from(schema.packageTemplates)
        .leftJoin(
          schema.packageCategories,
          eq(
            schema.packageTemplates.package_category_id,
            schema.packageCategories.id,
          ),
        )
        .leftJoin(
          schema.pilgrimageTypes,
          eq(
            schema.packageTemplates.pilgrimage_type_id,
            schema.pilgrimageTypes.id,
          ),
        )
        .leftJoin(
          schema.packageTemplateStatuses,
          eq(
            schema.packageTemplates.package_template_status_id,
            schema.packageTemplateStatuses.id,
          ),
        )
        .where(where)
        .orderBy(desc(schema.packageTemplates.created_at))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(schema.packageTemplates)
        .where(where)
        .then((r) => r[0]?.count ?? 0),
    ]);

    return {
      data: rows.map((r) => this.mapTemplateRow(r)),
      total: count,
      page,
      pageSize,
    };
  }

  async getTemplate(id: string) {
    const [row] = await this.db
      .select()
      .from(schema.packageTemplates)
      .leftJoin(
        schema.packageCategories,
        eq(
          schema.packageTemplates.package_category_id,
          schema.packageCategories.id,
        ),
      )
      .leftJoin(
        schema.pilgrimageTypes,
        eq(
          schema.packageTemplates.pilgrimage_type_id,
          schema.pilgrimageTypes.id,
        ),
      )
      .leftJoin(
        schema.packageTemplateStatuses,
        eq(
          schema.packageTemplates.package_template_status_id,
          schema.packageTemplateStatuses.id,
        ),
      )
      .where(
        and(
          eq(schema.packageTemplates.id, id),
          eq(schema.packageTemplates.is_deleted, false),
        ),
      )
      .limit(1);
    if (!row) throw new NotFoundException('Package template not found');
    return this.mapTemplateRow(row);
  }

  async createTemplate(dto: CreatePackageTemplateDto, actorId: string) {
    const activeStatus = await this.getTemplateStatus('ACTIVE');
    const code = await this.generateTemplateCode();
    const id = ulid();
    await this.db.insert(schema.packageTemplates).values({
      id,
      package_template_code: code,
      name: dto.name,
      short_name: dto.short_name ?? null,
      description: dto.description ?? null,
      pilgrimage_type_id: dto.pilgrimage_type_id,
      package_category_id: dto.package_category_id,
      default_duration_days: dto.default_duration_days,
      package_template_status_id: activeStatus.id,
      created_by: actorId,
      updated_by: actorId,
    });
    return this.getTemplate(id);
  }

  async updateTemplate(
    id: string,
    dto: UpdatePackageTemplateDto,
    actorId: string,
  ) {
    const existing = await this.getTemplate(id);
    this.assertTemplateActive(existing);

    await this.db
      .update(schema.packageTemplates)
      .set({
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.short_name !== undefined && {
          short_name: dto.short_name ?? null,
        }),
        ...(dto.description !== undefined && {
          description: dto.description ?? null,
        }),
        ...(dto.pilgrimage_type_id !== undefined && {
          pilgrimage_type_id: dto.pilgrimage_type_id,
        }),
        ...(dto.package_category_id !== undefined && {
          package_category_id: dto.package_category_id,
        }),
        ...(dto.default_duration_days !== undefined && {
          default_duration_days: dto.default_duration_days,
        }),
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.packageTemplates.id, id));
    return this.getTemplate(id);
  }

  async archiveTemplate(id: string, actorId: string) {
    const existing = await this.getTemplate(id);
    this.assertTemplateActive(existing);
    const archivedStatus = await this.getTemplateStatus('ARCHIVED');

    await this.db
      .update(schema.packageTemplates)
      .set({
        package_template_status_id: archivedStatus.id,
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.packageTemplates.id, id));

    return this.getTemplate(id);
  }

  private mapTemplateRow(row: any) {
    return {
      id: row.package_templates.id,
      package_template_code: row.package_templates.package_template_code,
      name: row.package_templates.name,
      short_name: row.package_templates.short_name,
      description: row.package_templates.description,
      default_duration_days: row.package_templates.default_duration_days,
      package_template_status_id:
        row.package_templates.package_template_status_id,
      status: row.package_template_statuses?.status_code,
      status_name: row.package_template_statuses?.name,
      pilgrimage_type: row.pilgrimage_types
        ? { id: row.pilgrimage_types.id, name: row.pilgrimage_types.name }
        : null,
      package_category: row.package_categories
        ? { id: row.package_categories.id, name: row.package_categories.name }
        : null,
      created_at: row.package_templates.created_at,
      updated_at: row.package_templates.updated_at,
      is_deleted: row.package_templates.is_deleted,
    };
  }

  // ---- Package versions ----

  async listVersions(
    page = 1,
    pageSize = 25,
    templateId?: string,
    search?: string,
  ) {
    const filters = [eq(schema.packageVersions.is_deleted, false)];
    if (templateId)
      filters.push(eq(schema.packageVersions.package_template_id, templateId));
    if (search) {
      filters.push(
        or(
          like(schema.packageVersions.version_name, `%${search}%`),
          like(schema.packageVersions.package_version_code, `%${search}%`),
        ) as any,
      );
    }
    const where = and(...filters);

    const [rows, count] = await Promise.all([
      this.db
        .select()
        .from(schema.packageVersions)
        .leftJoin(
          schema.packageTemplates,
          eq(
            schema.packageVersions.package_template_id,
            schema.packageTemplates.id,
          ),
        )
        .leftJoin(
          schema.packageTemplateStatuses,
          eq(
            schema.packageTemplates.package_template_status_id,
            schema.packageTemplateStatuses.id,
          ),
        )
        .leftJoin(
          schema.packageVersionStatuses,
          eq(
            schema.packageVersions.package_version_status_id,
            schema.packageVersionStatuses.id,
          ),
        )
        .leftJoin(
          schema.seasons,
          eq(schema.packageVersions.season_id, schema.seasons.id),
        )
        .leftJoin(
          schema.currencies,
          eq(schema.packageVersions.currency_id, schema.currencies.id),
        )
        .where(where)
        .orderBy(desc(schema.packageVersions.created_at))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(schema.packageVersions)
        .where(where)
        .then((r) => r[0]?.count ?? 0),
    ]);

    const data = await Promise.all(
      rows.map(async (row) => this.withAvailability(this.mapVersionRow(row))),
    );

    return {
      data,
      total: count,
      page,
      pageSize,
    };
  }

  async getVersion(id: string, withInclusions = true) {
    const [row] = await this.db
      .select()
      .from(schema.packageVersions)
      .leftJoin(
        schema.packageTemplates,
        eq(
          schema.packageVersions.package_template_id,
          schema.packageTemplates.id,
        ),
      )
      .leftJoin(
        schema.packageTemplateStatuses,
        eq(
          schema.packageTemplates.package_template_status_id,
          schema.packageTemplateStatuses.id,
        ),
      )
      .leftJoin(
        schema.packageVersionStatuses,
        eq(
          schema.packageVersions.package_version_status_id,
          schema.packageVersionStatuses.id,
        ),
      )
      .leftJoin(
        schema.seasons,
        eq(schema.packageVersions.season_id, schema.seasons.id),
      )
      .leftJoin(
        schema.currencies,
        eq(schema.packageVersions.currency_id, schema.currencies.id),
      )
      .leftJoin(
        schema.packageCategories,
        eq(
          schema.packageTemplates.package_category_id,
          schema.packageCategories.id,
        ),
      )
      .leftJoin(
        schema.pilgrimageTypes,
        eq(
          schema.packageTemplates.pilgrimage_type_id,
          schema.pilgrimageTypes.id,
        ),
      )
      .where(
        and(
          eq(schema.packageVersions.id, id),
          eq(schema.packageVersions.is_deleted, false),
        ),
      )
      .limit(1);
    if (!row) throw new NotFoundException('Package version not found');

    const result = this.mapVersionRow(row);
    if (withInclusions) {
      result.inclusions = await this.getVersionInclusions(id);
    }
    return result;
  }

  async createVersion(dto: CreatePackageVersionDto, actorId: string) {
    const template = await this.getTemplate(dto.package_template_id);
    this.assertTemplateActive(template);

    const nextNumber = await this.getNextVersionNumber(dto.package_template_id);
    const draftStatus = await this.getVersionStatus('DRAFT');
    const code = await this.generateVersionCode();
    const slug = await this.ensureUniqueSlug(
      dto.slug?.trim() || slugify(dto.version_name),
    );

    const id = ulid();
    await this.db.insert(schema.packageVersions).values({
      id,
      package_version_code: code,
      package_template_id: dto.package_template_id,
      version_name: dto.version_name,
      version_number: nextNumber,
      slug,
      hero_image_url: dto.hero_image_url ?? null,
      sort_order: dto.sort_order ?? 0,
      season_id: dto.season_id ?? null,
      year: dto.year,
      departure_date: toDateOrNull(dto.departure_date),
      return_date: toDateOrNull(dto.return_date),
      base_price: String(dto.base_price),
      currency_id: dto.currency_id,
      max_capacity: dto.max_capacity ?? null,
      sales_start_date: toDateOrNull(dto.sales_start_date),
      sales_end_date: toDateOrNull(dto.sales_end_date),
      package_version_status_id: draftStatus.id,
      created_by: actorId,
      updated_by: actorId,
    });

    if (dto.inclusions?.length) {
      await this.saveInclusions(id, dto.inclusions, actorId);
    }

    return this.getVersion(id);
  }

  async updateVersion(
    id: string,
    dto: UpdatePackageVersionDto,
    actorId: string,
  ) {
    const existing = await this.getVersion(id);
    if (existing.status !== 'DRAFT') {
      throw new ConflictException('Only draft package versions can be edited');
    }

    const departure =
      dto.departure_date !== undefined
        ? dto.departure_date
        : dateKey(existing.departure_date);
    const returnDate =
      dto.return_date !== undefined
        ? dto.return_date
        : dateKey(existing.return_date);
    const salesStart =
      dto.sales_start_date !== undefined
        ? dto.sales_start_date
        : dateKey(existing.sales_start_date);
    const salesEnd =
      dto.sales_end_date !== undefined
        ? dto.sales_end_date
        : dateKey(existing.sales_end_date);

    this.assertDateRangeOrder(departure, returnDate, 'travel dates');
    this.assertDateRangeOrder(salesStart, salesEnd, 'registration window');

    const slug = dto.slug?.trim()
      ? await this.ensureUniqueSlug(dto.slug.trim(), id)
      : existing.slug;

    await this.db
      .update(schema.packageVersions)
      .set({
        ...(dto.version_name !== undefined && {
          version_name: dto.version_name,
        }),
        ...(dto.slug !== undefined && { slug }),
        ...(dto.hero_image_url !== undefined && {
          hero_image_url: dto.hero_image_url ?? null,
        }),
        ...(dto.sort_order !== undefined && { sort_order: dto.sort_order }),
        ...(dto.season_id !== undefined && {
          season_id: dto.season_id ?? null,
        }),
        ...(dto.year !== undefined && { year: dto.year }),
        ...(dto.departure_date !== undefined && {
          departure_date: toDateOrNull(dto.departure_date),
        }),
        ...(dto.return_date !== undefined && {
          return_date: toDateOrNull(dto.return_date),
        }),
        ...(dto.base_price !== undefined && {
          base_price: String(dto.base_price),
        }),
        ...(dto.currency_id !== undefined && { currency_id: dto.currency_id }),
        ...(dto.max_capacity !== undefined && {
          max_capacity: dto.max_capacity ?? null,
        }),
        ...(dto.sales_start_date !== undefined && {
          sales_start_date: toDateOrNull(dto.sales_start_date),
        }),
        ...(dto.sales_end_date !== undefined && {
          sales_end_date: toDateOrNull(dto.sales_end_date),
        }),
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.packageVersions.id, id));

    if (dto.inclusions) {
      await this.replaceInclusions(id, dto.inclusions, actorId);
    }

    return this.getVersion(id);
  }

  async publishVersion(id: string, actorId: string) {
    const existing = await this.getVersion(id);
    if (existing.status !== 'DRAFT') {
      throw new ConflictException(
        `Only draft package versions can be published; current status is ${existing.status}`,
      );
    }

    const issues = getPackageVersionPublicationIssues(existing);
    if (issues.length > 0) {
      throw new BadRequestException({
        code: 'PACKAGE_VERSION_NOT_READY',
        message: 'Package version cannot be published.',
        issues,
      });
    }

    const publishedStatus = await this.getVersionStatus('PUBLISHED');
    await this.db
      .update(schema.packageVersions)
      .set({
        package_version_status_id: publishedStatus.id,
        published_at: new Date(),
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.packageVersions.id, id));

    return this.getVersion(id);
  }

  async closeVersion(id: string, actorId: string) {
    const existing = await this.getVersion(id);
    if (existing.status !== 'PUBLISHED') {
      throw new ConflictException(
        `Only published package versions can be closed; current status is ${existing.status}`,
      );
    }

    const closedStatus = await this.getVersionStatus('CLOSED');
    await this.db
      .update(schema.packageVersions)
      .set({
        package_version_status_id: closedStatus.id,
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.packageVersions.id, id));

    return this.getVersion(id);
  }

  async cancelVersion(id: string, actorId: string) {
    const existing = await this.getVersion(id);
    if (!['DRAFT', 'PUBLISHED'].includes(existing.status)) {
      throw new ConflictException(
        `Only draft or published package versions can be cancelled; current status is ${existing.status}`,
      );
    }

    const cancelledStatus = await this.getVersionStatus('CANCELLED');
    await this.db
      .update(schema.packageVersions)
      .set({
        package_version_status_id: cancelledStatus.id,
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.packageVersions.id, id));

    return this.getVersion(id);
  }

  private assertTemplateActive(template: { status?: string | null }) {
    if (template.status !== 'ACTIVE') {
      throw new ConflictException(
        'Only active package templates can be edited or used for new versions',
      );
    }
  }

  private assertDateRangeOrder(
    start: Date | string | null | undefined,
    end: Date | string | null | undefined,
    label: string,
  ) {
    const startKey = dateKey(start);
    const endKey = dateKey(end);
    if (startKey && endKey && startKey > endKey) {
      throw new BadRequestException(
        `${label} end date must be on or after its start date`,
      );
    }
  }

  private async getNextVersionNumber(templateId: string) {
    const [row] = await this.db
      .select({ max: max(schema.packageVersions.version_number) })
      .from(schema.packageVersions)
      .where(eq(schema.packageVersions.package_template_id, templateId));
    return (row?.max ?? 0) + 1;
  }

  private async getTemplateStatus(code: string) {
    const [row] = await this.db
      .select()
      .from(schema.packageTemplateStatuses)
      .where(eq(schema.packageTemplateStatuses.status_code, code))
      .limit(1);
    if (!row)
      throw new NotFoundException(`Package template status ${code} not found`);
    return row;
  }

  private async getVersionStatus(code: string) {
    const [row] = await this.db
      .select()
      .from(schema.packageVersionStatuses)
      .where(eq(schema.packageVersionStatuses.status_code, code))
      .limit(1);
    if (!row)
      throw new NotFoundException(`Package version status ${code} not found`);
    return row;
  }

  async assertAvailableForRegistration(id: string) {
    const version = await this.getVersion(id);
    const available = await this.withAvailability(version);
    if (!available.is_registration_available) {
      throw new ConflictException({
        code: 'PACKAGE_VERSION_UNAVAILABLE',
        message: 'Package version is not available for registration.',
        blockers: available.availability_blockers,
      });
    }
    return available;
  }

  private async withAvailability(version: any, now = new Date()) {
    const registrationCount = await this.countRegistrations(version.id);
    const remainingCapacity =
      version.max_capacity === null
        ? null
        : Math.max(version.max_capacity - registrationCount, 0);
    const blockers: string[] = [];

    if (version.status !== 'PUBLISHED') {
      blockers.push('PACKAGE_VERSION_NOT_PUBLISHED');
    }
    if (
      !isWithinRegistrationWindow(
        version.sales_start_date,
        version.sales_end_date,
        now,
      )
    ) {
      blockers.push('REGISTRATION_WINDOW_CLOSED');
    }
    if (
      version.max_capacity !== null &&
      registrationCount >= version.max_capacity
    ) {
      blockers.push('PACKAGE_VERSION_AT_CAPACITY');
    }

    return {
      ...version,
      registration_count: registrationCount,
      remaining_capacity: remainingCapacity,
      available_capacity: remainingCapacity,
      is_registration_available: blockers.length === 0,
      availability_blockers: blockers,
    };
  }

  private async countRegistrations(packageVersionId: string) {
    const [row] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.registrations)
      .innerJoin(
        schema.registrationStatuses,
        eq(
          schema.registrations.registration_status_id,
          schema.registrationStatuses.id,
        ),
      )
      .where(
        and(
          eq(schema.registrations.package_version_id, packageVersionId),
          eq(schema.registrations.is_deleted, false),
          not(eq(schema.registrationStatuses.status_code, 'CANCELLED')),
        ),
      );
    return Number(row?.count ?? 0);
  }

  private async getVersionInclusions(versionId: string) {
    return this.db
      .select()
      .from(schema.packageVersionInclusions)
      .where(
        and(
          eq(schema.packageVersionInclusions.package_version_id, versionId),
          eq(schema.packageVersionInclusions.is_deleted, false),
        ),
      )
      .orderBy(asc(schema.packageVersionInclusions.display_order));
  }

  private async saveInclusions(
    versionId: string,
    inclusions: PackageVersionInclusionDto[],
    actorId: string,
  ) {
    await this.db.insert(schema.packageVersionInclusions).values(
      inclusions.map((inc) => ({
        id: ulid(),
        package_version_id: versionId,
        inclusion_text: inc.inclusion_text,
        display_order: inc.display_order,
        is_highlighted: inc.is_highlighted ?? false,
        created_by: actorId,
        updated_by: actorId,
      })),
    );
  }

  private async replaceInclusions(
    versionId: string,
    inclusions: PackageVersionInclusionDto[],
    actorId: string,
  ) {
    await this.db
      .update(schema.packageVersionInclusions)
      .set({ is_deleted: true, deleted_at: new Date() })
      .where(eq(schema.packageVersionInclusions.package_version_id, versionId));
    await this.saveInclusions(versionId, inclusions, actorId);
  }

  private async ensureUniqueSlug(slug: string, excludeId?: string) {
    let candidate = slug;
    let counter = 2;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const [existing] = await this.db
        .select({
          id: schema.packageVersions.id,
          slug: schema.packageVersions.slug,
        })
        .from(schema.packageVersions)
        .where(eq(schema.packageVersions.slug, candidate))
        .limit(1);
      if (!existing || (excludeId && existing.id === excludeId)) {
        return candidate;
      }
      candidate = `${slug}-${counter++}`;
    }
  }

  private async generateTemplateCode() {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const code = `PKG-${ulid()}`;
      const [existing] = await this.db
        .select({ id: schema.packageTemplates.id })
        .from(schema.packageTemplates)
        .where(eq(schema.packageTemplates.package_template_code, code))
        .limit(1);
      if (!existing) return code;
    }
  }

  private async generateVersionCode() {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const code = `PV-${ulid()}`;
      const [existing] = await this.db
        .select({ id: schema.packageVersions.id })
        .from(schema.packageVersions)
        .where(eq(schema.packageVersions.package_version_code, code))
        .limit(1);
      if (!existing) return code;
    }
  }

  private mapVersionRow(row: any) {
    return {
      id: row.package_versions.id,
      package_version_code: row.package_versions.package_version_code,
      version_name: row.package_versions.version_name,
      version_number: row.package_versions.version_number,
      slug: row.package_versions.slug,
      hero_image_url: row.package_versions.hero_image_url,
      sort_order: row.package_versions.sort_order,
      year: row.package_versions.year,
      departure_date: row.package_versions.departure_date,
      return_date: row.package_versions.return_date,
      base_price: Number(row.package_versions.base_price),
      max_capacity: row.package_versions.max_capacity,
      published_at: row.package_versions.published_at,
      sales_start_date: row.package_versions.sales_start_date,
      sales_end_date: row.package_versions.sales_end_date,
      status: row.package_version_statuses?.status_code,
      status_name: row.package_version_statuses?.name,
      template_status: row.package_template_statuses?.status_code,
      package_template: row.package_templates
        ? {
            id: row.package_templates.id,
            name: row.package_templates.name,
          }
        : null,
      season: row.seasons
        ? { id: row.seasons.id, name: row.seasons.name }
        : null,
      currency_id: row.package_versions.currency_id,
      package_template_id: row.package_versions.package_template_id,
      season_id: row.package_versions.season_id,
      currency: row.currencies
        ? {
            id: row.currencies.id,
            code: row.currencies.currency_code,
            name: row.currencies.name,
          }
        : null,
      available_capacity: row.package_versions.max_capacity,
      package_category: row.package_categories
        ? { id: row.package_categories.id, name: row.package_categories.name }
        : null,
      pilgrimage_type: row.pilgrimage_types
        ? { id: row.pilgrimage_types.id, name: row.pilgrimage_types.name }
        : null,
      created_at: row.package_versions.created_at,
      updated_at: row.package_versions.updated_at,
      is_deleted: row.package_versions.is_deleted,
      inclusions: [] as any[],
    };
  }

  // ---- Public catalog ----

  async listPublicPackages(filters: {
    category?: string;
    pilgrimageType?: string;
    year?: string;
    search?: string;
  }) {
    const published = await this.getVersionStatus('PUBLISHED');
    const conditions = [
      eq(schema.packageVersions.is_deleted, false),
      eq(schema.packageVersions.package_version_status_id, published.id),
      sql`${schema.packageVersions.published_at} IS NOT NULL`,
    ];

    if (filters.year) {
      conditions.push(eq(schema.packageVersions.year, Number(filters.year)));
    }

    if (filters.category) {
      conditions.push(
        eq(schema.packageCategories.category_code, filters.category),
      );
    }

    if (filters.pilgrimageType) {
      conditions.push(
        eq(schema.pilgrimageTypes.pilgrimage_type_code, filters.pilgrimageType),
      );
    }

    if (filters.search) {
      const q = `%${filters.search}%`;
      conditions.push(
        or(
          like(schema.packageVersions.version_name, q),
          like(schema.packageTemplates.name, q),
          like(schema.packageVersions.slug, q),
        ) as any,
      );
    }

    const rows = await this.db
      .select()
      .from(schema.packageVersions)
      .innerJoin(
        schema.packageTemplates,
        eq(
          schema.packageVersions.package_template_id,
          schema.packageTemplates.id,
        ),
      )
      .innerJoin(
        schema.packageVersionStatuses,
        eq(
          schema.packageVersions.package_version_status_id,
          schema.packageVersionStatuses.id,
        ),
      )
      .innerJoin(
        schema.packageCategories,
        eq(
          schema.packageTemplates.package_category_id,
          schema.packageCategories.id,
        ),
      )
      .innerJoin(
        schema.pilgrimageTypes,
        eq(
          schema.packageTemplates.pilgrimage_type_id,
          schema.pilgrimageTypes.id,
        ),
      )
      .leftJoin(
        schema.currencies,
        eq(schema.packageVersions.currency_id, schema.currencies.id),
      )
      .where(and(...conditions))
      .orderBy(
        asc(schema.packageVersions.sort_order),
        desc(schema.packageVersions.published_at),
      );

    const withInclusions = await Promise.all(
      rows.map(async (r) => {
        const version = this.mapVersionRow(r);
        const inclusions = await this.getVersionInclusions(version.id);
        return this.withAvailability({ ...version, inclusions });
      }),
    );

    return {
      data: withInclusions,
      total: withInclusions.length,
    };
  }

  async getPublicPackageBySlug(slug: string) {
    const published = await this.getVersionStatus('PUBLISHED');
    const [row] = await this.db
      .select()
      .from(schema.packageVersions)
      .innerJoin(
        schema.packageTemplates,
        eq(
          schema.packageVersions.package_template_id,
          schema.packageTemplates.id,
        ),
      )
      .innerJoin(
        schema.packageVersionStatuses,
        eq(
          schema.packageVersions.package_version_status_id,
          schema.packageVersionStatuses.id,
        ),
      )
      .innerJoin(
        schema.packageCategories,
        eq(
          schema.packageTemplates.package_category_id,
          schema.packageCategories.id,
        ),
      )
      .innerJoin(
        schema.pilgrimageTypes,
        eq(
          schema.packageTemplates.pilgrimage_type_id,
          schema.pilgrimageTypes.id,
        ),
      )
      .leftJoin(
        schema.currencies,
        eq(schema.packageVersions.currency_id, schema.currencies.id),
      )
      .leftJoin(
        schema.seasons,
        eq(schema.packageVersions.season_id, schema.seasons.id),
      )
      .where(
        and(
          eq(schema.packageVersions.slug, slug),
          eq(schema.packageVersions.package_version_status_id, published.id),
          eq(schema.packageVersions.is_deleted, false),
          sql`${schema.packageVersions.published_at} IS NOT NULL`,
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundException('Package not found');

    const version = this.mapVersionRow(row);
    version.inclusions = await this.getVersionInclusions(version.id);
    return this.withAvailability(version);
  }
}
