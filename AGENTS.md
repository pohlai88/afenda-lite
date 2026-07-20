# AGENTS.md — Afenda-Lite

Cursor Agent instructions for this repository. Prefer **actions and links** over essays. Day-to-day architecture packs live under `docs-V2/` (Scratch). Living controlled `docs/` is **absent by design** on this checkout (cutover `71176a0`) until an explicit Docs-lane reopen — do not invent a second SSOT or recreate `doc/`.

## Product

| Edition | Role |
|---------|------|
| **Afenda-Lite** | This checkout — beta multi-module SaaS |
| **Afenda-Elite** | Battle-proven edition — **same** DOC-001 control shape; not a second docs tree or product stack |

**Retired name:** Client Declaration Portal — compulsory; [deprecation register](.cursor/skills/agent-skills/skills/deprecation-and-migration/reference.md).

**Hosting:** GitHub `pohlai88/afenda-lite` · Vercel `afenda-lite` · `APP_URL=https://www.nexuscanon.com`

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
| Coding floor | Product/package code → list **`coding-discipline`** under **Rules** ([`.cursor/rules/coding-discipline.mdc`](.cursor/rules/coding-discipline.mdc)). List **`afenda-coding-discipline`** under **Skills** only when that skill was loaded |

Do not start skill loads or MCP calls before the PREFLIGHT block is in the visible reply for that turn.

1. **Route product work** through [`/using-afenda-elite-skills`](.cursor/skills/using-afenda-elite-skills/SKILL.md) — sole product entry. Vendor phase skills under `agent-skills/` are a **method library after** the farm is fixed, not competing entry points.
2. **One mission per chat** when shipping product work — ARCH-028 coding slices are **closed**; use GUIDE-018 phases (farm map + [docs-V2](docs-V2/README.md) Scratch packs) from the router. Residual scaffold / Neon Auth `N*` missions: [implementation-slices](.cursor/skills/afenda-elite-implementation-slices/SKILL.md) (+ command-sheet or neon-command-sheet).
3. **Prefer Agent** for implement/verify; use **Plan** only when the slice cutover has a real choice; use **Ask** for read-only navigation.
4. **Verify with evidence** (commands, CI/Deploy runs, `Test-Path` / `git ls-files`) — never trust a stale Cursor index alone.
5. **Commit/push only when the user asks.** Never force-push `main`; never amend remote commits without explicit request.
6. **Do not print secrets.** Validate tokens via HTTP status / presence checks only.

### Skill router (short)

Full inventory: [catalog.md](.cursor/skills/using-afenda-elite-skills/catalog.md). Prefer **extend** before inventing farms.

| Need | Skill |
|------|-------|
| Pick farm / docs type | `using-afenda-elite-skills` |
| Controlled docs write | `afenda-elite-doc-control` |
| Doc↔doc conflict / register drift | `afenda-elite-doc-integrity` |
| GUIDE-018 Phase I (`I*`) / residual ARCH-028 (`S*`) | `afenda-elite-implementation-slices` + command-sheet |
| Neon Auth optimisation (`N1`–`N18`) | `afenda-elite-implementation-slices` + neon-command-sheet · Neon Slice Score + independent audit |
| UI primitives / `@afenda/ui-system` (shadcn·Radix, tokens, barrel) | `shadcn-ui` + ADR-010 owned-source (`pnpm --filter @afenda/ui-system ui:add` → relative → barrel → tests) |
| Shadcn Studio DNA / Pro blocks / DNA forwarder | `shadcn-ui` — Method A → `apps/web/shadcn-studio`; Method B MCP; machine SSOT [`dna-ledger.json`](.cursor/skills/shadcn-ui/dna-ledger.json); promote → prune; never product-import DNA; Afenda install registry deferred; no ui-system registries without ADR-010 reopen |
| Product UI compose / handroll fix / visual consistency | `afenda-elite-ui-compose` (SCALABILITY-FIRST / UI-CAP-*; then `frontend-ui-engineering` for a11y/state/responsive method only) |
| React composition / compound / provider API | `afenda-elite-react-composition` (after ui-compose classifies capability; vendor composition patterns = progressive only) |
| React runtime / perf (waterfalls · rerenders · bundle · hydration) | `afenda-elite-react-best-practices` (App Router/cache stays with `afenda-elite-nextjs-best-practice`; vendor RBP = progressive only) |
| UI in app routes / FE scaffold | `afenda-elite-frontend-scaffold` (consume `@afenda/ui-system` barrel) |
| Next.js App Router / RSC / proxy / cache | `afenda-elite-nextjs-best-practice` |
| Modules / ports / residue | `afenda-elite-backend-modules` |
| API contract / ActionResult / OpenAPI / REST | `afenda-elite-api-contract` |
| Module evidence / MOD readiness claims | `afenda-elite-module-readiness` |
| Cross-package import / DAG | `afenda-elite-monorepo-discipline` |
| Dead code / skill-catalog drift | `afenda-elite-repo-housekeeping` |
| Root / package / app README · Diátaxis · README Score | `afenda-readme-diataxis` (not controlled `docs/` bodies) |
| TS / coding discipline (brands · unions · any/as · boundary) | L0 [coding-discipline](.cursor/rules/coding-discipline.mdc) rule (PREFLIGHT **Rules**); full table `afenda-coding-discipline` skill after farm fixed |
| Neon tenancy ops ladder | `neon-tenancy-efficiency` |
| Generic engineering phases | `using-agent-skills` (method library **after** Elite router) |

