---
name: afenda-elite-doc-integrity
description: Audit governed Afenda documentation for document-to-document conflicts, duplicate authorities, SSOT drift, exact DOC-002 metadata mismatch, lifecycle and controlled-structure errors, broken internal references, category/home ambiguity, OpenAPI artifact drift, coverage misstatement, lock violations, and architecture misalignment. Use for baseline, audit, plan, align, or verify work under docs/; do not use for code-to-document drift or ordinary prose writing.
---

# Afenda Elite — Documentation Integrity

Audit **doc↔doc** integrity under `docs/` with reproducible validator evidence and aspect-aware authority analysis.

Announce: "I'm using afenda-elite-doc-integrity — validating documentation evidence before semantic conflict analysis."

```text
LOAD: DOC-001…003 · authority-map.yaml · reference.md · checks.md
ROOT: first change to the repository containing this skill, or pass --root <absolute-repository-path>
RUN: node .cursor/skills/afenda-elite-doc-integrity/scripts/audit-docs.mjs --scope <dir-or-file.md> --format json
NEVER: claim Pass/none/full coverage without validator evidence
NEVER: reorder, move, reopen, or retire locked material without explicit approval
NEVER: edit a closed controlled document unless the user or accountable owner explicitly reopens the named document or bounded scope
NEVER: treat historical Change Log body rows as Living next-pointer authority (header Version ↔ latest row only)
```
## Owns

```text
Audit · Detect · Classify · Explain · Plan · Verify
```

## Does Not Own

- Writing new controlled documents, substantive Living rewrites, register changes, version bumps, document retirement, or architecture decisions → [afenda-elite-doc-control](../afenda-elite-doc-control/SKILL.md)
- Deep prose / ADR composition craft → [documentation-and-adrs](../agent-skills/skills/documentation-and-adrs/SKILL.md)
- Code/catalogue hygiene → [afenda-elite-repo-housekeeping](../afenda-elite-repo-housekeeping/SKILL.md)
- Generic code-to-document comparison → global `documentation-audit`

Keep code-to-doc runtime drift out of scope. Keep document-to-generated-artifact consistency in scope.

## Boundary

| Capability | Owner |
| --- | --- |
| Detect, classify, plan, and verify doc conflicts | This skill |
| Create/update/retire controlled documents or DOC-002 rows | [afenda-elite-doc-control](../afenda-elite-doc-control/SKILL.md) |
| Compose prose and ADRs | [documentation-and-adrs](../agent-skills/skills/documentation-and-adrs/SKILL.md) |
| Code/catalogue hygiene | [afenda-elite-repo-housekeeping](../afenda-elite-repo-housekeeping/SKILL.md) |

## Evidence model

Never collapse these dimensions:

| Dimension | Required statement |
| --- | --- |
| Finding evidence | Confirmed / Supported / Review needed / Observation |
| Audit coverage | Primary inspected/expected; dependencies; artifacts; exclusions |
| Resolution confidence | Why the proposed fix preserves the correct authority |
| Residual risk | What remains unread, unparsed, or semantically untested |

Evidence tiers:

- **Confirmed** — reproducible deterministic failure or direct contradiction with complete relevant inputs.
- **Supported** — strong semantic evidence with resolved subject, aspect, scope, and lifecycle.
- **Review needed** — authority, lifecycle, scope, timing, or wording remains interpretive.
- **Observation** — no current violation; do not count as a finding.

If the validator exits `2`, coverage is incomplete. Stop semantic conclusions that depend on the missing evidence and never report a clean audit.

## Modes

| Mode | Writes | Result |
| --- | --- | --- |
| `baseline` | No | Exact primary/dependency/artifact ledger and authority aspects |
| `audit` | No | Validator report plus semantic findings |
| `plan` | No | Ordered controlled resolution plan |
| `plan-fix` | No | Schema-validated remediation manifest with hashes and unresolved routing |
| `apply-safe` | Navigation-only | Explicitly apply allowlisted `AUTO` operations with rollback and verification |
| `align` | Navigation-only | Alias for approved safe navigation alignment; prefer `plan-fix` then `apply-safe` |
| `verify` | No | Fresh validator run plus touched semantic comparison sets |

Workflow: `baseline → validator → semantic audit → plan-fix → apply-safe or controlled execution → verify`.

Controlled-document content, metadata, Control State, register rows, and authority changes are **never** applied by this skill. Integrity produces a repair plan; [afenda-elite-doc-control](../afenda-elite-doc-control/SKILL.md) performs the authorized change after explicit reopen. Even high-confidence metadata repairs cannot bypass `Control State = Closed`.

## Required method

1. **Inventory current disk state.** Separate primary scope, referenced dependencies, artifacts, and exclusions. Git only annotates tracked/untracked state; it never replaces the disk inventory.
2. **Run the bundled validator.** Use full profile for audits and naming profile only for the repository naming check. Preserve JSON output as evidence.
3. **Resolve coverage failures.** Missing parser, invalid authority map, unreadable file, or unsupported primary type is exit `2`, not a pass.
4. **Analyze claims by subject and aspect.** Load [authority-map.yaml](authority-map.yaml). Compare every Living/Accepted claim and every Draft claim that uses normative language or is cited by an active authority.
5. **Run cross-subject comparison sets.** Response envelopes, release verification, guide homes, and generated artifacts span multiple subject labels; never isolate them into separate audits.
6. **Apply negative controls.** Do not report narrowing specialization, explicitly non-authoritative examples, navigation-only summaries, or clearly provisional Draft proposals as conflicts.
7. **Plan resolution.** Name authority, subordinate source, lock status, version/register impact, backlinks, and verification.
8. **Verify independently.** Rebuild the disk inventory and rerun the validator. Re-extract every semantic comparison set touched by an approved change.
9. **Close after verification.** Treat every controlled document in the completed scope as closed again; later edits require a new explicit reopen. General reopening never overrides a named lock.

