# Vertical-Slice Implementation Roadmap — Kafi NestJS Backend

**Deadline:** 2 September 2026
**Scope:** `apps/api`, `apps/admin`, `apps/web`, `database/`, and `deployment/` / `infrastructure/` support for the `kafi` monorepo.
**Constraint:** This is a planning document. No code is included. Locked domain decisions from `docs/domain/domain-decisions.md` and `ddd-domain-model.md` are not reopened.

---

## 1. Roadmap principles

- **Vertical slices, not horizontal layers.** Every slice delivers an end-to-end, testable business capability.
- **IAM first.** The first slice establishes users, roles, permissions, login, admin screens, RBAC, and CI/deployment so every later slice builds on a secure foundation.
- **One working system at a time.** A slice is not "done" until it has DB schema, API endpoints, admin UI screens, tests, and migration/CI wiring.
- **Priority order.** Slices are ordered by business value and dependency: identity → package catalog → traveller intake → money in → trip execution → logistics → documents → money out/integration.
- **Deadline-aware.** Supporting features (instalments, advanced reporting) are stretch goals for the final integration slice.

---

## 2. Shared conventions for every slice

- Each slice produces:
  - `database/schema` and migration changes.
  - domain entities, value objects, and events.
  - application commands + queries.
  - Drizzle repository implementations.
  - REST controllers under `/api/admin/*` and `/api/public/*` where relevant.
  - admin screens in `apps/admin`.
  - unit and integration tests.
- `apps/web` consumes `/api/public/*` for read/browse and public registration/document upload.
- `apps/admin` consumes `/api/auth/*` and `/api/admin/*`.
- Each slice adds one or more migrations in `database/migrations/` and updates CI if needed.

---

## 3. Slice summary

| # | Slice | Target week | Core value |
|---|-------|-------------|------------|
| 1 | **IAM and project foundation** | Week 1 | Staff can log in, RBAC is seeded, CI/deployment pipeline runs, all later slices reuse shared infra. |
| 2 | **Package preparation and public catalog** | Week 1–2 | Admin can build packages; public site can browse published package versions. |
| 3 | **Traveller profiles, contacts, and registration flow** | Week 2 | Master customer data; staff and public can register for a package. |
| 4 | **Finance foundation — invoices, payments, allocations** | Week 2–3 | Money owed and money received; outstanding balance visible. |
| 5 | **Travel groups, participation, and guarantee** | Week 3 | Registrations become operational trips; guarantee requirement and instruments handled as a small sub-area. |
| 6 | **Operations logistics — hotels, rooms, transport, vendors** | Week 3–4 | Hotel booking, room assignment, transport segments, vendor management. |
| 7 | **Documents and visa** | Week 4 | Travel documents and visa application lifecycle. |
| 8 | **Finance — expenses and go-live prep** | Week 4–5 | Outgoing money, end-to-end hardening, staging deployment. Instalments only if time permits. |

---

## 4. Detailed slice definitions

### Slice 1 — IAM and project foundation

**Purpose:** Build the authentication/authorization stack, the database migration pipeline, the admin login and user-management screens, and the CI/deployment foundation so the rest of the project has a safe base.

**Modules affected:**
- `apps/api/src/modules/iam`
- `apps/api/src/shared`
- `apps/admin`
- `database/`
- `deployment/`, `.github/`

**Database changes:**
- Create `users`, `roles`, `permissions`, `user_roles`, `role_permissions`.
- Seed roles (`ADMIN`, `MANAGER`, `AGENT`) and permissions from `kafidb-updated.dbml` header.
- Seed a root `ADMIN` user with nullable `created_by`/`updated_by`.
- Create `database/drizzle.config.ts` and the first migration in `database/migrations/`.

**API endpoints:**
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `GET /api/auth/me`
- `GET /api/admin/users`
- `GET /api/admin/users/:id`
- `POST /api/admin/users`
- `PUT /api/admin/users/:id`
- `DELETE /api/admin/users/:id` (soft delete)
- `GET /api/admin/roles`
- `GET /api/admin/permissions`

**Admin UI impact:**
- Login page.
- User list, create/edit, soft delete, role assignment.
- Read-only role/permission viewer.
- Layout shell with logout and current-user menu.

