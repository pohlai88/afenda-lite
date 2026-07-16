---
name: afenda-elite-audit-orchestrator
description: >-
  Discovers Afenda farm skills, resolves controlled authority chains, runs existing
  repository checks, compares authority/plan/implementation/evidence, and produces
  a normalized gap matrix with explicit check-coverage. Use when auditing doc-to-code
  alignment, evaluating implementation against ARCH/ADR/API/MOD authority, checking
  plan traceability, finding consistency gaps, or when the user mentions audit
  orchestrator, authority alignment, or doc-to-code drift.
disable-model-invocation: true
---

# Afenda Elite — Audit Orchestrator

**SSOT for cross-layer alignment audit.** Orchestrates farm skills, resolves authority chains, runs existing repository checks, produces normalized gap matrix with explicit check-coverage. Do not duplicate existing validators — delegate to owning farms.

**Announce:** "I'm using afenda-elite-audit-orchestrator — discovering scope and resolving authority before cross-layer audit."

```text
LOAD:
  using-afenda-elite-skills/catalog.md + SKILL.md
  scope-map.md (farm routing per domain)
  reference.md (authority tiers, gap taxonomy, evidence rules)
  AGENTS.md (docs-first + index-ghost rules)
SKIP:
  bundled validator logic (v1 orchestration-only)
  treating .cursor/plans as SSOT (Tier C — audit traceability only)
  doc↔doc conflicts (afenda-elite-doc-integrity owns)
  controlled document writes (afenda-elite-doc-control owns)
  new validator rules (v2 registry-backed scripts only after coverage gaps proven)
```

## Owns

- **Discover** — resolve scope → farm(s) via catalog + scope-map
- **Resolve authority chain** — Tier A docs + farm companions; Tier C plans checked for traceability metadata only
- **Identify + run** existing repository checks (consumer, not author)
- **Disk truth** — `Test-Path`, `git ls-files`, `pnpm check:docs-trunk-ban` (AGENTS.md index-ghost rule)
- **Normalize** results into one gap matrix + check-coverage ledger
- **Classify** findings with evidence tiers (Confirmed / Supported / Review needed / Observation) — reuse doc-integrity vocabulary for consistency
- **Apply negative controls** — never flag forward-recorded / absent-by-design / logical-vs-physical / gated-script items as gaps
- **Use precise patterns** — exclude sibling identifiers; cite the exact command in every finding
- **Emit PREFLIGHT** on its own invocation (it engages skills + rules) and announce before audit
- **Delegate** remediation plans to owning farms (`doc-control`, `frontend-scaffold`, `api-contract`, etc.) — **no** controlled-doc or product-code writes in audit modes

## Does not own

| Out of scope | Owner |
|--------------|-------|
| doc↔doc conflicts | `afenda-elite-doc-integrity` |
| Controlled doc writes | `afenda-elite-doc-control` |
| MOD Enterprise Readiness claims | `afenda-elite-module-readiness` |
| Dead code / Knip / skill-catalog drift | `afenda-elite-repo-housekeeping` |
| New validator logic | Future `check:*` scripts (v1.1+ registry, v2 narrow scripts) |
| Treating `.cursor/plans` as SSOT | This skill audits plan→authority linkage only |

## Authority hierarchy (binding for this skill)

| Tier | Artifact | Authority | Can auditors rely on it? |
|------|----------|-----------|--------------------------|
| **A** | `docs/` controlled documents (DOC/ARCH/ADR/API/MOD) | ✅ Highest | **Yes** |
| **A** | Farm `completeness.md`, `verify.md`, gate registers | ✅ Highest | **Yes** |
| **B** | Generated evidence (pnpm checks, tests, CI outputs) | ✅ Controlled evidence | **Yes** |
| **C** | `.cursor/plans/*.plan.md` | ⚠ Planning only | **Reference only** |
| **D** | Scratch notes, prompts, conversations | ❌ None | No |

**Direction rule:** Plan → references → Authority. Never Authority → depends on → Plan.

## Modes

| Mode | Writes | Output |
|------|--------|--------|
| `discover` | No | Farm list + authority chain + applicable checks |
| `baseline` | No | Disk inventory + plan traceability header parse + exclusions |
| `audit` | No | Gap matrix + check-coverage ledger |
| `plan` | No | Ordered delegation list (which farm/skill/check to run next) |
| `verify` | No | Re-run checks + diff against prior audit |

**Workflow:** `discover → baseline → audit → plan → verify`.

## Gap matrix template

Standard columns:

