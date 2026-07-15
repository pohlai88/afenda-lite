# AGENTS.md — Afenda-Lite

Cursor Agent instructions for this repository. Prefer **actions and links** over essays. Deep authority lives under `docs/` and farm skills — do not invent a second SSOT here.

## Product

| Edition | Role |
|---------|------|
| **Afenda-Lite** | This checkout — beta multi-module SaaS |
| **Afenda-Elite** | Battle-proven edition — **same** DOC-001 control shape; not a second docs tree or product stack |

**Retired name:** Client Declaration Portal — compulsory; [deprecation register](.cursor/skills/agent-skills/skills/deprecation-and-migration/reference.md).

**Hosting:** GitHub `pohlai88/afenda-lite` · Vercel `afenda-lite` · `APP_URL=https://afenda-lite.vercel.app`

## How Cursor Agent should work here

### PREFLIGHT (mandatory self-declaration)

**Whenever this turn uses skills, MCP, or project rules**, the agent’s **first user-visible reply** MUST open with:

```text
### PREFLIGHT
- Engaging: skills | mcp | rules (list which apply)
- Skills: <name(s) or none>
- MCP: <server/tool(s) or none>
- Rules: <rule file stem(s) or none>
- Router: using-afenda-elite-skills | n/a
```

| Surface | Duty |
|---------|------|
| Rule | [`.cursor/rules/agent-authority-preflight.mdc`](.cursor/rules/agent-authority-preflight.mdc) (`alwaysApply`) |
| Hooks | `sessionStart` · `beforeMCPExecution` · `postToolUse` (Read of skills/rules) → [`.cursor/hooks/agent-authority-preflight.mjs`](.cursor/hooks/agent-authority-preflight.mjs) |
| Skip | Pure chitchat with no skill load, no MCP, no rule-driven work |

Do not start skill loads or MCP calls before the PREFLIGHT block is in the visible reply for that turn.

1. **Route product work** through [`/using-afenda-elite-skills`](.cursor/skills/using-afenda-elite-skills/SKILL.md) before vendor phase skills.
2. **One mission per chat** when shipping product work — ARCH-028 coding slices are **closed**; use [GUIDE-018](docs/guides/GUIDE-018-fullstack-e2e-integration-program.md) phases + farms from [`/using-afenda-elite-skills`](.cursor/skills/using-afenda-elite-skills/SKILL.md). Residual scaffold verify: [implementation-slices](.cursor/skills/afenda-elite-implementation-slices/SKILL.md).
3. **Prefer Agent** for implement/verify; use **Plan** only when the slice cutover has a real choice; use **Ask** for read-only navigation.
4. **Verify with evidence** (commands, CI/Deploy runs, `Test-Path` / `git ls-files`) — never trust a stale Cursor index alone.
5. **Commit/push only when the user asks.** Never force-push `main`; never amend remote commits without explicit request.
6. **Do not print secrets.** Validate tokens via HTTP status / presence checks only.

### Skill router (short)

| Need | Skill |
|------|-------|
| Pick farm / docs type | `using-afenda-elite-skills` |
| Controlled docs write | `afenda-elite-doc-control` |
| Doc↔doc conflict / register drift | `afenda-elite-doc-integrity` |
| ARCH-028 slice implement | `afenda-elite-implementation-slices` |
| GUIDE-018 Phase I (I1.1…) | `afenda-elite-implementation-slices` + command-sheet |
| UI / Studio / shell / gateway (any farm) | `afenda-elite-ui-handoff` **then** design-system / admincn / FE scaffold |
| Neon tenancy ops ladder | `neon-tenancy-efficiency` |
| FFT product module | `feed-farm-trade` |
| Generic engineering phases | `using-agent-skills` (method library **after** Elite router) |

## Non-negotiable rules

