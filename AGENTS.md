# Agent instructions — Afenda-Lite

**Product:** **Afenda-Lite** — beta edition of the Afenda family (multi-module SaaS). **Afenda-Elite** is the battle-proven edition: same documentation control and similar infrastructure aliasing — not a parallel product stack or a second docs tree.
**Retired product name:** Client Declaration Portal — compulsory; see [deprecation register](.cursor/skills/agent-skills/skills/deprecation-and-migration/reference.md).

**Authoritative documentation:** [docs/README.md](docs/README.md) under `docs/` only. Control: [DOC-001](docs/_control/DOC-001-documentation-control-standard.md) (approved shared Lite/Elite standard) · [DOC-002](docs/_control/DOC-002-documentation-register.md) · [DOC-003](docs/_control/DOC-003-controlled-document-template.md). Do **not** recreate `doc/`.

**Quality bar (sole):** **Enterprise production.** Do not propose, plan, or ship under a reduced-viability frame. Rule [`.cursor/rules/no-mvp-quality-bar.mdc`](.cursor/rules/no-mvp-quality-bar.mdc) · hook [`.cursor/hooks/no-mvp-quality-bar.mjs`](.cursor/hooks/no-mvp-quality-bar.mjs). Shrink scope with Approved slices / Module Enterprise Readiness evidence — never shrink quality.

**Repository layout:** [ARCH-022](docs/architecture/ARCH-022-system-overview.md) (Target system / monorepo tree) · [ARCH-017](docs/architecture/ARCH-017-frontend-folder-map.md) (frontend folder map — logical Living shape). ARCH-021 migration map archived. Hosting: GitHub `pohlai88/afenda-lite` · Vercel `afenda-lite` · `APP_URL=https://afenda-lite.vercel.app`.

### Checkout posture (Collapse · anti-contamination)

This checkout is **docs-first** after design-SSOT Collapse (`4680c91`). Repo-root product trees `app/`, `modules/`, `features/`, `components-V2/` and most Collapse-era ops scripts are **absent by design**.

| Rule | Detail |
|------|--------|
| **Forbidden** | Recovering those trees or wiped scripts from git (`f014807`, Collapse parents) — contamination ban |
| Authority | [ARCH-028 Anti-contamination lock](docs/architecture/ARCH-028-implementation-slices.md) · [deprecation register — Closed product phases](.cursor/skills/agent-skills/skills/deprecation-and-migration/reference.md) |
| Forward product code | Target greenfield only (`apps/web/**`, `packages/*`) after an **explicit** ARCH-028 implement request — never restore banned roots |
| Scripts | Many `package.json` scripts gate to `scripts/collapse-script-unavailable.mjs`. Docs-capable: `npm run checks` · `check:docs-naming` · `check:doc-integrity` · `check:module-quality` · `check:openapi` · `validate:neon-env` |

## Feed Farm Trade — Phase 2A closed · 2B–2D ADRs Accepted

**Product module (UI / shell):** Feed Farm Trade — agent skill [`.cursor/skills/feed-farm-trade`](.cursor/skills/feed-farm-trade/SKILL.md) · locks/architecture [FFT-MOD-001](docs/modules/feed-farm-trade/FFT-MOD-001-module-architecture.md) · roadmap [FFT-MOD-010](docs/modules/feed-farm-trade/FFT-MOD-010-module-docs-index.md).

**Agent entry (engine ops):** [docs/modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md](docs/modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md) · Index: [docs/modules/feed-farm-trade/FFT-MOD-010-module-docs-index.md](docs/modules/feed-farm-trade/FFT-MOD-010-module-docs-index.md)

| Authority | Doc |
|-----------|-----|
| Runtime / gates / checklists | [FFT-MOD-008](docs/modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md) |
| Module index | [FFT-MOD-010](docs/modules/feed-farm-trade/FFT-MOD-010-module-docs-index.md) |
| Auth / FFT RBAC | [FFT-MOD-005](docs/modules/feed-farm-trade/FFT-MOD-005-auth-tenancy-rbac.md) |
| API / adapters | [FFT-MOD-007](docs/modules/feed-farm-trade/FFT-MOD-007-api-and-adapters.md) |
| Locks / architecture | [FFT-MOD-001](docs/modules/feed-farm-trade/FFT-MOD-001-module-architecture.md) |
| Roadmap / readiness | [FFT-MOD-010](docs/modules/feed-farm-trade/FFT-MOD-010-module-docs-index.md) |

