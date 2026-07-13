---
name: using-afenda-elite-skills
description: Routes Afenda Elite agent work — skill catalog, glossary/doc-type authority, Fumadocs Day-1 mirror locks, housekeeping/refactor handoff, and matrices for when to create skills. Use when starting Elite monorepo sessions, choosing which skill to load, adding a new Elite skill, dead-code/Knip audits, cross-package refactors, or when the task touches term.*, documentation types, apps/docs, or Lite→Elite residue.
disable-model-invocation: true
---

# Using Afenda Elite Skills

## Mode

Internal guide for agents and maintainers. **Enables:** pick the right farm and skill without inventing terms or a skill zoo.

**End-state:** this skill is the **only product entry**. Vendor phase skills under `agent-skills/skills/` are a **method library** after the farm is fixed — not Elite-named forks.

```text
LOAD:
  doc/REGISTRY.md
  doc/register/DOC-002-documentation-system.md
  doc/register/DOC-003-glossary.md
  doc/architecture/DOC-004-skills-architecture.md
SKIP:
  Lite-as-ceiling deepen · Fumadocs-as-authority · hand glossary twin
  Storybook / Guardian Auth product restore · guardian-css-audit · FFT P3 flag promotion without gate-register
  afenda-Xerp editorial bundles (different repo overlay)
  forking vendor phase skills into afenda-elite-*
  Accepted SSOT under docs/ · inventing doc types outside DOC-002
```

**Authority above skills:** cite `term.*` from [DOC-003](../../../doc/register/DOC-003-glossary.md); doc homes/lifecycle from [DOC-002](../../../doc/register/DOC-002-documentation-system.md) + [DOC-001](../../../doc/REGISTRY.md). Skills never redefine product names.

## Invoke order

```text
Task arrives (this repo / Afenda Elite)
    │
    ├── Elite product, monorepo, glossary, docs types, apps/docs? ──→ THIS skill first
    ├── Docs create/update/deprecate/classify? ─────────────────────→ afenda-elite-documentation → documentation-and-adrs (prose)
    ├── One mission / commit mixing risk? ──────────────────────────→ bounded-agent-lanes
    ├── Dead code / Knip / skill-catalog drift? ────────────────────→ afenda-elite-repo-housekeeping
    ├── Cross-package move / extract / Slice D delete? ─────────────→ afenda-elite-monorepo-refactor
    ├── FE scaffold / wipe / app routes? ───────────────────────────→ afenda-elite-frontend-scaffold
    ├── Modules / ports / residue? ─────────────────────────────────→ afenda-elite-backend-modules
    ├── API contract / ActionResult / brands / OpenAPI / REST-001? ─→ afenda-elite-api-contract
    ├── Generic engineering lifecycle? ─────────────────────────────→ using-agent-skills
    └── Domain farm (Neon, FFT, AdminCN)? ──────────────────────────→ neon-tenancy / feed-farm-trade / admincn-customization
```

**Rule:** This router chooses *which farm*. Vendor phase skills choose *how to engineer* once the farm is fixed. Housekeeping never deletes — it hands **Slice D** to monorepo-refactor. Retired names: `portal-*-*` → use `afenda-elite-*` above.

## Docs filesystem (Docs lane)

```text
LOAD skill → afenda-elite-documentation
Authority  → DOC-001 + DOC-002 (+ DOC-003 for names)
Classify   → ADR | Register | Architecture | Runbook | API Contract
Place      → doc/adr | doc/register | doc/architecture | doc/runbooks | doc/api
Write      → header ↔ registry; cite term.*; no secrets
Lifecycle  → Draft | Review | Accepted | Superseded | Deprecated | Archived
Verify     → npm run check:doc-registry (non-zero = stop)
Prose      → documentation-and-adrs (method library only — not registry SSOT)
```

## Layers

| Layer | Owns |
|-------|------|
| L0 Rules / `AGENTS.md` | Always-on boundaries |
| L1 This skill + `using-agent-skills` | Elite routing vs vendor lifecycle |
| L2 Glossary · documentation system · lanes · deprecation | Stability SSOT |
| L3 Platform / module / housekeeping+refactor / planned `afenda-elite-*` | Domain workflows |

## Operating contract

1. **Cite `term.*`** — do not invent display names in ADRs, UI chrome concepts, or new skills.
2. **Five production doc types under `doc/`** — ADR · Register · Architecture · Runbook · API Contract per DOC-002. Accept → registry row in DOC-001. Violation → stop (`check:doc-registry`).
3. **Fumadocs = Day-1 mirror** — not authority; no DB/Auth/`CRON_SECRET` on docs project; no `_reference/` upload.
4. **Glossary farms** — target SSOT `@repo/glossary` `terms.yaml` → register MD · i18n · Fumadocs meta; until Phase C, markdown register is the editable seed.
5. **One lane per mission** — Ops / Fix / Docs / Test / Normalize; no mixing.
6. **Before creating a skill** — pass matrices in [DOC-004](../../../doc/architecture/DOC-004-skills-architecture.md). If a register row or router bullet suffices, do not create a skill.

## Non-goals

- Treating Afenda-Lite as the Elite ceiling  
- Hand-maintained MD+JSON glossary twins  
- Per-module glossary SSOTs or wiki skills  
- Deferring `apps/docs` to a late phase  
- Duplicating vendor lifecycle inside Elite skills  

## Verification

- [ ] Invoked this skill (or equivalent LOAD) before Elite farm work  
- [ ] Terms cited by `id`, not redefined  
- [ ] Lane named; no lane mixing  
- [ ] New skill (if any) passed complexity matrix in reference.md  
- [ ] Domain skill chosen from catalog status (keep / planned / forbidden)  

## Additional resources

- Catalog + matrices (SSOT): [DOC-004](../../../doc/architecture/DOC-004-skills-architecture.md)  
- Pointer: [reference.md](reference.md)  
- Documentation governance: [afenda-elite-documentation](../afenda-elite-documentation/SKILL.md)  
- Housekeeping: [afenda-elite-repo-housekeeping](../afenda-elite-repo-housekeeping/SKILL.md)  
- Refactor: [afenda-elite-monorepo-refactor](../afenda-elite-monorepo-refactor/SKILL.md)  
- FE scaffold: [afenda-elite-frontend-scaffold](../afenda-elite-frontend-scaffold/SKILL.md)  
- Modules: [afenda-elite-backend-modules](../afenda-elite-backend-modules/SKILL.md)  
- API contract: [afenda-elite-api-contract](../afenda-elite-api-contract/SKILL.md)  
- Vendor lifecycle: [using-agent-skills](../agent-skills/skills/using-agent-skills/SKILL.md)  
- Docs prose: [documentation-and-adrs](../agent-skills/skills/documentation-and-adrs/SKILL.md)  
- Doc rows: [doc/REGISTRY.md](../../../doc/REGISTRY.md)  
- Lanes: [bounded-agent-lanes](../agent-skills/skills/bounded-agent-lanes/SKILL.md)  