**Public-site impact:**
- None.

**Testing needed:**
- Unit tests for password hashing and `PermissionResolver`.
- Integration tests for login, refresh, and `PermissionsGuard`.
- E2E admin login → user list → create user.

**Deployment/CI implications:**
- Add MariaDB service to CI and local `docker-compose.yml`.
- Add `db:generate`, `db:migrate`, and `db:seed` Nx targets to `apps/api/project.json`.
- Add `.github/workflows/ci.yml` running lint, typecheck, tests, and migration against a CI database.
- Update root `package.json` with `db:*` scripts.

**Dependencies on previous slices:**
- None.

---

### Slice 2 — Package preparation and public catalog

**Purpose:** Make packages sellable. Staff can create package templates and versions; the public site can browse published packages.

**Modules affected:**
- `apps/api/src/modules/packages`
- `apps/admin`
- `apps/web`

**Database changes:**
- Create `package_templates`, `package_versions`, `package_template_statuses`, `package_version_statuses`, `package_categories`, `pilgrimage_types`, `seasons`, `currencies`.
- Enforce `published_at` / status immutability for commercial fields after active registrations exist (DDD-008).
- Remove `package_version_id` and `current_capacity` from `travel_groups` (already reflected in target DBML).

**API endpoints:**
- Admin: `GET /api/admin/package-templates`, `POST /api/admin/package-templates`, `PUT /api/admin/package-templates/:id`, `DELETE /api/admin/package-templates/:id`.
- Admin: `GET /api/admin/package-versions`, `POST /api/admin/package-versions`, `PUT /api/admin/package-versions/:id`, `DELETE /api/admin/package-versions/:id`, `POST /api/admin/package-versions/:id/publish`.
- Admin: `GET /api/admin/package-categories`, `GET /api/admin/pilgrimage-types`.
- Public: `GET /api/public/packages`, `GET /api/public/packages/:id`.

**Admin UI impact:**
- Package template builder.
- Package version editor with publish action and capacity/price fields.
- Category and pilgrimage type management.

**Public-site impact:**
- Public package catalog page.
- Package detail page.

**Testing needed:**
- Version immutability after publication with active registrations.
- Date ordering constraints.
- Capacity tracking derived from active registrations.

**Deployment/CI implications:**
- Add package migrations to CI migration step.
- Verify `apps/web` can fetch `/api/public/packages` in CI build.

**Dependencies on previous slices:**
- Slice 1 (auth for admin; public endpoints are anonymous).

---

### Slice 3 — Traveller profiles, contacts, and registration flow

**Purpose:** Build the master traveller and contact records and the registration intake flow (staff and public). This slice establishes `Registration` as an aggregate in `travellers`, publishes `RegistrationCreated`, and exposes an `IRegistrationView` read model so later slices react without coupling to the `registrations` table.

**Modules affected:**
- `apps/api/src/modules/travellers`
- `apps/api/src/modules/packages` (read-only package version reference)
- `apps/admin`
- `apps/web`

**Database changes:**
- Create `travellers`, `contact_persons`, `traveller_contacts`, `relationship_types`, `traveller_statuses`, `contact_person_statuses`, `traveller_contact_statuses`, `traveller_sources`.
- Create `registrations` and `registration_statuses`. `registrations` references `package_version_id` and `traveller_id`/`primary_contact_id`.
- Add `phone_number unique` on `contact_persons`.
- Add composite unique `(traveller_id, contact_person_id)` and `(traveller_id, priority)` on `traveller_contacts`.

**API endpoints:**
- Admin: `GET /api/admin/travellers`, `POST /api/admin/travellers`, `PUT /api/admin/travellers/:id`, `DELETE /api/admin/travellers/:id`.
- Admin: `GET /api/admin/contact-persons`, `POST /api/admin/contact-persons`, `PUT /api/admin/contact-persons/:id`, `DELETE /api/admin/contact-persons/:id`.
- Admin: `POST /api/admin/travellers/:id/contacts`, `PUT /api/admin/travellers/:id/contacts/:contactId`, `DELETE /api/admin/travellers/:id/contacts/:contactId`.
- Admin: `GET /api/admin/registrations`, `GET /api/admin/registrations/:id`, `POST /api/admin/registrations`, `PUT /api/admin/registrations/:id/status`, `DELETE /api/admin/registrations/:id`.
- Admin: `POST /api/admin/travellers/check-duplicate` (warns on `first_name + phone_no` per DDD-001).
- Public: `POST /api/public/registrations`.