**Production state:** tag `fft-phase-2a` → `8e650ff`; `FFT_RBAC_ENABLED=true` on Vercel; DB branch `br-tiny-hill-ao82jp6f`. **2B–2D code blocked** until explicit program reopen + Approved slice group in [FFT-MOD-008](docs/modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md). No Feed Farm Trade commits mixed with unrelated refactors.

## Platform tenancy (hard cutover + multi-org ready)

**Decision / Living inventory:** [ARCH-023](docs/architecture/ARCH-023-multi-tenancy.md) — sole Living SSOT for platform IAM + multi-tenancy + Decision lock (supersedes ARCH-003).

| Fact | Detail |
|------|--------|
| Shipped | Hard `organization_id = $org`; migrations `027`/`028`; Users via `neon_auth.member`; FFT entry = platform `fft.access`; M1–M4 multi-org ready (logical) |
| Neon posture | Shared schema (not project-per-tenant); prod `DATABASE_URL` must be `-pooler`; RLS out of scope on BFF path — see [ARCH-023](docs/architecture/ARCH-023-multi-tenancy.md) Operational considerations |
| Neon Cloud | Org `org-fragrant-lake-90358173` (Launch) · project `young-hat-54755363` (**Afenda-Lite**) · branch `br-tiny-hill-ao82jp6f` protected |
| Recovery | PITR 7d (Launch max); daily snapshots; see [multi-org-ops](docs/runbooks/RB-001-multi-org-ops.md) |
| Env | `PORTAL_ORG_SLUG` / `PORTAL_ORG_NAME` / `PORTAL_ORG_SWITCHER_ENABLED`; do not confuse with `NEON_ORG_ID` (Neon Cloud) |
| Ops | Tenancy/ops npm scripts are **gated** on this docs-first checkout (Collapse ban). When a Target product tree exists: `audit:tenancy-nulls` · `check:tenancy-residue` · `backfill:fft-access` — skill ladder A–E [neon-tenancy-efficiency](.cursor/skills/neon-tenancy-efficiency/reference.md) |
| Cheat sheet | [docs/runbooks/RB-005-post-lock-coding-cheat-sheet.md](docs/runbooks/RB-005-post-lock-coding-cheat-sheet.md) — post-lock commands + Rejected/Deferred flash card |
| Decision lock | [ARCH-023 Decision lock](docs/architecture/ARCH-023-multi-tenancy.md) — Rejected R1–R7 / Deferred D4·D5; do not reopen without explicit user approval |
| Accepted constraints | **D4** FFT child denorm deferred (M5); **D5** shared-schema / not project-per-tenant |
| Anti-claim | Do **not** say multi-DB isolation (D5). `FFT_RBAC_ENABLED` ≠ soft SQL tenancy. Soft dual-mode / first-org stamp are **retired** — see deprecation register |

## Environment variables

### Source of truth (local dev)

Human-maintained files (gitignored):

| File | Contents |
|------|----------|
| `env.config` | Non-secrets: URLs, emails, feature flags, playground fixtures |
| `env.secret` | Credentials: `DATABASE_URL`, passwords, API keys |

Templates (committed): `env.config.example`, `env.secret.example`.

**Workflow (when env compose tooling exists on a Target checkout)**

1. Edit `env.config` and/or `env.secret`.
2. Run `npm run env:compose` → regenerates `.env` for Next.js and scripts.
3. Run `npm run dev`.

On **this docs-first checkout**, `env:compose` / `env:guard` / `dev` are **gated** (`collapse-script-unavailable`) until Target scaffold replaces them — do **not** restore Collapse-era compose scripts from git.

