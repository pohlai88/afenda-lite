# Fumadocs Framework Mode — Deploying (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/deploying.md` |
| Authority | **Scratch** — upstream [Deploying](https://fumadocs.dev/docs/deploying) · disk `@afenda/docs` |
| Status | **Active** — Framework Mode on Next.js · Vercel Node host target · product Deploy stays `@afenda/web` |
| Audience | Engineers hosting or auditing the official docs app |
| Updated | 2026-07-19 |

Upstream: Fumadocs is powered by the underlying React framework — follow that framework’s deploy guide. Lite locks **Next.js Framework Mode** on **Node** (not Edge), with Vercel as the configured host target for `@afenda/docs`.

Framework Mode shell: [next.md](next.md). Gates: [automation.md](automation.md). Product launch pack: [`../deploy/README.md`](../deploy/README.md) (`@afenda/web` only).

---

## Lite lock (configured)

| Decision | Disk / ops |
|----------|------------|
| Framework = Next.js (not RR / TanStack / Waku) | [`apps/docs/package.json`](../../apps/docs/package.json) · [next.md](next.md) |
| Host target = Vercel Node (region `sin1`) | [`apps/docs/vercel.json`](../../apps/docs/vercel.json) |
| Fumadocs MDX config present for builds | `source.config.ts` + `next.config.mjs` (createMDX) in app root |
| Runtime = Node — **not** Edge | No `export const runtime = "edge"` under `apps/docs` |
| Search = Orama route handler | `app/api/search/route.ts` — needs a Node server (not CDN-only SPA) |
| LLM text routes | `/llms.txt` · `/llms-full.txt` · `/docs/*.md` — [llms.md](llms.md) |
| Feedback = Server Actions | optional `GITHUB_APP_*` via `@afenda/env/docs` (root `.env.local` via `loadEnvConfig`) — never product Neon secrets |
| Product Deploy workflow | [`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml) builds **`@afenda/web` only** |
| Docs ≠ second product SSOT | Separate Vercel **docs** project when published — never reuse product `VERCEL_PROJECT_ID` / Neon secrets |

Wire test enforces: `vercel.json` filter + build commands, no Edge runtime, no `output: "export"` / `output: "standalone"` on baseline `next.config.mjs`, no Cloudflare/OpenNext deps, no Dockerfile until Docker reopen.

---

## Upstream map → Lite

| Upstream | Lite |
|----------|------|
| [Next.js deploying](https://nextjs.org/docs/app/getting-started/deploying) | **Baseline** — Vercel + Node via `apps/docs/vercel.json` |
| React Router / TanStack Start / Waku | Outside Lite — Framework Mode is Next.js only |
| [Static Build](https://fumadocs.dev/docs/deploying/static) | **Outside baseline** — see below |
| Next.js + Cloudflare (OpenNext) | **Outside baseline** — Fumadocs does not work on Edge runtime |
| Next.js + Docker (+ MDX `source.config.ts` in WORKDIR) | **Outside baseline** — monorepo Docker reopen required |

---

## Vercel (baseline)

### App config

```json
// apps/docs/vercel.json
{
  "framework": "nextjs",
  "regions": ["sin1"],
  "installCommand": "cd ../.. && corepack enable && pnpm install --frozen-lockfile",
  "buildCommand": "cd ../.. && pnpm exec turbo run build --filter=@afenda/docs",
  "ignoreCommand": "bash -c '[[ \"$VERCEL_ENV\" == \"production\" ]] && exit 0 || exit 1'"
}
```

| Setting | Why |
|---------|-----|
| Root Directory | `apps/docs` on the **docs** Vercel project |
| Install / build from monorepo root | Matches `@afenda/web` · needs workspace lockfile + Turbo |
| `ignoreCommand` production skip | Git push must not auto-promote docs prod — explicit promote (CLI or future Docs Deploy workflow) |
| Region `sin1` | Align with product / Neon APSE1 — [../deploy/README.md](../deploy/README.md) |

`prebuild` on `@afenda/docs` already runs `generate:source` + `generate:openapi-docs`. OAS YAML must exist at [`../api/OPEN-001-openapi.yaml`](../api/OPEN-001-openapi.yaml) in the checkout (committed SSOT).

### Project split (must)

| Project | Root | Secrets |
|---------|------|---------|
| Product `afenda-lite` | `apps/web` | Neon Auth · `DATABASE_URL` · `APP_URL` · … |
| Docs `afenda-lite-docs` | `apps/docs` | `DOCS_URL` · `VERCEL_DEEP_CLONE=true` · `GITHUB_APP_ID` · `GITHUB_APP_PRIVATE_KEY` — **no** Neon / `CRON_SECRET` / product `APP_URL` |

Do **not** point the product Deploy workflow at `@afenda/docs`. Do **not** attach product secrets to the docs project ([README.md](README.md) rule 1).

### Local / smoke before promote

```bash
pnpm --filter @afenda/docs test
pnpm --filter @afenda/docs typecheck
pnpm --filter @afenda/docs build
pnpm --filter @afenda/docs start   # :3001
```

Host (configured): Vercel project **`afenda-lite-docs`** · Root Directory `apps/docs` · production origin `https://afenda-lite-docs.vercel.app` · Agent link `apps/docs/.vercel` (gitignored). Prefer **Git-based** deploys so `VERCEL_DEEP_CLONE=true` supplies history for RSS `lastModified` (CLI file upload has no `.git`).

**Promote (explicit — `ignoreCommand` cancels Production-target Git builds):**

```bash
# 1) Git preview build of the SHA (omit target=production)
# 2) After Ready + smoke, point the prod alias at that deployment:
vercel alias set <ready-deployment-url> afenda-lite-docs.vercel.app --scope jacks-projects-7b3cfe94
```

Do **not** use `vercel promote` / API `target: "production"` for this project — those re-enter the ignore step and cancel. Product `deploy.yml` stays `@afenda/web` only.

---

## Outside baseline / reference only

### Static Build (`output: 'export'`)

Upstream can emit a CDN-only site after Orama static search config. Lite keeps **server-first** because:

- Search uses `createFromSource` route handler
- Feedback uses Server Actions + GitHub App
- OpenAPI preload path assumes the Framework Mode RSC shell

Do **not** set `output: "export"` without a named Docs static-export reopen + Scratch update (static Orama + feedback disposition).

### Next.js + Cloudflare

Upstream: use [OpenNext Cloudflare](https://opennext.js.org/cloudflare); Fumadocs does **not** work on Edge runtime. Lite has no OpenNext / Cloudflare adapter under `apps/docs`.

### Next.js + Docker

Upstream requires `source.config.ts` and `next.config.*` in the image WORKDIR so Fumadocs MDX can read config during `next build`, and typically `output: "standalone"` for the runner stage.

Lite is a **pnpm Turborepo**: a single-app Next.js Dockerfile is not enough. Docker reopen must cover:

1. Monorepo `COPY` of root lockfile / workspace packages `@afenda/config` · `@afenda/env`
2. `apps/docs/source.config.ts` + `apps/docs/next.config.mjs` available at build
3. Explicit `output: "standalone"` on docs `next.config` only for that reopen (not baseline Vercel)
4. No product Neon secrets in the docs image

Until then: no `Dockerfile` under `apps/docs`.

---

## Env (docs host)

| Key | Role |
|-----|------|
| `DOCS_URL` | Public docs origin for Next `metadataBase` / OG / RSS absolute links — default `http://localhost:3001`; set https origin on the docs Vercel project ([og-next.md](og-next.md) · [rss.md](rss.md)) |
| `VERCEL_DEEP_CLONE` | **Required on docs Vercel** — set `true` so fumadocs-mdx `lastModified` (git) can resolve RSS item dates — [rss.md](rss.md) |
| `GITHUB_APP_ID` · `GITHUB_APP_PRIVATE_KEY` | Optional at boot — required on feedback submit ([feedback.md](feedback.md)) · ops opened |
| Never | `DATABASE_URL` · Neon Auth · `CRON_SECRET` · product `APP_URL` as docs secret store / `metadataBase` |

Schema: `import { docsEnv } from '@afenda/env/docs'`. `VERCEL_DEEP_CLONE` is a Vercel platform clone flag (not in `@afenda/env/docs`).

---

## Hard stops / Why

| Stop | Why |
|------|-----|
| Deploy docs via product `deploy.yml` / product `VERCEL_PROJECT_ID` | Docs ≠ product runtime SSOT |
| Edge runtime / Cloudflare Workers without reopen | Upstream: Fumadocs incompatible with Edge |
| `output: "export"` without static reopen | Breaks search route + feedback actions |
| Product secrets on docs project | [README.md](README.md) rule 1 |
| Invent Docker standalone as baseline | Changes Vercel output shape; monorepo image unproven |

---

## Verify

```text
1. Test-Path apps/docs/vercel.json · source.config.ts · next.config.mjs
2. Grep apps/docs: no runtime = "edge" · no @opennextjs/cloudflare · no Dockerfile
3. next.config.mjs: createMDX · no output: "export" · no output: "standalone"
4. vercel.json: filter=@afenda/docs · regions sin1 · ignoreCommand production skip
5. pnpm --filter @afenda/docs test -- docs-openapi-wire · typecheck · build
```

Companion: [next.md](next.md) · [automation.md](automation.md) · [`../deploy/README.md`](../deploy/README.md) · [README.md](README.md).
