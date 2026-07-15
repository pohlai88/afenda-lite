# Afenda-Lite / Elite — skill catalog

| Field | Value |
|-------|-------|
| **Role** | Agent skill inventory and routing register (not a DOC-001 controlled document) |
| **Router** | [SKILL.md](SKILL.md) |
| **Authority above this file** | Controlled `docs/` (DOC/ARCH/API/REST/MOD) + [AGENTS.md](../../../AGENTS.md) |
| **Editions** | Afenda-Lite (beta) · Afenda-Elite (battle-proven) — same catalogue shape |

Scratch requirements under `docs/scratch/` may justify a **candidate** row. They are not Living/Target architecture and must not be cited as binding skill rules until controlled promotion.

## Lifecycle

| Status | Disk | Meaning |
|--------|------|---------|
| `keep` | Present | Valid and maintained; router may invoke |
| `extend` | Present | Valid; deepen before inventing a sibling farm |
| `candidate` | Absent | Proposed gap awaiting user decision and authority prerequisites |
| `planned` | Absent | Explicitly approved backlog row; still no files until prerequisites pass |
| `forbidden` | Absent | Must not be created or imported; report drift if found |

Transitions: `candidate → planned` only after explicit user acceptance; `planned → keep|extend` only when the skill is created and validated. Catalog acceptance never waives a controlled-authority prerequisite.

## Local-build and Xerp independence

| Allowed | Forbidden |
|---------|-----------|
| Rewrite checklists against Lite ARCH/API/Neon/DOC | Copy or fork Xerp skill trees |
| Cite controlled docs + this repo only | Symlink / submodule / git-subtree / “sync from Xerp” |
| Prefer **extend** before new `afenda-elite-*` | Fork vendor phase skills into Elite names |
| At most one non-operational historical-provenance sentence | Operational `LOAD` or path into `afenda-Xerp/` |
| Catalog **planned** row before new farm | Ad-hoc skill creation outside this catalog |

Local skills must remain operable if `afenda-Xerp` is absent. Do not edit `agent-skills/**` merely to erase that vendored library’s own cross-repo documentation.

## Present skills

### L1 — Router

| Skill | Source class | Management | Status | Owns | Invoked by | Controlled authority | Prerequisite | Evidence | Notes |
|-------|--------------|------------|--------|------|------------|----------------------|--------------|----------|-------|
| `using-afenda-elite-skills` | local-router | local | keep | Product farm routing; sole Lite/Elite entry | Session start / product tasks | DOC-001…003 · AGENTS.md | none | `.cursor/skills/using-afenda-elite-skills/SKILL.md` | Inventory SSOT is this file |

### L3 — Elite farms