## Non-negotiable rules

| Rule | Authority |
|------|-----------|
| **PREFLIGHT** before skills / MCP / rules | [`.cursor/rules/agent-authority-preflight.mdc`](.cursor/rules/agent-authority-preflight.mdc) |
| **Coding discipline** L0 floor (brands · unknown/as · ActionResult · barrel · env) | [`.cursor/rules/coding-discipline.mdc`](.cursor/rules/coding-discipline.mdc) (`alwaysApply`; full table → `afenda-coding-discipline` skill) |
| **Enterprise production** quality bar only — never MVP / “good enough later” | [`.cursor/rules/no-mvp-quality-bar.mdc`](.cursor/rules/no-mvp-quality-bar.mdc) |
| **No shims / stubs / throw-TODO** product paths | [`.cursor/rules/no-shim-stub-tech-debt.mdc`](.cursor/rules/no-shim-stub-tech-debt.mdc) |
| **No parking / defer / false YAGNI** — no consumer ≠ unused; drop only when user names it this turn | [`.cursor/rules/no-park-defer-false-yagni.mdc`](.cursor/rules/no-park-defer-false-yagni.mdc) |
| **No Collapse/legacy recover** (`app/`, `modules/`, `features/`, `components-V2/`, Collapse `lib/`, wiped `scripts/*`) unless user names that recovery **this turn** | [`.cursor/rules/no-collapse-legacy-recovery.mdc`](.cursor/rules/no-collapse-legacy-recovery.mdc) · farm ARCH-028 notes |
| **No Living ARCH ghost SSOT** — do not recreate Living `docs/` or cite missing `docs/architecture/ARCH-*` as on-disk authority; Scratch `docs-V2` is operative | [`.cursor/rules/no-living-arch-ghost-ssot.mdc`](.cursor/rules/no-living-arch-ghost-ssot.mdc) |
| **No `decision`/`decisions` directories** — ADRs under `docs/architecture/adr/` when Living docs reopen | [`.cursor/rules/no-decision-directory.mdc`](.cursor/rules/no-decision-directory.mdc) |
| **No git restore/reset/clean** without explicit user approval this turn | [`.cursor/rules/git-no-auto-recover.mdc`](.cursor/rules/git-no-auto-recover.mdc) |
| **Scratch docs** under **`docs-V2/`** — never recreate `doc/`; do **not** recreate Living `docs/` without Docs-lane reopen | [docs-V2/README.md](docs-V2/README.md) · cutover `71176a0` |
| Shrink **scope** via Approved slices / MOD readiness — never shrink **quality** | Farm maps · module-readiness |

## Documentation & architecture authority

| Surface | Use for |
|---------|---------|
| [docs-V2/README.md](docs-V2/README.md) | Scratch E2E architecture packs (day-to-day agent ops) |
| [docs-V2/system/README.md](docs-V2/system/README.md) · [monorepo](docs-V2/monorepo/README.md) · [pnpm](docs-V2/pnpm/README.md) · [api](docs-V2/api/README.md) · [tenancy](docs-V2/tenancy/README.md) | System · DAG · install · contracts · tenancy |
| [`@afenda/docs`](apps/docs) | **Official** human-facing documentation site (Fumadocs) — active config; enterprise production bar |
| [docs-V2/api/OPEN-001-openapi.yaml](docs-V2/api/OPEN-001-openapi.yaml) | OpenAPI machine SSOT consumed by `@afenda/docs` |
| [docs-V2/docs/README.md](docs-V2/docs/README.md) | Scratch ops pack for the official docs app (UI · pipeline · content rules) |
| Living `docs/` (DOC-001 · ARCH-* · GUIDE-018 · MOD-*) | **Dormant** — absent on disk until Docs-lane reopen; DOC-001 control shape still applies when Living returns |
| Farm skills under `.cursor/skills/` | Method + evidence companions (not a second product SSOT) |