`.env` is **generated** when compose exists — do not edit it by hand.

**Do not use `.env.local` for this repo** when Living compose is active. Next.js loads `.env.local` after `.env` and overrides composed values. Vercel CLI (`vercel env pull`, `vercel integration add`) writes `.env.local` automatically — that reintroduces stale Supabase/SMTP keys and wrong `DATABASE_URL` for local Neon dev. Target S4.1 ([ARCH-027](docs/architecture/ARCH-027-env-model.md)) moves to `@afenda/env` + `.env.local` only after that slice ships.

| Command | Purpose |
|---------|---------|
| `npm run env:guard` | Fail if `.env.local` exists (lists key **names** only) — gated here until Target tooling |
| `npm run env:guard:fix` | Move `.env.local` → `.env.local.vercel-backup` — gated here until Target tooling |
| `npm run dev` | Gated on this checkout; Target product app lives under `apps/web` after ARCH-028 implement |

Optional ops keys (Checkly): add `CHECKLY_*` to `env.secret` only — never pull from Vercel into local files.

**Runtime env SSOT (when product code exists):** Target `@afenda/env` ([ARCH-027](docs/architecture/ARCH-027-env-model.md)). Do **not** recreate Collapse-era `lib/env/` or recover it from git. Logical Living maps may still mention `modules/platform/env/` as shape — physical home after implement is the Target package tree.
### Playground (`/playground`) — local developer UI review only

`PLAYGROUND_*` vars live in `env.config` for **local developer UI review** (iframe embeds of real routes). **Never sync them to Vercel production.** Production deployments must not expose `/playground`; the route is gated by `PLAYGROUND_ENABLED=true` which stays local-only.

**Not part of the client product**

- `/playground` is a **developer harness** — not a client entry point, not documented in client journeys, and not used in production.
- Client routes (`/`, `/client/login`, `/client/*`) are accessed **directly** by clients. Playground may iframe those URLs locally with `?embed=1` for layout review only.
- Do **not** add product features, auth flows, or architecture that depend on `PLAYGROUND_*` or `/playground/*`.
- Do **not** suggest playground screens or bindings when implementing client gate routes, onboarding, or sign-in — use E2E or local `/playground` embed for client UI validation instead.

### Vercel production sync

**Direction:** local → Vercel only (`env.config` + `env.secret` → Vercel production).

| Command | Purpose |
|---------|---------|
| `npm run env:compose` | Merge config + secret → `.env` |
| `npm run audit:vercel` | Compare key **names** on Vercel (no values) |
| `npm run sync:vercel` | Push canonical production keys to Vercel |
| `npm run cleanup:vercel` | Remove stale Supabase/SMTP/MailerSend keys from Vercel |

**Keys synced to Vercel production:** Neon (`DATABASE_URL`, `NEON_AUTH_*`), admin/preview client, `APP_URL`, FFT feature flags (including `FFT_ERP_SYNC_ENABLED`).

**Tenant-owned (`syncOptional`):** `FFT_ERP_VENDOR`, `FFT_ERP_BASE_URL` — pushed only when set; not required for `validate:env-sync` / `audit:vercel` while unset. Configure per customer when enabling FFT ERP sync (2D-3); adapter lives under `modules/fft/domain/erp/`, not as a product-wide Afenda ERP client.

**Keys never synced:** `PLAYGROUND_*`, `NEON_API_KEY`, `NEON_ORG_ID`, `NEON_PROJECT_ID`, `NEON_BRANCH_ID`, Shadcn Studio (`SHADCN_STUDIO_*`, `LICENSE_KEY`, `EMAIL`).

After `sync:vercel`, redeploy: `vercel deploy --prod --yes`.

### Blocked commands (do not run)

- **`vercel env pull`** — Vercel redacts secrets as empty strings on pull, which causes false audit mismatches and agent errors. Blocked by `scripts/vercel-env-guard.mjs`.
- **`vercel integration add`** — auto-writes `.env.local`; run `npm run env:guard:fix` after any marketplace install.
- Do not create scripts that pull Vercel env into local files.
- Do not overwrite `env.config` / `env.secret` from Vercel.

