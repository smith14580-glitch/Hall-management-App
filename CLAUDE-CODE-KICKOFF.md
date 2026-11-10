# MARQUE ONE — Claude Code Kickoff (Phase 2)

Claude Code is the right tool for this project: it reads files, writes code,
runs terminal commands (npm install, migrations, builds, tests) and fixes its
own errors. This file tells you exactly what to give it and what to paste.

## 0. Before you start Claude Code — you must have these

- [ ] A GitHub repo for this project (empty is fine). Clone it to your PC.
- [ ] This file + `ARCHITECTURE.md` copied into the repo root.
- [ ] A Neon PostgreSQL project created at neon.tech (free tier is enough
      to start). Copy its pooled `DATABASE_URL` — you will paste it into a
      local `.env` file, never into chat and never into the repo.
- [ ] Answers to the blocking questions in `ARCHITECTURE.md` §12 if you can.
      At minimum: Day price confirmed or not, Day/Night slot times, hall
      capacity (max guests + total tables), first manager name + phone.
      Anything unanswered: Claude Code must use the recommended defaults in
      the decisions log (§13) and mark them as defaults, not invent facts.

## 1. Start Claude Code

```bash
git clone https://github.com/<your-username>/<repo-name>.git
cd <repo-name>
# copy ARCHITECTURE.md and this file into this folder
claude
```

## 2. Paste this exact prompt into Claude Code (Phase 2 only)

> Read ARCHITECTURE.md in this repo and implement Phase 2 — Foundation
> only. Do not start Phase 3.
> >
> Build: the monorepo layout from §2 (frontend/ Next.js + TypeScript +
> Tailwind + Shadcn UI, backend/ FastAPI + SQLAlchemy + Alembic), the
> database schema from §3 with Alembic migrations, JWT auth (access token
> 15 minutes + refresh token) and role-based access control from §5, and
> the design system from the architecture. Seed data: one hall MARQUE ONE
> with Night PKR 300,000 and Day PKR 150,000 (Day price is UNCONFIRMED —
> keep it configurable in application\_settings, do not hardcode it as
> final), and the roles manager / staff / waiter.
> >
> Rules: never invent client facts. Where §12 has an unanswered question,
> use the recommended default from the decisions log (§13) and list every
> default you used at the end. No fake data, no placeholder buttons, no
> secrets in frontend code. Env vars come from a local `.env` file that
> you must never commit — create `.env.example` with names only.
> >
> When done, run the backend tests, `npm run build` for the frontend, and
> the migration against the Neon database, fix all errors, then report:
> what was built, which defaults you used, and what is still needed
> before Phase 3.

## 3. Environment variables Claude Code will need

Create `backend/.env` (local only, never commit) and `frontend/.env.local`:

| Variable | Where it comes from |
| --- | --- |
| `DATABASE_URL` | Neon project → pooled connection string |
| `JWT_SECRET_KEY` | Generate a long random string (Claude Code can generate one) |
| `CORS_ORIGINS` | `http://localhost:3000` for dev; production URL later |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` for dev; backend URL later |
| `NEXT_PUBLIC_APP_NAME` | `MARQUE ONE` |
| `FIRST_ADMIN_NAME`, `FIRST_ADMIN_PHONE`, `FIRST_ADMIN_PASSWORD` | You decide — first manager account, set at deploy/seed time |

## 4. What Claude Code CAN do here

- Scaffold frontend + backend, write all Phase 2 code, run installs,
  migrations, builds and tests, and fix errors itself.
- Work phase by phase: give it one phase at a time (Phase 3 prompt is
  the same pattern — "implement Phase 3 from ARCHITECTURE.md §… only").
- Commit to git when you tell it to (`git add`, `git commit`, `git push`
  work from your PC because your Git Credential Manager is connected).

## 5. What Claude Code CANNOT do (you must do these)

- Create Neon, Vercel or Render accounts, or create the GitHub repo.
- Generate the Android APK — that needs Android Studio / Android SDK on
  a build machine or CI (see ARCHITECTURE.md §8).
- Test on a real phone, or confirm real business rules with the client.
- Deploy to production by itself — it can prepare the deploy, you click
  Deploy / approve it in Vercel and Render.

## 6. After Phase 2 — quick checks before Phase 3

- [ ] `npm run build` passes, backend tests pass.
- [ ] Login works as manager and as staff; staff cannot open any
      manager-only API route (Claude Code must test the negative case).
- [ ] Migration runs cleanly against Neon; tables exist as per §3.
- [ ] No secret appears in the repo (`git grep JWT_SECRET_KEY` etc.).
- [ ] Phase 2 defaults list reviewed — confirm or correct them with the
      client before Phase 3.