**Admin UI impact:**
- Traveller list and detail.
- Contact person lookup and management.
- Traveller contact management (relationship, priority, emergency/primary flags).
- Registration form linked to a traveller and a published package version.

**Public-site impact:**
- Public registration form (package version + traveller details).

**Testing needed:**
- Duplicate traveller detection.
- Contact priority and emergency/primary uniqueness rules.
- Registration capacity check against `PackageVersion.max_capacity`.
- Soft-delete behaviour and search filtering.

**Deployment/CI implications:**
- Add traveller/registration migrations.
- Add e2e test for public registration flow.

**Dependencies on previous slices:**
- Slice 1 (auth).
- Slice 2 (package versions).

---

### Slice 4 — Finance foundation: invoices, payments, and allocations

**Purpose:** Track money owed, money received, and how payments settle invoices.

**Modules affected:**
- `apps/api/src/modules/finance` (listens to `RegistrationCreated` from `travellers`; queries `IRegistrationView` for package price/payer context)
- `apps/admin`

**Database changes:**
- Create `invoices`, `invoice_line_items`, `payments`, `payment_allocations`, `payers`, `payment_methods`, `payment_statuses`, `invoice_statuses`, `payer_types`, `payer_statuses`, `payment_method_statuses`.
- Enforce `allocated_amount > 0`, `allocated_amount <= payment.amount`, and `allocated_amount <= invoice.balance`.
- `payers` requires `organization_name` for `ORGANIZATION` type and a person link for `INDIVIDUAL` type (DDD-003).
- Invoice becomes line-item based (DDD-004).

**API endpoints:**
- `GET /api/admin/invoices`, `GET /api/admin/invoices/:id`, `POST /api/admin/invoices`, `PUT /api/admin/invoices/:id`, `DELETE /api/admin/invoices/:id`.
- `GET /api/admin/invoices/:id/line-items`, `POST /api/admin/invoices/:id/line-items`, `PUT /api/admin/invoices/:id/line-items/:lineItemId`, `DELETE ...`.
- `GET /api/admin/payments`, `GET /api/admin/payments/:id`, `POST /api/admin/payments`, `POST /api/admin/payments/:id/allocate`, `DELETE /api/admin/payments/:id`.
- `GET /api/admin/invoices/:id/outstanding-balance`.
- `GET /api/admin/payers`, `GET /api/admin/payment-methods`.

**Admin UI impact:**
- Invoice creation with line items.
- Payment entry and allocation to invoice(s).
- Outstanding balance display on invoice and registration.
- Payer and payment method management.

**Public-site impact:**
- Optional: `GET /api/public/registrations/:id/invoices` (read-only invoice status).

**Testing needed:**
- `total_amount` computed from line items minus discount.
- Allocation invariants (cannot allocate more than payment or invoice balance).
- Overpayment remains unallocated and emits `PaymentUnallocated` (DDD-006).

**Deployment/CI implications:**
- Add finance migrations.

**Dependencies on previous slices:**
- Slice 1 (auth).
- Slice 3 (registrations and `IRegistrationView`).

---

### Slice 5 — Travel groups, participation, and guarantee

**Purpose:** Turn registrations into operational trips. `operations` consumes `RegistrationCreated` to prepare a `GroupMembership` placeholder; staff later assign it to a `TravelGroup` and can add guarantee requirements. Guarantee logic stays a small sub-area of `operations`, not a standalone module.

**Modules affected:**
- `apps/api/src/modules/operations` (`TravelGroup`, `GroupMembership`, `GuaranteeRequirement`, `Guarantee`)
- `apps/api/src/modules/travellers` (read-only `ContactPerson` / `Registration` lookup via `IRegistrationView`)
- `apps/admin`