| Rule | Authority |
|------|-----------|
| **PREFLIGHT** before skills / MCP / rules | [`.cursor/rules/agent-authority-preflight.mdc`](.cursor/rules/agent-authority-preflight.mdc) |
| **Enterprise production** quality bar only — never MVP / “good enough later” | [`.cursor/rules/no-mvp-quality-bar.mdc`](.cursor/rules/no-mvp-quality-bar.mdc) |
| **No shims / stubs / throw-TODO** product paths | [`.cursor/rules/no-shim-stub-tech-debt.mdc`](.cursor/rules/no-shim-stub-tech-debt.mdc) |
| **No Collapse/legacy recover** (`app/`, `modules/`, `features/`, `components-V2/`, Collapse `lib/`, wiped `scripts/*`) unless user names that recovery **this turn** | [ARCH-028](docs/architecture/ARCH-028-implementation-slices.md) · [`.cursor/rules/no-collapse-legacy-recovery.mdc`](.cursor/rules/no-collapse-legacy-recovery.mdc) |
| **No `decision`/`decisions` directories** — ADRs under `docs/architecture/adr/` | [`.cursor/rules/no-decision-directory.mdc`](.cursor/rules/no-decision-directory.mdc) |
| **No git restore/reset/clean** without explicit user approval this turn | [`.cursor/rules/git-no-auto-recover.mdc`](.cursor/rules/git-no-auto-recover.mdc) |
| Docs SSOT under **`docs/` only** — never recreate `doc/` | [DOC-001](docs/_control/DOC-001-documentation-control-standard.md) |
| Shrink **scope** via Approved slices / MOD readiness — never shrink **quality** | ARCH-028 · MOD-002 |

## Documentation & architecture authority

