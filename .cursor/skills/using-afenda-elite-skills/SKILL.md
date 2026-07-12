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
  doc/architecture/afenda-elite-documentation-types.md
  doc/architecture/afenda-elite-doc-registry.md
  doc/architecture/afenda-elite-glossary-register.md
  doc/architecture/afenda-elite-skills-architecture.md
SKIP:
  Lite-as-ceiling deepen · Fumadocs-as-authority · hand glossary twin
  Storybook / Guardian Auth product restore · guardian-css-audit · FFT P3 flag promotion without gate-register
  afenda-Xerp editorial bundles (different repo overlay)
  forking vendor phase skills into afenda-elite-*
  production SSOT under doc/ · Elite controllers under docs/
```

**Authority above skills:** cite `term.*` from the [glossary register](../../../doc/architecture/afenda-elite-glossary-register.md); doc homes from [documentation-types](../../../doc/architecture/afenda-elite-documentation-types.md) + [doc-registry](../../../doc/architecture/afenda-elite-doc-registry.md). Skills never redefine product names.

## Invoke order

```text
Task arrives (this repo / Afenda Elite)
    │
    ├── Elite product, monorepo, glossary, docs types, apps/docs? ──→ THIS skill first
    ├── One mission / commit mixing risk? ──────────────────────────→ bounded-agent-lanes
    ├── Dead code / Knip / skill-catalog drift? ────────────────────→ afenda-elite-repo-housekeeping
    ├── Cross-package move / extract / Slice D delete? ─────────────→ afenda-elite-monorepo-refactor
    ├── FE scaffold / wipe / app routes? ───────────────────────────→ afenda-elite-frontend-scaffold
    ├── Modules / ports / residue? ─────────────────────────────────→ afenda-elite-backend-modules
    ├── API contract / ActionResult / brands? ──────────────────────→ afenda-elite-api-contract
    ├── Generic engineering lifecycle? ─────────────────────────────→ using-agent-skills
    └── Domain farm (Neon, FFT, AdminCN)? ──────────────────────────→ neon-tenancy / feed-farm-trade / admincn-customization
```

**Rule:** This router chooses *which farm*. Vendor phase skills choose *how to engineer* once the farm is fixed. Housekeeping never deletes — it hands **Slice D** to monorepo-refactor. Retired names: `portal-*-*` → use `afenda-elite-*` above.

## Layers

| Layer | Owns |
|-------|------|
| L0 Rules / `AGENTS.md` | Always-on boundaries |
| L1 This skill + `using-agent-skills` | Elite routing vs vendor lifecycle |
| L2 Glossary · documentation-types · lanes · deprecation | Stability SSOT |
| L3 Platform / module / housekeeping+refactor / planned `afenda-elite-*` | Domain workflows |

## Operating contract

1. **Cite `term.*`** — do not invent display names in ADRs, UI chrome concepts, or new skills.
2. **Five production doc types only** — new type → amend documentation-types first. Homes: `docs/`; Elite controllers: `doc/architecture/afenda-elite-*`. Violation → stop (`check:doc-registry`).
3. **Fumadocs = Day-1 mirror** — not authority; no DB/Auth/`CRON_SECRET` on docs project; no `_reference/` upload.
4. **Glossary farms** — target SSOT `@repo/glossary` `terms.yaml` → register MD · i18n · Fumadocs meta; until Phase C, markdown register is the editable seed.
5. **One lane per mission** — Ops / Fix / Docs / Test / Normalize; no mixing.
6. **Before creating a skill** — pass matrices in [afenda-elite-skills-architecture.md](../../../doc/architecture/afenda-elite-skills-architecture.md). If a register row or router bullet suffices, do not create a skill.

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

- Catalog + matrices (SSOT): [afenda-elite-skills-architecture.md](../../../doc/architecture/afenda-elite-skills-architecture.md)  
- Pointer: [reference.md](reference.md)  
- Housekeeping: [afenda-elite-repo-housekeeping](../afenda-elite-repo-housekeeping/SKILL.md)  
- Refactor: [afenda-elite-monorepo-refactor](../afenda-elite-monorepo-refactor/SKILL.md)  
- FE scaffold: [afenda-elite-frontend-scaffold](../afenda-elite-frontend-scaffold/SKILL.md)  
- Modules: [afenda-elite-backend-modules](../afenda-elite-backend-modules/SKILL.md)  
- API contract: [afenda-elite-api-contract](../afenda-elite-api-contract/SKILL.md)  
- Vendor lifecycle: [using-agent-skills](../agent-skills/skills/using-agent-skills/SKILL.md)  
- Lanes: [bounded-agent-lanes](../agent-skills/skills/bounded-agent-lanes/SKILL.md)  