`@afenda/docs` is the official docs site. Do **not** treat its MDX as Living DOC-001 controlled-document SSOT (register / Accept·Living lifecycle). Scratch packs are engineering authority, not a second published docs app.

## Checkout posture (Living Turborepo on disk)

**Present:** `@afenda/{config,db,auth,env,errors,logger,rate-limit,cache,audit,search,notifications,events,master-data,sales,admin,http,security,metrics,openapi,ai-the-machine,ui-system,emails}` · `apps/web` · `apps/docs` (**official** Fumadocs docs) · `apps/web/proxy.ts` edge session gate · `apps/web/modules/{platform,identity}` · `apps/web/features/{auth,org-admin,ai-the-machine}` · `docs-V2/**` Scratch packs · CI/Deploy (`.github/workflows/{ci,deploy}.yml`).

**Absent by design / removed domains:** Living controlled `docs/` (cutover `71176a0`) · product **Declarations** + **Feed Farm Trade (FFT)** modules/features/routes (nuclear wipe) · `feed-farm-trade` skill · repo-root `app/`, `modules/`, `features/`, `components-V2/`, Collapse `lib/`, wiped ops script bodies · `apps/web/app/playground/` · `apps/web/features/playground/` (removed 2026-07-15; do not handroll). Do **not** recreate `modules/declarations`, `modules/fft`, `features/declarations`, `features/fft`, or `/client/declarations` / `/fft` product trees.

| Rule | Detail |
|------|--------|
| Forward code | Greenfield under `apps/web/**` and `packages/*` only |
| Docs | Official site = `apps/docs`. Scratch ops = `docs-V2/docs/**`. Living `docs/` restore requires explicit Docs-lane + named recovery — not agent default |
| Next open (GUIDE-018) | Phase **I1–I6 DONE**. GUIDE-017 claim **NOT READY** @ `fc16109`. Next Ops = **I7.1**. ARCH-028 Checkpoint G **closed**. Do **not** invent **N19**. Do **not** claim GUIDE-017 READY from I6.3 alone. Map: implementation-slices farm |
| Next open (Neon Auth `N*`) | **N1–N18 serial complete** — all APPROVED at 100% (incl. **N15** Path-to-100% closed). Do **not** invent **N19**. Map: [neon-auth-slice-map](.cursor/skills/afenda-elite-implementation-slices/neon-auth-slice-map.md). |
| Env | `@afenda/env` + `.env.local` only (compose retired) |
| Docs trunks | Gate `pnpm check:docs-trunk-ban` (banned architecture trunks stay absent) |
| Index ghosts | Grep/Glob may list deleted Living `docs/**` paths — trust `Test-Path` · `git ls-files` · trunk-ban check |
| Scripts | Many root `package.json` script names still route through `scripts/collapse-script-unavailable.mjs` — **inventory only**. Live when `docs/` absent: `pnpm checks` skips Living naming/integrity/module-quality · `check:docs-trunk-ban` · `check:openapi` · `validate:neon-env` · `audit:tenancy-nulls` · `audit:github-actions-secrets` · `protect:main` · `pnpm gh` |

**App layout:** sole deployable `apps/web` · edge gate `apps/web/proxy.ts` on disk (do not invent `middleware.ts`) · imports `@afenda/*` only across packages.

## Platform tenancy

**SSOT (Scratch):** [docs-V2/tenancy](docs-V2/tenancy/README.md) · farm `neon-tenancy-efficiency` (Living ARCH-023 dormant until Docs-lane reopen).

| Fact | Detail |
|------|--------|
| Shipped | Hard `organization_id = $org`; Users via `neon_auth.member`; living modules = **platform + identity** only |
| Neon | Shared schema (not project-per-tenant); prod `DATABASE_URL` must be `-pooler` |
| Cloud | Org `org-fragrant-lake-90358173` · project `young-hat-54755363` · branch `br-tiny-hill-ao82jp6f` |
| Lock | Rejected R1–R7 / Deferred D4·D5 — do not reopen without explicit approval |
| Anti-claim | Do **not** claim multi-DB isolation |
| Permission catalog seed | `pnpm --filter @afenda/db db:ensure-permission-catalog` (not baseline migrate); catalog has **no** `declarations.*` / `fft.access` |
| Client home | `CLIENT_HOME` = `/client` (workspace shell — not declarations product) |
| Ops | Farm companions + [docs-V2/tenancy](docs-V2/tenancy/README.md) (Living RB-005 dormant) |

## Environment

| File | Role |
|------|------|
| `.env.local` | **Only** local runtime env (gitignored) |
| `.env.example` | Committed key template (no secrets) |
| `packages/foundation/env/src/web.ts` | Zod schema — add new product vars here |

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

