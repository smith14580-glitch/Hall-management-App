# MARQUE ONE — Marriage Hall Management System
## Phase 1: Technical Architecture

| Field | Value |
|---|---|
| Project | MARQUE ONE Marriage Hall Management System |
| Client | MARQUE ONE wedding venue (real client project) |
| Phase | Phase 1 — Analysis & Architecture (this document only) |
| Date | 2026-11-10 |
| Status | Architecture approved for Phase 2 planning; **no application code exists yet** |
| Author | Senior Full-Stack Software Architect |
| Source | Client master brief (18 sections), summarised faithfully in this document |

**How to use this document:** a developer who has never seen the brief must be able to start Phase 2 from this file alone, without re-asking the brief. Anything marked **NEEDS CLIENT CONFIRMATION** is a genuine unknown — do not guess it in code. Recommended defaults are listed in §12 and §13 and must be confirmed by the client before they become rules.

**What this system replaces:** manual registers for wedding bookings, dates, customer information, and staff attendance. The goal is one central digital system that the manager, reception staff, waiters, and other employees all use every day.

**What this system is NOT (v1):** it is not a public marketing website, not a payment gateway integration, not an SMS/WhatsApp/email sender, and not a GPS/selfie attendance system. Those are future options (see §12, Q11).

---

## 1. System Overview

### 1.1 What the system does

MARQUE ONE is a single-tenant (one venue, one branch — see §12, Q1) management system with two very different user experiences on one shared backend:

- **Manager (Super Admin):** a full desktop web dashboard — bookings, calendar, customers, payments, pricing, tables, employees, attendance, reports, settings.
- **Staff / Waiters:** a deliberately simple mobile-first interface — log in, mark Present/Absent, check in, check out, see their own attendance and their assigned event/duty. Nothing else.

All data lives in one PostgreSQL database (Neon Cloud). All clients — desktop web, mobile web, PWA, Android APK — talk to the same FastAPI backend and the same database. There are no separate databases and no duplicated business logic.

### 1.2 Architecture diagram (text)

```
                          ┌─────────────────────────────────┐
                          │        MARQUE ONE users         │
                          │  Manager (desktop) · Staff /    │
                          │  Waiters (mobile)               │
                          └──────────────┬──────────────────┘
                                         │ HTTPS
              ┌──────────────────────────┼──────────────────────────┐
              │                          │                          │
   ┌──────────▼──────────┐    ┌──────────▼──────────┐    ┌────────▼─────────┐
   │  Next.js frontend   │    │  PWA (same Next.js  │    │  Android APK     │
   │  (Vercel)           │    │  build, installable │    │  (Capacitor      │
   │  Manager dashboard  │    │  from the website)  │    │  wrapper around  │
   │  + Staff mobile UI  │    │  Same pages,        │    │  the same web    │
   │  TypeScript,        │    │  offline fallback   │    │  app, same API)  │
   │  Tailwind, Shadcn,  │    │  page, service      │    │                  │
   │  React Hook Form    │    │  worker             │    │  See §8 for the  │
   │  + Zod              │    │                     │    │  honest limits   │
   └──────────┬──────────┘    └──────────┬──────────┘    └────────┬─────────┘
              │                          │                          │
              └──────────────────────────┼──────────────────────────┘
                                         │ REST API (JSON)
                                         │ JWT Bearer token
                              ┌──────────▼──────────┐
                              │  FastAPI backend    │
                              │  (Python, Render —  │
                              │  see §9)            │
                              │  • REST endpoints   │
                              │  • JWT auth + RBAC  │
                              │  • Pydantic/Zod-    │
                              │    equivalent       │
                              │    validation       │
                              │  • SQLAlchemy ORM   │
                              │  • Alembic          │
                              │    migrations       │
                              │  • Audit logging    │
                              │  • Conflict-safe    │
                              │    booking          │
                              │    transactions     │
                              └──────────┬──────────┘
                                         │ SQL (TLS)
                              ┌──────────▼──────────┐
                              │  PostgreSQL         │
                              │  (Neon Cloud)       │
                              │  • One database     │
                              │  • All tables in §3 │
                              │  • Partial unique   │
                              │    index enforces   │
                              │    no double        │
                              │    booking (§3.14)  │
                              └─────────────────────┘
```

### 1.3 Key architectural decisions (summary)

| Decision | Choice | Reason |
|---|---|---|
| Frontend | Next.js (App Router) + TypeScript | One codebase serves desktop manager UI, mobile staff UI, and the PWA; Vercel deployment is the natural host |
| Backend | FastAPI (Python) | Fast to build, strong validation (Pydantic), async-ready, good PostgreSQL ecosystem |
| Database | PostgreSQL on Neon | Relational data (bookings, payments, attendance) needs transactions and constraints; Neon is managed, serverless-friendly |
| ORM / migrations | SQLAlchemy + Alembic | Standard Python stack; migrations are versioned and reviewable |
| Auth | JWT access + refresh tokens, RBAC enforced in FastAPI dependencies | Stateless API, works identically for web, PWA, and APK |
| Mobile | PWA first; Capacitor APK wraps the same web app | One UI and one API to maintain; APK is a distribution channel, not a second app |
| Sync | REST + short polling / refetch on focus for v1; no WebSockets in v1 | Simpler and reliable; "real-time or near real-time" is met by refetch-on-focus plus manual refresh on lists. WebSockets are a Phase 5 option, not a v1 requirement |
| File exports | Server-generated CSV; PDF via server-side generation (see §9/§10) | Receipts and reports must be identical regardless of client |

### 1.4 Non-negotiable rules (from the brief)

1. **Never allow staff/waiters to see financials, booking management, or manager features.** Enforced on the backend (RBAC dependency on every route), not just by hiding frontend buttons.
2. **Duplicate confirmed bookings for the same hall + date + slot must be impossible**, even under concurrent requests. Enforced at the database level (§3.14), not by frontend date checks.
3. **Never auto-mark a booking Fully Paid** unless recorded payments cover the full amount.
4. **All dashboard statistics come from real database records.** No fake or hardcoded analytics, ever.
5. **No secrets in frontend code.** All secrets live in backend environment variables.
6. **No fake buttons or placeholder features in the shipped app.** If a feature is not built yet, it is not shown as if it works.

### 1.5 Users and their devices

| User | Device | Interface | Network |
|---|---|---|---|
| Manager / Super Admin | Desktop / laptop browser | Full dashboard (§7.1) | Online (office Wi-Fi) |
| Reception staff | Desktop or mobile browser | Manager dashboard (limited by role if applicable) or staff UI — role decides, see §5 | Online |
| Staff (general) | Mobile phone browser / PWA / APK | Staff mobile UI (§7.2) | Mobile data / Wi-Fi |
| Waiters | Mobile phone browser / PWA / APK | Simplest possible UI (§7.2) | Mobile data / Wi-Fi |

---

## 2. Monorepo Layout

One Git repository. Three deployable parts share one repo so the API contract stays in sync.

```
marque-one/
├── README.md                    # Repo overview, how to run each part, links to docs
├── docs/
│   ├── ARCHITECTURE.md          # This file (Phase 1)
│   ├── API.md                   # Generated/maintained from §4 (Phase 2+)
│   ├── DEPLOYMENT.md            # Step-by-step deploy runbook (Phase 6)
│   ├── RUNBOOK.md               # Manager user guide (Phase 6)
│   └── DECISIONS.md             # Copy of §13, updated as questions are answered
├── frontend/                    # Next.js app (manager + staff UI + PWA)
│   ├── app/
│   │   ├── (manager)/           # Manager route group (desktop layout)
│   │   │   ├── dashboard/
│   │   │   ├── bookings/
│   │   │   ├── calendar/
│   │   │   ├── customers/
│   │   │   ├── payments/
│   │   │   ├── tables/
│   │   │   ├── employees/
│   │   │   ├── attendance/
│   │   │   ├── reports/
│   │   │   ├── notifications/
│   │   │   └── settings/
│   │   ├── (staff)/             # Staff route group (mobile-first layout)
│   │   │   ├── attendance/      # Check-in / check-out
│   │   │   ├── my-attendance/
│   │   │   ├── my-events/
│   │   │   └── profile/
│   │   ├── login/
│   │   ├── api/                 # Next.js route handlers ONLY for PWA/proxy needs;
│   │   │                        # business logic lives in FastAPI, never here
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                  # Shadcn UI primitives (button, dialog, table, …)
│   │   ├── layout/              # Manager sidebar/topbar, staff bottom nav
│   │   ├── bookings/            # BookingForm, BookingCard, BookingFilters
│   │   ├── calendar/            # Month/Week/Day views, AvailabilityCell
│   │   ├── payments/            # PaymentForm, Receipt (printable)
│   │   ├── tables/              # TableGrid, FloorPlan (optional)
│   │   ├── attendance/          # CheckInButton, AttendanceTable
│   │   └── dashboard/           # StatCard, RevenueChart, UpcomingList
│   ├── lib/
│   │   ├── api-client.ts        # Typed fetch wrapper (adds JWT, handles 401/refresh)
│   │   ├── api/                 # One module per backend resource (bookings.ts, …)
│   │   ├── auth.ts              # Token storage, role helpers, route guards
│   │   ├── utils.ts             # Formatting (PKR, dates), cn()
│   │   └── validations.ts       # Zod schemas mirroring backend Pydantic schemas
│   ├── hooks/                   # useBookings, useAvailability, useAttendance, …
│   ├── public/
│   │   ├── manifest.webmanifest # PWA manifest (§8)
│   │   ├── icons/               # icon-192.png, icon-512.png, maskable, apple-touch
│   │   └── offline.html         # Offline fallback page
│   ├── capacitor.config.ts      # Capacitor config (appId, appName MARQUE ONE)
│   ├── next.config.ts           # PWA + headers; see §8
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── .env.local.example       # NEXT_PUBLIC_API_URL only (no secrets)
├── backend/                     # FastAPI app
│   ├── app/
│   │   ├── main.py              # App factory, CORS, routers, error handlers
│   │   ├── core/
│   │   │   ├── config.py        # Settings from env vars (§9.4)
│   │   │   ├── security.py      # Password hashing, JWT create/verify
│   │   │   ├── deps.py          # get_current_user, require_role(...) — RBAC here
│   │   │   └── exceptions.py    # AppError, handlers (409 conflict, 422, …)
│   │   ├── db/
│   │   │   ├── base.py          # SQLAlchemy Base, session
│   │   │   ├── models.py        # ORM models (§3) — one file per model in Phase 2
│   │   │   └── session.py       # Engine (Neon, SSL), get_db
│   │   ├── models/              # SQLAlchemy models (users, bookings, …)
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   ├── crud/                # Data-access functions (one module per resource)
│   │   ├── services/            # Business logic (booking conflict check, pricing,
│   │   │                        # payment status, attendance rules) — NOT in routers
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── endpoints/   # Thin routers: auth, bookings, customers, …
│   │   │       └── router.py    # Aggregates all routers under /api/v1
│   │   ├── utils/
│   │   │   ├── audit.py         # Audit-log writer
│   │   │   ├── receipts.py      # Printable receipt HTML/PDF data
│   │   │   └── exports.py       # CSV/PDF report generation
│   │   └── alembic/             # Alembic migrations (versions/)
│   ├── tests/                   # pytest: unit, API, concurrency (§10)
│   ├── requirements.txt
│   ├── alembic.ini
│   └── .env.example             # Names only, no values (§9.4)
├── capacitor/                   # Android project generated by Capacitor (Phase 6)
│   │                            # NOTE: `npx cap add android` creates android/
│   │                            # here. The folder is generated, not hand-written.
│   └── README.md                # How to build the APK (needs Android SDK, §8.4)
└── .github/
    └── workflows/
        ├── frontend.yml         # Lint + build + typecheck (CI)
        └── backend.yml          # pytest + Alembic check (CI)
```