Detailed gates: [checks.md](checks.md). Taxonomy and output contract: [reference.md](reference.md).

## Validator contract

```powershell
node .cursor/skills/afenda-elite-doc-integrity/scripts/audit-docs.mjs `
  --scope docs/api `
  --register docs/_control/DOC-002-documentation-register.md `
  --authority-map .cursor/skills/afenda-elite-doc-integrity/authority-map.yaml `
  --format json
```

| Exit | Meaning |
| ---: | --- |
| `0` | Complete coverage; no confirmed findings |
| `1` | Complete coverage; findings exist |
| `2` | Dependency, parsing, schema, configuration, or coverage failure |

The validator parses Markdown and YAML structurally. Never replace a parser failure with regex-only success.

### Module quality contract

`npm run check:module-quality` validates every pack under `docs/modules` against the schema-validated executable mirror of MOD-002. The audit CLI accepts `--module-contract <path>` for isolated fixtures and diagnostics. Structural success does not require a Claimable readiness state.

## Safe remediation contract

Generate a plan without writing:

```powershell
node .cursor/skills/afenda-elite-doc-integrity/scripts/remediate-docs.mjs `
  --scope docs/api --mode plan-fix --format json
```

Apply only allowlisted operations after reviewing the plan:

```powershell
node .cursor/skills/afenda-elite-doc-integrity/scripts/remediate-docs.mjs `
  --scope docs/api --mode apply-safe --plan <reviewed-plan.json> --apply --format json
```

`apply-safe` requires the exact reviewed plan file, an explicit flag, matching before/after SHA-256 hashes, an unlocked in-repository target, the same ruleset hash and deterministic preflight plan, transactional rollback, no new findings, a closing audit, and an idempotent second plan. It currently permits only removing a missing hyperlink from a navigation `README.md` while retaining its label as plain text. Zero eligible operations is a valid plan, not permission to widen the allowlist.

## Authority rules

- Resolve **subject + aspect**, not subject alone. `API-002` owns exact error-body detail; `ARCH-029` owns error architecture and placement.
- Apply lifecycle before precedence. A Draft proposal cannot silently override Living authority or serve as the sole active evidence bar when it disclaims enforcement.
- Apply DOC-001 §3.5.1 before any write. Lifecycle status does not imply write permission; controlled documents are closed outside an explicitly reopened, bounded task.
- Treat conflicting governance homes as `SSOT-AMBIGUOUS`; check locks before proposing any move.
- Compare response shapes across `ARCH-029`, `API-001`, `API-003`, `API-008`, `REST-001`, `OPEN-001`, and OpenAPI rather than auditing each subject in isolation.
- This skill may determine which authority wins **only** when DOC-001, lifecycle, and the authority map produce an unambiguous result. Ambiguous or architecture-level conflicts must be escalated (`SSOT-AMBIGUOUS` / `ASK-LOCK`); do not independently decide architecture.

## Alignment boundary

`align` / `apply-safe` may change only navigation-only, non-controlled content when the target is unambiguous and rollback is obvious. It must not change:

- a controlled header, H1, version, lifecycle, Change Log, or DOC-002 row;
- normative or duplicate controlled prose;
- a controlled document home;
- an authority map or decision lock;
- generated contract semantics;
- Control State, or any edit that would bypass `Control State = Closed`.

Route those changes to an approved plan and [afenda-elite-doc-control](../afenda-elite-doc-control/SKILL.md). `ASK-LOCK` remains report-only.

## Completion requirement

Report:

- mode and exact primary scope;
- primary inspected/expected, dependency list, artifacts, and exclusions;
- validator exit and evidence location;
- findings by severity, category, and evidence tier;
- controlled delegations and lock escalations;
- residual semantic risk — evidence-based from the validator `residualRisk` field (unimplemented in-scope comparison sets only; never a standing pairwise caveat after exit `0` with all in-scope sets implemented). For `docs/guides`, expect [zero findings](reference.md#known-baselines-do-not-reopen-as-rename-debt) for the navigator plus Living GUIDE-017 (Retired stubs remain hard-deleted).

Never say “no findings” when only a spot check was performed.

## Resources

- [checks.md](checks.md) — pass gates
- [reference.md](reference.md) — taxonomy, severity, evidence, output
- [authority-map.yaml](authority-map.yaml) — aspect precedence and cross-subject sets
- [validator](scripts/audit-docs.mjs) — deterministic and implemented semantic checks
- [remediator](scripts/remediate-docs.mjs) — hash-guarded plan/apply workflow for allowlisted `AUTO` repairs
- [DOC-001](../../../docs/_control/DOC-001-documentation-control-standard.md) · [DOC-002](../../../docs/_control/DOC-002-documentation-register.md) · [DOC-003](../../../docs/_control/DOC-003-controlled-document-template.md)
