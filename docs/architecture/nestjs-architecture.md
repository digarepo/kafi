# NestJS Architecture — Kafi Tour & Travel

**Status:** Revised architecture baseline aligned with the actual `kafi` monorepo
**Scope:** `apps/api` (NestJS), `apps/admin` (staff UI), `apps/web` (public site), `packages/ui`, `database/`, and supporting `deployment/` / `infrastructure/`.
**Constraint:** This document is design and planning only — no implementation code is included. Domain decisions in `docs/domain/domain-decisions.md` and `ddd-domain-model.md` are treated as locked and are not reopened.

---

## 1. Goals

Provide a practical, buildable NestJS architecture that:

- Puts **IAM first**: database tables, backend API, admin screens, RBAC, and deployment/CI before any other feature.
- Supports the **admin app** (`apps/admin`) with full CRUD and RBAC.
- Supports the **public site** (`apps/web`) with read-only package browsing and registration intake.
- Uses **MariaDB** with **Drizzle** as the primary persistence layer (raw `mysql2` as an escape hatch).
- Stays inside the **existing `kafi` monorepo layout** (`apps/*`, `packages/*`, `database/`, `docs/`, `deployment/`, `infrastructure/`).
- Uses **REST only** for the API; no GraphQL.
- Keeps the 2 September deadline in mind: avoid over-engineering, ship vertical slices, and defer non-essential abstractions.

---

## 2. Monorepo layout (existing)

The architecture uses the current `kafi/` structure as-is.

```text
kafi/
├── apps/
│   ├── admin/          # React Router + Vite staff SPA
│   ├── api/            # NestJS API (global prefix /api)
│   └── web/            # React Router + Vite public site (already deployed)
│
├── packages/
│   └── ui/             # shared shadcn/ui components
│
├── database/
│   ├── schema/         # Drizzle schema files per module
│   ├── migrations/     # Drizzle-generated migrations
│   ├── seeds/          # roles, permissions, reference data
│   └── backups/        # DB backups
│
├── deployment/         # deployment manifests and compose/helm files
├── infrastructure/     # infra-as-code / provisioning
├── docs/
│   ├── architecture/
│   ├── decisions/
│   ├── database/
│   ├── api/
│   └── deployment/
├── scripts/            # one-off automation
├── tools/              # generators, lint helpers
├── nx.json
├── package.json
└── tsconfig.base.json
```

---

## 3. High-level technology choices

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | NestJS (Node) | Existing `apps/api`; strong DI and modular boundaries. |
| Database | MariaDB | Required for this phase. |
| ORM / query layer | Drizzle | Primary persistence layer: type-safe schema in `database/schema/`, migrations with `drizzle-kit`. Raw `mysql2` is an escape hatch for complex queries, not a parallel design path. |
| Monorepo | Nx 23 | Existing `nx.json`, `project.json`, `tsconfig.base.json`. |
| Shared UI | `packages/ui` | shadcn/ui components already shared by `admin` and `web`. |
| API transport | HTTP REST only | Admin and public site consume the same API. No GraphQL. |
| Auth | JWT access tokens | `sub` = user id; roles/permissions resolved from DB and cached per request. |
| Cross-module communication | Domain events + typed query facades | `EventEmitter2` or a lightweight typed event bus in `apps/api/src/shared/infrastructure`. No message broker for the deadline. |

---

## 4. API route structure

`apps/api/src/main.ts` already sets `app.setGlobalPrefix('api')`. Controllers group routes by audience:

```text
/api/auth/*       # login, refresh, me
/api/admin/*       # staff endpoints (JWT + RBAC)
/api/public/*      # public-site endpoints (anonymous / optional public token)
```

- `apps/admin` calls `/api/auth/*` and `/api/admin/*`.
- `apps/web` calls `/api/public/*`.
- Rate limiting and a strict DTO whitelist are applied to `/api/public/*`.

---

## 5. Bounded contexts → NestJS modules

All backend modules live under `apps/api/src/modules/`. Each module owns its domain, application, infrastructure, and presentation layers.

