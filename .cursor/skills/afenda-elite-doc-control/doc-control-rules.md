# DOC-001 · DOC-002 · DOC-003 — operative rules (skill-local)

Living Controlled bodies under `docs/_control/DOC-00*.md` are **absent by design** on this checkout until Docs-lane reopen. This companion is the offline SSOT for the control **model**. Do **not** recreate Living `docs/` or `doc/`.

Day-to-day Scratch packs: [`docs-V2/`](../../../docs-V2/README.md). Official site: `@afenda/docs` (not DOC-001 SSOT).

## Checkout posture

| Surface | Status |
|---------|--------|
| Living `docs/**` | Dormant — writes **blocked** until Docs-lane reopen + tree on disk |
| Scratch `docs-V2/**` | Live engineering packs |
| Skill-local rules (this file) | Operable without Living tree |
| `scaffold:module-pack --apply` | Requires `docs/scratch/module-packs/` — **N/A** while Living `docs/` absent |

## Conflict order

DOC-001 → category-specific standard (if any) → DOC-003 → the individual document.

## Categories · prefixes · homes (DOC-001)

| Reader must… | Category | Prefix | Home (when Living restored) |
| --- | --- | --- | --- |
| Govern docs themselves | Control | DOC | `docs/_control/` |
| Understand system shape / Target architecture | Architecture | ARCH | `docs/architecture/` |
| Accept one binding decision | ADR | ADR | `docs/architecture/adr/` only — **no** top-level `docs/adr/`; **no** `decisions/` folder |
| Integrate against shared interface vocabulary | API | API | `docs/api/` |
| Read HTTP path/method catalogues | REST | REST | `docs/api/` |
| Consume machine-readable OpenAPI | OPEN | OPEN | `docs/api/` |
| Operate / recover / escalate | Runbook | RB | `docs/runbooks/` |
| Follow internal implementation guidance | Guide | GUIDE | `docs/guides/` |
| Navigate a product module spine | Module | MOD (or module-qualified, e.g. `FFT-MOD-001`) | `docs/modules/<slug>/` |

Ambiguous? Prefer two linked documents over a hybrid.

## DOC-002 register (seven fields only)

| Field | Notes |
|-------|--------|
| ID | User-approved before permanent registration |
| Category | One of the allowed categories |
| Title | Matches H1 |
| Version | Semver |
| Status | Lifecycle status |
| Owner | Team or function |
| Updated | YYYY-MM-DD |

**Not a register column:** Control State (header-only).

## DOC-003 header + structure

Mandatory header fields: ID · Category · Version · Status · **Control State** · Owner · Updated.

Allowed **Status:** Draft · Review · Accepted · Living · Target · Superseded · Retired.  
Allowed **Control State:** Open · Closed · Reopened.

When Reopened, add control-state note below the table. Six sections: Purpose · Scope · Content · References · Change Log · Notes.

Filename: `{ID}-{kebab-slug}.md` under the category home (exceptions: `docs/README.md`, folder `README.md` stubs, scratch trees when Living exists).

## Control State gates

- Lifecycle **Status** ≠ write permission.
- While **Closed**: do not change content, metadata, path, register, or authority.
- Reopen requires explicit bounded purpose; after verify → Closed and remove note.

## Anti-drift (hard)

1. One subject → one primary category → one home.
2. Never permanently assign/register an ID without explicit user approval.
3. Never reuse Retired or Superseded IDs.
4. No secrets in documentation.
5. New category → amend DOC-001 model (and checkers) in the same change — do not invent a home.
6. Do not recreate `doc/`. Do not invent Living `docs/` without Docs-lane.

## Version bumps (Accepted / Living / Target)

| Change | Bump |
|--------|------|
| Wording, links, formatting, clarification | Patch |
| New controlled content, backward-compatible | Minor |
| Breaking governance, decision, or interpretation | Major |

## Verify (when Living tree present)

- Header ↔ DOC-002 seven fields
- Control State present and enforced
- Filename convention
- Six-section structure
- No SSOT under `doc/`

While Living absent: treat controlled writes as **blocked**; use Scratch `docs-V2/**` for engineering packs only.