**Database changes:**
- Create `travel_groups`, `group_memberships`, `travel_group_statuses`, `group_membership_statuses`.
- `travel_groups` does **not** store `current_capacity`; it is derived from active `group_memberships`.
- `group_memberships` links to `registration_id` and `travel_group_id` only.
- Create `guarantee_requirements` and `guarantees`.
- `guarantees` columns: `group_membership_id`, `registration_id`, `guarantee_type`, `guarantee_status`, `contact_person_id`, `instrument_reference`, `amount`, `currency_id`, `expiry_date`, `issuer`, `effective_date`, `previous_guarantee_id`, `replaced_by_id`.
- Enforce at most one `ACTIVE` guarantee per `group_membership_id`.
- `GuaranteeType`, `GuaranteeStatus`, and `GuaranteeRequirementStatus` are MariaDB enum or string-enum columns, not lookup tables.

**API endpoints:**
- `GET /api/admin/travel-groups`, `GET /api/admin/travel-groups/:id`, `POST /api/admin/travel-groups`, `PUT /api/admin/travel-groups/:id`, `DELETE /api/admin/travel-groups/:id`.
- `POST /api/admin/travel-groups/:id/members`.
- `PUT /api/admin/travel-groups/:id/members/:membershipId/transfer`.
- `DELETE /api/admin/travel-groups/:id/members/:membershipId` (soft delete / `left_at`).
- `GET /api/admin/group-memberships/:id/guarantee-requirement`.
- `POST /api/admin/group-memberships/:id/guarantee-requirement`.
- `PUT /api/admin/group-memberships/:id/guarantee-requirement`.
- `GET /api/admin/group-memberships/:id/guarantees`.
- `POST /api/admin/group-memberships/:id/guarantees`.
- `PUT /api/admin/guarantees/:id/activate`.
- `PUT /api/admin/guarantees/:id/replace`.
- `PUT /api/admin/guarantees/:id/release|refund|expire`.

**Admin UI impact:**
- Travel group planner (dates, max capacity, status).
- Registration-to-group assignment UI.
- Membership transfer and history UI.
- Guarantee requirement toggle on group membership detail.
- Guarantee form per type (person guarantor lookup, cash deposit, CPO, bank guarantee).
- Guarantee status actions and replacement history.

**Public-site impact:**
- None.

**Testing needed:**
- Capacity enforcement on add.
- Active membership uniqueness.
- Transfer preserves history.
- Lifecycle transitions (`PENDING → ACTIVE → REPLACED/RELEASED/REFUNDED/EXPIRED`).
- Type-specific validation.
- At most one `ACTIVE` guarantee per `group_membership_id`.
- After-departure lock when travel group is `DEPARTED`.

**Deployment/CI implications:**
- Add operations migrations.
- Add e2e travel group + guarantee flow.

**Dependencies on previous slices:**
- Slice 1 (auth).
- Slice 3 (registrations and `IRegistrationView`).
- Slice 4 (payments optional but useful for seat confirmation).

---

### Slice 6 — Operations logistics: hotels, rooms, transport, vendors

**Purpose:** Book hotels, reserve rooms, plan transport, and manage vendors for travel groups.

**Modules affected:**
- `apps/api/src/modules/operations` (hotels, group hotel stays, rooms, room assignments, transport segments, vendors)
- `apps/admin`

**Database changes:**
- Create `hotels`, `group_hotel_stays`, `rooms`, `room_assignments`, `vendors`, `transport_segments`, `vendor_types`, `hotel_statuses`, `group_hotel_stay_statuses`, `room_statuses`, `room_assignment_statuses`, `vendor_statuses`, `transport_segment_statuses`.
- Enforce `check_in_date < check_out_date`, `capacity > 0`, and one active room assignment per registration (DDD-010).
- Enforce gender restriction in shared rooms with family-room override (DDD-010).