| Module | Folder | Business scope | Key aggregates / sub-areas |
|--------|--------|----------------|---------------------------|
| **IAM** | `modules/iam/` | Staff authentication, users, roles, permissions | `User`, `Role`, `Permission` |
| **Packages** (package preparation) | `modules/packages/` | Package templates, package versions, categories, sellable setup | `PackageTemplate`, `PackageVersion` |
| **Travellers** | `modules/travellers/` | Traveller profiles, contact persons, emergency contacts, registration flow | `Traveller`, `ContactPerson`, `TravellerContact`, `Registration` |
| **Operations** | `modules/operations/` | Travel group logistics, trip execution, hotel/transport/vendor booking, and the small **participation/guarantee** sub-area | `TravelGroup`, `GroupMembership`, `GuaranteeRequirement`, `Guarantee`, `GroupHotelStay`, `Hotel`, `Vendor`, `TransportSegment`, `Room`, `RoomAssignment` |
| **Documents** | `modules/documents/` | Travel documents, visa records, receipts, evidence/history | `Document`, `VisaApplication` |
| **Finance** | `modules/finance/` | Incoming and outgoing money: invoices, payments, allocations, expenses, cash flow, later reporting | `Invoice`, `Payment`, `PaymentAllocation`, `Payer`, `Expense`, `ExpenseCategory`, `PaymentArrangement`, `PaymentInstalment` |
| **Shared** | `apps/api/src/shared/` | API-only shared code: kernel, infrastructure helpers, application guards/DTOs | (not a business module) |

### Notes on module boundaries

- **`Registration`** is an aggregate root inside the `travellers` module because it is part of the traveller intake flow. It references `PackageVersion` from `packages` by typed ID only. Other modules (`finance`, `operations`, `documents`) consume `RegistrationCreated`/`RegistrationCancelled` events and query the `IRegistrationView` read model; they never write to the `registrations` table.
- **`GroupMembership`**, **`GuaranteeRequirement`**, and **`Guarantee`** remain owned by `GroupMembership` per DDD-011. They live as a small sub-area under `modules/operations/travel-groups/participation/` rather than as a standalone module.
- **`VisaApplication`** remains owned by `documents` (DDD-012). `operations` consumes visa-readiness events for flight/hotel/trip execution.
- **`Expense`** is moved into `finance`; there is no separate `expenses` module. Business rules (attribution, approval) stay the same.

---

## 6. Folder structure inside a module

```text
apps/api/src/modules/<context>/
├── domain/
│   ├── aggregates/        # aggregate roots and invariants
│   ├── entities/          # non-root entities owned by an aggregate
│   ├── value-objects/     # value objects (ids, money, date ranges, enums)
│   ├── events/            # domain events published by this context
│   ├── services/          # domain services for cross-aggregate logic
│   └── repositories/      # repository interfaces (ports)
│
├── application/
│   ├── commands/          # command DTOs + handlers (writes)
│   ├── queries/           # query DTOs + handlers (reads)
│   ├── dto/               # request/response DTOs for controllers
│   ├── services/          # application/use-case services
│   └── event-handlers/    # react to external domain events
│
├── infrastructure/
│   ├── persistence/
│   │   ├── repositories/  # Drizzle repository implementations
│   │   └── seeds/         # module-specific seed data
│   └── event-bus/         # optional context-specific listeners
│
├── presentation/
│   ├── controllers/       # REST controllers
│   ├── guards/            # context-specific route guards
│   └── decorators/        # route metadata decorators
│
├── <context>.module.ts    # module definition
└── index.ts               # public API of the module
```

### Dependency rules inside a module

- `presentation` depends on `application` and shared guards.
- `application` depends on `domain` and shared application helpers.
- `infrastructure` depends on `domain` (implements repository interfaces) and `apps/api/src/shared/infrastructure`.
- `domain` has **no** dependencies on other layers or other modules.

---

## 7. Shared packages and what belongs in each

### `packages/ui`

- Shared shadcn/ui components used by `apps/admin` and `apps/web`.
- Base styles and design tokens.

### `packages/shared-types`, `packages/shared-validation`, `packages/shared-config` (reserved)

