# Customer Feedback Portal

Collect customer satisfaction feedback with shareable survey links. Built for the fastest possible ship on **Vercel + Neon Postgres + Neon Auth**.

## What you get

- Admin sign-up / sign-in via **Neon Auth** (email OTP built in)
- Create 1–5 rating surveys with optional comments
- Public customer link at `/survey/[slug]` (no login required)
- Dashboard to copy links and review responses

## Neon configuration (via MCP)

This project is linked to Neon project **afenda**:

| Setting | Value |
|---------|-------|
| Project ID | `snowy-dawn-60990429` |
| Branch | `production` (`br-young-term-aobkvd38`) |
| Database | `neondb` |

Local env is in `.env` (gitignored). Project metadata is in `.neon`.

**Trusted domains:** `http://localhost:3000` and `https://iam-check.vercel.app`. Custom domains removed; add more Vercel preview URLs in Neon Console → Auth when needed.

## GitHub

Repository: https://github.com/pohlai88/iam-check

Pushes to `main` auto-deploy via Vercel Git integration.

## Vercel

| | |
|---|---|
| **Project** | `iam-check` |
| **Production URL** | https://iam-check.vercel.app |
| **Dashboard** | https://vercel.com/jacks-projects-7b3cfe94/iam-check |

Env vars (`DATABASE_URL`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`) are set in Vercel for production and development.

## Neon configuration (via MCP)

### 1. Deploy to Vercel (one click)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fneondatabase%2Fvercel-marketplace-neon-auth%2Ftree%2Fmain&project-name=client-feedback-portal&repository-name=client-feedback-portal&products=[{%22type%22:%22integration%22,%22integrationSlug%22:%22neon%22,%22productSlug%22:%22neon%22,%22protocol%22:%22storage%22}])

**Important:** check the **Auth** checkbox when creating the project so Neon Auth is enabled.

Or push this repo to GitHub and import it in Vercel with the **Neon** integration + **Auth** enabled.

### 2. Add one env var in Vercel

Vercel + Neon auto-set `DATABASE_URL` and `NEON_AUTH_BASE_URL`.

You only add:

```bash
openssl rand -base64 32
```

Set `NEON_AUTH_COOKIE_SECRET` in Vercel → Settings → Environment Variables (Production + Preview + Development).

### 3. Add your domain to Neon Auth trusted domains

In [Neon Console](https://console.neon.tech/) → your project → **Auth** → **Trusted domains**, add:

- `https://your-app.vercel.app`
- `http://localhost:3000` (for local dev)

Redeploy if needed. Done.

## Local development

```bash
npm install
cp .env.example .env
```

Fill `.env` from Neon Console (or run `vercel env pull` after linking):

```env
DATABASE_URL=postgresql://...
NEON_AUTH_BASE_URL=https://ep-xxx.neonauth.../neondb/auth
NEON_AUTH_COOKIE_SECRET=<openssl rand -base64 32>
```

```bash
npm run dev
```

Open http://localhost:3000 → sign up → `/dashboard` → create a survey → share `/survey/[slug]`.

Survey tables are created automatically on first use.

## App routes

| Route | Who | Purpose |
|-------|-----|---------|
| `/` | Public | Landing page |
| `/auth/sign-in` | Public | Neon Auth sign in |
| `/auth/sign-up` | Public | Neon Auth sign up |
| `/dashboard` | Admin | Create surveys, copy links |
| `/dashboard/[id]` | Admin | View responses |
| `/survey/[slug]` | Customer | Submit feedback (anonymous) |

## Stack

- [Next.js](https://nextjs.org/) on Vercel
- [Neon Postgres](https://neon.tech/)
- [Neon Auth](https://neon.com/docs/auth/overview)
- Based on [neondatabase/vercel-marketplace-neon-auth](https://github.com/neondatabase/vercel-marketplace-neon-auth)

## Why this stack

- **Neon via Vercel Marketplace** — database + auth wired in one flow
- **No Docker** — unlike Formbricks
- **No MongoDB** — Postgres only
- **Minimal code** — survey schema + 4 pages on top of the official Neon template