**API endpoints:**
- `GET /api/admin/hotels`, `POST /api/admin/hotels`, `PUT /api/admin/hotels/:id`, `DELETE /api/admin/hotels/:id`.
- `GET /api/admin/vendors`, `POST /api/admin/vendors`, `PUT /api/admin/vendors/:id`, `DELETE /api/admin/vendors/:id`.
- `GET /api/admin/travel-groups/:id/stays`, `POST /api/admin/travel-groups/:id/stays`, `PUT ...`, `DELETE ...`.
- `GET /api/admin/stays/:id/rooms`, `POST /api/admin/stays/:id/rooms`, `PUT ...`, `DELETE ...`.
- `GET /api/admin/rooms/:id/assignments`, `POST /api/admin/rooms/:id/assignments`, `PUT ...`, `DELETE ...`.
- `GET /api/admin/travel-groups/:id/transport-segments`, `POST /api/admin/travel-groups/:id/transport-segments`, `PUT ...`, `DELETE ...`.

**Admin UI impact:**
- Hotel/vendor catalog.
- Travel group hotel stay and room planner.
- Room assignment with gender/capacity warnings.
- Transport segment sequence planner.

**Public-site impact:**
- None.

**Testing needed:**
- Room capacity and gender rules.
- One active room assignment per registration.
- Transport segment ordering and vendor linkage.

**Deployment/CI implications:**
- Add logistics migrations.

**Dependencies on previous slices:**
- Slice 1 (auth).
- Slice 5 (travel groups and memberships).

---

### Slice 7 — Documents and visa

**Purpose:** Store, verify, and track travel documents and visa applications. `VisaApplication` stays in `documents` (DDD-012); documents/visa are linked to `registration_id` (via `IRegistrationView`) and optionally `traveller_id`. `operations` consumes visa-readiness events for trip execution.

**Modules affected:**
- `apps/api/src/modules/documents`
- `apps/admin`
- `apps/web` (optional self-service document upload)

**Database changes:**
- Create `documents`, `visa_applications`, `document_types`, `document_statuses`, `verification_statuses`, `visa_application_statuses`.
- Enforce at least one of `traveller_id` or `registration_id` on `documents` (DDD-002).
- Enforce only one `APPROVED` visa per `registration_id` (DDD-012).

**API endpoints:**
- `GET /api/admin/documents`, `GET /api/admin/documents/:id`, `POST /api/admin/documents`, `PUT /api/admin/documents/:id/verify`, `DELETE /api/admin/documents/:id`.
- `GET /api/admin/visa-applications`, `GET /api/admin/visa-applications/:id`, `POST /api/admin/visa-applications`, `PUT /api/admin/visa-applications/:id/status`, `DELETE /api/admin/visa-applications/:id`.
- Optional public: `POST /api/public/registrations/:id/documents`.

**Admin UI impact:**
- Document list with owner (traveller or registration).
- Upload and verify actions.
- Visa application tracker with status transitions.

**Public-site impact:**
- Optional self-service document upload for registrations.

**Testing needed:**
- Document ownership rule (at least one owner).
- Visa approved uniqueness.
- `approval_date >= submission_date`.

**Deployment/CI implications:**
- Add documents migrations.
- Configure file storage (local for dev, S3-compatible for staging/production) in `deployment/`.

**Dependencies on previous slices:**
- Slice 1 (auth).
- Slice 3 (travellers and registrations).

---

### Slice 8 — Finance: expenses and go-live prep

**Purpose:** Track outgoing money through `Expense` records, then harden the system for launch. Instalment plans (`PaymentArrangement` / `PaymentInstalment`) are explicitly optional and only built if the earlier slices finish ahead of schedule.

**Modules affected:**
- `apps/api/src/modules/finance` (`Expense`, `ExpenseCategory`; `PaymentArrangement` / `PaymentInstalment` only if time permits)
- `apps/api/src/modules/operations` (attribution targets: `TravelGroup`, `TransportSegment`, `GroupHotelStay`, `Vendor`)
- `apps/api` (health, version, metrics endpoints)
- `apps/admin`
- `deployment/`, `.github/`

**Database changes:**
- Create `expenses`, `expense_categories`, `expense_statuses`.
- Enforce `expenses.amount > 0`; attribution to `travel_group_id`, `transport_segment_id`, `group_hotel_stay_id`, or `vendor_id`.
- (Optional, time permitting) Create `payment_arrangements`, `payment_instalments`, and related status tables. Enforce `paid_amount <= amount` and `amount > 0` on instalments.

