# MOD-002 Modules Index

| Field | Value |
|-------|-------|
| ID | MOD-002 |
| Category | Module |
| Version | 2.1.0 |
| Status | Living |
| Owner | Platform |
| Updated | 2026-07-13 |

## Purpose

`docs/modules/` is the home for **product-module documentation**. Every product module uses the same **10-MOD spine**. This document is the catalogue of modules and the authoritative **10-MOD guideline**.

## Module catalog

| Module | Shell id | Home | Index | Agent runtime |
|--------|----------|------|-------|---------------|
| Feed Farm Trade | `fft` | [feed-farm-trade/](feed-farm-trade/) | [FFT-MOD-010](feed-farm-trade/FFT-MOD-010-module-docs-index.md) | [FFT-MOD-008](feed-farm-trade/FFT-MOD-008-ops-runtime.md) |

Platform tenancy / RBAC (not a product-module spine): [ARCH-011](../architecture/ARCH-011-platform-tenancy-rbac.md) · [ARCH-023](../architecture/turborepo/ARCH-023-multi-tenancy.md).

## Target layout

```text
docs/modules/
  MOD-002-modules-index.md          ← this file (catalog + guideline)
  <module-slug>/
    README.md                       → MOD-010
    *-MOD-001-…md … *-MOD-010-…md   ← 10-MOD spine only
```

**File + header IDs** are module-qualified (`FFT-MOD-001`, …) so every module can implement the same spine roles without ID collision. Indexes may still say “MOD-001 Architecture”.

**No depth folders** under module homes (`adr/`, `ops/`, `spec/`, …). Put gates and contracts in MOD-008 / MOD-005 / guides; platform decisions live under `docs/architecture/`.

---

## Guideline — the 10 MOD

Every product module must ship all ten. Status may be Draft until accurate; Living when authoritative. Do not add typed depth trees under the module slug.

### MOD-001 Module Architecture

- **Mode:** architecture
- **Enables:** understand system shape before coding
- **Required sections:** Context · Responsibilities and boundaries · Components · Data / request flow · Key decisions (link ADRs) · Failure modes · Operational considerations · Known limits
- **Must include:** boundary diagram; explicit non-goals
- **Must not:** paste full PRDs, gate SQL matrices, or changelog noise

### MOD-002 Domain and Ownership

- **Mode:** architecture
- **Enables:** know which code/docs own which concepts
- **Required sections:** Bounded context · Ubiquitous language · Code ownership map · Doc ownership · Forbidden renames / duplicate stacks
- **Must not:** redefine platform tenancy (link ARCH-023 / ADR-002)

### MOD-003 Tech Stack

- **Mode:** architecture / internal-guide
- **Enables:** know runtime, libraries, and module-scoped env
- **Required sections:** Runtime · Frameworks/UI · Data access · Auth dependency · Module feature flags / env keys · Local vs prod differences
- **Must not:** invent platform-wide env policy (link ARCH-027); never document secret values

### MOD-004 Data Model

- **Mode:** architecture
- **Enables:** schema and tenancy column rules for the module
- **Required sections:** Entities / tables · Relationships · `organization_id` rules · Migration ownership · Indexes / hot paths · Deferred denorms (if any)
- **Must link:** ARCH-023 Decision lock where relevant

### MOD-005 Auth, Tenancy and RBAC

- **Mode:** architecture
- **Enables:** correct gates and permission checks
- **Required sections:** Identity source · Org resolution · Platform vs module permissions · Route/action gates · Control-plane surfaces · Deny behavior
- **Must link:** ADR-002, ARCH-023, module RBAC ADR(s)

### MOD-006 Surfaces and Routes

- **Mode:** architecture
- **Enables:** find UI/route homes without inventing paths
- **Required sections:** Route map · Layout/shell · AdminCN alignment · Client vs operator surfaces · Thin page rule
- **Must link:** frontend ARCH maps / FE ADRs as needed

### MOD-007 API and Adapters

- **Mode:** architecture
- **Enables:** correct BFF/action/adapter patterns for the module
- **Required sections:** Server Actions map · Route Handlers (if any) · Result / error types · Ports/adapters · What stays in `docs/api` vs module-specific
- **Must not:** duplicate API-001/002 — link them

### MOD-008 Ops Runtime

- **Mode:** runbook / internal-guide
- **Enables:** operate and change prod safely — **default agent entry**
- **Required sections:** Production state · Allowed / forbidden · Verify commands · Rollout / rollback pointers · Incident quick checks
- **Must include:** production state, allowed/forbidden, verify commands (gate detail lives here — not a separate `ops/` tree)

### MOD-009 Verification

- **Mode:** internal-guide
- **Enables:** prove slices with evidence
- **Required sections:** AC / evidence expectations · Unit / interaction / e2e touchpoints · Gate evidence pointers · “Done” definition
- **Must link:** testing README, module verify skill card, MOD-008 for gate evidence

### MOD-010 Module Docs Index

- **Mode:** module index
- **Enables:** navigation + read order
- **Required sections:** Status snapshot · Agent read order · Catalog of MOD-001…009 · Links to FE/platform ADRs · Frozen boundaries

---

## Promotion rule

1. Create `docs/modules/<slug>/` with the 10 qualified `*-MOD-001`…`010` files (Draft OK).
2. Add a row to the module catalog above.
3. Do not recreate depth folders under the module slug.
4. Point AGENTS / skills at MOD-008 (runtime) and MOD-010 (index).

## Change Log

| Version | Date | Summary |
|---------|------|---------|
| 2.1.0 | 2026-07-13 | Spine-only module homes — depth folders forbidden |
| 2.0.0 | 2026-07-13 | 10-MOD spine guideline; FFT under `feed-farm-trade/` |
| 1.0.0 | 2026-07-13 | Scaffolded modules folder |
