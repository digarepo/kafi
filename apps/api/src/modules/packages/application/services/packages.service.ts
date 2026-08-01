import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { MySql2Database } from 'drizzle-orm/mysql2';
import { eq, and, or, like, desc, asc, max, sql } from 'drizzle-orm';
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
        .where(where)
        .orderBy(desc(schema.packageTemplates.created_at))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(schema.packageTemplates)
        .where(eq(schema.packageTemplates.is_deleted, false))
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
      .where(eq(schema.packageTemplates.id, id))
      .limit(1);
    if (!row) throw new NotFoundException('Package template not found');
    return this.mapTemplateRow(row);
  }

  async createTemplate(dto: CreatePackageTemplateDto, actorId: string) {
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
    await this.db
      .update(schema.packageTemplates)
      .set({
        is_deleted: true,
        deleted_at: new Date(),
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.packageTemplates.id, id));
  }

  private mapTemplateRow(row: any) {
    return {
      id: row.package_templates.id,
      package_template_code: row.package_templates.package_template_code,
      name: row.package_templates.name,
      short_name: row.package_templates.short_name,
      description: row.package_templates.description,
      default_duration_days: row.package_templates.default_duration_days,
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
        .where(eq(schema.packageVersions.is_deleted, false))
        .then((r) => r[0]?.count ?? 0),
    ]);

    return {
      data: rows.map((r) => this.mapVersionRow(r)),
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
      .where(eq(schema.packageVersions.id, id))
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
    if (!template) throw new NotFoundException('Package template not found');

    const nextNumber = await this.getNextVersionNumber(dto.package_template_id);
    const draftStatus = await this.getVersionStatus('DRAFT');
    const code = await this.generateVersionCode();
    const slug = await this.ensureUniqueSlug(
      dto.slug ?? slugify(dto.version_name),
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
    if (!existing) throw new NotFoundException('Package version not found');
    if (existing.status === 'PUBLISHED') {
      this.guardCommercialFieldsOnUpdate(dto);
    }

    const slug = dto.slug
      ? await this.ensureUniqueSlug(dto.slug, id)
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
    if (!existing) throw new NotFoundException('Package version not found');
    if (existing.status === 'PUBLISHED')
      throw new ConflictException('Version is already published');

    const publishedStatus = await this.getVersionStatus('PUBLISHED');
    if (
      !existing.departure_date ||
      !existing.return_date ||
      existing.base_price === undefined ||
      !existing.currency_id
    ) {
      throw new BadRequestException(
        'Version must have departure_date, return_date, base_price, and currency before publishing',
      );
    }

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

  async archiveVersion(id: string, actorId: string) {
    await this.db
      .update(schema.packageVersions)
      .set({
        is_deleted: true,
        deleted_at: new Date(),
        updated_at: new Date(),
        updated_by: actorId,
      })
      .where(eq(schema.packageVersions.id, id));
  }

  private guardCommercialFieldsOnUpdate(dto: UpdatePackageVersionDto) {
    const commercial = [
      'base_price',
      'currency_id',
      'departure_date',
      'return_date',
      'max_capacity',
      'sales_start_date',
      'sales_end_date',
    ] as const;
    const touched = commercial.filter(
      (k) => dto[k as keyof UpdatePackageVersionDto] !== undefined,
    );
    if (touched.length > 0) {
      throw new ConflictException(
        `Cannot modify commercial fields after publication: ${touched.join(', ')}`,
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
        return { ...version, inclusions };
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
    version.available_capacity = version.max_capacity; // placeholder until Slice 3
    return version;
  }
}