| Skill | Source class | Management | Status | Owns | Invoked by | Controlled authority | Prerequisite | Evidence | Notes |
|-------|--------------|------------|--------|------|------------|----------------------|--------------|----------|-------|
| `afenda-elite-doc-control` | local-elite-farm | local | keep | Controlled-document lifecycle under `docs/` | Docs create/update/deprecate | DOC-001 · DOC-002 · DOC-003 | none | `.cursor/skills/afenda-elite-doc-control/SKILL.md` | |
| `afenda-elite-doc-integrity` | local-elite-farm | local | keep | Doc↔doc conflict / SSOT drift audit | Integrity detect/plan/verify | DOC-001 · DOC-002 | none | `.cursor/skills/afenda-elite-doc-integrity/SKILL.md` | Not controlled writes |
| `afenda-elite-frontend-scaffold` | local-elite-farm | local | keep | Target FE scaffold / wipe inventory | FE scaffold missions | ARCH-017 · ARCH-028 · ARCH-015 | none | `.cursor/skills/afenda-elite-frontend-scaffold/SKILL.md` | Docs-first until implement request |
| `afenda-elite-nextjs-best-practice` | local-elite-farm | local | keep | App Router / RSC / cache / proxy mechanics | Next.js route/runtime work | ARCH-002 · ARCH-012 · ARCH-016 · ARCH-017 · ADR-008 · ARCH-027 | none | `.cursor/skills/afenda-elite-nextjs-best-practice/SKILL.md` | Wave 2 extend closed → keep |
| `afenda-elite-backend-modules` | local-elite-farm | local | keep | Module ports, residue, ownership map | Modules / hexagonal boundaries | ARCH-001 · ARCH-006 · ARCH-009 · ARCH-022 · ARCH-024 · ARCH-028 | none | `.cursor/skills/afenda-elite-backend-modules/SKILL.md` | Wave 2 extend closed → keep; Target vs docs-first path truth |
| `afenda-elite-api-contract` | local-elite-farm | local | keep | ActionResult, brands, OpenAPI, REST contracts | API / BFF contract work | ARCH-029 · docs/api · API-001… · REST-001 · OPEN-001 | none | `.cursor/skills/afenda-elite-api-contract/SKILL.md` | Wave 2 extend closed → keep; ARCH-029 §3.3 ten-stage pipeline |
| `afenda-elite-module-readiness` | local-elite-farm | local | keep | Module evidence ledgers · Module Enterprise Readiness claims | MOD-009 / MOD-010 evidence and claim work | MOD-002 · owning `*-MOD-009` / `*-MOD-010` | none | `.cursor/skills/afenda-elite-module-readiness/SKILL.md` | MOD-002/009/010 only — no scratch QG · no edition certification |
| `afenda-elite-repo-housekeeping` | local-elite-farm | local | keep | Knip/drift discovery; skill-catalog align | Housekeeping / catalog drift | ARCH-024 · ARCH-028 · this catalog | none | `.cursor/skills/afenda-elite-repo-housekeeping/SKILL.md` | Deletes → monorepo-refactor Slice D |
| `afenda-elite-monorepo-discipline` | local-elite-farm | local | keep | Day-to-day `@afenda/*` import/DAG/export surface | Cross-package imports · new `packages/*` · layer violations | ARCH-024 · ARCH-022 | none | `.cursor/skills/afenda-elite-monorepo-discipline/SKILL.md` | Lite rewrite of Xerp `monorepo-discipline` (no Xerp LOAD) |
| `afenda-elite-monorepo-refactor` | local-elite-farm | local | keep | Governed extract/move/Slice D | Cross-package refactor | ARCH-024 · ARCH-028 | none | `.cursor/skills/afenda-elite-monorepo-refactor/SKILL.md` | Day-to-day boundaries → monorepo-discipline |
| `afenda-elite-implementation-slices` | local-elite-farm | local | keep | One GUIDE-018 Phase I / residual ARCH-028 mission + command sheet | Named `PHASE_ID` (I*) / `SLICE_ID` (S*) / command-sheet paste | GUIDE-018 · ARCH-028 (+ sibling per map) | Checkpoint G closed; Phase I open at I1.1 | `.cursor/skills/afenda-elite-implementation-slices/SKILL.md` | Routes to farms via slice-map; does not replace scaffold/modules/nextjs/api |


### Domain farms

| Skill | Source class | Management | Status | Owns | Invoked by | Controlled authority | Prerequisite | Evidence | Notes |
|-------|--------------|------------|--------|------|------------|----------------------|--------------|----------|-------|
| `admincn-customization` | local-domain-farm | local | keep | AdminCN shell / theme / studio MCP | AdminCN UI work | ARCH-015 · ARCH-018 · ARCH-019 | none | `.cursor/skills/admincn-customization/SKILL.md` | |
| `feed-farm-trade` | local-domain-farm | local | keep | FFT module farm / gates | FFT domain work | FFT-MOD-* · FFT-MOD-008 | none | `.cursor/skills/feed-farm-trade/SKILL.md` | 2B–2D blocked until reopen |
| `neon-tenancy-efficiency` | local-domain-farm | local | keep | Neon shared-schema tenancy + ARCH-023 IAM application | Tenancy / Neon ops | ARCH-023 · ARCH-025 · ARCH-027 | none | `.cursor/skills/neon-tenancy-efficiency/SKILL.md` | Wave 2 extend closed → keep; ARCH-027 `@afenda/env` + `.env.local` |
| `update-mcp-config` | local-domain-farm | local | keep | Project MCP config updates | MCP wiring | AGENTS.md · `.vscode/mcp.json` | none | `.cursor/skills/update-mcp-config/SKILL.md` | |

### Vendored method library

Management = `vendored`. Status = `keep` (inventory only). Invoked via `using-agent-skills` after a farm is fixed — not Elite-named forks. Controlled authority = method library only (no product SSOT).