- `tsconfig.base.json` already maps `@kafi/shared-types`, `@kafi/shared-validation`, and `@kafi/shared-config`.
- Create these packages only when a type, Zod schema, or config value must be shared outside `apps/api`.
- Until then, keep equivalent API-only shared code in `apps/api/src/shared`.

### `apps/api/src/shared`

Backend shared code that does not leave the API app:

- `kernel/` — typed ids, enums, value-object stubs, base domain events, audit/soft-delete conventions.
- `infrastructure/` — Drizzle DB module, config loader, event bus wrapper, logger base, pagination helpers, `UnitOfWork` helper.
- `application/` — `JwtAuthGuard`, `PermissionsGuard`, `CurrentUser` decorator, common response wrappers, validation/exception mapping.

Rules:
- No business logic.
- No direct imports from bounded-context modules.
- Other modules depend on it, not the reverse.

---

## 8. Database and migrations

### Drizzle on MariaDB

- Table definitions live in `database/schema/<context>.schema.ts` (one file per module).
- `drizzle-kit` generates migrations into `database/migrations/`.
- Seed data (roles, permissions, statuses, countries, etc.) lives in `database/seeds/` and is run as a separate step from migrations.
- `database/drizzle.config.ts` configures the connection and schema glob.

### One database, bounded-context module ownership

- A single MariaDB database is used.
- Each bounded context owns its tables, but the schema is not physically split.
- Table names follow the existing snake_case convention from `kafidb-updated.dbml`.

### Migrations in CI

- Each slice in the roadmap produces one or more numbered migrations with an explicit purpose.
- CI runs `drizzle-kit migrate` against the target environment before deploying `apps/api`.
- `apps/api/project.json` adds `db:generate`, `db:migrate`, and `db:seed` targets.

### Schema constraints already locked by domain decisions

- `guarantees` uses `group_membership_id` as owner, `contact_person_id` for person guarantors, and instrument fields for non-person guarantees.
- `guarantee_requirements` has `status` `NOT_REQUIRED` / `REQUIRED`.
- `group_memberships` links to `registration_id` (not `traveller_id`).
- `invoices` is line-item based.
- `users.created_by` / `updated_by` are nullable to allow seeding.

---

## 9. Auth and RBAC structure

### Authentication

- `POST /api/auth/login` — email + password; returns JWT `access_token` and `refresh_token`.
- `POST /api/auth/refresh` — rotates access token.
- Tokens carry `sub` (user id) and a `roles` claim (role codes, not permission strings).
- Password hashing uses `Argon2id`.

### Authorization

- Roles and permissions live in the `iam` module (`users`, `roles`, `permissions`, `user_roles`, `role_permissions`).
- `PermissionResolver` loads the flat set of `permission_code` strings for the authenticated user by walking `User → UserRole → Role → RolePermission → Permission`.
- Permissions are cached on the request object so the graph is resolved once per request.
- Two guards are used:
  - `JwtAuthGuard` — validates token and attaches `req.user`.
  - `PermissionsGuard` — checks that `req.user.permissions` includes at least one of the required permission codes.
- Controllers / handlers use a `@RequirePermissions(...)` decorator.

### Permission codes (from `kafidb-updated.dbml` header)

| Module | Permissions |
|--------|-------------|
| Users & Auth | `USER_CREATE`, `USER_VIEW`, `USER_EDIT`, `USER_DELETE`, `AUTH_MANAGE` |
| Travellers | `TRAVELLER_CREATE`, `TRAVELLER_VIEW`, `TRAVELLER_EDIT`, `TRAVELLER_DELETE` |
| Packages | `PACKAGE_CREATE`, `PACKAGE_VIEW`, `PACKAGE_EDIT`, `PACKAGE_DELETE` |
| Registrations | `REGISTRATION_CREATE`, `REGISTRATION_VIEW`, `REGISTRATION_EDIT`, `REGISTRATION_DELETE` |
| Financial | `FINANCE_CREATE`, `FINANCE_VIEW`, `FINANCE_EDIT`, `FINANCE_DELETE` |
| Visa | `VISA_MANAGE` |
| Documents | `DOCUMENT_MANAGE` |
| Accommodation | `ACCOMMODATION_MANAGE` |
| Travel Groups | `TRAVEL_GROUP_MANAGE` |

