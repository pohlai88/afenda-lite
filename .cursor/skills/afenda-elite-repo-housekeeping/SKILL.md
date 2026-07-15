---
name: afenda-elite-repo-housekeeping
description: Orchestrates Afenda Elite dead-code and drift discovery (Knip when present, registry/catalog/skill-catalog alignment). Classifies findings and delegates removals to afenda-elite-monorepo-refactor Slice D. Use when running housekeeping, knip, dead-code audits, skill-catalog drift, or promoting advisory checks to blocking CI.
disable-model-invocation: true
---

# Afenda Elite — Repo Housekeeping

Local Elite housekeeping: modes · Phase 0 contract · classify → Slice D. Targets `@afenda/*` / `apps/web` · no Storybook/PAS/foundation-registry-owner.

This skill **orchestrates** discovery and classification. **Removal** always delegates to [`afenda-elite-monorepo-refactor`](../afenda-elite-monorepo-refactor/SKILL.md) **Slice D** — not ad-hoc deletes.

**Announce:** "I'm using afenda-elite-repo-housekeeping — stating housekeeping contract before edits."

```text
LOAD: using-afenda-elite-skills · this skill · docs/_control when Docs-lane align
SKIP: bulk knip --fix · deleting _reference/archive · hand glossary twin · Storybook orphan flows
LANE: Normalize (or Docs for catalog-only align) — never mix with Fix product work
```

---

## Skill chain

| Phase | Delegate to |
|-------|-------------|
| Layer / DAG / package boundaries | [`afenda-elite-monorepo-discipline`](../afenda-elite-monorepo-discipline/SKILL.md) · [ARCH-024](../../../docs/architecture/ARCH-024-package-boundaries.md) · removals → [`afenda-elite-monorepo-refactor`](../afenda-elite-monorepo-refactor/SKILL.md) |
| Skill catalog align | [using-afenda-elite-skills/catalog.md](../using-afenda-elite-skills/catalog.md) |
| Slice D execution | `/afenda-elite-monorepo-refactor execute` |
| Engineering method | `using-agent-skills` → incremental-implementation / code-simplification |
| Compulsory residue | `deprecation-and-migration` |

---

## Modes

| Keyword | Mode | Edits? | Output |
|---------|------|--------|--------|
| (default) | `audit` | No | Finding matrix + recommended next mode |
| `expand` | `expand` | Yes — knip/turbo scope only (post Phase C) | One workspace enabled + baseline |
| `plan` | `plan` | No | Numbered slices + paste-ready Slice D commands |
| `align` | `align` | Yes — registries / catalogs / skill catalog only | Drift fix + gates |
| `promote` | `promote` | No (CI only with user approval) | Go / no-go for advisory → blocking |

If the user asks to delete files directly → redirect to `/afenda-elite-monorepo-refactor execute Slice D`.

---

## Hard stops

- Repo-wide `knip --fix` or bulk delete without classification  
- Touch `_reference/**` or archive evidence trees  
- Slice would delete >10 files (split Slice D commands)  
- `registry-drift` / `catalog-drift` / `skill-catalog-drift` handled as delete instead of **align**  
- Secrets / `.env.local` / docs-project env deny-list paths  
- Hand-editing generated glossary farms  

**Never:** invent Knip `"turbo": true` in knip config (Knip 6 rejects it) — turbo tasks only.

---

## Phase 0 — Housekeeping contract (before edits)

```text
1. Mode              — audit | expand | plan | align | promote
2. Objective         — one sentence
3. Workspace scope   — package(s) or app(s) or pre-scaffold paths
4. Finding classes   — see reference.md taxonomy
5. Prohibited        — paths / deletes out of scope
6. Gates             — scoped commands that must pass
```

---

## Phase 1 — Discover

Prefer scoped runs. Until Phase C Knip scripts exist, use `rg` + catalog review and still classify.

```bash
# Post Phase C (targets — wire when scaffold lands)
pnpm housekeeping:knip:workspace packages/<name>
pnpm housekeeping:knip:advisory
# Pre / always
rg "<Symbol>" apps packages modules features --glob "*.{ts,tsx}"
```

Do not commit Knip captures under random `.cursor/audit/` dumps.

---

## Phase 2 — Classify

Every finding gets **exactly one** class — [reference.md](reference.md).

| Class | Action |
|-------|--------|
| `unused-export` / `unused-file` / `unused-dependency` | Delegate Slice D |
| `registry-drift` / `catalog-drift` / `skill-catalog-drift` | **align** |
| `intentional-public` | Document ignore; no delete |
| `glossary-farm-stale` | Edit YAML / seed register + sync — not Slice D on generated MD alone |

---

## Phase 3 — Mode workflows

### audit
Build finding matrix → recommend `expand` / `align` / Slice D slices.

### expand
One package per session; enable Knip workspace + turbo inputs; **do not** delete in the same slice.

### plan
Numbered removal slices:

```text
/afenda-elite-monorepo-refactor execute Slice D — remove <symbols> from @repo/<pkg> (housekeeping)
```

### align
Skill catalog ↔ disk ↔ router: edit [catalog.md](../using-afenda-elite-skills/catalog.md) and [using-afenda-elite-skills](../using-afenda-elite-skills/SKILL.md) invoke order so `keep|extend` matches every local farm on disk. Never invent `doc/` or DOC-004. Never silent-delete DOC-002 rows.

### promote
Go/no-go for advisory→blocking CI only with explicit user approval.

---

## Completion report

```markdown
## Housekeeping completion

| Item | Evidence |
|------|----------|
| Mode | audit / expand / plan / align / promote |
| Scope | packages/apps touched |
| Findings by class | … |
| Delegated slices | Slice D commands (or none) |
| Gates | command → pass/fail |
| Next mode | … |
```

## Related

- [afenda-elite-monorepo-refactor](../afenda-elite-monorepo-refactor/SKILL.md)  
- Skill catalog: [using-afenda-elite-skills/catalog.md](../using-afenda-elite-skills/catalog.md)  