**UI design system:** import UI only via the flat barrel `@afenda/ui-system` and tokens via `@afenda/ui-system/styles.css` (ADR-010 flat-barrel — Living ADR body dormant; farm `shadcn-ui` + `afenda-elite-ui-compose`). Owned shadcn `new-york` / Radix source in `packages/surfaces/ui-system`; no gateway subpath, no `*Contract` layer, no external/paid registries. The retired `@afenda/ui` playground gateway is gone — do not restore it. Next.js `/playground` routes remain absent — any future browser harness requires an explicit **Shadcn Studio MCP** slice (no handroll).

**Vercel:** dashboard/CLI is production secret store. `VERCEL_TOKEN` for Actions must be a **classic PAT** ([account tokens](https://vercel.com/account/tokens)) — OAuth CLI sessions fail in CI. Deploy: `.github/workflows/deploy.yml` (Environment `production`).

**GitHub CLI:** Cursor may inject `GITHUB_TOKEN` without write scopes → `gh` 403. Prefer `pnpm gh -- …` (wrapper drops it) or `Remove-Item Env:GITHUB_TOKEN` then keyring `gh`. Do **not** put `GITHUB_TOKEN` in `.env.local` as app config.

## Neon Auth

Authority: [`.agents/skills/neon/SKILL.md`](.agents/skills/neon/SKILL.md) · password-reset / email refs under `.agents/skills/neon-postgres/`. Optimisation serial: [neon-auth-slice-map](.cursor/skills/afenda-elite-implementation-slices/neon-auth-slice-map.md) · [neon-slice-score](.cursor/skills/afenda-elite-implementation-slices/neon-slice-score.md).

| Topic | Rule |
|-------|------|
| Mail | **Zoho SMTP** via Neon Auth console (`email_provider` · `smtp.zoho.com` · sender `no-reply@nexuscanon.com`) — not Neon shared `auth@mail.myneon.app`; no app-side SMTP for Neon Auth flows ([docs-V2/auth](docs-V2/auth/README.md)) |
| Invites | Neon Auth org invitations via `@afenda/auth` (`inviteOrgMember`); Origin = production `APP_URL` |
| Join URL | `/join?invitationId=…` |
| Password reset | Neon Auth delivery via Zoho SMTP (`/auth/forgot-password` · `/auth/reset-password`). Living UI = Neon Auth UI components; Neon SDK reset method incomplete per Neon docs. Custom sign-in/sign-up UI via `@afenda/auth` is Neon Path A — not forbidden ([docs-V2/auth](docs-V2/auth/README.md)) |
| Branch policy | Local = **production** Neon branch `br-tiny-hill-ao82jp6f` — no branch switching |
| MCP | User env `NEON_API_KEY`; restart Cursor after change. Avoid day-to-day `neonctl link` (rewrites `.neon`) |
| `N*` close | Neon Slice Score + independent auditor `APPROVED` only — implementer never self-APPROVES; GUIDE-018 “closed” ≠ Neon APPROVED |

```bash
pnpm validate:neon-env
pnpm --filter @afenda/web dev
# trusted domains when APP_URL / previews change:
neon neon-auth domain add https://www.nexuscanon.com
```

Ops: [docs-V2/auth](docs-V2/auth/README.md) · neon-auth-slice-map (Living RB-001 §3.12 dormant until Docs-lane reopen).

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
| `pnpm audit:tenancy-nulls` | Hard tenant roots null-org audit (30 tables via `HARD_TENANT_ROOT_TABLE_NAMES`: platform_* six · `md_party`/`md_item*`/`md_warehouse*` · `md_payment_term` · `md_tax_registration` · MDG/variants · `sales_order`/`sales_order_line`) |
| `pnpm audit:github-actions-secrets` | Required Actions secret/var **names** only (Ops; keyring `gh`) |
| `pnpm protect:main` | Verify (or `-- --apply`) Living `main` required check = `quality` |

Factory SSOT: **`testing/`** only — specs import `@/testing/e2e/*` when present.

**Neon Auth `N*` missions:** floor verify from [neon-auth-slice-map](.cursor/skills/afenda-elite-implementation-slices/neon-auth-slice-map.md) + acceptance matrix + [Neon Slice Score](.cursor/skills/afenda-elite-implementation-slices/neon-slice-score.md). Product close requires independent auditor `APPROVED` in a fresh chat — not implementer self-APPROVE.

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
- [ ] `N*` only: Neon Slice Score emitted + independent auditor APPROVED (or REJECTED/BLOCKED findings)
- [ ] No shim/MVP/park-defer/false-YAGNI language introduced
- [ ] Controlled docs closed or Docs-lane reopen explicit
- [ ] Secrets not committed (`.env.local` gitignored)
