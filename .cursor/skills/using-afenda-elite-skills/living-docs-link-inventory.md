# Living `docs/` link inventory (Elite cutover)

| Field | Value |
|-------|-------|
| **Role** | Acceptance evidence for Elite self-contained cutover |
| **Scope** | 15 `afenda-elite-*` + this router (not `shadcn-ui` / `agent-skills`) |
| **Labels** | `present` · `replaced-local` · `removed-dead` |
| **Baseline** | 2026-07-20 — **172** Living-path hits in Elite markdown (excl. `scripts/` fixtures) |
| **Close** | 2026-07-20 — **0** Living markdown hyperlinks to `docs/**` required |

Ban/history mentions of “Living `docs/`” **without** a hyperlink to an absent path are allowed. Homes listed as “when Docs-lane restores” are OK. Required LOAD targets must not be Living `docs/**`.

## Per-farm status

| Farm | Before | After | Status | Companions touched |
|------|--------|-------|--------|--------------------|
| `using-afenda-elite-skills` | 20 | 0 href | closed | `SKILL.md` · `reference.md` · `catalog.md` · this file |
| `afenda-elite-api-contract` | 6 | ban-only | closed | (residual ban/history; SSOT already docs-V2) |
| `afenda-elite-doc-control` | 25 | 0 href | closed | **`doc-control-rules.md`** · `SKILL.md` · `reference.md` |
| `afenda-elite-backend-modules` | 30 | 0 href | closed | `SKILL.md` · all 5 companions |
| `afenda-elite-doc-integrity` | 6 | 0 href | closed | `SKILL.md` · `reference.md` (scripts = fixtures / skip) |
| `afenda-elite-module-readiness` | 12 | 0 href | closed | **`mod-readiness-rules.md`** · `SKILL.md` |
| `afenda-elite-implementation-slices` | 12 | 0 href | closed | `SKILL.md` · `slice-map` · `command-sheet` · neon-* |
| `afenda-elite-frontend-scaffold` | 16 | 0 href | closed | `SKILL.md` · `boundaries` · `completeness` · `wipe-inventory` |
| `afenda-elite-nextjs-best-practice` | 22 | 0 href | closed | `SKILL.md` · `reference/*` |
| `afenda-elite-audit-orchestrator` | 9 | 0 href | closed | `SKILL.md` · `scope-map.md` |
| `afenda-elite-monorepo-discipline` | 5 | 0 href | closed | `SKILL.md` · `LAYERS.md` |
| `afenda-elite-monorepo-refactor` | 2 | 0 href | closed | `SKILL.md` |
| `afenda-elite-ui-compose` | 4 | 0 href | closed | `SKILL.md` · `reference.md` |
| `afenda-elite-repo-housekeeping` | 1 | 0 href | closed | `SKILL.md` |
| `afenda-elite-react-composition` | 1 | 0 href | closed | `SKILL.md` |
| `afenda-elite-react-best-practices` | 1 | 0 href | closed | `SKILL.md` |

**Totals:** before **172** → after **0** required Living hyperlinks.

## Classification log (summary)

| Pattern | Label |
|---------|-------|
| `docs/_control/DOC-001…003` hyperlinks / LOAD | `replaced-local` → `afenda-elite-doc-control/doc-control-rules.md` |
| `docs/architecture/ARCH-*` · `adr/ADR-*` hyperlinks | `replaced-local` / `removed-dead` → skill companions · AGENTS · docs-V2 |
| `docs/api/**` · `docs/guides/**` · `docs/modules/**` LOAD | `replaced-local` → docs-V2 / api-contract / mod-readiness-rules / slice-map |
| Living homes as “when restored” tables | `removed-dead` as required LOAD; homes remain as Docs-lane map |
| Ban/history “do not restore Living docs/api” | allowed (no hyperlink) |
| `doc-integrity` scripts fixture `docs/` paths | test doubles only — not agent LOAD |

## Spot-check (3 farms)

| Farm | LOAD without Living `docs/` |
|------|-----------------------------|
| api-contract | companions + `docs-V2/api` + disk — **pass** (`Test-Path docs` = False) |
| backend-modules | 5 companions + disk modules — **pass** |
| doc-control | `doc-control-rules.md` + `reference.md` — **pass**; writes blocked while tree absent |

## Grep gate

```text
# Zero matches expected for markdown links whose target is Living docs/**
# (relative ../../../docs/… hrefs) under afenda-elite-* + this router (excl. scripts/)
```

Catalog still routes; no new Elite farm names.

## Audit follow-up (out of Elite SCOPE)

| ID | Surface | Status | Note |
|----|---------|--------|------|
| **C1** | `afenda-coding-discipline` (local-method) | **closed** 2026-07-20 | LOAD retargeted to `AGENTS.md` + api-contract `brands-and-schemas` + monorepo `LAYERS` + ui-compose; `reference.md` Living API-003 href → brands-and-schemas. Audit-delegated; not an Elite farm rename. |
