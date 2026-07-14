---
name: using-afenda-elite-skills
description: Routes Afenda-Lite / Elite overlay work to the correct farm skill. Use when starting product, docs, monorepo, or domain tasks in this repository before invoking vendor phase skills.
---

# Using Afenda Elite Skills

## Mode

Internal guide for agents and maintainers. **Enables:** pick the right farm and skill without inventing terms or a skill zoo.

**End-state:** this skill is the **only product entry**. Vendor phase skills under `agent-skills/skills/` are a **method library** after the farm is fixed — not Elite-named forks.

**Editions:** Afenda-Lite (this checkout, **beta**) and Afenda-Elite (**battle-proven**) share [DOC-001](../../../docs/_control/DOC-001-documentation-control-standard.md) documentation control and similar infrastructure aliasing. Maturity differs; catalogue shape does not.

```text
LOAD:
  docs/README.md
  docs/_control/DOC-001-documentation-control-standard.md
  docs/_control/DOC-002-documentation-register.md
  docs/_control/DOC-003-controlled-document-template.md
SKIP:
  recreating doc/ · Fumadocs-as-authority · hand glossary twin
  Storybook / Guardian Auth product restore · guardian-css-audit · FFT P3 flag promotion without gate-register
  afenda-Xerp editorial bundles (different repo overlay)
  forking vendor phase skills into afenda-elite-*
  inventing categories outside DOC-001 · auto-registering IDs without user approval
  treating Lite and Elite as divergent documentation systems
  reduced-viability quality / proposal / planning frames (sole bar = enterprise production; no-mvp-quality-bar)
```

**Authority above skills:** documentation homes, lifecycle, and register rules from [DOC-001](../../../docs/_control/DOC-001-documentation-control-standard.md) + [DOC-002](../../../docs/_control/DOC-002-documentation-register.md) + [DOC-003](../../../docs/_control/DOC-003-controlled-document-template.md). Product display names follow [AGENTS.md](../../../AGENTS.md) and the deprecation register — do not invent alternate product titles in skills.

## Invoke order

```text
Task arrives (this repo / Afenda-Lite)
    │
    ├── Product routing, monorepo, docs types, apps/docs? ──→ THIS skill first
    ├── Docs create/update/deprecate/classify? ─────────────→ afenda-elite-doc-control → documentation-and-adrs (prose)
    ├── Docs duplication / conflict / SSOT / register drift? → afenda-elite-doc-integrity
    ├── One mission / commit mixing risk? ──────────────────→ bounded-agent-lanes
    ├── Dead code / Knip / skill-catalog drift? ────────────→ afenda-elite-repo-housekeeping
    ├── Cross-package move / extract / Slice D delete? ─────→ afenda-elite-monorepo-refactor
    ├── FE scaffold / wipe / app routes? ───────────────────→ afenda-elite-frontend-scaffold
    ├── Next.js App Router / RSC / rendering / proxy / MCP routes? → afenda-elite-nextjs-best-practice
    ├── Modules / ports / residue? ─────────────────────────→ afenda-elite-backend-modules
    ├── API contract / ActionResult / brands / OpenAPI / REST-001? ─→ afenda-elite-api-contract
    ├── Generic engineering lifecycle? ─────────────────────→ using-agent-skills
    └── Domain farm (Neon, FFT, AdminCN)? ──────────────────→ neon-tenancy / feed-farm-trade / admincn-customization
```

**Rule:** This router chooses *which farm*. Vendor phase skills choose *how to engineer* once the farm is fixed. Housekeeping never deletes — it hands **Slice D** to monorepo-refactor. Retired names: `portal-*-*` → use `afenda-elite-*` above. Wave 3: `afenda-elite-documentation` → `afenda-elite-doc-control`; `afenda-elite-docs-consistency` → `afenda-elite-doc-integrity`. Next.js mechanics: Xerp-borrowed `afenda-elite-nextjs-best-practice` (not Xerp overlay).

## Docs filesystem (Docs lane)

