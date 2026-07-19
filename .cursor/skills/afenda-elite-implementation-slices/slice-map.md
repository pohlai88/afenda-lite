# Implementation slice map (farms · authority · verify)

Always also load: this skill’s [SKILL.md](SKILL.md).

**Neon Auth (`N1`–`N18`):** use [neon-auth-slice-map.md](neon-auth-slice-map.md) + [neon-slice-score.md](neon-slice-score.md) — not this file.

**Progress hint (checkout):** ARCH-028 S1–S8 + Checkpoints A–**G** **closed**. Current program: GUIDE-018 Phase **I3** — **I3.1** done; next **I3.2**. Evidence on disk wins over this hint.

## Farm short names

| Short | Skill path |
|-------|------------|
| router | `using-afenda-elite-skills` |
| slices | `afenda-elite-implementation-slices` (this farm) |
| scaffold | `afenda-elite-frontend-scaffold` |
| nextjs | `afenda-elite-nextjs-best-practice` |
| modules | `afenda-elite-backend-modules` |
| api | `afenda-elite-api-contract` |
| readiness | `afenda-elite-module-readiness` |
| doc-control | `afenda-elite-doc-control` |
| doc-integrity | `afenda-elite-doc-integrity` |
| alignment | `afenda-elite-audit-orchestrator` |
| refactor | `afenda-elite-monorepo-refactor` |
| neon | `neon-tenancy-efficiency` |
| fft | `feed-farm-trade` |
| ui | `afenda-elite-frontend-scaffold` + `@afenda/ui-system` barrel (ADR-010) |
| admincn | `afenda-elite-frontend-scaffold` (chrome); AdminCN authority ARCH-018 |
| lanes | `bounded-agent-lanes` (method) |
| ship | `shipping-and-launch` (method) |
| tdd | `test-driven-development` (method) |
| security | `security-and-hardening` (method) |

---

## Phase I table (GUIDE-018) — current

Authority: GUIDE-018 operative facts in this map + [command-sheet.md](command-sheet.md) (Living GUIDE body dormant).