**Rules for the layout:**

- Business logic lives in `backend/app/services/` and `backend/app/crud/`. Routers only parse, authorise, call a service, and return.
- The frontend never talks to Neon directly. Every data call goes through the FastAPI REST API.
- Shared types: the backend Pydantic schemas are the source of truth; frontend Zod schemas mirror them field-for-field. Any field added to the API must be added to both.
- Environment files (`.env`, `.env.local`) are never committed. Only `.example` files are committed.

---

## 3. Database Schema (PostgreSQL / Neon)

### 3.1 Conventions

- All tables: `id UUID PRIMARY KEY DEFAULT gen_random_uuid()` unless stated otherwise (UUIDs avoid guessable sequential IDs in URLs).
- All tables: `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`, `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()` (updated by trigger or application).
- Money: `NUMERIC(12,2)` in PKR. Never use floating point for money. Never store money as formatted text.
- Dates: `event_date DATE` (the wedding day, no time). Times of day for slots live in `application_settings` (see §3.13 and §12, Q3), not in the booking row.
- Times: `TIME` for check-in/out and duty-start; `TIMESTAMPTZ` for audit/attendance timestamps.
- Soft delete: none in v1, except `is_active BOOLEAN` flags where the brief requires deactivation (employees, tables). Cancelled bookings stay in the table with `status = 'cancelled'` — they are never deleted, because payments and history must survive.
- Every foreign key: `ON DELETE RESTRICT` by default (never cascade-delete customers, bookings, or payments by accident). The only cascade is `event_table_allocations → bookings` (`ON DELETE CASCADE` is forbidden; allocations are removed explicitly by the cancel flow, see §6.9).
- Naming: `snake_case` tables and columns; `*_id` for foreign keys; indexes named `idx_<table>_<columns>`.

### 3.2 `roles`

| Column | Type | Constraints |
|---|---|---|
| id | SMALLINT | PK (1 = super_admin, 2 = staff, 3 = waiter). Seeded, not user-created. |
| name | VARCHAR(30) | UNIQUE, NOT NULL (`super_admin`, `staff`, `waiter`) |
| description | TEXT | NULL |
| created_at / updated_at | TIMESTAMPTZ | NOT NULL, default now() |

Note: the brief names the top role "Super Admin / Manager". One role row covers it. If the client later wants a separate "manager" vs "super admin", add a role row — no schema change needed.

### 3.3 `users`

One login account per person. Employees and managers are both users; the `employees` table holds HR data.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| role_id | SMALLINT | FK → roles.id, NOT NULL |
| full_name | VARCHAR(120) | NOT NULL |
| phone | VARCHAR(20) | NOT NULL, UNIQUE (phone is the login identifier for staff; see §5.4) |
| email | VARCHAR(255) | NULL, UNIQUE when present |
| password_hash | TEXT | NOT NULL (bcrypt/argon2, §5.3; never store plain text) |
| is_active | BOOLEAN | NOT NULL DEFAULT true (deactivated users cannot log in) |
| last_login_at | TIMESTAMPTZ | NULL |
| created_at / updated_at | TIMESTAMPTZ | NOT NULL |

Indexes: `idx_users_phone`, `idx_users_role_id`.

### 3.4 `employees`

HR record for every employee, including waiters. Linked 1-to-1 to a login user when the employee needs to log in.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK → users.id, NULL, UNIQUE (NULL = employee record without login yet) |
| employee_code | VARCHAR(20) | NOT NULL, UNIQUE (e.g. `EMP-0001`; generated by the backend, see §6.10) |
| full_name | VARCHAR(120) | NOT NULL |
| phone | VARCHAR(20) | NOT NULL |
| role | VARCHAR(30) | NOT NULL, CHECK (role IN ('manager','reception','waiter','cook','cleaner','security','other')) — job title, distinct from login role |
| cnic | VARCHAR(15) | NULL, UNIQUE when present (format validated, not verified against any registry) |
| address | TEXT | NULL |
| hire_date | DATE | NULL |
| duty_start_time | TIME | NULL (overrides the global default from settings; see §6.7) |
| monthly_salary | NUMERIC(12,2) | NULL (manager-only; never returned to staff endpoints) |
| is_active | BOOLEAN | NOT NULL DEFAULT true |
| created_at / updated_at | TIMESTAMPTZ | NOT NULL |

Indexes: `idx_employees_employee_code`, `idx_employees_phone`, `idx_employees_is_active`.

### 3.5 `customers`

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| full_name | VARCHAR(120) | NOT NULL |
| phone | VARCHAR(20) | NOT NULL (index; the main search key) |
| alternate_phone | VARCHAR(20) | NULL |
| address | TEXT | NULL |
| email | VARCHAR(255) | NULL |
| notes | TEXT | NULL |
| created_at / updated_at | TIMESTAMPTZ | NOT NULL |

Indexes: `idx_customers_phone`, `idx_customers_full_name` (trigram/GIN for partial-name search if needed in Phase 3; plain B-tree in v1, `ILIKE '%…%'` search).

Note: a customer is created automatically from the first booking if no matching phone exists (see §6.2). Duplicate customer rows for the same phone are prevented by application check + a partial unique index on `phone` where the row is not merged — in v1, enforce uniqueness in the service layer and warn the manager on duplicates; a hard DB unique constraint on phone is the recommended default (see §12, Q13).

### 3.6 `halls`

Designed for one hall today and many halls/branches later without a rewrite.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| branch_id | UUID | NULL in v1 (reserved for future multi-branch; FK to a future `branches` table) |
| name | VARCHAR(120) | NOT NULL, UNIQUE (v1: `MARQUE ONE`) |
| capacity_guests | INTEGER | NOT NULL, CHECK (capacity_guests > 0) — **NEEDS CLIENT CONFIRMATION** (§12, Q4) |
| capacity_tables | INTEGER | NOT NULL, CHECK (capacity_tables > 0) — **NEEDS CLIENT CONFIRMATION** (§12, Q4) |
| day_price | NUMERIC(12,2) | NOT NULL — current day price (see §3.13; also snapshotted per booking, §3.8) |
| night_price | NUMERIC(12,2) | NOT NULL — current night price |
| is_active | BOOLEAN | NOT NULL DEFAULT true |
| created_at / updated_at | TIMESTAMPTZ | NOT NULL |

Seed row (v1): one hall, `MARQUE ONE`, night_price `300000.00`, day_price `150000.00` (**day price unconfirmed — §12, Q2**).

### 3.7 `hall_pricing_history` (price changes are auditable)

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| hall_id | UUID | FK → halls.id, NOT NULL |
| slot | VARCHAR(10) | NOT NULL, CHECK (slot IN ('day','night')) |
| price | NUMERIC(12,2) | NOT NULL, CHECK (price >= 0) |
| effective_from | DATE | NOT NULL |
| changed_by | UUID | FK → users.id, NOT NULL |
| created_at | TIMESTAMPTZ | NOT NULL |

Index: `idx_pricing_hall_slot_effective (hall_id, slot, effective_from DESC)`.

Rule: changing the hall price never changes existing bookings. Each booking stores its own snapshot price (§3.8).

### 3.8 `bookings` — the core table

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| booking_code | VARCHAR(20) | NOT NULL, UNIQUE (human ID, e.g. `MQ-2026-0001`; generated by backend, §6.1) |
| customer_id | UUID | FK → customers.id, NOT NULL |
| hall_id | UUID | FK → halls.id, NOT NULL |
| event_type | VARCHAR(50) | NOT NULL (e.g. `Wedding`, `Mehndi`, `Barat`, `Walima`, `Engagement`, `Other`) — free list in v1, configurable list later |
| event_date | DATE | NOT NULL, CHECK (event_date >= CURRENT_DATE at insert — enforced in service layer, see §6.3) |
| slot | VARCHAR(10) | NOT NULL, CHECK (slot IN ('day','night')) |
| guest_count | INTEGER | NOT NULL, CHECK (guest_count > 0) |
| tables_required | INTEGER | NOT NULL, CHECK (tables_required > 0) |
| special_instructions | TEXT | NULL |
| total_price | NUMERIC(12,2) | NOT NULL, CHECK (total_price >= 0) — snapshot of the price at booking time |
| advance_amount | NUMERIC(12,2) | NOT NULL DEFAULT 0, CHECK (advance_amount >= 0) — the agreed advance (default 50% of total, §6.4) |
| amount_paid | NUMERIC(12,2) | NOT NULL DEFAULT 0 — **derived**: sum of non-voided payments; maintained by the payment service, never typed by hand |
| balance_amount | NUMERIC(12,2) | GENERATED ALWAYS AS (total_price - amount_paid) STORED — or maintained by trigger/service; pick one in Phase 2 and document it |
| payment_status | VARCHAR(20) | NOT NULL DEFAULT 'unpaid', CHECK (payment_status IN ('unpaid','partially_paid','fully_paid')) — derived from amount_paid vs total_price (§6.5) |
| status | VARCHAR(20) | NOT NULL DEFAULT 'pending', CHECK (status IN ('pending','confirmed','cancelled','completed')) |
| created_by | UUID | FK → users.id, NOT NULL |
| cancelled_by | UUID | FK → users.id, NULL |
| cancelled_reason | TEXT | NULL |
| completed_at | TIMESTAMPTZ | NULL |
| created_at / updated_at | TIMESTAMPTZ | NOT NULL |