### Role-permission mapping (seeded)

- `ADMIN` — all permissions.
- `MANAGER` — all except `AUTH_MANAGE`, `USER_DELETE`, `TRAVELLER_DELETE`, `PACKAGE_DELETE`, `REGISTRATION_DELETE`, `FINANCE_DELETE`.
- `AGENT` — `USER_VIEW`; `TRAVELLER_VIEW`, `TRAVELLER_CREATE`, `TRAVELLER_EDIT`; `PACKAGE_VIEW`; `REGISTRATION_VIEW`, `REGISTRATION_CREATE`; `FINANCE_VIEW`; `VISA_MANAGE`; `DOCUMENT_MANAGE`.

### Admin frontend IAM screens

- Login page.
- User list, create/edit, soft delete, role assignment.
- Role/permission viewer (read-only).
- Layout shell with logout and current user menu.

---

## 10. Cross-module communication rules

1. **No direct aggregate access.** A module never imports another module's domain entities or repositories. Cross-context data is referenced only by typed ID.
2. **Read via query facades.** If a module needs data owned by another context, it calls a public query from the owning module (e.g. `FindContactPersonByIdQuery` from `travellers`).
3. **Write via domain events.** Downstream actions (e.g. `RegistrationCreated` triggers invoice creation and group membership creation) are handled by domain events:
   - `travellers` publishes `RegistrationCreated`.
   - `finance`, `operations`, and `documents` subscribe in their `application/event-handlers`.
4. **Event bus choice.** For the deadline, use NestJS `EventEmitter2` or a light typed wrapper in `apps/api/src/shared/infrastructure`. A real message broker is a future migration.
5. **No circular dependencies.** Each module's `index.ts` declares a public surface. Shared code has no business logic and can be imported anywhere.

### How `Registration` flows through the modules

`Registration` is the traveller-intake transaction. It is created in the `travellers` module and is referenced everywhere else by typed `RegistrationId` only.

1. A staff user or public visitor submits traveller/contact data and selects a published `PackageVersion` (Slice 3).
2. `travellers` validates capacity with the `PackageVersion` read model, persists the `Registration`, and publishes `RegistrationCreated`.
3. Other modules react without coupling to the `Registration` aggregate:
   - `finance` listens to `RegistrationCreated` and creates a draft `Invoice` by querying `IRegistrationView` for the package price and payer information.
   - `operations` listens to `RegistrationCreated` to prepare a `GroupMembership` placeholder; a staff user later assigns it to a `TravelGroup` and can add guarantee requirements. It queries `IRegistrationView` for `traveller_id` and `primary_contact_id`.
   - `documents` listens to `RegistrationCreated` (optional) to pre-create a document checklist and stores uploaded documents/visa against `registration_id`.
4. If a registration is cancelled, `travellers` publishes `RegistrationCancelled`. `finance` and `operations` handle refund/reversal policies inside their own boundaries.
5. No module other than `travellers` writes to the `registrations` table.

---

## 11. Where `GroupMembership`, `GuaranteeRequirement`, and `Guarantee` live

They are implemented as a **small sub-area inside `modules/operations/travel-groups/participation/`**, not as a standalone module.

```text
apps/api/src/modules/operations/
├── domain/
│   ├── aggregates/
│   │   └── travel-group/            # TravelGroup aggregate root
│   └── entities/
│       └── participation/
│           ├── group-membership/
│           │   ├── group-membership.entity.ts
│           │   ├── guarantee-requirement.entity.ts
│           │   └── guarantee.entity.ts
│           └── guarantee-lifecycle.service.ts
├── application/
│   └── travel-groups/
│       └── participation/
│           ├── commands/            # add/replace/activate/release/refund
│           └── queries/             # find by group, by registration, status view
├── infrastructure/
│   └── persistence/
│       └── repositories/
│           └── participation/
│               ├── group-membership.repository.ts
│               ├── guarantee-requirement.repository.ts
│               └── guarantee.repository.ts
└── presentation/
    └── travel-groups/
        └── participation/
            └── guarantee.controller.ts
```