| Doc | Use for |
|-----|---------|
| [docs/README.md](docs/README.md) | Docs entry |
| [DOC-001](docs/_control/DOC-001-documentation-control-standard.md) · [DOC-002](docs/_control/DOC-002-documentation-register.md) · [DOC-003](docs/_control/DOC-003-controlled-document-template.md) | Control · register · template |
| [ARCH-022](docs/architecture/ARCH-022-system-overview.md) | Living monorepo / system overview |
| [ARCH-023](docs/architecture/ARCH-023-multi-tenancy.md) | IAM · tenancy · Decision lock |
| [ARCH-024](docs/architecture/ARCH-024-package-boundaries.md)…[ARCH-027](docs/architecture/ARCH-027-env-model.md) | Packages · data · auth · env |
| [ARCH-024 § `@afenda/ui`](docs/architecture/ARCH-024-package-boundaries.md#afendaui) | `@afenda/ui/playground` gateway subpath vs removed Next.js `/playground` harness — one canonical paragraph, do not re-explain elsewhere |
| [ARCH-028](docs/architecture/ARCH-028-implementation-slices.md) | Scaffold slices (closed) · anti-contamination |
| [GUIDE-018](docs/guides/GUIDE-018-fullstack-e2e-integration-program.md) | Post-scaffold program roadmap (Draft) |
| [ARCH-031](docs/architecture/ARCH-031-technology-stack-catalogue.md) | Stack discovery |

Controlled docs: respect **Control State**. `Closed` → reopen with explicit Docs-lane approval before substantive edits.

## Checkout posture (Living Turborepo on disk)

**Present:** `@afenda/{config,db,auth,env,ui,emails}` · `apps/web` route groups · `apps/web/proxy.ts` edge session gate · `apps/web/modules/{platform,identity,declarations,fft}` · `apps/web/features/{auth,declarations,fft,org-admin}` · CI/Deploy (`.github/workflows/{ci,deploy}.yml`).

**Absent by design:** repo-root `app/`, `modules/`, `features/`, `components-V2/`, Collapse `lib/`, wiped ops script bodies · `apps/web/app/playground/` · `apps/web/features/playground/` (removed 2026-07-15; do not handroll).

| Rule | Detail |
|------|--------|
| Forward code | Greenfield under `apps/web/**` and `packages/*` only |
| Next open (program) | [GUIDE-018](docs/guides/GUIDE-018-fullstack-e2e-integration-program.md) **I2.2** — feature → domain → db boundary. **I2.1** ActionResult / error brands closed. Phase I1 closed. ARCH-028 Checkpoint G **closed**. |
| Env | `@afenda/env` + `.env.local` only (compose retired) |
| Docs trunks | Flat `docs/architecture/ARCH-*.md` — gate `pnpm check:docs-trunk-ban` |
| Index ghosts | Grep/Glob may list deleted paths — trust `Test-Path` · `git ls-files` · trunk-ban check |
| Scripts | Many root `package.json` script names still route through `scripts/collapse-script-unavailable.mjs` — **inventory only, not live controls**, until an Approved forward slice replaces them. Docs-capable today: `pnpm checks` · `check:docs-naming` · `check:docs-trunk-ban` · `check:doc-integrity` · `check:module-quality` · `check:openapi` · `validate:neon-env` |

**App layout:** sole deployable `apps/web` · edge gate `apps/web/proxy.ts` on disk (do not invent `middleware.ts`) · imports `@afenda/*` only across packages.

## Feed Farm Trade

| Fact | Detail |
|------|--------|
| Skill | [`.cursor/skills/feed-farm-trade`](.cursor/skills/feed-farm-trade/SKILL.md) |
| Ops entry | [FFT-MOD-008](docs/modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md) |
| Index / readiness | [FFT-MOD-010](docs/modules/feed-farm-trade/FFT-MOD-010-module-docs-index.md) |
| Production | tag `fft-phase-2a` · `FFT_RBAC_ENABLED=true` · branch `br-tiny-hill-ao82jp6f` |
| Freeze | **2B–2D code blocked** until explicit program reopen + Approved slice group in FFT-MOD-008. Never mix FFT domain commits with unrelated refactors. |

## Platform tenancy

**SSOT:** [ARCH-023](docs/architecture/ARCH-023-multi-tenancy.md) (supersedes ARCH-003).

| Fact | Detail |
|------|--------|
| Shipped | Hard `organization_id = $org`; Users via `neon_auth.member`; FFT entry = platform `fft.access` |
| Neon | Shared schema (not project-per-tenant); prod `DATABASE_URL` must be `-pooler` |
| Cloud | Org `org-fragrant-lake-90358173` · project `young-hat-54755363` · branch `br-tiny-hill-ao82jp6f` |
| Lock | Rejected R1–R7 / Deferred D4·D5 — do not reopen without explicit approval |
| Anti-claim | Do **not** claim multi-DB isolation. `FFT_RBAC_ENABLED` ≠ soft SQL tenancy |
| Ops cheat sheet | [RB-005](docs/runbooks/RB-005-post-lock-coding-cheat-sheet.md) |

## Environment

| File | Role |
|------|------|
| `.env.local` | **Only** local runtime env (gitignored) |
| `.env.example` | Committed key template (no secrets) |
| `packages/env/src/web.ts` | Zod schema — add new product vars here |

**App config:** `import { env } from '@afenda/env'` — never raw `process.env` for product config. Never restore `env.config` / `env.secret` / compose.

```bash
# Local
cp .env.example .env.local   # then fill DATABASE_URL, NEON_AUTH_*, APP_URL
pnpm validate:neon-env
pnpm --filter @afenda/web dev   # :3000
```

| Never sync to Vercel prod | Notes |
|---------------------------|--------|
| `PLAYGROUND_*` | Local reserved toggles only — Next.js `/playground` trees **absent**; do not recreate by hand; never sync to Vercel prod |
| `NEON_API_KEY`, `NEON_ORG_ID`, `NEON_PROJECT_ID`, `NEON_BRANCH_ID` | Local / MCP ops |
| Shadcn Studio keys | Local tooling |

**Playground package gateway:** import UI only via `@afenda/ui/playground` ([ADR-009](docs/architecture/adr/ADR-009-afenda-ui-playground-gateway.md)). Next.js `/playground` routes were removed 2026-07-15 — any future browser harness requires an explicit **Shadcn Studio MCP** slice (no handroll).

**Vercel:** dashboard/CLI is production secret store. `VERCEL_TOKEN` for Actions must be a **classic PAT** ([account tokens](https://vercel.com/account/tokens)) — OAuth CLI sessions fail in CI. Deploy: `.github/workflows/deploy.yml` (Environment `production`).

**GitHub CLI:** Cursor may inject `GITHUB_TOKEN` without write scopes → `gh` 403. Prefer `pnpm gh -- …` (wrapper drops it) or `Remove-Item Env:GITHUB_TOKEN` then keyring `gh`. Do **not** put `GITHUB_TOKEN` in `.env.local` as app config.

## Neon Auth

Authority: [`.agents/skills/neon/SKILL.md`](.agents/skills/neon/SKILL.md) · password-reset / email refs under `.agents/skills/neon-postgres/`.

| Topic | Rule |
|-------|------|
| Mail | Neon **shared** provider only — no custom SMTP for Neon Auth |
| Invites | Neon Auth org invitations via `@afenda/auth` (`inviteOrgMember`); Origin = production `APP_URL` |
| Join URL | `/join?invitationId=…` |
| Password reset | Neon Auth UI forms only (`/auth/forgot-password`, `/auth/reset-password`) |
| Branch policy | Local = **production** Neon branch `br-tiny-hill-ao82jp6f` — no branch switching |
| MCP | User env `NEON_API_KEY`; restart Cursor after change. Avoid day-to-day `neonctl link` (rewrites `.neon`) |

```bash
pnpm validate:neon-env
pnpm --filter @afenda/web dev
# trusted domains when APP_URL / previews change:
neon neon-auth domain add https://afenda-lite.vercel.app
```

Runbook: [docs/runbooks/local-dev-auth.md](docs/runbooks/local-dev-auth.md).

## Portal Atmosphere

**Dormant** — do not remount. No `components/portal-atmosphere/`, no Storybook restore, no CSS invert heroes. Production auth shell: Studio login-page-02 + Neon on `/auth/*`. Bans: deprecation register · `/using-afenda-elite-skills`.

## Testing & quality gates

Authority: [`testing/README.md`](testing/README.md).

| Command | Purpose |
|---------|---------|
| `pnpm test` / `pnpm test:unit` | Turbo/Vitest package contracts |
| `pnpm lint` / `pnpm typecheck` | Biome · `tsc` |
| `pnpm exec turbo run lint typecheck test` | CI parity (S8.1) |
| `pnpm test:e2e` / `:smoke` / `:journey` | Playwright when specs exist |
| `pnpm check:docs-naming` | DOC-002 / naming gate |
| `pnpm validate:neon-env` | Neon Cloud ids vs `.env.local` |

Factory SSOT: **`testing/`** only — specs import `@/testing/e2e/*` when present.

**CI:** `.github/workflows/ci.yml` — `pnpm/action-setup` reads root `packageManager` (no duplicate `version:`).  
**Deploy:** `.github/workflows/deploy.yml` — turbo build `@afenda/web` → Vercel prod; production Git auto-deploy skipped via `apps/web/vercel.json` `ignoreCommand`.

## Agent behavior checklist

Before coding:

- [ ] **PREFLIGHT** self-declared (skills / MCP / rules named) if authority engages
- [ ] Farm routed (`using-afenda-elite-skills` or named slice skill)
- [ ] Slice / lane / Control State understood
- [ ] Paths under `apps/web/**` or `packages/*` (no Collapse restore)
- [ ] Env via `@afenda/env` if touching config

Before claiming done:

- [ ] Acceptance / Verify commands green with pasted evidence
- [ ] No shim/MVP language introduced
- [ ] Controlled docs closed or Docs-lane reopen explicit
- [ ] Secrets not committed (`.env.local` gitignored)
