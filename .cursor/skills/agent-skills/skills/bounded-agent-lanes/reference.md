# Bounded Agent Lanes — Repo reference

Updatable defaults for this repository. The skill core in [SKILL.md](SKILL.md) stays lane-generic; edit this file when the active lane or rollout context changes.

---

## Current active lane

**Ops only** (as of 2026-07-09)

Not Normalize. Not product. Not 2B–2D.

Phase 2A is an **operational rollout**, not a development phase.

---

## Fixed boundaries (Ops — Hot Sales 2A)

- Do not reopen Phase 2A product scope.
- Do not add 2B–2D.
- Do not add schema/UI/permission expansion.
- Do not touch unrelated layout/lib cleanup in this lane.
- Do not mix `lib/` / `components/` repo normalization or layout migration WIP into Ops commits.

---

## Authority docs (Ops lane)

| Doc | Role |
|-----|------|
| [docs/hot-sales/PHASE-2A-RELEASE-READINESS.md](../../../../docs/hot-sales/PHASE-2A-RELEASE-READINESS.md) | Rollout order, verification matrix, rollback |
| [docs/hot-sales/PHASE-2A-OPS-ROLLOUT.md](../../../../docs/hot-sales/PHASE-2A-OPS-ROLLOUT.md) | Step-by-step checklist, commands, evidence template |
| [docs/hot-sales/PHASE-2A-SLICES.md](../../../../docs/hot-sales/PHASE-2A-SLICES.md) | Frozen — do not re-implement slices |
| [docs/architecture/slices/s19-hot-sales-trade.md](../../../../docs/architecture/slices/s19-hot-sales-trade.md) | Phase 1/2A architecture cross-links |

### Frozen decisions (do not rename / redesign)

| Area | Decision |
|------|----------|
| Feature flag | `HOT_SALES_RBAC_ENABLED` |
| Default | Off (`false` / unset) |
| Rollback | Set flag false → `npm run env:compose` → redeploy |
| Migration | `014_hot_sales_rbac.sql` |
| Admin RBAC UI | `/trade/[locale]/admin/rbac` |
| Event create UI | `/trade/[locale]/admin/events/new` |

---

## Typical Ops target files

- `docs/hot-sales/*` — readiness, rollout, cross-links
- `lib/env/manifest.ts` — flag/env documentation if rollout requires it
- Rollout scripts under `scripts/` — only when explicitly in scope

**Not in scope:** broad `lib/` sweeps, `components/` moves, declaration domain, portal atmosphere.

---

## Typical Ops checks

Run what applies to the mission:

| Check | Command |
|-------|---------|
| Trade unit tests | `npm run test:unit -- lib/domain/trade` |
| Typecheck | `npx tsc --noEmit` |
| Trade smoke e2e | `npm run test:e2e:smoke` (Trade Hot Sales auth redirect) |
| Env compose | `npm run env:compose` (after flag changes locally) |
| Env sync validation | `npm run validate:env-sync` (if manifest touched) |
| Vercel key audit | `npm run audit:vercel` (if production env keys involved) |

Pre-enable verification matrix: see [PHASE-2A-RELEASE-READINESS.md](../../../../docs/hot-sales/PHASE-2A-RELEASE-READINESS.md#pre-enable-verification-matrix).

Evidence close-out: copy [PHASE-2A-OPS-ROLLOUT.md § Evidence report template](../../../../docs/hot-sales/PHASE-2A-OPS-ROLLOUT.md#evidence-report-template) into the mission report.

---

## Docs lane (rollout doc updates)

When improving rollout docs for agent execution:

| Field | Value |
|-------|-------|
| **Lane** | Docs |
| **Target files** | `docs/hot-sales/PHASE-2A-*.md`, `bounded-agent-lanes/reference.md` (cross-links only) |
| **Allowed** | Checklist wording, command placeholders, cross-links, evidence sections |
| **Forbidden** | Code, schema, permissions, UI, repo layout cleanup |

---

## Normalize lane (not current work)

Repo structure cleanup belongs in the **Normalize** lane on a **separate branch**.

Authority: [docs/architecture/repo-layout.md](../../../../docs/architecture/repo-layout.md)

`lib/` and `components/` are the largest future cleanup opportunities. Keep that work out of Hot Sales 2A Ops commits.

Suggested branch pattern: `normalize/<concern>` — never `release/hot-sales-phase-2a` or `hardening/hot-sales-phase-2a`.

---

## Example filled mission (Hot Sales 2A Ops)

```markdown
## Purpose
Execute flag=false smoke checkpoint per PHASE-2A-OPS-ROLLOUT.md and record evidence.

## Lane
Ops

## Fixed boundaries
- Do not reopen Phase 2A product scope.
- Do not add 2B–2D.
- Do not add schema/UI/permission expansion.
- Do not touch unrelated layout/lib cleanup in this lane.

## Target files
- docs/hot-sales/PHASE-2A-OPS-ROLLOUT.md (evidence notes only, if updating tracker)

## Allowed changes
- Checklist status markers in ops tracker
- Evidence notes in GitHub issue #1

## Forbidden changes
- Product code under lib/ or app/
- New permissions, roles, or RBAC UI
- Schema or migration edits
- lib/ or components/ file moves

## Required checks
- npm run env:compose (HOT_SALES_RBAC_ENABLED=false)
- npm run test:unit -- lib/domain/trade
- npx tsc --noEmit
- npm run test:e2e:smoke

## Evidence to report
- Use PHASE-2A-OPS-ROLLOUT.md evidence report template
- Files changed
- Checks run (pass/fail per command)
- Flag state before/after
- Commit recommendation
```

## Example filled mission (Hot Sales 2A Docs)

```markdown
## Purpose
Make rollout docs easier for agents to execute (commands, evidence, cross-links).

## Lane
Docs

## Target files
- docs/hot-sales/PHASE-2A-OPS-ROLLOUT.md
- docs/hot-sales/PHASE-2A-RELEASE-READINESS.md
- .cursor/skills/agent-skills/skills/bounded-agent-lanes/reference.md

## Allowed changes
- Clarify checklist wording
- Add command placeholders
- Fix cross-links
- Add evidence sections

## Forbidden changes
- Code, schema, permissions, UI, repo layout cleanup

## Required checks
- Manual link click-through in edited docs

## Evidence to report
- Files changed
- Cross-links added/fixed
- Commit recommendation
```