| ID | Size | Lane | Primary path | Sibling authority | LOAD farms (order) | Verify (minimum) |
|----|------|------|--------------|-------------------|--------------------|------------------|
| **I1.1** | S | Ops | `apps/web/proxy.ts` | ARCH-026 · ARCH-012 · ARCH-022 | router → slices → nextjs → neon | Edge gate present; unauth protected routes redirect; typecheck `@afenda/web` |
| **I1.2** | M | Ops | `apps/web/app/(public)/auth/**` | ARCH-026 · Neon Auth | router → slices → nextjs → neon → scaffold | `/auth/login` · forgot · reset render; Neon Auth UI only |
| **I1.3** | M | Ops | `/join` + invite path | ARCH-026 · ARCH-023 | router → slices → nextjs → neon → modules | `/join?invitationId=` works; invite via `@afenda/auth` |
| **I1.4** | S | Ops | Role shells | ARCH-026 · ARCH-023 | router → slices → nextjs → neon | Unauth → login; wrong role → `/403`; happy session reaches shell |
| **I2.1** | M | Ops | ActionResult / error brands | ARCH-029 · API-002 · GUIDE-015 | router → slices → api → modules | Shared result/error types on Target paths; typecheck |
| **I2.2** | S | Ops | Feature→domain→db boundary | ARCH-024 · ARCH-029 | router → slices → modules → api | `rg` features never import `@afenda/db` |
| **I2.3** | M | Ops | First authenticated **write** | ARCH-023 · owning MOD | router → slices → modules → api → neon | One non-FFT-2B write E2E under hard tenancy |
| **I2.4** | S | Ops | OpenAPI / REST honesty | ARCH-029 · GUIDE-015 | router → slices → api | `pnpm check:openapi` (+ integrity if mapped) |
| **I3.1** | M | Ops | Identity / Platform | ARCH-023 · MOD | router → slices → modules → readiness → neon | Roles/assignments/audit beyond list ports |
| **I3.2** | M | Ops | Declarations submit/read | Declarations MOD · ARCH-023 | router → slices → modules → readiness → neon | Client list → submit/read under hard tenancy |
| **I3.3** | S | Ops | FFT read shell (freeze) | FFT-MOD-008 | router → slices → fft → modules | Phase 2A envelope only — no 2B–2D |
| **I3.4** | M | Ops | Org-admin shell | ARCH-015/018 when needed | router → slices → scaffold → modules → admincn? | Operator UX composes Identity/Platform ports |
| **I4** | L | Test | `testing/e2e/*` · `e2e/` | GUIDE-017 · testing/README | router → slices → tdd · lanes | Forward factories + smoke; two-org denial; no Collapse recover |
| **I5.1** | M | Ops | Security / privacy / audit | GUIDE-017 · ARCH-023 | router → slices → security → neon | Non-waivable isolation/secret/unsafe-error closed or evidenced |
| **I5.2** | M | Ops | Resilience / restore | GUIDE-017 · ARCH-025 | router → slices → neon | Restore/RPO path rehearsed or blocker named |
| **I5.3** | M | Ops | Observability | GUIDE-017 | router → slices · ship | Correlation on critical path; alert→runbook link when alerts exist |
| **I5.4** | M | Ops | UX · a11y · i18n · perf | GUIDE-017 | router → slices → scaffold | Declared states + budgets with owners (no invented thresholds) |
| **I5.5** | M | Ops | CI / supply chain / release | GUIDE-017 · ARCH-022 | router → slices → lanes | Merge/deploy gate honesty; no silent skip |
| **I5.6** | S | Ops | Simplification | code-simplification | router → slices | Complexity down; behavior unchanged; tests green |
| **I6.1** | S | Docs | `*-MOD-009` / `*-MOD-010` | MOD-002 | router → slices → readiness → doc-control | Ledger rows for claimed verticals |
| **I6.2** | S | Docs | GUIDE-017 claim | GUIDE-017 | router → slices → readiness → ship | READY / CONDITIONALLY READY / NOT READY filled |
| **I6.3** | S | Ops | Deploy health | Deploy runbook | router → slices → ship | Actions Deploy · Vercel READY · Neon Auth domains |
| **I7.1** | S | Docs | Doc integrity | DOC-001 | router → slices → doc-integrity | Integrity run clean or residuals logged |
| **I7.2** | S | Normalize | Housekeeping → Slice D | ARCH-024 | router → slices → refactor | Discovery only; deletes via monorepo-refactor |
| **I7.3** | S | Docs | Deprecation register | deprecation skill | router → slices | No banned product names / surfaces reintroduced |
| **I7.4** | S | Docs | Skill catalog honesty | catalog.md | router → slices | Extend before inventing farms |

### Phase I order lock

```text
I1.1 → I1.2 → I1.3 → I1.4 → I2.* → I3.* → I4 → I5.* → I6.* → I7.*
```

Do not skip I1 before I2 unless the user waives serial order **this turn**.

---

## ARCH-028 table (scaffold residual — coding closed)

Authority: ARCH-028 operative facts in this map + [command-sheet.md](command-sheet.md) (Living ARCH body dormant).

Use only for evidence re-verify or named residual. **Do not invent S9.**

| Slice | Size | Primary path | Sibling ARCH | LOAD farms (order) | Verify (minimum) |
|-------|------|--------------|--------------|--------------------|------------------|
| S1.1–S8.2 | — | see ARCH-028 | per row historically | — | Checkboxes + evidence already closed |
| **Checkpoint G** | — | Docs Living cutover | DOC-001 · ARCH-022…028 | doc-control | **DONE** 2026-07-15 |

### Path truth (Living)

| Concept | Use | Do not use |
|---------|-----|------------|
| App | `apps/web` | repo-root `app/` |
| Edge gate | `apps/web/proxy.ts` | new `middleware.ts` |
| Features | `apps/web/features/**` | root `features/` |
| Domain | `apps/web/modules/**` | root `modules/` |
| Packages | `packages/{auth,db,env,ui,emails,config}` | parallel invented roots |
| Program order | GUIDE-018 Phase I | inventing ARCH-028 S9 |
