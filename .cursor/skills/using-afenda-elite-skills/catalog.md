# Afenda-Lite / Elite — skill catalog

| Field | Value |
|-------|-------|
| **Role** | Agent skill inventory and routing register (not a DOC-001 controlled document) |
| **Router** | [SKILL.md](SKILL.md) |
| **Authority above this file** | [AGENTS.md](../../../AGENTS.md) · farm companions · Scratch [docs-V2](../../../docs-V2/README.md) · [doc-control-rules](../afenda-elite-doc-control/doc-control-rules.md) |
| **Editions** | Afenda-Lite (beta) · Afenda-Elite (battle-proven) — same catalogue shape |
| **Living docs/** | Absent by design until Docs-lane reopen — Elite skills must LOAD skill-local / Scratch / disk |

Scratch packs under `docs-V2/**` may justify a **candidate** row. They are not Living/Target architecture and must not be cited as binding skill rules until Docs-lane controlled promotion.

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
| Rewrite checklists against Lite ARCH/API/Neon/DOC (skill-local + Scratch) | Copy or fork Xerp skill trees |
| Cite AGENTS · docs-V2 · farm companions + this repo only | Symlink / submodule / git-subtree / “sync from Xerp” · required Living `docs/` LOAD |
| Prefer **extend** before new `afenda-elite-*` | Fork vendor phase skills into Elite names |
| At most one non-operational historical-provenance sentence | Operational `LOAD` or path into `afenda-Xerp/` |
| Catalog **planned** row before new farm | Ad-hoc skill creation outside this catalog |

Local skills must remain operable if `afenda-Xerp` is absent. Do not edit `agent-skills/**` merely to erase that vendored library’s own cross-repo documentation.

## Present skills

### L1 — Router

| Skill | Source class | Management | Status | Owns | Invoked by | Controlled authority | Prerequisite | Evidence | Notes |
|-------|--------------|------------|--------|------|------------|----------------------|--------------|----------|-------|
| `using-afenda-elite-skills` | local-router | local | keep | Product farm routing; sole Lite/Elite entry | Session start / product tasks | doc-control-rules · AGENTS.md · docs-V2 | none | `.cursor/skills/using-afenda-elite-skills/SKILL.md` | Inventory SSOT is this file; Living docs/ dormant |

### L3 — Elite farms

| Skill | Source class | Management | Status | Owns | Invoked by | Controlled authority | Prerequisite | Evidence | Notes |
|-------|--------------|------------|--------|------|------------|----------------------|--------------|----------|-------|
| `afenda-elite-doc-control` | local-elite-farm | local | keep | Controlled-document lifecycle (DOC model) | Docs create/update/deprecate | doc-control-rules (DOC-001…003 operative) | none | `.cursor/skills/afenda-elite-doc-control/SKILL.md` | Living docs/ writes blocked while tree absent |
| `afenda-elite-doc-integrity` | local-elite-farm | local | keep | Doc↔doc conflict / SSOT drift audit | Integrity detect/plan/verify | doc-control-rules · authority-map | none | `.cursor/skills/afenda-elite-doc-integrity/SKILL.md` | N/A while Living docs/ absent; not controlled writes |
| `afenda-elite-frontend-scaffold` | local-elite-farm | local | keep | Target FE scaffold / wipe inventory; consumes `@afenda/ui-system` barrel | FE scaffold missions · app-route UI | ARCH-017 · ARCH-028 · ARCH-015 · ADR-010 | none | `.cursor/skills/afenda-elite-frontend-scaffold/SKILL.md` | Docs-first until implement request; UI primitives via `@afenda/ui-system` (ADR-010) |
| `afenda-elite-ui-compose` | local-elite-farm | local | keep | Product UI consistency lock — lean SKILL + reference progressive disclosure; QUALITY ORDER; Compose Score /100%; hard rule 15 / UI-CAP-*; F* + C* Vitest | Compose · handroll fix · visual consistency · UI audit/rate | ADR-010 · ARCH-024 · tokens.css · Geist | none | `.cursor/skills/afenda-elite-ui-compose/SKILL.md` | Done = capability + matrix + Compose Score; floor `pnpm check:ui-system`; reference = recipes/gates/rubric SSOT; Studio DNA method → `shadcn-ui` then return here |
| `shadcn-ui` | local-elite-farm | local | keep | Monorepo shadcn CLI + Studio DNA — ui-system product SSOT (no registries); Method A → `apps/web/shadcn-studio`; Method B MCP; `dna-ledger.json` metadata | Studio /iui /cui /rui · DNA forwarder · `ui:add` · Claude `@/components/ui` override · DNA ledger | ADR-010 · ARCH-015 · ARCH-024 · ui-system.mdc | none | `.cursor/skills/shadcn-ui/SKILL.md` | Owns AFN-DNA-* ledger; Afenda install registry deferred; never product-import DNA tree; compose → ui-compose |
| `afenda-elite-react-composition` | local-elite-farm | local | keep | React component API architecture adapter — RC-COMP-*; variants/compounds/providers; after ui-compose capability status | Boolean-mode refactor · compound API design · provider boundaries · UI-CAP shared-compound design | ADR-010 · ARCH-024 · ui-compose | ui-compose classifies first | `.cursor/skills/afenda-elite-react-composition/SKILL.md` | Vendor `vercel-composition-patterns` progressive only; may design package upgrades under BLOCKED_UI_SYSTEM; never feature-local substitute |
| `afenda-elite-react-best-practices` | local-elite-farm | local | keep | React runtime/perf adapter — override-only matrix over vendor RBP; waterfalls/rerender/bundle/serialization/hydration; evidence gate | Runtime perf review/refactor with evidence · bundle/rerender/waterfall smells | ADR-010 · ARCH-023 · ui-compose · nextjs-best-practice | App Router/cache stays with nextjs-best-practice | `.cursor/skills/afenda-elite-react-best-practices/SKILL.md` | Vendor `vercel-react-best-practices` progressive only; barrel override (`@afenda/ui-system`) + reject cross-request LRU for tenant data; no speculative micro-opt |
| `afenda-elite-nextjs-best-practice` | local-elite-farm | local | keep | App Router / RSC / cache / proxy mechanics | Next.js route/runtime work | ARCH-002 · ARCH-012 · ARCH-016 · ARCH-017 · ADR-008 · ARCH-027 | none | `.cursor/skills/afenda-elite-nextjs-best-practice/SKILL.md` | Wave 2 extend closed → keep |
| `afenda-elite-backend-modules` | local-elite-farm | local | keep | Module ports, residue, ownership map | Modules / hexagonal boundaries | ARCH-001 · ARCH-006 · ARCH-009 · ARCH-022 · ARCH-024 · ARCH-028 | none | `.cursor/skills/afenda-elite-backend-modules/SKILL.md` | Wave 2 extend closed → keep; Target vs docs-first path truth |
| `afenda-elite-api-contract` | local-elite-farm | local | keep | ActionResult, brands, OpenAPI, REST contracts | API / BFF contract work | docs-V2/api Scratch · disk app/api · OPEN YAML | none | `.cursor/skills/afenda-elite-api-contract/SKILL.md` | Scratch + disk honesty; Living docs/api retired on this checkout |
| `afenda-elite-module-readiness` | local-elite-farm | local | keep | Module evidence ledgers · Module Enterprise Readiness claims | MOD-009 / MOD-010 evidence and claim work | MOD-002 · owning `*-MOD-009` / `*-MOD-010` | none | `.cursor/skills/afenda-elite-module-readiness/SKILL.md` | MOD-002/009/010 only — no scratch QG · no edition certification |
| `afenda-elite-repo-housekeeping` | local-elite-farm | local | keep | Knip/drift discovery; skill-catalog align | Housekeeping / catalog drift | ARCH-024 · ARCH-028 · this catalog | none | `.cursor/skills/afenda-elite-repo-housekeeping/SKILL.md` | Deletes → monorepo-refactor Slice D |
| `afenda-elite-monorepo-discipline` | local-elite-farm | local | keep | Day-to-day `@afenda/*` import/DAG/export surface | Cross-package imports · new `packages/*` · layer violations · Rank-1 http/security/metrics/audit/search/notifications/events/master-data/ai-the-machine | ARCH-024 · ARCH-022 · docs-V2/monorepo · docs-V2/ai · docs-V2/events · docs-V2/master-data | none | `.cursor/skills/afenda-elite-monorepo-discipline/SKILL.md` · [LAYERS.md](../afenda-elite-monorepo-discipline/LAYERS.md) | Lite rewrite of Xerp `monorepo-discipline` (no Xerp LOAD); AI DNA under docs-V2/ai |
| `afenda-elite-monorepo-refactor` | local-elite-farm | local | keep | Governed extract/move/Slice D | Cross-package refactor | ARCH-024 · ARCH-028 | none | `.cursor/skills/afenda-elite-monorepo-refactor/SKILL.md` | Day-to-day boundaries → monorepo-discipline |
| `afenda-elite-implementation-slices` | local-elite-farm | local | keep | One GUIDE-018 Phase I / residual ARCH-028 / Neon Auth `N*` mission + command sheets | Named `PHASE_ID` (I*) / `SLICE_ID` (S*|N*) / command-sheet or neon-command-sheet paste | GUIDE-018 · ARCH-028 · ARCH-023/026 for N* (+ sibling per map) | Checkpoint G closed; Phase I open; N* UNEVALUATED until Neon Slice Score + audit | `.cursor/skills/afenda-elite-implementation-slices/SKILL.md` | Routes via slice-map / neon-auth-slice-map; Neon Slice Score + independent APPROVED; no dedicated neon-erp farm |
| `afenda-elite-audit-orchestrator` | local-elite-farm | local | keep | Authority→implementation alignment audit; plan traceability; check-coverage matrix | Doc-to-code alignment; cross-layer audit; alignment matrix | DOC-001…003 · AGENTS.md · farm completeness standards | none | `.cursor/skills/afenda-elite-audit-orchestrator/SKILL.md` | Orchestration-only v1; delegates to owning farms; no bundled validator |


### Domain farms

| Skill | Source class | Management | Status | Owns | Invoked by | Controlled authority | Prerequisite | Evidence | Notes |
|-------|--------------|------------|--------|------|------------|----------------------|--------------|----------|-------|
| `neon-tenancy-efficiency` | local-domain-farm | local | keep | Neon shared-schema tenancy + ARCH-023 IAM application | Tenancy / Neon ops | ARCH-023 · ARCH-025 · ARCH-027 | none | `.cursor/skills/neon-tenancy-efficiency/SKILL.md` | Wave 2 extend closed → keep; ARCH-027 `@afenda/env` + `.env.local` |
| `afenda-docs-app` | local-domain-farm | local | keep | Official Fumadocs app `@afenda/docs` — narrative MDX, OpenAPI/package publish, runtime, gates, host locks | apps/docs · docs-V2/docs · generate:openapi-docs · generate:package-docs · check:docs-app · :3001 | docs-V2/docs Scratch · disk apps/docs · OPEN-001 | none | `.cursor/skills/afenda-docs-app/SKILL.md` | Operational contract + completion report; not Living DOC-001; bans 8bitcn/registry templates |
| `feed-farm-trade` | local-domain-farm | local | forbidden | — (skill directory removed) | — | — | — | — | Nuclear wipe — FFT product module + farm **removed**; do not recreate |
| `update-mcp-config` | local-domain-farm | local | keep | Project MCP config updates | MCP wiring | AGENTS.md · `.vscode/mcp.json` | none | `.cursor/skills/update-mcp-config/SKILL.md` | |
| `cursor-mission-compile` | local-agent-ops | local | keep | Compiles raw prose/HTML/logs/tickets into budget Cursor missions | Prompt clean · transform · optimize · compile | Scratch vibe guideline · context-engineering | none | `.cursor/skills/cursor-mission-compile/SKILL.md` | Compile only — does not execute; Agent search owns discovery; no PREFLIGHT paste |

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
| `vercel-composition-patterns` | vendored-method | `.cursor/skills/vercel-composition-patterns/SKILL.md` (progressive under `afenda-elite-react-composition`; not a competing product entry) |
| `vercel-react-best-practices` | vendored-method | `.cursor/skills/vercel-react-best-practices/react-best-practices/SKILL.md` (progressive under `afenda-elite-react-best-practices`; not a competing product entry) |

Container folder `.cursor/skills/agent-skills/` has no top-level `SKILL.md` by design (skill roots live under `skills/`). Vercel vendor trees live at `.cursor/skills/vercel-*` — invoke after the matching Elite farm is fixed; do not fork into `afenda-elite-*`.

### Local method library

Management = `local`. Status = `keep`. Method library invoked after a farm is fixed — not under `agent-skills/` and not an Elite-named farm fork.

| Skill | Source class | Evidence |
|-------|--------------|----------|
| `afenda-readme-diataxis` | local-method | `.cursor/skills/afenda-readme-diataxis/SKILL.md` (Diátaxis triage + QUALITY ORDER + README Score / Path to 100%; handoff to doc-control / technical-writing / documentation-and-adrs) |
| `technical-writing` | local-method | `.cursor/skills/technical-writing/SKILL.md` |
| `afenda-coding-discipline` | local-method | `.cursor/skills/afenda-coding-discipline/SKILL.md` (full TS/coding table after farm fixed; L0 floor = alwaysApply `.cursor/rules/coding-discipline.mdc` → PREFLIGHT **Rules**; skill name only under **Skills** when loaded) |

## Planned (approved backlog — no SKILL.md until authoring mission)

_None. Last authored: `afenda-docs-app` 2026-07-20 → keep (local-domain-farm)._

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
| `afenda-elite-design-system` (Studio promote → gateway pipeline) | Hard-deleted 2026-07-16 — ADR-010 retires the `@afenda/ui` gateway; product primitives via `@afenda/ui-system`; Studio DNA method = [`shadcn-ui`](../shadcn-ui/SKILL.md) (stage `apps/web/shadcn-studio` → promote) — do not restore this farm |
| `afenda-elite-ui-handoff` (UI handoff gate) | Hard-deleted 2026-07-16 — ADR-010 boundary is enforced by committed guardrail tests (`ui-boundary` / `consistency` / `overlays.interaction`), not a skill |
| `admincn-customization` (AdminCN shell / Studio DNA in `components-V2`) | Hard-deleted 2026-07-16 — targeted retired `components-V2` / Studio-registry surface; AdminCN architecture authority = ARCH-018 (skill-local / Scratch; Living body dormant); DNA intake = [`shadcn-ui`](../shadcn-ui/SKILL.md); primitives via `@afenda/ui-system` |

## Gap → Wave 2 routing

| Need | Catalog status | Mission order |
|------|----------------|---------------|
| Tenant isolation + ARCH-023 platform IAM absorption | keep `neon-tenancy-efficiency` | Wave 2.1 done |
| API schemas / errors / ARCH-029 §3.3 pipeline | keep `afenda-elite-api-contract` | Wave 2.2 done |
| App Router Actions / ARCH-027 env | keep `afenda-elite-nextjs-best-practice` | Wave 2.3 done |
| Module ports / ARCH-006 boundaries | keep `afenda-elite-backend-modules` | Wave 2.4 done |
| Module evidence / readiness claims | keep `afenda-elite-module-readiness` | Authored after API env cleanup; Declarations/FFT product modules removed |
| Broader RBAC/SoD farm · env farm · Action farm · drizzle · test | candidate (above) | Not Wave 2 authoring |

## Wave 2 extend status (history · 2026-07-14)

| Mission | Farm | History | Catalog status now |
|---------|------|---------|-------------------|
| 2.1 | `neon-tenancy-efficiency` | Extended — ARCH-023 IAM + ARCH-027 env reconciliation | **keep** |
| 2.2 | `afenda-elite-api-contract` | Extended — ARCH-029 §3.3 ten-stage pipeline | **keep** |
| 2.3 | `afenda-elite-nextjs-best-practice` | Extended — Action mechanics + ARCH-027 env (`@afenda/env`) | **keep** |
| 2.4 | `afenda-elite-backend-modules` | Extended — Target vs docs-first companions | **keep** |

**P1 corrections (same wave):** ten-stage pipeline; retired compose guidance; companions no longer claim deleted trees as disk SSOT; env reconciled to ARCH-027 (`@afenda/env`); `afenda-elite-module-readiness` authored → **keep**. Declarations/FFT product farms **removed** (nuclear wipe).

### RBAC absorption note

ARCH-023 three-tier IAM, hard org predicates, permission-first checks, session/org binding, and seed codes are absorbed across neon-tenancy (+ api-contract / nextjs / backend-modules). `afenda-elite-rbac` remains **candidate**.

## Parity rules (housekeeping)

`skill-catalog-drift` means any of:

1. On-disk `SKILL.md` missing from this catalog (or vice versa for `keep|extend`)
2. Folder name ≠ frontmatter `name`
3. Router invoke target not listed as `keep|extend`
4. `candidate|planned|forbidden` row present on disk

Align by editing this catalog, the router, or disk evidence — never by inventing `doc/` registers.