Indexes:
- `idx_bookings_event_date (event_date)`
- `idx_bookings_customer_id`
- `idx_bookings_status`
- `idx_bookings_hall_date_slot (hall_id, event_date, slot)` — supports the conflict index and the calendar query.
- **The conflict safeguard (see §3.14):** partial unique index below.

### 3.9 `payments`

Every payment is a separate row. Payments are never edited in place; a wrong payment is voided (with a reason) and a correcting payment is recorded.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| booking_id | UUID | FK → bookings.id, NOT NULL |
| amount | NUMERIC(12,2) | NOT NULL, CHECK (amount > 0) |
| payment_date | DATE | NOT NULL (defaults to today) |
| method | VARCHAR(30) | NOT NULL, CHECK (method IN ('cash','bank_transfer','jazzcash','easypaisa','cheque','other')) — **NEEDS CLIENT CONFIRMATION** (§12, Q5) |
| reference | VARCHAR(100) | NULL (transaction ID / cheque number / receipt number) |
| received_by | UUID | FK → users.id, NOT NULL |
| receipt_number | VARCHAR(30) | NOT NULL, UNIQUE (e.g. `RCP-2026-0001`) |
| is_voided | BOOLEAN | NOT NULL DEFAULT false |
| voided_by | UUID | FK → users.id, NULL |
| void_reason | TEXT | NULL |
| notes | TEXT | NULL |
| created_at / updated_at | TIMESTAMPTZ | NOT NULL |

Indexes: `idx_payments_booking_id`, `idx_payments_payment_date`, `idx_payments_receipt_number`.

Derived rule: `bookings.amount_paid = SUM(payments.amount WHERE booking_id = … AND is_voided = false)`. Recomputed inside the same transaction that inserts/voids a payment (§6.5).

### 3.10 `tables`

Physical tables in the hall.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| hall_id | UUID | FK → halls.id, NOT NULL |
| table_number | VARCHAR(20) | NOT NULL (e.g. `T-01`; unique per hall) |
| capacity | INTEGER | NOT NULL, CHECK (capacity > 0) — guests this table seats |
| is_active | BOOLEAN | NOT NULL DEFAULT true |
| created_at / updated_at | TIMESTAMPTZ | NOT NULL |

Unique: `UNIQUE (hall_id, table_number)`. Index: `idx_tables_hall_id`.

### 3.11 `event_table_allocations`

Which tables are assigned to which booking.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| booking_id | UUID | FK → bookings.id, NOT NULL |
| table_id | UUID | FK → tables.id, NOT NULL |
| created_by | UUID | FK → users.id, NOT NULL |
| created_at | TIMESTAMPTZ | NOT NULL |

Unique: `UNIQUE (booking_id, table_id)` (same table cannot be allocated twice to the same event).
Index: `idx_alloc_booking_id`, `idx_alloc_table_id`.

Capacity rule (§6.8): `SUM(tables.capacity)` over a booking's allocations must be `>= guest_count`, and the total allocated tables must be `<= halls.capacity_tables`. Enforced in the allocation service inside a transaction.

### 3.12 `attendance`

One row per employee per day. **No duplicate check-in is possible** (unique index below).

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| employee_id | UUID | FK → employees.id, NOT NULL |
| attendance_date | DATE | NOT NULL |
| status | VARCHAR(20) | NOT NULL, CHECK (status IN ('present','absent','leave','half_day')) — `present` is set by check-in; `absent` is set by the manager (or by end-of-day default, §6.7) |
| check_in_at | TIMESTAMPTZ | NULL |
| check_out_at | TIMESTAMPTZ | NULL |
| is_late | BOOLEAN | NOT NULL DEFAULT false — set by the service at check-in (§6.7) |
| late_minutes | INTEGER | NULL — minutes past duty-start time |
| working_minutes | INTEGER | NULL — computed at check-out: `check_out_at - check_in_at` in minutes |
| check_in_method | VARCHAR(20) | NULL (`manual`, `pwa`, `apk`) |
| notes | TEXT | NULL |
| corrected_by | UUID | FK → users.id, NULL (manager correction) |
| correction_reason | TEXT | NULL |
| created_at / updated_at | TIMESTAMPTZ | NOT NULL |

Unique: `UNIQUE (employee_id, attendance_date)` — this is what prevents duplicate check-ins at the DB level.
Indexes: `idx_attendance_date (attendance_date)`, `idx_attendance_employee_date (employee_id, attendance_date DESC)`.

Rules (§6.7): check-out requires a check-in on the same day; check-out must be after check-in; staff cannot edit `check_in_at`/`check_out_at` themselves — only the manager can correct, and every correction writes an audit log row.

### 3.13 `notifications`

In-app notifications only in v1 (email/SMS/WhatsApp are future).

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK → users.id, NOT NULL (recipient; manager role users get booking notifications) |
| type | VARCHAR(40) | NOT NULL (`booking_created`, `booking_confirmed`, `booking_cancelled`, `upcoming_event`, `payment_due`, `attendance_event`) |
| title | VARCHAR(200) | NOT NULL |
| body | TEXT | NULL |
| related_booking_id | UUID | FK → bookings.id, NULL |
| related_employee_id | UUID | FK → employees.id, NULL |
| is_read | BOOLEAN | NOT NULL DEFAULT false |
| created_at | TIMESTAMPTZ | NOT NULL |

Index: `idx_notifications_user_unread (user_id, is_read, created_at DESC)`.

### 3.14 `audit_logs`

Append-only. Nobody (including the manager) can edit or delete audit rows through the API.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK → users.id, NULL (NULL = system action) |
| action | VARCHAR(60) | NOT NULL (`booking.create`, `booking.cancel`, `payment.void`, `attendance.correct`, `price.change`, `user.deactivate`, …) |
| entity_type | VARCHAR(40) | NOT NULL (`booking`, `payment`, `attendance`, …) |
| entity_id | UUID | NULL |
| old_values | JSONB | NULL |
| new_values | JSONB | NULL |
| ip_address | INET | NULL |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() |

Index: `idx_audit_entity (entity_type, entity_id, created_at DESC)`, `idx_audit_user (user_id, created_at DESC)`.

### 3.15 `application_settings`

One row per setting (key/value). The manager edits these from Settings; the frontend never hardcodes them.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| key | VARCHAR(100) | NOT NULL, UNIQUE (`hall_day_price`, `hall_night_price`, `default_advance_percent`, `duty_start_time`, `slot_day_start`, `slot_day_end`, `slot_night_start`, `slot_night_end`, `late_grace_minutes`, `app_name`, …) |
| value | TEXT | NOT NULL (JSON-encoded for structured values) |
| description | TEXT | NULL |
| updated_by | UUID | FK → users.id, NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |

Seed values (defaults — **all NEED CLIENT CONFIRMATION**, §12): `default_advance_percent = 50`, `duty_start_time = 09:00`, `late_grace_minutes = 15`, slot times `TBD` (§12, Q3).

### 3.16 Booking-conflict safeguard — the exact rule

**The rule, in one sentence:** for any given hall, date, and slot, there may be at most one booking whose status is `pending` or `confirmed`.

- `cancelled` bookings do **not** block the date — cancelling frees the slot immediately (§6.9).
- `completed` bookings do **not** block the date in the index — a completed booking is a past event, and past dates cannot be booked anyway (§6.3). Keeping `completed` out of the index predicate avoids a stale row ever blocking a future booking for the same date.
- `pending` **does** block the date. Reason: a pending booking is a held date awaiting confirmation. If pending did not block, two managers could each create a pending booking for the same slot and both could later confirm — the conflict would only surface at confirmation time. Blocking at `pending` matches the brief's calendar requirement (pending dates are shown as distinct from available) and is the safer default. If the client wants pending to be non-blocking, this is a one-line change to the index predicate — record it as a decision (§13).

**Enforcement — three layers, all required:**

1. **Database (the guarantee):**
   ```sql
   CREATE UNIQUE INDEX uq_active_booking_per_hall_date_slot
     ON bookings (hall_id, event_date, slot)
     WHERE status IN ('pending', 'confirmed');
   ```
   This is a PostgreSQL partial unique index. It makes a double booking physically impossible, no matter how many requests arrive at once.

2. **Service layer (the friendly error):** inside a single DB transaction, the booking service first runs an explicit availability check (`SELECT … WHERE hall_id = ? AND event_date = ? AND slot = ? AND status IN ('pending','confirmed') FOR UPDATE` on the hall row, or a `SELECT … FOR UPDATE` on any conflicting booking row), then inserts. If the check finds a conflict, return HTTP `409 Conflict` with a clear message ("This date and slot are already booked"). If two requests race past the check, layer 1 rejects the second insert and the service converts the unique-violation into the same `409`.

3. **Frontend (the UX only):** the calendar shows availability and warns before submit. It is never the enforcement mechanism.

**The race condition this prevents:** two receptionists open the same free date at the same moment and both press "Confirm booking". Without the index, both `SELECT`s return "free" and both `INSERT`s succeed — a double-booked wedding. With the index, the second `INSERT` fails atomically and the user gets a clear conflict error instead of a double booking.

**Why not `SERIALIZABLE` alone:** serializable transactions also prevent the race, but they fail with retry-able errors that are harder to explain to the user, and they do not protect against bugs in other code paths (e.g. a future bulk-import script). The partial unique index protects every code path, forever, with zero application code. Use `READ COMMITTED` + the index as the primary mechanism; `SELECT … FOR UPDATE` on the hall row is the secondary lock that makes the pre-check reliable inside the transaction.

### 3.17 Relationships summary (ER, text)

```
roles 1───* users 1───0..1 employees 1───* attendance
users *───* bookings (created_by, cancelled_by)
customers 1───* bookings 1───* payments
halls 1───* bookings; halls 1───* tables; halls 1───* hall_pricing_history
bookings 1───* payments; bookings 1───* event_table_allocations *───1 tables
users 1───* notifications; users 1───* audit_logs
```

---

## 4. REST API — Complete Endpoint List

Base URL: `{API_URL}/api/v1`. All endpoints except `POST /auth/login` and `POST /auth/refresh` require a JWT Bearer token. All list endpoints support `?page=`, `?page_size=` (max 100), `?search=`, and `?sort=` unless noted. All responses are JSON in this shape:

```json
{ "success": true, "data": { "...": "..." }, "message": "optional human message" }
{ "success": false, "error": { "code": "BOOKING_CONFLICT", "message": "This date and slot are already booked." } }
```

