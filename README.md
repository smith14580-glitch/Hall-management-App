# MARQUE ONE — Marriage Hall Management System

## What this folder is

This folder holds **Phase 1 only**: the technical architecture for the MARQUE ONE
Marriage Hall Management System.

- `ARCHITECTURE.md` — the complete Phase 1 technical architecture document.
  System overview, monorepo layout, full PostgreSQL schema (including the
  booking-conflict safeguard), the complete REST API list, auth + RBAC matrix,
  core business rules, frontend route maps, PWA + Capacitor plan, deployment
  plan, testing plan, phase plan with exit criteria, risks + open questions,
  and a decisions log.
- `README.md` — this file.

## What this folder is NOT

**No application code exists yet.** There is no Next.js app, no FastAPI app,
no database, no migrations, and no APK in this folder. That is deliberate:
the client brief says to analyse first and not rush into coding.

Phase 2 (Foundation) starts from `ARCHITECTURE.md` §11 — after the client
answers the open questions in §12.

## Status

- Phase 1: complete (2026-11-10).
- Phase 2: not started.
- Open questions that most block Phase 2: day price confirmation (PKR 150,000),
  Day/Night slot times, hall capacity (guests/tables), first manager account
  details, and Neon/Vercel account ownership. See `ARCHITECTURE.md` §12.