```text
LOAD skill → afenda-elite-doc-control (controlled-document lifecycle) → documentation-and-adrs (deep prose/ADR composition, still independently available)
Authority  → DOC-001 + DOC-002 + DOC-003 (under docs/_control/)
Classify   → Control | Architecture | ADR | API | REST | OPEN | Runbook | Guide | Module
Place      → docs/_control | docs/architecture [| /adr | /archive] | docs/api | docs/runbooks | docs/guides | docs/modules/<slug>
Write      → DOC-003 header (incl. Control State) + six sections; cite related IDs; no secrets
Register   → DOC-002 seven fields only — after explicit ID approval (no Control State column)
Lifecycle  → Status: Draft | Review | Accepted | Living | Target | Superseded | Retired
Control    → Control State: Open | Closed | Reopened (header-only; ≠ Status)
Verify     → header ↔ DOC-002; Control State enforced; filename {ID}-{kebab-slug}.md; no SSOT under doc/
Integrity  → afenda-elite-doc-integrity (doc↔doc detect / plan / verify — not controlled writes)
Prose      → documentation-and-adrs (method library only — not register SSOT)
```

## Layers

| Layer | Owns |
|-------|------|
| L0 Rules / `AGENTS.md` | Always-on boundaries |
| L1 This skill + `using-agent-skills` | Product routing vs vendor lifecycle |
| L2 Documentation control · lanes · deprecation | Stability SSOT |
| L3 Platform / module / housekeeping+refactor / planned `afenda-elite-*` | Domain workflows |

## Operating contract

1. **Do not invent product display names** — follow AGENTS.md / deprecation register.
2. **Authoritative docs live under `docs/`** — categories and folders per DOC-001. Accept/Living/Target → DOC-002 row after user-approved ID. Do **not** recreate `doc/`.
3. **Fumadocs = Day-1 mirror** when present — not authority; no DB/Auth/`CRON_SECRET` on docs project; no `_reference/` upload.
4. **One lane per mission** — Ops / Fix / Docs / Test / Normalize; no mixing.
5. **Before creating a skill** — prefer a register row, router bullet, or existing farm. Do not fork vendor phase skills into `afenda-elite-*`.

## Non-goals

- Parallel Accepted/Living SSOT under `doc/` for either edition  
- Hand-maintained MD+JSON glossary twins as documentation SSOT  
- Per-module documentation control standards that weaken DOC-001  
- Treating Lite beta vs Elite battle-proven as an excuse for divergent catalogue rules  
- Duplicating vendor lifecycle inside Elite skills  

## Verification

- [ ] Invoked this skill (or equivalent LOAD) before product farm work  
- [ ] Docs work cites DOC-001 / DOC-002 / DOC-003, not a reinvented scheme  
- [ ] Lane named; no lane mixing  
- [ ] Domain skill chosen from catalog status (keep / planned / forbidden)  

## Additional resources

- Pointer: [reference.md](reference.md)  
- Documentation governance: [afenda-elite-doc-control](../afenda-elite-doc-control/SKILL.md)
- Documentation conflict audits: [afenda-elite-doc-integrity](../afenda-elite-doc-integrity/SKILL.md)
- Control: [DOC-001](../../../docs/_control/DOC-001-documentation-control-standard.md) · [DOC-002](../../../docs/_control/DOC-002-documentation-register.md) · [DOC-003](../../../docs/_control/DOC-003-controlled-document-template.md)
- Housekeeping: [afenda-elite-repo-housekeeping](../afenda-elite-repo-housekeeping/SKILL.md)
- Refactor: [afenda-elite-monorepo-refactor](../afenda-elite-monorepo-refactor/SKILL.md)
- FE scaffold: [afenda-elite-frontend-scaffold](../afenda-elite-frontend-scaffold/SKILL.md)
- Next.js App Router: [afenda-elite-nextjs-best-practice](../afenda-elite-nextjs-best-practice/SKILL.md) — Accelint + Cache Components Mode A default / Mode B ADR-gated
- Modules: [afenda-elite-backend-modules](../afenda-elite-backend-modules/SKILL.md)
- API contract: [afenda-elite-api-contract](../afenda-elite-api-contract/SKILL.md) — mirrors `docs/api` + ARCH-029; sync via GUIDE-015 phases + `check:doc-integrity`
- Vendor lifecycle: [using-agent-skills](../agent-skills/skills/using-agent-skills/SKILL.md)
- Docs prose: [documentation-and-adrs](../agent-skills/skills/documentation-and-adrs/SKILL.md)
- Lanes: [bounded-agent-lanes](../agent-skills/skills/bounded-agent-lanes/SKILL.md)