| Skill | Source class | Evidence |
|-------|--------------|----------|
| `using-agent-skills` | vendored-method | `.cursor/skills/agent-skills/skills/using-agent-skills/SKILL.md` |
| `api-and-interface-design` | vendored-method | `.cursor/skills/agent-skills/skills/api-and-interface-design/SKILL.md` |
| `bounded-agent-lanes` | vendored-method | `.cursor/skills/agent-skills/skills/bounded-agent-lanes/SKILL.md` |
| `browser-testing-with-devtools` | vendored-method | `.cursor/skills/agent-skills/skills/browser-testing-with-devtools/SKILL.md` |
| `ci-cd-and-automation` | vendored-method | `.cursor/skills/agent-skills/skills/ci-cd-and-automation/SKILL.md` |
| `code-review-and-quality` | vendored-method | `.cursor/skills/agent-skills/skills/code-review-and-quality/SKILL.md` |
| `code-simplification` | vendored-method | `.cursor/skills/agent-skills/skills/code-simplification/SKILL.md` |
| `context-engineering` | vendored-method | `.cursor/skills/agent-skills/skills/context-engineering/SKILL.md` |
| `debugging-and-error-recovery` | vendored-method | `.cursor/skills/agent-skills/skills/debugging-and-error-recovery/SKILL.md` |
| `deprecation-and-migration` | vendored-method | `.cursor/skills/agent-skills/skills/deprecation-and-migration/SKILL.md` |
| `documentation-and-adrs` | vendored-method | `.cursor/skills/agent-skills/skills/documentation-and-adrs/SKILL.md` |
| `doubt-driven-development` | vendored-method | `.cursor/skills/agent-skills/skills/doubt-driven-development/SKILL.md` |
| `frontend-ui-engineering` | vendored-method | `.cursor/skills/agent-skills/skills/frontend-ui-engineering/SKILL.md` |
| `git-workflow-and-versioning` | vendored-method | `.cursor/skills/agent-skills/skills/git-workflow-and-versioning/SKILL.md` |
| `idea-refine` | vendored-method | `.cursor/skills/agent-skills/skills/idea-refine/SKILL.md` |
| `incremental-implementation` | vendored-method | `.cursor/skills/agent-skills/skills/incremental-implementation/SKILL.md` |
| `interview-me` | vendored-method | `.cursor/skills/agent-skills/skills/interview-me/SKILL.md` |
| `observability-and-instrumentation` | vendored-method | `.cursor/skills/agent-skills/skills/observability-and-instrumentation/SKILL.md` |
| `performance-optimization` | vendored-method | `.cursor/skills/agent-skills/skills/performance-optimization/SKILL.md` |
| `planning-and-task-breakdown` | vendored-method | `.cursor/skills/agent-skills/skills/planning-and-task-breakdown/SKILL.md` |
| `security-and-hardening` | vendored-method | `.cursor/skills/agent-skills/skills/security-and-hardening/SKILL.md` |
| `shipping-and-launch` | vendored-method | `.cursor/skills/agent-skills/skills/shipping-and-launch/SKILL.md` |
| `source-driven-development` | vendored-method | `.cursor/skills/agent-skills/skills/source-driven-development/SKILL.md` |
| `spec-driven-development` | vendored-method | `.cursor/skills/agent-skills/skills/spec-driven-development/SKILL.md` |
| `test-driven-development` | vendored-method | `.cursor/skills/agent-skills/skills/test-driven-development/SKILL.md` |

Container folder `.cursor/skills/agent-skills/` has no top-level `SKILL.md` by design (skill roots live under `skills/`).

## Planned (approved backlog — no SKILL.md until authoring mission)

_None. `afenda-elite-implementation-slices` authored 2026-07-14 → keep (L3)._

## Candidate gaps (not approved for authoring)

Scratch REQ/response inform discovery only. Prerequisites are controlled-authority gates.