| ID | Requirement | Authority | Planned | Implemented | Verified | Finding | Severity | Required action |

**Check coverage block (mandatory):**

```text
Applicable controls:       N
Controls with checks:      N
Checks executed:           N
Checks passed:             N
Checks failed:             N
Controls without checks:   N
Unevaluated controls:      N
```

**Hard rule:** Never report "clean" when `Controls without checks + Unevaluated controls > 0` without labeling coverage **Incomplete**.

Severity scale:

| Severity | Meaning |
|----------|---------|
| Critical | Tier A authority contradicted by disk, or a forbidden/retired surface present |
| Major | Required control has no passing evidence (implemented-not-verified, or failing check) |
| Minor | Advisory / traceability gap (e.g. plan omits authority IDs); no authority breach |
| Pass | Control satisfied with cited evidence |
| Observation | Forward-recorded / absent-by-design / negative-control hit — not a gap |

## Plan traceability checks (Tier C — non-authoritative)

Current `.cursor/plans/*.plan.md` frontmatter is `name / overview / todos / isProject` — it has **no** `Authority:/Produces:/Verification:` fields. So traceability findings are **advisory** (Observation / Minor), never Major, until the `PLAN-001` doc class (backlog) exists.

When a plan is in scope, audit:

- Whether the plan cites controlled IDs (ADR/ARCH/API/MOD/DOC) anywhere — absence is an Observation, not a failure
- `todos` marked `completed` are supported by Tier A/B evidence — **not** by todo status alone (the core check)
- Any commands the plan names map to real `package.json` scripts (flag `collapse-script-unavailable` as **Unevaluated**, not pass)

## Negative controls (avoid false positives — mandatory)

The repo is deliberately docs-first; without these controls the orchestrator manufactures spurious gaps:

- **Forward-recorded work is not a gap.** If a farm `completeness.md` marks a slice `Recorded (forward)` / `Intentional` / `Draft — not Living SSOT`, report it as **Observation**, not Missing.
- **Absent-by-design is not missing.** Trees listed "Absent by design" in AGENTS.md / ARCH-028 (root `app/`, `modules/`, `features/`, `components-V2/`, Collapse `lib/`, playground) must never be reported as implementation gaps.
- **Docs-first vs Target.** Logical `modules/*` paths in farm companions are Target shape; on this checkout physical home is under `apps/web/**`. Do not flag logical-vs-physical as drift.
- **Gated scripts are not failures.** `collapse-script-unavailable` scripts are inventory, not live controls → **Unevaluated**, and they push coverage to **Incomplete**.
- **Closed/Draft lifecycle.** A `Closed`/`Draft` controlled doc that under-claims is not a gap; readiness is a separate axis from lifecycle.

## Evidence-gathering rule — precise patterns (mandatory)

Disk truth beats the Cursor index (AGENTS.md). When matching identifiers, patterns must be **precise enough to exclude sibling names**:

- Wrong: `@afenda/ui\b` — the `\b` before `-` also matches `@afenda/ui-system`.
- Right: `@afenda/ui/` or `from ["']@afenda/ui["']` to isolate the retired gateway.

Prefer `git ls-files` / `Test-Path` / `pnpm check:docs-trunk-ban` over index hits; state the exact command in every finding's evidence cell.

## Required method

1. **Emit PREFLIGHT** with skills/rules engaged.
2. **Discover scope** — route to farm(s) via catalog + scope-map.
3. **Baseline disk state** — separate primary scope, dependencies, artifacts, exclusions.
4. **Resolve authority chain** — load Tier A controlled docs + farm evidence files.
5. **Identify applicable checks** — existing `pnpm` scripts, not new validator logic.
6. **Run checks** — execute and capture exit codes + output.
7. **Apply negative controls** — filter out forward-recorded/absent-by-design hits.
8. **Classify findings** with evidence tiers and severity scale.
9. **Build gap matrix** with honest check-coverage block.
10. **Delegate next steps** to owning farms — no controlled-doc or product-code writes in audit modes.

## Additional resources

- Scope routing: [scope-map.md](scope-map.md)
- Authority tiers + gap taxonomy: [reference.md](reference.md)
- Catalog: [../using-afenda-elite-skills/catalog.md](../using-afenda-elite-skills/catalog.md)
- Router: [../using-afenda-elite-skills/SKILL.md](../using-afenda-elite-skills/SKILL.md)
- Control: [../../../docs/_control/DOC-001-documentation-control-standard.md](../../../docs/_control/DOC-001-documentation-control-standard.md)