### Why this respects DDD-011

- `GuaranteeRequirement` and `Guarantee` remain child entities of `GroupMembership`.
- `Guarantee` references `ContactPerson` (from `travellers`) for person guarantors and does **not** use `TravellerContact`.
- At most one `ACTIVE` guarantee exists per `group_membership_id`.
- `GuaranteeType`, `GuaranteeStatus`, and `GuaranteeRequirementStatus` are MariaDB `enum` columns or string-enum columns, not generic lookup tables.
- After-departure operational lock is enforced by the `TravelGroup` status `DEPARTED` plus a guard in the participation application service.

`travellers` supplies the guarantor `ContactPerson` and the `Registration` context, but does not own the guarantee record.

---

## 12. Where `Finance` and `Expenses` live

`Expense` and `ExpenseCategory` live inside the `finance` module because expenses are outgoing money.

```text
finance/
├── domain/
│   ├── aggregates/
│   │   ├── invoice/
│   │   ├── payment/
│   │   └── expense/
│   └── ...
├── application/
│   ├── commands/
│   │   ├── create-invoice.command.ts
│   │   ├── record-payment.command.ts
│   │   └── create-expense.command.ts
│   └── queries/
│       ├── outstanding-balance.query.ts
│       └── cash-flow-summary.query.ts
...
```

- `Invoice`, `Payment`, `PaymentAllocation`, `Payer`, `PaymentArrangement`, and `PaymentInstalment` handle incoming money.
- `Expense` handles outgoing money and attribution to `TravelGroup`, `TransportSegment`, `GroupHotelStay`, or `Vendor`.
- Later reporting/profit-and-loss features can be added inside `finance` without creating a new module.

---

## 13. Shared vs isolated

### Shared

- `packages/ui` — shared UI.
- `packages/shared-types`, `packages/shared-validation`, `packages/shared-config` — only when needed across apps.
- `apps/api/src/shared` — API cross-cutting concerns.
- Cross-cutting concerns: logging, configuration, health checks, rate limiting.

### Isolated per bounded context

- Domain aggregates, entities, and business invariants.
- Repository interfaces and persistence implementations.
- Application commands/queries and use cases.
- Controllers and route guards.
- Domain events owned by the context.

### Dependency direction

```text
web/admin  ←  packages/ui  ←  shared-* packages (if created)
                ↓
            apps/api
                ↓
    modules (iam, packages, travellers, operations, documents, finance)
                ↓
    apps/api/src/shared (kernel, infrastructure, application)
```

- Modules depend on `apps/api/src/shared` and on each other's public query/event surface only.
- `iam` is upstream of auth guards; the guards call an `IPermissionResolver` interface exposed by `iam`.

---

## 14. Conventions and naming

- Folders/files: kebab-case (`group-membership.entity.ts`).
- Classes: PascalCase (`GroupMembershipEntity`).
- Drizzle schema files: `database/schema/<context>.schema.ts`.
- Aggregate roots: root entity name without suffix in domain; persistence repository uses `*Repository`.
- Commands: `CreateXxxCommand`, `UpdateXxxCommand`.
- Queries: `FindXxxByIdQuery`, `SearchXxxQuery`.
- DTOs: `CreateXxxDto`, `XxxResponseDto`.
- Controllers: plural resource name (`travellers.controller.ts`), grouped under `admin/` or `public/` route prefixes.
- Events: past tense (`RegistrationCreated`, `GuaranteeReplaced`).

---

## 15. Non-goals for the first implementation

To keep the deadline realistic, the following are explicitly out of scope for the first pass:

- GraphQL.
- Switching ORM away from Drizzle or changing the database away from MariaDB.
- Event sourcing.
- Microservices / message broker.
- Separate read/write databases or read replicas.
- Multi-tenancy.
- Advanced analytics or reporting.
- Automated refund workflows (overpayments remain unallocated per DDD-006).
- Credit ledger (DDD-006 explicitly defers this).

These can be introduced later without changing the architecture laid out above.
