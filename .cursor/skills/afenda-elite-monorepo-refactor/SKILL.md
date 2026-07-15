---
name: afenda-elite-monorepo-refactor
description: Plans and executes governed monorepo refactors for Afenda Elite — package extraction, layer fixes, export moves, consumer migrations, and Slice D removals from housekeeping. Serializes safe slices, runs scoped gates, and respects @afenda/* DAG + apps/web. Use when refactoring across packages, moving code between layers, extracting shared libraries, fixing import violations, or deleting dead code after housekeeping classify. Day-to-day import rules live in afenda-elite-monorepo-discipline.
disable-model-invocation: true
---

# Afenda Elite — Monorepo Refactor

Local Elite monorepo refactor: Phase 0 contract · audit/plan/execute/stabilize · Slices A–E. Targets `@afenda/*` · `apps/web` · no PAS/Storybook/architecture-authority package. Day-to-day DAG/import checks → [`afenda-elite-monorepo-discipline`](../afenda-elite-monorepo-discipline/SKILL.md).

**Announce:** "I'm using afenda-elite-monorepo-refactor — stating refactor contract before edits."

```text
LOAD: using-afenda-elite-skills · docs/_control (Docs lane) · package DAG ADRs when Accepted
SKIP: bulk codemods · full-repo lint --fix · _reference/archive · Fumadocs-as-authority edits
LANE: Normalize (structure) or Fix (single bug) — one lane; housekeeping removals = Normalize
```

---

## Skill chain

| Phase | Delegate to |
|-------|-------------|
| Dead-code discovery | `/afenda-elite-repo-housekeeping` |
| Package DAG / new package checklist | [`afenda-elite-monorepo-discipline`](../afenda-elite-monorepo-discipline/SKILL.md) · [ARCH-024](../../../docs/architecture/ARCH-024-package-boundaries.md) · [ARCH-028](../../../docs/architecture/ARCH-028-implementation-slices.md) |
| Engineering method | `using-agent-skills` → incremental-implementation |
| Simplify after move | `code-simplification` |
| Compulsory bans | `deprecation-and-migration` |

---

## Modes

| Keyword | Mode | Edits? | Output |
|---------|------|--------|--------|
| `audit` | Safety assessment | No | Risk matrix + Go / No-go / Slice-first |
| `plan` | Serialized slices | No | Numbered slices + execute commands |
| `execute` | One approved slice | Yes | Implementation + gates + evidence |
| `stabilize` | Post-refactor health | Yes | Minimal repair; re-run gates |

Default: `audit`/`plan` unless user names one concrete slice → `execute`.

---

## Hard stops

- Creates or widens a circular dependency  
- Duplicates authority (glossary terms, doc types, tenancy, secrets on docs)  
- Touches generated glossary farms by hand  
- Spans multiple slices but user asked for one  
- Bulk regex tree-wide replace / throwaway migration scripts  
- `git restore` / `git clean` on unrelated WIP  
- Full-repo `lint --fix` / biome write without explicit approval  

---

## Phase 0 — Refactor contract (before edits)

```text
1. Refactor type     — extract | move | rename-export | split-package | layer-fix | consumer-migration | removal
2. Objective         — one sentence: what moves from where to where
3. Source scope      — exact folders/files
4. Target scope      — exact package(s)/apps receiving code
5. Consumer scope    — importers that must compile (or "none this slice")
6. Prohibited        — paths that must NOT be touched
7. Gates             — scoped commands (see reference.md)
```

**Primary farm owner (pick one):** Platform · Identity · Module (declarations/fft) · Docs mirror · Glossary farms · App shell.

---

## Phase 1 — Classify

```text
Wrong package, same layer?     → move
Needed by 2+ packages?         → extract (lowest valid layer)
Public API rename?             → rename-export (+ consumer-migration)
Mixed concerns package?        → split-package (multi-slice)
Import violates DAG?           → layer-fix
Call sites only?               → consumer-migration
Housekeeping unused-*?         → removal (Slice D)
```

Consumer discovery:

```bash
rg "from [\"']@afenda/<source>" apps packages --glob "*.{ts,tsx}"
rg "<ExportedSymbol>" apps/web packages --glob "*.{ts,tsx}"
```

Split if >~8 consumer files or multiple apps.

---

## Phase 2 — Pre-flight (read-only)

| Check | Severity |
|-------|----------|
| DAG / layer legal | BLOCK |
| Cycle introduced | BLOCK |
| Duplicate authority | BLOCK |
| Consumer count >8 | WARN — split |
| Glossary/docs type redefined | BLOCK |
| Docs app gains secrets env | BLOCK |

`audit` ends with **Go / No-go / Slice-first**.

---

## Phase 3 — Serialize slices

```text
Slice A — Target surface    : types/contracts + package exports (no consumers yet)
Slice B — Move implementation + tests
Slice C — Consumer migration (one package/app at a time)
Slice D — Removal           : delete shims / dead code (housekeeping handoff)
Slice E — Governance        : architecture register / ADR only if authorized
```

Rules: types before behavior · max ~10 files per execute · shim at most one slice · `workspace:*` only.

---

## Phase 4 — Execute one slice

Edit only files in the current slice. Chunk order: types → impl → tests → consumers → cleanup → package.json.

- Cross-package: `from "@afenda/<pkg>"` only — no deep paths  
- Same-package: relative imports  
- Add dependency before importing (`workspace:*`)  

---

## Phase 5 — Gates

Scoped first (post Phase C targets):

```bash
pnpm --filter <pkg> typecheck
pnpm --filter <pkg> test
pnpm architecture:cycles   # when available
```

Pre-scaffold: `npx tsc --noEmit` and relevant vitest paths. Failures outside scope → report, do not expand silently.

Full matrix: [reference.md](reference.md).

---

## Phase 6 — Report

```markdown
## Refactor completion
| Item | Evidence |
|------|----------|
| Verdict | Complete / Partial / Blocked |
| Slice | A–E + objective |
| Diff | git diff --stat |
| Gates | PASS/FAIL/NOT RUN |
| Remaining slices | … |
| Drift | no cycles · no deep imports · no glossary redefine |
```

## Related

- [afenda-elite-monorepo-discipline](../afenda-elite-monorepo-discipline/SKILL.md)  
- [afenda-elite-repo-housekeeping](../afenda-elite-repo-housekeeping/SKILL.md)  
- Skill catalog: [using-afenda-elite-skills/catalog.md](../using-afenda-elite-skills/catalog.md)  
