# MARQUE ONE — Frontend (Next.js)

The real frontend for the MARQUE ONE Marriage Hall Management System.
This replaces the old create-next-app scaffold whose home page was still the
default Next.js starter template.

Built from `../ARCHITECTURE.md` (Phase 1). Frontend only — no backend code
here. All data comes from the FastAPI backend over REST.

## Stack

Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + lucide-react +
react-hook-form + zod. No shadcn — plain Tailwind components with a premium
dark-charcoal / gold design system.

## How to run

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # production build
npm run start   # serve the production build
npm run lint
```

## Environment variables

Copy `.env.local.example` to `.env.local` and fill in real values.

| Variable | Meaning |
|---|---|
| `NEXT_PUBLIC_API_URL` | FastAPI backend base URL, no trailing slash. Local: `http://localhost:8000`. Production: the backend's public URL, e.g. `https://hall-management-app-backend.vercel.app` |
| `NEXT_PUBLIC_APP_NAME` | `MARQUE ONE` |
| `NEXT_PUBLIC_USE_SAMPLE_DATA` | `false` (default). Set to `true` ONLY to preview the UI without a backend — every page then shows a visible "SAMPLE DATA — demo only" banner. Never `true` in production. |

## Demo mode (sample data)

When `NEXT_PUBLIC_USE_SAMPLE_DATA=true`, login works **without any backend**:

- **Demo login: phone `03000000000`, password `demo1234`** (shown on the login page too).
- A "Demo dekhein — bina login ke" button on the login page opens the dashboard directly.
- Every page shows a "SAMPLE DATA — demo only" banner; nothing is real data.

## Replacing the broken scaffold in the user's repo

The user's repo (`hall-management-app` on Vercel) currently deploys a
create-next-app template. To replace it:

1. In the repo, delete the old `frontend/` folder contents (or the whole
   folder if the repo root IS the frontend — check where `package.json` is).
2. Copy this `frontend/` folder into the repo in its place.
3. Commit and push. Vercel redeploys automatically.
4. **Vercel Root Directory must be `frontend`** (Settings → General → Root
   Directory). Without it Vercel reports "No Next.js version detected"
   because the repo root has no `package.json`.
5. In Vercel → Project → Settings → Environment Variables, set
   `NEXT_PUBLIC_API_URL` to the real backend URL and redeploy. Until it is
   set, every page shows an honest "Backend se connect nahi ho raha" error —
   that is by design, not a bug.

## Backend note (important)

This frontend only needs the API URL. **FastAPI is not Vercel-native**, but
the backend repo (`Hall-management-App-Backend`) now ships a **Mangum
serverless adapter** (`api/index.py` + `vercel.json` rewrites), so it CAN be
deployed on Vercel. Render (per ARCHITECTURE.md §9) remains the recommended
long-term host — Vercel Python functions have cold starts and 60s limits.

- On Vercel: set env vars `DATABASE_URL` (Neon pooled), `JWT_SECRET_KEY`,
  `JWT_REFRESH_SECRET_KEY`, `CORS_ORIGINS` (must include the frontend
  origin `https://hall-management-app.vercel.app`), `FIRST_ADMIN_*`.
- Run Alembic migrations + seed from your PC against Neon (Vercel cannot
  run them).
- Verify: `/docs` shows Swagger UI with all endpoints, `/openapi.json`
  returns 200, `POST /api/v1/auth/login` works with the seeded manager.
- Then set `NEXT_PUBLIC_API_URL` here to the backend URL and redeploy.

## Pages

- `/login` — phone + password, JWT login, redirects by role.
- `/` — Manager dashboard (stats, revenue chart, recent + upcoming bookings).
- `/bookings`, `/bookings/new`, `/bookings/[id]` — list, create (live pricing
  + duplicate-slot warning), detail with payments, receipt, status actions,
  table allocation.
- `/calendar` — month view, Day/Night slot pills, click a date for bookings.
- `/customers`, `/customers/[id]` — list, detail with history + totals.
- `/payments` — outstanding balances, payment history, receipt print.
- `/tables` — add/edit/activate/deactivate, capacity display.
- `/employees` — add/deactivate employees (manager only).
- `/attendance` — staff mobile check-in/out (big buttons, live clock) and
  manager view (today, monthly history, mark attendance).
- `/reports` — bookings/revenue/outstanding/attendance with CSV export.
- `/settings` — hall pricing, advance %, slot timings, duty rules, capacity.

Staff and waiter roles see only Attendance in the sidebar — financial pages
are hidden AND refused by the backend (RBAC is enforced server-side;
hiding buttons is UX only).

## Language

EN / اردو toggle in the top bar (Urdu script + RTL, choice persisted).
The architecture doc (§7.3, D23) said English-only v1, but the user asked
for the toggle, so it is implemented. Data values (names, amounts) are
never translated — only UI labels.

## Defaults used (from ARCHITECTURE.md §12/§13 — all need client confirmation)

- Night PKR 300,000 (confirmed), Day PKR 150,000 (**unconfirmed**).
- Advance 50% of total, editable per booking.
- Slot times Day 12:00–16:00, Night 19:00–23:00.
- Duty start 09:00, late after 09:15 (15-min grace).
- Payment methods: Cash, Bank Transfer, JazzCash, EasyPaisa, Cheque, Other.
- Event types: Wedding, Barat, Walima, Mehndi, Engagement, Nikkah, Other.
- Hall capacity: **no number invented** — the manager must enter it in
  Settings before table allocation can be enforced.

## What still needs the real backend

- A running FastAPI backend + Neon database (see `ARCHITECTURE.md` §9).
- `NEXT_PUBLIC_API_URL` set in Vercel to the real backend URL.
- The first manager account (name/phone) — created by the backend seed
  script, not by this frontend.
- Real hall capacity, confirmed Day price, slot times — enter in Settings
  once the client confirms them.

## What this frontend does NOT do

- No backend, no database, no direct Neon access.
- No fake data in production mode: with no backend reachable, pages show
  an honest connection error with a retry button.
- No APK build (needs Android Studio / CI — see ARCHITECTURE.md §8.4).
