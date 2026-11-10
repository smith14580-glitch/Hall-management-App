# MARQUE ONE — Hall Management App (Frontend)

Next.js 16 + TypeScript + Tailwind + Shadcn UI frontend for the MARQUE ONE Marriage Hall Management System.

- Backend repo: `smith14580-glitch/Hall-management-App-Backend` (FastAPI on Vercel/Render)
- Database: PostgreSQL on Neon

## Features

- Login (JWT) — manager / staff / waiter
- Dashboard, Bookings (list/new/detail), Customers, Payments (outstanding), Tables, Employees, Attendance, Settings
- EN / اردو language toggle with RTL support

## Run locally

```bash
npm install
cp .env.local.example .env.local   # set NEXT_PUBLIC_API_URL to your backend URL
npm run dev
```

## Deploy on Vercel

- Root Directory: leave empty (repo root **is** the app)
- Environment Variable: `NEXT_PUBLIC_API_URL` = your deployed backend URL (e.g. `https://hall-management-app-backend.vercel.app`)
- Build command: default (`next build`)

## Env vars

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend base URL (no trailing slash), e.g. `https://xxx.vercel.app` |
| `NEXT_PUBLIC_APP_NAME` | Display name, default `MARQUE ONE` |