Use `npm run audit:vercel` for key-name validation instead.

### GitHub CLI (issues / PRs)

**Problem:** Cursor and some shells set `GITHUB_TOKEN` to a fine-grained PAT. `gh` prefers that env var over `gh auth login` keyring credentials. Fine-grained tokens often lack `issues:write` / PR create scope → HTTP 403 on `gh issue comment`, `gh pr create`, `gh issue close`.

**Fix — use the wrapper (drops `GITHUB_TOKEN` for the child process):**

```bash
npm run gh -- auth status          # should show keyring; scopes include repo
npm run gh -- issue close 1 --reason completed
npm run gh -- pr create --base main --head my-branch
```

**Do not** add `GITHUB_TOKEN` to `env.secret` or `env.config` — it is not app runtime config. One-time setup: `gh auth login` with a classic or keyring token that has **`repo`** scope (covers issues and PRs on private repos).

**Manual override (PowerShell):** `Remove-Item Env:GITHUB_TOKEN` then run `gh` directly.

**CI secrets (GitHub Actions):** `npm run audit:github-actions-secrets` · `npm run sync:github-actions-secrets` (from `env.config` + `env.secret` after `env:compose`). `NEON_AUTH_*` must match the Neon branch behind `DATABASE_URL` on GitHub.

---

## Neon Auth

Authority: [`.agents/skills/neon/SKILL.md`](.agents/skills/neon/SKILL.md), [`.agents/skills/neon-postgres/references/neon-auth/portal-email-verification.md`](.agents/skills/neon-postgres/references/neon-auth/portal-email-verification.md).

**Setup / audit:** Cursor `setup-neon-auth` may 404 — use MCP `get_neon_auth_config`, then `npm run sync:neon-auth-manifest` and `npm run audit:neon-auth-production`. Cross-check [docs/backlogs/neon-auth-validation-matrix.md](docs/backlogs/neon-auth-validation-matrix.md).

### Email — default Neon shared provider only

- Neon Auth transactional mail uses the **shared provider** (`auth@mail.myneon.app`). Do **not** configure custom SMTP for Neon Auth.
- Client onboarding invites use **Neon Auth organization invitations** (`sendClientOnboardingEmail` → `inviteClientOrganizationMember`), not a separate app email provider.
- Before advising on auth email, read live config via Neon MCP `get_neon_auth_config`.

### Trusted domains

When `APP_URL` or preview URLs change, add them to Neon Auth trusted origins:

```bash
neon neon-auth domain add https://afenda-lite.vercel.app
neon neon-auth domain list
```

Branch plugins (magic link, organization): `npm run configure:neon-auth-production -- --configure-plugins`, then `npm run sync:neon-auth-manifest`.

Production checklist: `npm run audit:neon-auth-production`.

### Client invitation entry

- Canonical URL: `/join?invitationId=…` (not `/auth/accept-invitation` or `/?invitationId=…`).
- Org invites must use production `APP_URL` as Origin — see `lib/auth/neon-auth-request.ts`.

### Password reset

Authority: [`.agents/skills/neon-postgres/references/neon-auth/portal-password-reset.md`](.agents/skills/neon-postgres/references/neon-auth/portal-password-reset.md).

- Enabled when Neon `email_password` is on (MCP `get_neon_auth_config`) — no custom SMTP required.
- UI: `/auth/forgot-password` and `/auth/reset-password` via `AuthView`; `NeonAuthUIProvider` must set `baseURL` (client origin) for reset email links.
- Do not use SDK `resetPasswordForEmail` — use Neon Auth UI forms only (Neon docs).

### Local development auth

**Single branch policy:** local dev uses the **production** Neon branch (`br-tiny-hill-ao82jp6f`) — no dev/CI branch switching.

```bash
npm run env:neon-production   # align env.config, env.secret, .neon → production
npm run env:compose
npm run dev                   # http://localhost:3000
```