**API endpoints:**
- `GET /api/admin/expenses`, `GET /api/admin/expenses/:id`, `POST /api/admin/expenses`, `PUT /api/admin/expenses/:id/approve`, `PUT /api/admin/expenses/:id/attribution`, `DELETE /api/admin/expenses/:id`.
- `GET /api/admin/expense-categories`.
- `GET /api/health`, `GET /api/version`, `GET /api/metrics`.
- (Optional) `GET /api/admin/registrations/:id/payment-arrangements`.
- (Optional) `POST /api/admin/registrations/:id/payment-arrangements`.
- (Optional) `PUT /api/admin/payment-arrangements/:id`.
- (Optional) `POST /api/admin/payment-arrangements/:id/instalments/:instalmentId/pay`.

**Admin UI impact:**
- Expense entry, approval, and attribution UI.
- Simple cash-flow / outstanding balance dashboard.
- (Optional) Instalment plan creation with schedule preview and instalment payment recording.

**Public-site impact:**
- Optional: `GET /api/public/registrations/:id/payment-arrangement`.

**Testing needed:**
- Expense amount and attribution rules.
- E2E critical path: package → public registration → invoice → payment → travel group → guarantee → document/visa.
- (Optional, if instalments built) Instalment `paid_amount` cannot exceed `amount`; only one active arrangement per registration.
- RBAC matrix test for `ADMIN`, `MANAGER`, and `AGENT`.
- Load test on package search and registration creation.
- Soft-delete and data integrity audits.

**Deployment/CI implications:**
- Final migrations for indexes, composite unique constraints, and missing foreign keys.
- Add seed data job for reference data, roles, and permissions.
- Finalize CI/CD with staging deployment and e2e tests.
- Add `docker-compose` production-ish setup in `deployment/`.
- Nx `build` for `api`, `admin`, and `web` in CI.

**Dependencies on previous slices:**
- All previous slices.

---

## 5. Critical-path timeline (target)

| Week | Focus | Deliverable |
|------|-------|-------------|
| 1 | Slice 1 + Slice 2 start | IAM (DB, API, admin UI, CI), package catalog foundation |
| 2 | Slice 2 completion + Slice 3 + Slice 4 start | Public package browsing, traveller/contact CRUD, public registration, invoice/payment foundation |
| 3 | Slice 4 completion + Slice 5 + Slice 6 start | Outstanding balance, travel groups/memberships/guarantee, hotel/transport/vendor booking |
| 4 | Slice 6 completion + Slice 7 + Slice 8 start | Logistics complete, documents/visa, expenses, integration (instalments only if time permits) |
| 5 | Slice 8 completion | Go-live prep: e2e, performance, staging deployment, final CI |

---

## 6. Risks and mitigations

| Risk | Mitigation |
|------|------------|
| **Drizzle on MariaDB edge cases** | Keep raw `mysql2` as an escape hatch; use `drizzle-kit` for migrations but be ready to hand-write complex migrations in `database/migrations/`. |
| **Cross-module circular dependency** | Enforce public `index.ts` per module; query facades and events only. |
| **Capacity / active-guarantee invariants** | Implement invariants in application/domain layer first; add DB partial unique indexes in Slice 8. |
| **Public-site security** | Public endpoints use strict DTOs, rate limiting, and optional public token. Write operations limited to registration and document upload. |
| **Deadline pressure** | Instalments and advanced reporting are stretch goals. The system is usable without them because Slice 4 supports arbitrary payments. |

---

## 7. Definition of done for a slice

- All listed API endpoints are implemented and return correct HTTP status codes.
- Drizzle migrations and seed scripts run cleanly from an empty database.
- Admin UI screens for the slice are present and exercise the happy path.
- Public-site endpoints, if listed, are exposed and smoke-tested.
- Unit and integration tests pass (aim: >70 % coverage on domain/application code).
- CI pipeline is updated if the slice touches deployment, DB, or cross-app contracts.
- No new domain decisions are introduced; all business rules align with `domain-decisions.md` and `ddd-domain-model.md`.
