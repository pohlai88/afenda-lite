# Afenda Elite Audit Orchestrator — Reference

## Authority tiers (binding hierarchy)

| Tier | Artifact | Authority Level | Audit Role | Examples |
|------|----------|----------------|------------|----------|
| **A** | `docs/` controlled documents | ✅ Highest | Source of truth | DOC-001, ARCH-024, ADR-010, API-001, MOD-002 |
| **A** | Farm evidence files | ✅ Highest | Proof of implementation | `completeness.md`, `verify.md`, gate registers |
| **B** | Generated evidence | ✅ Controlled evidence | Runtime proof | `pnpm check:*` outputs, test results, CI logs |
| **C** | `.cursor/plans/*.plan.md` | ⚠ Planning only | Execution intent | Plan frontmatter, todos, command refs |
| **D** | Scratch notes | ❌ None | Working notes | `docs/scratch/`, prompts, conversations |

**Authority direction:** Plan → references → Authority. Never Authority → depends on → Plan.

## Evidence tiers (reuse doc-integrity vocabulary)

| Evidence Tier | Meaning | When to Use |
|---------------|---------|-------------|
| **Confirmed** | Reproducible deterministic failure or direct contradiction with complete relevant inputs | Tier A contradicted by disk; forbidden surface present |
| **Supported** | Strong semantic evidence with resolved subject, aspect, scope, and lifecycle | Required control failing or missing evidence |
| **Review needed** | Authority, lifecycle, scope, timing, or wording remains interpretive | Ambiguous controlled doc state; unclear boundaries |
| **Observation** | No current violation; negative control hit; forward-recorded item | Forward work, absent-by-design, docs-first vs Target |

## Severity scale

| Severity | Evidence Tier | Typical Scenario | Action Required |
|----------|---------------|------------------|-----------------|
| **Critical** | Confirmed | Tier A authority contradicted by disk; forbidden/retired surface present | Immediate remediation |
| **Major** | Supported | Required control has no passing evidence (implemented-not-verified, failing check) | Evidence gathering or implementation |
| **Minor** | Review needed | Advisory/traceability gap (plan omits authority IDs); no authority breach | Process improvement |
| **Pass** | N/A | Control satisfied with cited evidence | None |
| **Observation** | Observation | Forward-recorded/absent-by-design/negative-control hit — not a gap | Awareness only |

## Gap taxonomy

### Implementation gaps (Major/Critical)

- **Missing implementation**: Tier A requires X, disk lacks X
- **Failing verification**: X exists but check fails
- **Retired surface present**: Forbidden pattern still on disk
- **Authority contradiction**: Disk contradicts controlled doc

### Process gaps (Minor)

- **Traceability missing**: Plan omits authority references
- **Check coverage incomplete**: Control exists but no automated verification
- **Evidence stale**: Completeness claims not backed by recent verification

### Non-gaps (Observation)

- **Forward-recorded**: Farm marks slice "Recorded (forward)" / "Draft — not Living SSOT"
- **Absent-by-design**: AGENTS.md / ARCH-028 lists tree as deliberately missing
- **Docs-first vs Target**: Logical path differs from physical checkout path
- **Gated scripts**: `collapse-script-unavailable` — inventory, not live control

## Check coverage ledger (mandatory output)

```text
Coverage Analysis:
==================
Applicable controls:       N (total Tier A authorities in scope)
Controls with checks:      N (have automated verification)
Checks executed:           N (ran successfully this audit)
Checks passed:             N (exit code 0)
Checks failed:             N (exit code ≠ 0)
Controls without checks:   N (manual verification required)
Unevaluated controls:      N (gated scripts, missing dependencies)

Coverage Status: Complete | Incomplete
```

**Coverage rule:** Report **Incomplete** when `Controls without checks + Unevaluated controls > 0`.

## Negative control patterns (prevent false positives)

### Forward-recorded patterns
- Completeness status: `Recorded (forward)`, `Draft — not Living SSOT`, `Intentional`
- API contract: `contract-only`, `expand on demand`
- Roadmap phases: `Phase 2/3` draft authorities

### Absent-by-design patterns (AGENTS.md / ARCH-028)
- Root paths: `app/`, `modules/`, `features/`, `components-V2/`
- Collapse residue: Collapse `lib/`, `db/`, `e2e/`, `testing/`, `messages/`, `scripts/*` bodies
- Playground: `apps/web/app/playground/`, `apps/web/features/playground/`

### Docs-first vs Target patterns
- Module paths: logical `modules/*` → physical `apps/web/modules/*`
- Package claims: Target describes `@afenda/db` when checkout has docs-first structure

### Gated script patterns
- Script body: `node scripts/collapse-script-unavailable.mjs "script-name"`
- Exit codes: Non-zero from unavailable scripts → **Unevaluated**, not Fail
- Package.json: ~56 root scripts still route through the unavailable handler (six reliance/route-coverage/import-boundaries aliases removed 2026-07-17)

## Precise pattern rules (evidence-gathering)

### Identity matching (mandatory precision)
- Wrong: `@afenda/ui\b` — matches `@afenda/ui-system` due to word boundary before `-`
- Right: `@afenda/ui/` or `from ["']@afenda/ui["']` — isolates the retired gateway
- Command: Always cite the exact `git grep`, `rg`, or `Test-Path` command in findings

### Disk truth sources (preference order)
1. `git ls-files` — tracked files only
2. `Test-Path` (PowerShell) or `test -e` (bash) — file existence
3. `pnpm check:docs-trunk-ban` — validates against controlled doc structure
4. Cursor index via Grep/Glob — may include deleted paths (index ghosts)

## V1.1/V2 backlog (out of scope for orchestration-only v1)

### V1.1 — Check registry
- Machine-readable `checks-registry.yaml`
- Per-farm check mapping
- Automated coverage gap discovery

### V2 — Narrow shared scripts
- `check:control-traceability` — only if v1 repeatedly finds the same cross-farm gap
### PLAN-001 doc class (DOC-001 approval required)
- Formal controlled plan documents under `docs/` — backlog only
- Until then: advisory YAML keys `Authority` / `Produces` / `Verification` on `.cursor/plans/*.plan.md` close “plan omits” Observations without claiming Tier A
- Bundled validator scripts (only for proven, stable, cross-farm rules)

Each addition requires proven gap from orchestrator deployment + no existing owner.

## Related skills

| Boundary | Skill |
|----------|-------|
| doc↔doc conflicts | `afenda-elite-doc-integrity` |
| Controlled doc writes | `afenda-elite-doc-control` |
| MOD readiness claims | `afenda-elite-module-readiness` |
| Dead code / Knip discovery | `afenda-elite-repo-housekeeping` |
| Cross-farm routing | `using-afenda-elite-skills` |

## Historical context

Created 2026-07-16 to fill confirmed gap: no existing skill owned cross-layer alignment audit (authority + plan + evidence + disk code). The phantom `documentation-audit` pointer in doc-integrity and doc-control skills is retired by this farm.

V1 stays orchestration-only (no bundled validators) per incremental-implementation discipline.