**Neon Cloud org (ops):** `NEON_ORG_ID=org-fragrant-lake-90358173` (Launch) · project `young-hat-54755363` (**Afenda-Lite**). Put org-scoped `NEON_API_KEY` in `env.secret` only. CLI: shell `NEON_API_KEY` or `~/.config/neonctl/credentials.json`. Cursor MCP (`.cursor/mcp.json` / `.vscode/mcp.json`): User env `NEON_API_KEY` so `Bearer ${NEON_API_KEY}` resolves — **restart Cursor** after changing it. Do **not** use `neonctl link` day-to-day here (it can rewrite `.neon` and pull into `.env`); prefer `npm run env:neon-production` then `npm run env:compose`.

Localhost is allowed on production Neon Auth for `http://localhost:3000` sign-in. Keep `APP_URL` as the production URL in `env.config` — server-side org invites still emit production links (see `lib/auth/neon-auth-request.ts`). For layout-only UI work without auth, use `/playground` embed.

Runbook: [docs/runbooks/local-dev-auth.md](docs/runbooks/local-dev-auth.md).

---

## Portal Atmosphere — agent constraints

**Status:** Experiment **dormant** — do not remount. Authority for bans: [deprecation register](.cursor/skills/agent-skills/skills/deprecation-and-migration/reference.md) (Closed product phases) · `/using-afenda-elite-skills`.

Former Portal Atmosphere slice ADRs under `docs/architecture/slices/portal-atmosphere/` were retired. Do not restore those paths. Living docs live under `docs/` only — do not recreate `doc/`.

| Rule | Detail |
|------|--------|
| Plan before visual work | Hero/atmosphere changes: Plan mode → user approval → implement |
| Experiment surface | **Dormant** — `components/portal-atmosphere/` hard-deleted; brand refs under `public/brand/` if present; Storybook removed |
| Forbidden | CSS invert on owls; single PNG sticker heroes; reintroducing rejected Guardian/PA approaches |
| Prod wiring | **Studio login-page-02 + Neon** on `/auth/*` is the production shell. Guardian Auth stay experiment-only |

---

## Testing

Authority: [`testing/README.md`](testing/README.md). Gap analysis: `/afenda-test` + [`.agents/subagents/afenda-test-engineer.md`](.agents/subagents/afenda-test-engineer.md).

### Pyramid

| Layer | Runner | Location |
| --- | --- | --- |
| L0 | Vitest node | `lib/**/*.test.ts` |
| L2 | Vitest jsdom | `**/*.interaction.test.tsx` |
| L4 smoke | Playwright `@smoke` | `e2e/**/*.spec.ts` |
| L4 journey | Playwright `@journey` | `e2e/**/*.spec.ts` |

Registry scripts (`npm run checks`) are non-Vitest L0 substitutes for copy, nav, and proxy allowlists.

### Factory SSOT

Credentials, fixtures, Playwright base, and React test helpers live under **`testing/`** only. Specs import from `@/testing/e2e/*`.

### Commands

| Command | When |
| --- | --- |
| `npm run test:unit` | Pure lib routing, policy, href builders |
| `npm run test:interaction` | Radix menus, dialogs, dropdowns |
| `npm run test:e2e:smoke` | Auth ingress, health, public-link redirects (CI) |
| `npm run test:e2e:journey` | Full operator/client flows (pre-release) |
| `npm test` | All Playwright projects locally |

### E2E environment

| Variable | Purpose |
| --- | --- |
| `SHARED_ADMIN_EMAIL` / `SHARED_ADMIN_PASSWORD` | Operator login (CI + local) |
| `E2E_OPERATOR_EMAIL` / `E2E_OPERATOR_PASSWORD` | Operator override |
| `PREVIEW_CLIENT_EMAIL` / `CLIENT_DEFAULT_PASSWORD` | Preview client for journeys |
| `E2E_CLIENT_EMAIL` / `E2E_CLIENT_PASSWORD` | Client override |
| `E2E_SURVEY_SLUG` / `E2E_INVITE_TOKEN` | Public link smoke without operator create |

Run `npm run env:compose` before local E2E. CI injects secrets from GitHub Actions.