Error codes to use consistently: `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `VALIDATION_ERROR` (422), `BOOKING_CONFLICT` (409), `DUPLICATE_CHECKIN` (409), `INVALID_CHECKOUT` (409), `PAYMENT_EXCEEDS_BALANCE` (422), `INTERNAL_ERROR` (500).

### 4.1 Auth

| Method | Path | Role | Request / Response |
|---|---|---|---|
| POST | /auth/login | Public | `{phone, password}` → `{access_token, refresh_token, token_type, user: {id, full_name, role, phone}}` |
| POST | /auth/refresh | Public (refresh token) | `{refresh_token}` → new access token |
| POST | /auth/logout | Any logged-in | Invalidates refresh token (server-side denylist or token version) |
| GET | /auth/me | Any logged-in | Current user profile + role + permissions list |
| POST | /auth/change-password | Any logged-in | `{current_password, new_password}` |

### 4.2 Users & Employees (manager-only unless noted)

| Method | Path | Role | Notes |
|---|---|---|---|
| GET | /users | Manager | List all login accounts (no password hashes, no salaries) |
| POST | /users | Manager | Create login account `{full_name, phone, email?, role_id, password}`; returns user without hash |
| GET | /users/{id} | Manager | Single user |
| PATCH | /users/{id} | Manager | Edit name/phone/email/role; deactivation via `is_active` |
| POST | /users/{id}/deactivate | Manager | Sets `is_active=false`; audit-logged; cannot deactivate self |
| GET | /employees | Manager | List employees, filters `?role=`, `?is_active=`, `?search=` |
| POST | /employees | Manager | Create employee (with or without a linked login user) |
| GET | /employees/{id} | Manager | Employee + linked user + attendance summary |
| PATCH | /employees/{id} | Manager | Edit profile; salary field manager-only in response |
| POST | /employees/{id}/deactivate | Manager | Deactivates employee + linked user; audit-logged |

### 4.3 Customers

| Method | Path | Role | Notes |
|---|---|---|---|
| GET | /customers | Manager | Search `?search=` (name/phone), pagination |
| POST | /customers | Manager | Create customer `{full_name, phone, address?, email?}` |
| GET | /customers/{id} | Manager | Profile + booking history + totals (paid, outstanding) |
| PATCH | /customers/{id} | Manager | Edit contact details |
| GET | /customers/{id}/bookings | Manager | That customer's bookings |
| GET | /customers/{id}/summary | Manager | `{total_bookings, total_paid, total_outstanding}` |

### 4.4 Halls & Pricing

| Method | Path | Role | Notes |
|---|---|---|---|
| GET | /halls | Manager | List halls (v1: one row) + current prices + capacity |
| GET | /halls/{id} | Manager | Single hall |
| PATCH | /halls/{id} | Manager | Edit name/capacity/prices; writes `hall_pricing_history` + audit log |
| GET | /halls/{id}/pricing-history | Manager | Price-change history |
| GET | /pricing/current | Manager | Current day/night price for the booking form (single source of truth) |

### 4.5 Bookings

| Method | Path | Role | Notes |
|---|---|---|---|
| GET | /bookings | Manager | Filters: `?search=` (name/phone/booking_code), `?status=`, `?payment_status=`, `?event_date=`, `?date_from=&date_to=`, `?slot=` |
| POST | /bookings | Manager | Create booking (§6.1–6.3). Runs conflict check in a transaction; `409 BOOKING_CONFLICT` on clash. Auto-creates customer if phone is new. |
| GET | /bookings/{id} | Manager | Full booking + customer + payments + table allocations |
| PATCH | /bookings/{id} | Manager | Edit details while `pending`/`confirmed` (not after `completed`/`cancelled`); price change re-derives balance |
| POST | /bookings/{id}/confirm | Manager | `pending` → `confirmed`; notifies; audit-logged |
| POST | /bookings/{id}/cancel | Manager | `pending`/`confirmed` → `cancelled` `{reason}`; frees the slot; payments stay recorded (§6.9); audit-logged |
| POST | /bookings/{id}/complete | Manager | `confirmed` → `completed` (after the event date); sets `completed_at` |
| GET | /bookings/upcoming | Manager | Upcoming confirmed/pending bookings, sorted by date |
| GET | /bookings/today | Manager | Today's events (both slots) |

### 4.6 Availability & Calendar

| Method | Path | Role | Notes |
|---|---|---|---|
| GET | /availability?hall_id=&month=YYYY-MM | Manager | One row per day of the month: `{date, day: {status}, night: {status}}` where status ∈ `available`, `pending`, `booked`, `cancelled` (cancelled shown for history, treated as available) |
| GET | /availability/check?hall_id=&event_date=&slot= | Manager | `{available: true/false, conflicting_booking_code?}` — used by the form before submit; advisory only (§3.16) |
| GET | /calendar?view=month\|week\|day&date= | Manager | Bookings grouped for the calendar view, with event details for authorised users |

### 4.7 Payments & Receipts

| Method | Path | Role | Notes |
|---|---|---|---|
| GET | /bookings/{id}/payments | Manager | Payment history for one booking (newest first) |
| POST | /bookings/{id}/payments | Manager | Record a payment `{amount, payment_date, method, reference?, notes?}`; recomputes `amount_paid`, `balance_amount`, `payment_status` in the same transaction; `422` if amount exceeds remaining balance |
| POST | /payments/{id}/void | Manager | Void a payment `{reason}`; recomputes booking totals; audit-logged; payment row is kept, not deleted |
| GET | /payments/{id}/receipt | Manager | Printable receipt data (HTML for print, or PDF — see §9) for one payment, or a booking receipt showing all payments |
| GET | /payments/outstanding | Manager | All bookings with balance > 0, sorted by event date (outstanding report) |

### 4.8 Tables & Seating

| Method | Path | Role | Notes |
|---|---|---|---|
| GET | /tables?hall_id= | Manager | List tables with capacity and active status |
| POST | /tables | Manager | Add table `{hall_id, table_number, capacity}` |
| PATCH | /tables/{id} | Manager | Edit number/capacity; deactivate via `is_active` |
| POST | /tables/{id}/deactivate | Manager | Deactivate (cannot deactivate a table allocated to a future active booking) |
| GET | /bookings/{id}/tables | Manager | Allocated tables for a booking + total seated capacity |
| POST | /bookings/{id}/tables | Manager | Allocate tables `{table_ids: []}`; enforces capacity rules (§6.8) in a transaction |
| DELETE | /bookings/{id}/tables/{table_id} | Manager | Remove one allocation |

### 4.9 Attendance

| Method | Path | Role | Notes |
|---|---|---|---|
| POST | /attendance/check-in | Staff, Waiter, Manager | `{employee_id}` (or the logged-in user's own employee record). Creates today's row, sets `check_in_at = now()`, computes `is_late`. `409 DUPLICATE_CHECKIN` if already checked in today. |
| POST | /attendance/check-out | Staff, Waiter, Manager | Sets `check_out_at = now()`, computes `working_minutes`. `409 INVALID_CHECKOUT` if no check-in today or already checked out. |
| POST | /attendance/mark | Manager | Manager marks Present/Absent/Leave for an employee for a date (e.g. absent staff who never checked in) |
| GET | /attendance/me?month=YYYY-MM | Staff, Waiter | **Own** attendance history only (user can only see their own rows — enforced by user ID, not by a query parameter) |
| GET | /attendance/today | Manager | Today's attendance for all employees |
| GET | /attendance?employee_id=&month= | Manager | Filtered history, monthly report data |
| PATCH | /attendance/{id}/correct | Manager | Manager correction `{check_in_at?, check_out_at?, status?, reason}`; writes audit log; staff cannot call this |
| GET | /attendance/report/monthly?month= | Manager | Monthly report (per employee: present/absent/late days, total working hours); CSV export |

### 4.10 Dashboard & Reports

| Method | Path | Role | Notes |
|---|---|---|---|
| GET | /dashboard/summary?date_from=&date_to= | Manager | All §10 dashboard numbers in one call (computed from DB, never hardcoded) |
| GET | /dashboard/revenue?period=daily\|weekly\|monthly\|annual | Manager | Revenue series for charts (grouped by period, from payments) |
| GET | /reports/bookings?period=&format=json\|csv\|pdf | Manager | Booking report for a period |
| GET | /reports/revenue?period=&format= | Manager | Revenue report |
| GET | /reports/outstanding?format= | Manager | Outstanding-balance report |
| GET | /reports/attendance?month=&format= | Manager | Attendance + working-hours report |
| GET | /reports/customers/{id}?format= | Manager | Customer booking history report |

### 4.11 Notifications

| Method | Path | Role | Notes |
|---|---|---|---|
| GET | /notifications | Any logged-in | Own notifications, newest first, `?unread_only=` |
| POST | /notifications/{id}/read | Any logged-in | Mark one as read (own notifications only) |
| POST | /notifications/read-all | Any logged-in | Mark all own notifications as read |
| GET | /notifications/unread-count | Any logged-in | Badge count for the header |

### 4.12 Settings & Audit

| Method | Path | Role | Notes |
|---|---|---|---|
| GET | /settings | Manager | All application settings (key/value) |
| PATCH | /settings/{key} | Manager | Update one setting (e.g. prices, duty-start time); audit-logged |
| GET | /audit-logs?entity_type=&user_id=&date_from=&date_to= | Manager | Read-only list of audit events |
| GET | /audit-logs/{id} | Manager | Single audit entry with old/new values |

---

## 5. Authentication & Role-Based Access Control

### 5.1 Roles

| Role | Who | Login identifier |
|---|---|---|
| `super_admin` (Manager) | The venue manager / owner | Phone + password (email optional) |
| `staff` | Reception staff, general employees | Phone + password |
| `waiter` | Waiters | Phone + password |

There is exactly one top role in v1. "Super Admin / Manager" is one role, not two. If the client later needs a "manager who cannot change prices" vs "owner who can", add a new role row and extend the matrix — the `roles` table already supports it.

### 5.2 RBAC matrix (role × capability)

`✓` = allowed. `—` = forbidden (backend returns `403 FORBIDDEN`).

| Capability | Manager | Staff | Waiter |
|---|---|---|---|
| View full dashboard, revenue, outstanding | ✓ | — | — |
| Create / edit / confirm / cancel / complete bookings | ✓ | — | — |
| View calendar and availability | ✓ | — | — |
| View customers and booking history | ✓ | — | — |
| Record / void payments, view receipts | ✓ | — | — |
| Change hall pricing and settings | ✓ | — | — |
| Manage tables and seating allocations | ✓ | — | — |
| Add / edit / deactivate employees | ✓ | — | — |
| View all attendance, correct attendance | ✓ | — | — |
| View reports, export PDF/CSV | ✓ | — | — |
| View audit logs | ✓ | — | — |
| Log in | ✓ | ✓ | ✓ |
| Check in / check out (own record only) | ✓* | ✓ | ✓ |
| Mark self Present / Absent | — | ✓ | ✓ |
| View own attendance history | ✓ | ✓ | ✓ |
| View assigned event / duty info (when authorised) | ✓ | ✓ | ✓ |
| Edit permitted own profile details (phone, address) | ✓ | ✓ | ✓ |
| See any financial data (prices, revenue, balances) | ✓ | — | — |
| See other employees' attendance | ✓ | — | — |
| Modify own check-in/out timestamps | — | — | — |

\* A manager can also check in/out if they are also an employee record, but in practice the manager uses the manager attendance screens.

**Enforcement rule:** every FastAPI route declares its allowed roles in a dependency, e.g. `require_role("super_admin")` or `require_role("super_admin", "staff", "waiter")` plus an ownership check (staff endpoints load the employee record from the JWT user ID, never from a client-supplied employee ID). The frontend hides buttons for UX, but hiding is never the security mechanism. A staff user calling `GET /bookings` directly must get `403`, not data.

### 5.3 JWT plan

- **Access token:** JWT, expiry **15 minutes**, signed with `JWT_SECRET_KEY` (backend env only). Payload: `sub` (user ID), `role`, `employee_id` (if any), `exp`, `iat`.
- **Refresh token:** opaque random token (or a second JWT), expiry **7 days**, stored hashed in the database (or a server-side store) so it can be revoked on logout / deactivation. Rotation on every refresh (old refresh token is invalidated when a new one is issued).
- **Login flow:** `POST /auth/login` → verify password → check `is_active` → issue token pair → set `last_login_at`.
- **Refresh flow:** frontend `api-client` intercepts a `401`, calls `POST /auth/refresh` once, retries the original request. If refresh fails, redirect to login.
- **Logout:** refresh token revoked server-side; access token simply expires (15-minute window is accepted).
- **Deactivated users:** a deactivated user's refresh tokens are revoked immediately; their access token stops working at the next check because `get_current_user` re-reads `is_active` from the DB on every request (do not trust the JWT alone for active status).

### 5.4 Password policy (v1)

- Minimum **8 characters**, at least one letter and one number. (Stronger rules — e.g. 10 characters + symbol — are a client decision; 8 + letter + number is the recommended default.)
- Hashing: **bcrypt** (cost factor 12) or **argon2id** — pick one in Phase 2 and document it; never MD5/SHA-1/plain text.
- Passwords are set by the manager when creating a user account. Staff change their own password via `POST /auth/change-password`. There is no self-registration and no public sign-up.
- After **5 failed login attempts** for one phone number, lock that account for **15 minutes** (rate-limit + lockout; exact numbers are defaults — see §12).
- First manager account: created by a **seed script** run once at deployment (see §12, Q8 — the client's name/phone for this account is still unknown and blocks go-live, not Phase 2).

### 5.5 Input validation and sanitisation

- Every request body is validated by a Pydantic schema (types, ranges, enums, string lengths). Invalid input → `422 VALIDATION_ERROR` with per-field messages.
- The frontend mirrors the same rules with Zod so the user gets instant feedback, but the backend is the authority.
- All SQL goes through SQLAlchemy parameterised queries. No string-concatenated SQL anywhere.
- String fields are length-limited and stripped; HTML in free-text fields is escaped on render.

---

## 6. Core Business Rules

Numbered, in the order a developer should implement them. "Default" means the recommended value — it is **not** a client-confirmed fact until §12 is answered.

1. **Booking code:** generated by the backend at creation: `MQ-YYYY-NNNN` (e.g. `MQ-2026-0001`), sequential per calendar year, unique. Never typed by the user, never reused after cancellation.
2. **Customer handling:** a booking always references a `customers` row. If the phone number is new, the backend creates the customer from the booking form in the same transaction. If the phone already exists, the booking links to the existing customer (and the manager may update the address). See §12, Q13 for the duplicate-phone question.
3. **Past dates cannot be booked.** `event_date` must be today or in the future at creation. Editing a booking to a past date is forbidden.
4. **Pricing math (the only pricing rule in v1):**
   - `total_price` = the hall price for the chosen slot at booking time (night `300,000`, day `150,000` — day price unconfirmed, §12 Q2), snapshotted into the booking. Later price changes do not change this booking.
   - `advance_amount` (the agreed advance) defaults to **50% of total_price** (default `default_advance_percent = 50`, configurable in settings). The manager may change the agreed advance at booking time — **NEEDS CLIENT CONFIRMATION** (§12, Q6: is 50% fixed or variable?).
   - `amount_paid` = sum of non-voided payments. `balance_amount = total_price − amount_paid`.
   - Example (night): total `300,000`; advance `150,000`; remaining after full advance `150,000`.
5. **Payment status is derived, never typed:**
   - `amount_paid = 0` → `unpaid`
   - `0 < amount_paid < total_price` → `partially_paid`
   - `amount_paid >= total_price` → `fully_paid` (a payment that would take the total above `total_price` is rejected with `422 PAYMENT_EXCEEDS_BALANCE`, except an exact top-up to the full amount).
   - A booking is **never** marked `fully_paid` by hand or by the advance alone.
6. **Booking status transitions (and who can do them):**
   - `pending → confirmed` (manager only, via Confirm). This is the normal flow: a date is held as pending, then confirmed.
   - `pending → cancelled` (manager only, with a reason).
   - `confirmed → cancelled` (manager only, with a reason). See rule 9.
   - `confirmed → completed` (manager only, after the event date has passed).
   - `cancelled → anything`: **forbidden**. A cancelled booking stays cancelled; re-booking means creating a new booking.
   - `completed → anything`: **forbidden**.
   - Staff and waiters cannot change booking status at all (no endpoint exists for them).
7. **Attendance — late rule (default, NEEDS CLIENT CONFIRMATION, §12 Q7):**
   - Duty-start time is configurable in settings; default **`09:00`**, with a grace period of **15 minutes** (`late_grace_minutes`).
   - `is_late = true` when `check_in_at` time is after `duty_start_time + grace` (i.e. after 09:15 by default). `late_minutes` = minutes past duty-start time (not past grace — record the raw lateness).
   - An employee may have a personal `duty_start_time` in their employee record that overrides the global default (e.g. night-shift staff).
   - Working hours: `working_minutes = check_out_at − check_in_at` in minutes, computed at check-out. Displayed as hours + minutes (e.g. `9h 30m`). A missing check-out means working time is unknown, not zero.
   - Attendance rows are created by check-in (status `present`) or by the manager marking `absent`/`leave`. At end of day, any employee with no row is treated as absent in reports, but no row is fabricated in the table.
8. **Table capacity rule:** a booking's allocated tables must seat at least `guest_count` guests in total (`SUM(capacity) >= guest_count`), and the number of allocated tables must not exceed `halls.capacity_tables`. Allocating more tables than the hall has, or fewer seats than guests, is rejected with `422`. The optional drag-and-drop floor plan is a Phase 5 stretch goal, not a v1 requirement.
9. **Cancellation rule:** cancelling a booking (a) frees the hall/date/slot immediately (the partial unique index no longer sees the row, §3.16); (b) **does not delete or refund payments** — all recorded payments stay on the booking and remain visible in payment history; (c) requires a reason, stored in `cancelled_reason`; (d) sends a `booking_cancelled` notification; (e) writes an audit log. Refunds, if the client ever wants them, are a future feature — there is no refund flow in v1 and no payment row is ever deleted.
10. **Employee code:** generated by the backend: `EMP-NNNN` (sequential, e.g. `EMP-0001`), unique, never reused.
11. **Receipt number:** generated by the backend: `RCP-YYYY-NNNN`, unique per payment, never reused — even for voided payments (the voided receipt stays in history, marked voided).
12. **Duplicate check-in prevention:** the `UNIQUE (employee_id, attendance_date)` index (§3.12) plus a service check. A second check-in on the same day returns `409 DUPLICATE_CHECKIN`. Check-out without check-in, or a second check-out, returns `409 INVALID_CHECKOUT`.
13. **Manager corrections:** only a manager can correct attendance. Every correction requires a reason and writes an audit log row with old and new values. Staff can never edit their own timestamps through any endpoint.
14. **Notifications (v1, in-app only):** created automatically on booking created/confirmed/cancelled, on an upcoming event (a daily job or a check at login — pick one in Phase 2; a simple scheduled task that creates `upcoming_event` notifications for events in the next 3 days is the recommended default), on outstanding payments (booking with balance > 0 and event within 7 days), and on attendance events the manager should see. Email/SMS/WhatsApp are **not** in v1.
15. **Availability display rule:** for each date and slot: `booked` if a `confirmed` booking exists; `pending` if a `pending` booking exists and no confirmed one; `available` otherwise (including dates whose only booking is `cancelled`); `completed` dates are shown as past/closed, not as bookable. A booking can never be created for a date/slot that is `booked` or `pending` (see §3.16).

---

---

## 7. Frontend Page / Route Map

Two route groups, two layouts, one app. The role in the JWT decides which group a user can open; a staff user opening a manager URL is redirected to the staff home (and the API would refuse the data anyway, §5.2).

### 7.1 Manager (desktop) — route group `(manager)/`

| Route | Page | Purpose |
|---|---|---|
| /login | Login | Phone + password; redirects by role after login |
| /dashboard | Manager Dashboard | Stat cards, revenue chart, today's events, upcoming weddings, recent bookings, quick actions (§10 dashboard list) |
| /bookings | Booking List | Search (name/phone/booking code/date/status), filters, pagination; "New Booking" button |
| /bookings/new | New Booking | Full booking form (customer, event, date/slot with live availability warning, guests, tables, pricing preview, advance) |
| /bookings/[id] | Booking Detail | All booking fields, customer card (link to customer), payment history, record-payment form, table allocation, receipt print, confirm/cancel/complete actions |
| /calendar | Availability Calendar | Month / Week / Day views; booked/available/pending/cancelled colours; click a date to see its bookings or start a booking |
| /customers | Customer List | Search/filter, per-customer totals |
| /customers/[id] | Customer Detail | Profile, booking history, total paid, outstanding, previous events |
| /payments | Payments | All payments list; outstanding-balance list; receipt reprint |
| /tables | Table Management | Table list, add/edit/deactivate, capacity, allocated vs available counts; per-event allocation is done from the booking page |
| /employees | Employee List | Add/edit/deactivate employees, roles, account status |
| /employees/[id] | Employee Detail | Profile, attendance summary, monthly history |
| /attendance | Attendance (manager) | Today's attendance, per-employee history, monthly report, manager corrections |
| /reports | Reports | Daily/weekly/monthly/annual bookings, revenue, outstanding, attendance; PDF/CSV export buttons |
| /notifications | Notifications | In-app notification list, mark read |
| /settings | Settings | Hall name, prices, advance %, duty-start time, slot times, app settings; price-change history |
| /settings/audit-logs | Audit Logs | Who did what, when (read-only) |

Manager layout: left sidebar (desktop) / collapsible drawer (tablet), top bar with search, notifications bell with unread count, and user menu. Tables use proper pagination, not infinite scroll. All forms use React Hook Form + Zod with inline errors and loading/success/empty/error states.

### 7.2 Staff / Waiter (mobile-first) — route group `(staff)/`

Deliberately tiny. Four screens, big touch targets (minimum 48px), no tables of data, no financial numbers anywhere.

| Route | Page | Purpose |
|---|---|---|
| /login | Login (same) | Phone + password; role decides the landing page |
| /staff | Staff Home | Today's duty info (if assigned), one big **Check In** / **Check Out** button, today's status |
| /staff/attendance | My Attendance | Own history for the current month (present/absent/late, working hours) |
| /staff/events | My Events | Assigned event/duty info, only when authorised by the manager |
| /staff/profile | My Profile | Permitted details only (phone, address); change password |

Staff layout: bottom navigation with 3–4 items, large buttons, no sidebar, no dashboard charts. A waiter sees exactly the same staff screens; the only difference is the job title shown. There is no separate waiter app.

### 7.3 Shared frontend rules

- Language: **English only in v1** — see §12, Q12 (the construction website has an EN/اردو toggle; whether MARQUE ONE needs Urdu is an open client question, not a v1 assumption).
- Date/time display: Pakistan local time (Asia/Karachi). Store UTC in the DB (`TIMESTAMPTZ`), display local.
- Money display: `PKR 300,000` format everywhere (no decimals shown unless the amount has paisa).
- Every list has loading, empty ("No bookings yet"), and error states. Every form has validation errors inline. No button does nothing.
- Print: receipts use a print stylesheet (print only the receipt, not the whole dashboard).

---

## 8. PWA + Capacitor Plan

### 8.1 PWA (part of the Next.js app, Phase 6)

| Requirement | Implementation |
|---|---|
| Web app manifest | `public/manifest.webmanifest`: `name: "MARQUE ONE"`, `short_name: "MARQUE ONE"`, `display: "standalone"`, `theme_color` + `background_color` (deep, premium colour from the design system — exact hex chosen in Phase 2), `start_url: "/"`, `scope: "/"`, icons 192 + 512 (maskable + any) |
| Icons | Professional icon + splash assets in `public/icons/`; Apple touch icon; favicon |
| Installable | Manifest + service worker + HTTPS (Vercel provides HTTPS) = install prompt on Android/Chrome and iOS (Add to Home Screen) |
| Service worker | Cache the app shell (HTML/CSS/JS) for offline loading; **never cache API responses containing booking/payment data**; network-first for all `/api/*` calls |
| Offline fallback | `public/offline.html` shown when the app shell cannot load; it must say plainly that bookings and attendance need internet, and offer a retry button. No fake "saved offline" claims — v1 does **not** queue attendance offline |
| Standalone display | `display: "standalone"` so the installed app has no browser chrome |
| Theme colours | `theme-color` meta tag matching the manifest |

### 8.2 Capacitor (Android APK, Phase 6)

- `capacitor.config.ts`: `appId: "com.marqueone.app"` (confirm with the client — any reverse-domain ID works, but it cannot change after the first Play Store upload), `appName: "MARQUE ONE"`, `webDir: "out"` or the Next.js build output (see the note below), `server` config pointing at the production frontend URL.
- **Important technical note:** Capacitor wraps a *static* web build. A standard Next.js App Router app is server-rendered, so the Capacitor build must use either (a) `output: "export"` (fully static export — some dynamic features need rework), or (b) a Capacitor `server.url` pointing at the live Vercel deployment (the APK is then a wrapper around the live site and needs internet — simpler, and the recommended default for v1). The choice must be made in Phase 6 after the frontend exists; do not decide it now. Either way the APK talks to the same FastAPI backend as the website.
- Android project: generated by `npx cap add android` into `capacitor/android/`. Icon and splash screen are set in Android resources (adaptive icon, splash). App name, icon, and splash are configured once and reviewed by the client before the first APK.
- Auth in the APK: JWT tokens are stored in Capacitor Preferences / secure storage (not `localStorage` alone — the exact storage is chosen in Phase 6). Login, token refresh, and API calls behave identically to the PWA.
- Deep links / push notifications: **not** in v1.

### 8.3 What the PWA and APK share

One frontend codebase, one backend, one database. A booking created on the manager's desktop appears on the staff member's phone after a refetch; a check-in on the APK appears on the manager's dashboard after a refetch. There is no per-client database and no sync engine to build in v1.

### 8.4 Honest limits — read this before promising an APK date

- **An APK cannot be generated from this Linux VM without an Android SDK.** Building an Android APK needs Android Studio (or the Android command-line tools + a JDK) on a build machine, or a CI service with Android set up. This VM has neither. The Capacitor configuration, icon, splash, and app wiring can be prepared here; the actual APK build must run on a machine with Android Studio or in CI (e.g. GitHub Actions with `android-actions/setup-android`).
- **A Play Store release needs a Google Play developer account, a signed release keystore, and the client's organisation details.** None of those exist yet. For v1, distribute the APK as a direct download (sideload) or through the PWA install prompt — do not promise a Play Store listing in v1.
- **The PWA install prompt only appears on HTTPS.** Local development over `http://localhost` will not show it; test installation on the Vercel deployment.
- **Offline attendance is not in v1.** If the venue has poor mobile signal, attendance check-ins will fail without internet and the staff member will see an error. Offline queueing is a Phase 5+ feature if the client asks for it.

---

## 9. Deployment Plan

### 9.1 Recommended stack (and why)

| Part | Recommended | Alternative | Reason for the recommendation |
|---|---|---|---|
| Frontend | **Vercel** | Netlify | Next.js is built by Vercel; zero-config deploys, preview URLs per branch, free HTTPS, global CDN. The client already has a Vercel Hobby account (live, 2026-11-09) — confirm it is the account to use (§12, Q9). |
| Backend | **Render** | Railway or Fly.io | Render has the simplest persistent Python web service + background worker setup, free tier for starting, and clear env-var management. Railway is a good alternative if the client prefers it; Fly.io is more powerful but needs more DevOps care. Pick **one** in Phase 6 — do not run two. |
| Database | **Neon (PostgreSQL)** | — | Required by the brief. Managed, branching for dev/staging, connection pooling (PgBouncer) for serverless/fastAPI, free tier to start. |
| File/asset storage | None in v1 | — | No uploads in v1 (no photos, no documents). If the client later wants hall photos or CNIC images, add object storage then — do not add it now. |
| CI | GitHub Actions | — | Lint + typecheck + tests on every push; the repo already has a GitHub connection path (see §12, Q9). |

### 9.2 Environments

| Environment | Frontend | Backend | Database |
|---|---|---|---|
| Local dev | `localhost:3000` | `localhost:8000` (uvicorn) | Neon dev branch (or local Postgres in Docker) |
| Staging | Vercel preview deployment | Render staging service | Neon staging branch |
| Production | Vercel production (`marqueone.vercel.app` or custom domain) | Render production service | Neon production branch |

Never point local development at the production database. Never run migrations against production from a laptop without a backup.

### 9.3 Domains and CORS

- Production frontend domain: **TBD** (§12, Q9 — custom domain or `*.vercel.app`?). Backend domain: the Render URL (e.g. `https://marque-one-api.onrender.com`).
- CORS: the backend allows **only** the production frontend origin, the Vercel preview origins, and `http://localhost:3000` in development. `Access-Control-Allow-Origin: *` is forbidden.
- The frontend calls the backend by its public HTTPS URL only. No direct database access from the frontend, ever.

### 9.4 Environment variables (names only — no values in this document)

Backend (`backend/.env.example`):
```
DATABASE_URL
JWT_SECRET_KEY
JWT_REFRESH_SECRET_KEY
ACCESS_TOKEN_EXPIRE_MINUTES
REFRESH_TOKEN_EXPIRE_DAYS
CORS_ORIGINS
ENVIRONMENT
FIRST_ADMIN_NAME
FIRST_ADMIN_PHONE
FIRST_ADMIN_PASSWORD
```

Frontend (`frontend/.env.local.example`):
```
NEXT_PUBLIC_API_URL
NEXT_PUBLIC_APP_NAME
```

Rules: secrets are set in the hosting dashboard (Vercel / Render), never in the repo. `JWT_SECRET_KEY` must be a long random string generated at deploy time. Rotate it if it ever leaks — all sessions will need re-login, which is acceptable.

### 9.5 Deployment checklist (Phase 6)

1. Create Neon project → production branch → copy `DATABASE_URL` (pooled connection string).
2. Run Alembic migrations against staging, then production.
3. Run the seed script (roles, first admin account, one hall, settings defaults) — see §12, Q8.
4. Deploy backend to Render; set env vars; smoke-test `/api/v1/auth/login` and `/api/v1/dashboard/summary`.
5. Deploy frontend to Vercel; set `NEXT_PUBLIC_API_URL`; smoke-test login as manager and as staff on desktop and mobile.
6. Verify PWA manifest + service worker on the production URL; verify install prompt appears.
7. Prepare Capacitor config + icons; build the APK on a machine with Android Studio (or CI); install on a real Android phone and test login + check-in against production.
8. Hand over the manager user guide and the first-admin credentials **in person / on a secure channel, never in this document or in chat**.

---

## 10. Testing Plan

Testing is per phase, not an afterthought. No phase exits without its tests (see §11).

### 10.1 Test types

| Type | Tool | What it covers |
|---|---|---|
| Unit tests | pytest (backend), Vitest (frontend, if added in Phase 2) | Pricing math, payment-status derivation, late calculation, working-minutes calculation |
| API tests | pytest + FastAPI TestClient | Every endpoint in §4: happy path, validation errors, 401 without token, 403 for wrong role |
| Concurrency test | pytest + threading / parallel HTTP calls | **The double-booking test** (see §10.2) |
| Frontend tests | Manual checklist in Phase 2–3; automated component tests only if time allows | Form validation, availability warning, receipt print view |
| Manual QA | Written checklists per phase | Desktop + mobile (real phone), PWA install, APK install on a real device |

### 10.2 The concurrent double-booking test (mandatory, Phase 3)

1. Seed one hall, one free date, one slot.
2. Fire **two** `POST /bookings` requests for the same hall/date/slot **at the same time** (parallel threads, no delay between them).
3. Assert: exactly **one** succeeds (`201`), exactly **one** fails with `409 BOOKING_CONFLICT`.
4. Assert: the database contains exactly one active booking for that hall/date/slot.
5. Repeat with `pending` + `confirmed` mixed (a pending booking must also block).
6. Repeat after cancelling the first booking: a new booking for the same slot must now succeed.

This test must pass before Phase 3 exits. If it fails, the conflict safeguard (§3.16) is wrong — fix the index/transaction, not the test.

### 10.3 Role-access negative tests (mandatory, Phase 2)

For every manager-only endpoint, call it with a staff token and a waiter token and assert `403`. For every staff endpoint, assert a staff user cannot read another employee's attendance (request another employee's ID → `403`, not their data). These tests are as important as the happy-path tests.

### 10.4 Per-phase test focus

- **Phase 2:** auth (login, wrong password, expired token, refresh, deactivated user), RBAC negative tests, migration up/down.
- **Phase 3:** booking CRUD + status transitions (including illegal transitions → `422`/`409`), availability calendar correctness, pricing math (night/day/advance/partial), payment recording + void + receipt, table allocation capacity rules, dashboard numbers reconciled against raw SQL counts.
- **Phase 4:** check-in/check-out rules (duplicate check-in, check-out without check-in, late marking at 09:00/09:15 boundaries, working-minutes math), manager correction + audit log, staff cannot see financial endpoints.
- **Phase 5:** report totals reconciled against the database (revenue report sum = sum of payments), CSV/PDF export opens correctly, notification creation on booking events.
- **Phase 6:** PWA install on Android + iOS, offline fallback page, APK install on a real phone, login + check-in from the APK against production, responsive check at 360px / 768px / 1280px, no horizontal overflow.

### 10.5 Test data

- Seed script creates: 3 roles, 1 manager, 2 staff, 2 waiters, 1 hall, 10 tables, 5 sample customers, 5 sample bookings across past/future dates, sample payments, sample attendance. **Sample data is for staging/dev only and must never be loaded into production.**
- Production starts empty except: roles, the first admin account, the hall, settings defaults, and the tables the manager enters.

---

---

## 11. Phase Plan (Phases 1–6) with Exit Criteria

| Phase | Work | Exit criteria (all must be true before the next phase starts) |
|---|---|---|
| **1 — Analysis** | This document. Architecture, schema, API list, business rules, open questions. | This file exists and is complete; open questions (§12) are listed with recommended defaults; the client has seen the questions. No code is written. |
| **2 — Foundation** | Monorepo init; Next.js + FastAPI scaffolds; Neon + SQLAlchemy + Alembic; auth (login/refresh/logout/change-password); RBAC dependencies; design system (Tailwind + Shadcn tokens, typography, colours); seed script (roles, first admin, hall, settings); CI (lint/typecheck/test). | `npm run build` + `npm run lint` pass; `pytest` passes; migrations run up and down cleanly; login works for manager and staff; RBAC negative tests pass (§10.3); a staff token gets `403` on every manager endpoint; design-system page renders on desktop and mobile. |
| **3 — Core features** | Manager dashboard (real DB numbers); bookings (CRUD + status transitions + conflict safeguard); availability calendar (month/week/day); customers; payments + receipts; tables + allocations. | Double-booking concurrency test passes (§10.2); booking status transition tests pass; pricing-math unit tests pass; dashboard numbers match raw SQL counts; receipt prints correctly; calendar shows correct states for seeded data; no fake buttons. |
| **4 — Employee features** | Staff login; staff mobile UI; check-in/out; own attendance history; employee profiles; manager attendance screens; monthly reports; manager corrections + audit logs. | Duplicate check-in returns `409`; check-out rules pass; late marking verified at the 09:00/09:15 boundary; staff cannot see financial endpoints; manager correction writes an audit row; staff UI is usable one-handed on a real phone. |
| **5 — Advanced features** | Analytics/charts; in-app notifications; reports (daily/weekly/monthly/annual, revenue, outstanding, attendance, working hours); PDF/CSV export; audit-log viewer. | Every report total reconciles with the database; exports open correctly; notifications are created on booking create/confirm/cancel; audit log shows old/new values for corrections and price changes. |
| **6 — Mobile & deployment** | PWA (manifest, icons, service worker, offline fallback); Capacitor config + icons/splash; APK build (on a machine with Android Studio or CI); production deploy (Vercel + Render + Neon); deployment docs + manager user guide; handover. | PWA installs from the production URL; offline fallback page appears without network; APK installs on a real Android phone and login + check-in work against production; staging and production are separate; the manager can log in and complete a full booking → payment → receipt flow on production without developer help. |

**Phase discipline:** do not start Phase 3 until Phase 2's exit criteria pass. Do not add features from a later phase into an earlier one (e.g. do not build PDF export in Phase 3). If a phase's exit criteria cannot be met, say so in the phase summary and fix it before moving on — do not carry a failing test forward silently.

---

## 12. Risks + Open Questions

Every question below is a genuine unknown from the brief. Each has a **recommended default** (what Phase 2 will build if the client does not answer) and a **blocks** note (what it blocks). Nothing in this section is a client-confirmed fact.

### Q1. Is there exactly 1 hall, or more than one?
- **Recommended default:** exactly 1 hall (`MARQUE ONE`). The schema already supports many halls (§3.6), so adding a second hall later is data, not a rewrite.
- **Blocks:** nothing in Phase 2 (the schema is ready either way). It blocks the hall-picker UI only if there are 2+ halls.
- **Needs client confirmation:** yes.

### Q2. Is the Day price PKR 150,000 confirmed?
- The brief says the Day price is "subject to client confirmation". The Night price (PKR 300,000) is stated as fact.
- **Recommended default:** build with Day = `150,000` as the seeded value, clearly labelled unconfirmed in settings, and make it editable by the manager in one place.
- **Blocks:** final pricing display; does **not** block Phase 2 (the price is a setting, not code).
- **Needs client confirmation:** yes — this is the single most important pricing question.

### Q3. What are the Day and Night slot times?
- The brief requires separate Day and Night slots but gives no clock times.
- **Recommended default:** Day `12:00–16:00`, Night `19:00–23:00` (common Pakistani marquee timings). Stored in settings (`slot_day_start/end`, `slot_night_start/end`) so the manager can change them without code.
- **Blocks:** the calendar display (showing slot times), the "today's events" list, and any future rule such as "no booking within 2 hours of the previous slot".
- **Needs client confirmation:** yes.

### Q4. What is the hall capacity — how many guests, and how many tables?
- The brief requires capacity enforcement but gives no numbers.
- **Recommended default:** none — do **not** invent a number. The manager must enter `capacity_guests` and `capacity_tables` in Settings before table allocation can be used; the allocation screen must refuse to work (with a clear message) until capacity is set.
- **Blocks:** table allocation enforcement (§6.8) and the guest-count sanity check on the booking form.
- **Needs client confirmation:** yes.

### Q5. Which payment methods are accepted?
- The brief requires method + reference per payment but does not list the methods.
- **Recommended default:** Cash, Bank Transfer, JazzCash, EasyPaisa, Cheque, Other (the enum in §3.9). The manager can add a method only by a code change in v1 — acceptable, because the list is short.
- **Blocks:** the payment form's method dropdown.
- **Needs client confirmation:** yes.

### Q6. Is the advance fixed at 50%, or variable?
- The brief gives the example "Advance (50%): PKR 150,000" but does not say whether every booking must use 50%.
- **Recommended default:** 50% is the **default** (`default_advance_percent = 50` in settings), but the manager may change the agreed advance per booking (e.g. a customer pays 100,000 advance on a 300,000 booking). The system must never force 50%.
- **Blocks:** the booking-form advance field (editable vs fixed).
- **Needs client confirmation:** yes.

### Q7. What is the staff duty-start time for late marking?
- The brief requires late-arrival tracking but gives no start time.
- **Recommended default:** duty starts at **`09:00`**, grace **15 minutes** (late after 09:15), configurable in settings, overridable per employee.
- **Blocks:** the late flag and the monthly late report. Does not block check-in/out itself.
- **Needs client confirmation:** yes.

### Q8. Who is the first manager account (name and phone)?
- The system needs one Super Admin to log in first. No name or phone was supplied.
- **Recommended default:** none — do not invent a person. The seed script takes `FIRST_ADMIN_NAME`, `FIRST_ADMIN_PHONE`, `FIRST_ADMIN_PASSWORD` from env vars at deploy time. Deployment cannot finish without them.
- **Blocks:** go-live (not Phase 2 — Phase 2 can use a clearly-marked dev admin).
- **Needs client confirmation:** yes.

### Q9. Does the client have Neon / Vercel accounts, or should they be created?
- The brief names Neon and the deployment targets, but no accounts or project details were supplied. The user (Malik Shahzad) already has a Vercel Hobby account (live, 2026-11-09) and a GitHub account (`smith14580-glitch`), but whether those are the accounts for this client project is unknown.
- **Recommended default:** use the client's own accounts for anything the client will own (Neon project, Vercel project, GitHub repo, Render account, Play developer account). Create them in the client's name in Phase 6, with the client present.
- **Blocks:** deployment (Phase 6). Does not block Phases 2–5 (local + Neon dev branch are enough).
- **Needs client confirmation:** yes.

### Q10. Is GitHub the repo for this project, and which repo?
- No repo was named for MARQUE ONE. The user's GitHub connection in Muse is currently **disconnected** (checked 2026-11-09), so Muse cannot push code directly until it is reconnected and a repository is selected.
- **Recommended default:** one new private repo, e.g. `marque-one-management-system`, under the client's GitHub account. Reconnect GitHub in Muse before Phase 2 if the client wants Muse to push.
- **Blocks:** code handover and CI. Does not block writing the code locally.
- **Needs client confirmation:** yes.

### Q11. Are WhatsApp / email / SMS notifications wanted in v1, or later?
- The brief says email/SMS/WhatsApp are "optional for future development" and requires in-app notifications only.
- **Recommended default:** in-app notifications only in v1. No external messaging integration is built, quoted, or promised in v1.
- **Blocks:** nothing in v1. If the client says "WhatsApp in v1", that is a scope change — it needs a provider, a phone number, message templates, and cost, and it moves to a separate estimate.
- **Needs client confirmation:** yes (confirm "later" is acceptable).

### Q12. Is Urdu language needed, like the construction website, or English only?
- The construction-company preview built for the same user has an EN/اردو toggle because constructors in Pakistan prefer Urdu. The MARQUE ONE brief says nothing about language. The staff who will use the mobile attendance screens may or may not read English comfortably.
- **Recommended default:** English only in v1. Urdu is a Phase 5+ addition if the client asks — it is a translation layer across every screen, not a one-line change, and must not be assumed.
- **Blocks:** nothing in v1. Deciding late is expensive, so ask early.
- **Needs client confirmation:** yes.

### Q13. Can two customers share one phone number, or is phone unique per customer?
- The brief does not say. Families often share a phone number; businesses often treat the phone as the customer key.
- **Recommended default:** phone is the customer key (one customer row per phone; a booking for an existing phone links to that customer). If the client says families share numbers, the uniqueness moves from `phone` to `phone + full_name`.
- **Blocks:** the customer-creation logic in the booking flow (§6.2).
- **Needs client confirmation:** yes.

### Q14. What event types exist besides weddings?
- The brief lists "wedding event type" but does not enumerate the types (Barat, Walima, Mehndi, Engagement, etc.).
- **Recommended default:** `Wedding`, `Barat`, `Walima`, `Mehndi`, `Engagement`, `Nikkah`, `Other` as the v1 list, stored as a configurable list in Phase 3 if the client wants to edit it.
- **Blocks:** the booking-form event-type dropdown.
- **Needs client confirmation:** yes (low priority — the default is safe to build with).

### Q15. Are there reception staff who need manager-lite access, or is it strictly manager vs staff/waiter?
- The brief defines three roles but mentions "reception staff" as users of the system.
- **Recommended default:** reception staff use the `staff` role (mobile UI) unless the client says they should create bookings — in which case a fourth role (`receptionist`: can create/view bookings and customers, but cannot see pricing settings, void payments, or manage employees) must be defined before Phase 3. Do not grant receptionists manager access by default.
- **Blocks:** the RBAC matrix for Phase 3 if receptionists need booking access.
- **Needs client confirmation:** yes.

### Other risks (not questions — things that can go wrong)

| Risk | Impact | Mitigation |
|---|---|---|
| Double booking under load (two managers, same slot) | A wedding is double-booked — the worst failure in this system | Partial unique index + transaction + concurrency test (§3.16, §10.2) |
| Manager forgets to record a payment | Balance shown is wrong; customer disputes | Payment history is always visible on the booking; outstanding report is one click away; no silent edits |
| Staff share one phone / one login | Attendance becomes meaningless | One account per employee; manager creates accounts; logins are by personal phone number |
| Neon free-tier limits (connections, storage) | App slows or fails as data grows | Use Neon's pooled connection string; keep queries indexed; monitor usage in Phase 6 |
| Render free tier sleeps (cold starts) | First request after idle is slow (~30–60s) | Tell the client plainly in Phase 6; a paid Render instance removes it. Do not hide this. |
| APK built on the wrong machine | APK does not install or cannot reach the API | Build only on a machine with Android Studio or in CI; test on a real phone against production (§8.4) |
| Scope creep (WhatsApp, GPS, selfie, Play Store in v1) | Phases slip, quality drops | Every addition goes through §12/§13 as a decision with a phase attached. "Later" is a valid answer. |

---

## 13. Decisions Log

One-page table. **Status** is either `Confirmed` (the client said so in the brief) or `Assumed default` (our recommendation — needs client confirmation per §12). Nothing here may be treated as a client fact unless its status is `Confirmed`.

| # | Decision | Choice | Reason | Status |
|---|---|---|---|---|
| D1 | Frontend stack | Next.js + TypeScript + Tailwind + Shadcn + React Hook Form + Zod | Required by the brief; one codebase for desktop, mobile, PWA | Confirmed |
| D2 | Backend stack | FastAPI + REST + JWT + SQLAlchemy + Alembic | Required by the brief | Confirmed |
| D3 | Database | PostgreSQL on Neon | Required by the brief | Confirmed |
| D4 | Mobile approach | PWA first; Capacitor APK wraps the same web app | One codebase, one API; required by the brief | Confirmed |
| D5 | Number of halls (v1) | Exactly 1 hall: MARQUE ONE | The brief names one hall; schema supports more later | Assumed default (§12 Q1) |
| D6 | Night price | PKR 300,000 per event | Stated in the brief | Confirmed |
| D7 | Day price | PKR 150,000 per event | Stated in the brief **as subject to client confirmation** | Assumed default (§12 Q2) |
| D8 | Advance | 50% of total, editable per booking | Brief gives the 50% example; editability is our recommendation | Assumed default (§12 Q6) |
| D9 | Payment status | Derived from `amount_paid` vs `total_price`; never set by hand | Required by the brief ("never auto-mark fully paid unless payments cover the full amount") | Confirmed |
| D10 | Booking conflict rule | At most one `pending`/`confirmed` booking per hall/date/slot; enforced by partial unique index + transaction | Required by the brief ("database/backend level, concurrency-safe"); pending blocks by our choice (see §3.16) | Confirmed (rule) / Assumed default (pending blocks) |
| D11 | Slot times | Day 12:00–16:00, Night 19:00–23:00 | Not in the brief; common marquee timings; stored in settings | Assumed default (§12 Q3) |
| D12 | Hall capacity | No number invented; manager must enter it in Settings | Not in the brief; inventing capacity would be a false fact | Assumed default (§12 Q4) |
| D13 | Payment methods | Cash, Bank Transfer, JazzCash, EasyPaisa, Cheque, Other | Not in the brief; covers the common Pakistani methods | Assumed default (§12 Q5) |
| D14 | Late rule | Duty start 09:00, 15-min grace, late after 09:15 | Not in the brief; needed for the late report to work at all | Assumed default (§12 Q7) |
| D15 | Working hours | `check_out − check_in`, in minutes, shown as hours + minutes | Directly follows from the brief's "working hours calculation" | Confirmed |
| D16 | Cancellation | Frees the slot; payments stay recorded; reason required; no refunds in v1 | Follows from the brief; refunds were never mentioned | Confirmed (a–d) / Assumed default (no refunds in v1) |
| D17 | Roles | 3 roles: super_admin, staff, waiter | Required by the brief | Confirmed |
| D18 | RBAC enforcement | Backend dependency on every route; frontend hiding is UX only | Required by the brief ("enforce on the backend, not just by hiding") | Confirmed |
| D19 | JWT lifetimes | Access 15 min, refresh 7 days with rotation | Standard practice; not in the brief | Assumed default |
| D20 | Password hashing | bcrypt (cost 12) or argon2id; min 8 chars, letter + number | Not in the brief; standard practice | Assumed default |
| D21 | Notifications | In-app only in v1; email/SMS/WhatsApp are future | Brief says external messaging is optional/future | Confirmed |
| D22 | GPS / selfie attendance | Optional, NOT in v1 | Brief says optional, not mandatory for v1 | Confirmed |
| D23 | Language | English only in v1; Urdu is a future option | Brief is silent; the construction site's Urdu toggle is not evidence for this client | Assumed default (§12 Q12) |
| D24 | Sync | REST + refetch-on-focus in v1; no WebSockets | Brief asks for "real-time or near real-time"; polling meets it for this scale | Assumed default |
| D25 | Deployment | Frontend Vercel; backend Render (Railway/Fly as alternative); Neon DB | Brief requires Vercel/Neon by implication (stack); Render is our recommendation | Assumed default (§9) |
| D26 | APK build | Capacitor config prepared here; APK built on a machine with Android Studio or in CI — **not** on this Linux VM | Physical constraint (no Android SDK on this VM); see §8.4 | Confirmed (constraint) |
| D27 | Customer identity | Phone number is the customer key | Not in the brief; the simplest rule that matches "search by phone" | Assumed default (§12 Q13) |
| D28 | Receipts | One receipt number per payment; voided receipts stay in history | Follows from "record every payment separately" + auditability | Confirmed |
| D29 | Sample data | Seed data for dev/staging only; production starts empty (except roles, admin, hall, settings) | Standard practice; prevents fake data in production | Assumed default |
| D30 | PWA offline | App shell cached; API never cached; offline fallback page; no offline attendance queue in v1 | Brief requires offline fallback; offline queueing was never required | Confirmed (fallback) / Assumed default (no queue) |

---

## Appendix A — Glossary

| Term | Meaning in this system |
|---|---|
| Slot | `day` or `night` — the two bookable periods of one date. They are independent: a day booking and a night booking can exist on the same date. |
| Active booking | A booking with status `pending` or `confirmed`. Only active bookings block a date/slot. |
| Advance | The agreed first payment for a booking (default 50% of total). It is an amount the manager and customer agree, not a separate payment row — the actual money is recorded as payment rows. |
| Balance | `total_price − amount_paid`. What the customer still owes. |
| Receipt | The printable record of one payment (receipt number, date, amount, method, reference, booking code, customer name). |
| Check-in / Check-out | Staff attendance timestamps. Check-in marks the employee present; check-out closes the working day and computes working minutes. |
| RBAC | Role-Based Access Control — what a user may do is decided by their role, enforced on the backend. |
| PWA | Progressive Web App — the website installed on a phone like an app, with an icon, standalone display, and offline fallback. |
| Capacitor | A tool that wraps the web app in a native Android shell so it can be installed as an APK. |

## Appendix B — What Phase 2 Needs on Day One

1. Answers to §12, Q1–Q9 at minimum (hall count, day price, slot times, capacity, payment methods, advance rule, duty-start time, first admin, accounts). Q10–Q15 can follow, but Q2, Q3, Q4, and Q7 should be answered before the booking form and attendance screens are built.
2. A GitHub repo (or a decision to keep the code local until Phase 6) — see §12, Q10.
3. A Neon project (dev branch) — or agreement to use local Postgres for Phase 2 and Neon from Phase 3.
4. Confirmation that the decisions marked `Assumed default` in §13 are acceptable, or corrections to them.

---

*End of Phase 1 Architecture. No application code has been written. The next step is Phase 2 (Foundation), starting from §11 — after the client answers §12.*