| Proposed skill | Need | Controlled authority today | Prerequisite before authoring | Notes |
|----------------|------|----------------------------|-------------------------------|-------|
| `afenda-elite-rbac` | Broader permission/SoD / policy-overlay farm | ARCH-023 · ARCH-026 | After Wave 2 extends: decide whether ARCH-023 platform RBAC is adequately absorbed by neon-tenancy + api-contract + nextjs + backend-modules; broader SoD remains authority-gated | Keep **candidate**. Neon Auth only |
| `afenda-elite-env-governance` | Env fail-fast / client-secret boundary | ARCH-027 | Prefer extend nextjs first; promote only if size/ownership gap remains | Candidate |
| `afenda-elite-server-action-security` | Dedicated Action security farm | ARCH-029 · API-002 · nextjs farm | Only if api-contract + nextjs extension remain too large after review | Candidate |
| `afenda-elite-drizzle-migration` | Drizzle journal / migration governance | ARCH-025 · ARCH-028 | Target `@afenda/db` exists | Candidate |
| `afenda-elite-test` | Lite test-pyramid farm | testing authority / vendor TDD | Proven routing gap after checkout paths reconcile | Candidate |

**Retired candidate name:** `afenda-elite-enterprise-readiness` — do not create; use keep `afenda-elite-module-readiness` instead.

## Forbidden (must not create or import)

| Pattern / skill | Why |
|-----------------|-----|
| Xerp editorial / presentation / Storybook stacks (`afenda-editorial-*`, presentation promotion, Storybook agentic) | Explicit router SKIP; Storybook product restore dormant |
| `better-auth-erp` | ARCH-026 Neon Auth only |
| Wholesale Xerp `multi-tenancy-erp` (7-tier + RLS primary) | ARCH-023 shared-schema hard `organization_id`; RLS out of scope on BFF |
| `supabase` as auth/platform authority | Retired keys; Neon Auth lock |
| Lite product router `using-afenda-skills` | Wrong repo overlay; use this router |
| Sales / Purchasing / Inventory / Finance / Payments / multi-entity skill farms | ARCH-006 contexts only until controlled ADR; scratch OQ-10/OQ-20 cannot authorize |
| Forking `agent-skills/skills/*` into `afenda-elite-*` | Method library stays vendored |
| Recreating `doc/` or inventing DOC-004 without DOC-001 ID approval | Documentation control |

## Gap → Wave 2 routing

| Need | Catalog status | Mission order |
|------|----------------|---------------|
| Tenant isolation + ARCH-023 platform IAM absorption | keep `neon-tenancy-efficiency` | Wave 2.1 done |
| API schemas / errors / ARCH-029 §3.3 pipeline | keep `afenda-elite-api-contract` | Wave 2.2 done |
| App Router Actions / ARCH-027 env | keep `afenda-elite-nextjs-best-practice` | Wave 2.3 done |
| Module ports / ARCH-006 boundaries | keep `afenda-elite-backend-modules` | Wave 2.4 done |
| Module evidence / readiness claims | keep `afenda-elite-module-readiness` | Authored after API + FFT env cleanup |
| Broader RBAC/SoD farm · env farm · Action farm · drizzle · test | candidate (above) | Not Wave 2 authoring |

## Wave 2 extend status (history · 2026-07-14)

| Mission | Farm | History | Catalog status now |
|---------|------|---------|-------------------|
| 2.1 | `neon-tenancy-efficiency` | Extended — ARCH-023 IAM + ARCH-027 env reconciliation | **keep** |
| 2.2 | `afenda-elite-api-contract` | Extended — ARCH-029 §3.3 ten-stage pipeline | **keep** |
| 2.3 | `afenda-elite-nextjs-best-practice` | Extended — Action mechanics + ARCH-027 env (`@afenda/env`) | **keep** |
| 2.4 | `afenda-elite-backend-modules` | Extended — Target vs docs-first companions | **keep** |

**P1 corrections (same wave):** ten-stage pipeline; retired compose guidance; companions no longer claim deleted trees as disk SSOT; FFT MOD/command sheets reconciled to ARCH-027 (`@afenda/env`); `afenda-elite-module-readiness` authored → **keep**.

### RBAC absorption note

ARCH-023 three-tier IAM, hard org predicates, permission-first checks, session/org binding, and seed codes are absorbed across neon-tenancy (+ api-contract / nextjs / backend-modules). `afenda-elite-rbac` remains **candidate**.

## Parity rules (housekeeping)

`skill-catalog-drift` means any of:

1. On-disk `SKILL.md` missing from this catalog (or vice versa for `keep|extend`)
2. Folder name ≠ frontmatter `name`
3. Router invoke target not listed as `keep|extend`
4. `candidate|planned|forbidden` row present on disk

Align by editing this catalog, the router, or disk evidence — never by inventing `doc/` registers.
