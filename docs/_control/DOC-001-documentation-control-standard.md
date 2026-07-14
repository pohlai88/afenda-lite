# DOC-001 Documentation Control Standard

| Field             | Value      |
| ----------------- | ---------- |
| **ID**            | DOC-001    |
| **Category**      | Control    |
| **Version**       | 2.6.0      |
| **Status**        | Living     |
| **Control State** | Closed     |
| **Owner**         | Platform   |
| **Updated**       | 2026-07-14 |


---

# 1. Purpose

This standard defines the shared documentation governance model for the Afenda product family.

**Afenda-Lite** and **Afenda-Elite** use the same documentation control structure and alias to similar infrastructure. The editions differ by maturity, not by catalogue rules:

| Edition | Maturity | Role in this standard |
| ------- | -------- | --------------------- |
| Afenda-Lite | Beta | Active checkout in this repository; validates the shared control model |
| Afenda-Elite | Battle-proven | Same control structure and comparable infra posture when applied in Elite repos |

It establishes the minimum controls required to ensure that authoritative documents are:

- uniquely identified;
- consistently named;
- version controlled;
- assigned to an accountable owner;
- managed through an explicit lifecycle; and
- discoverable through a minimal documentation register.

The documentation register is a library catalogue, not a document management system. It records only the metadata required to confirm whether a document exists, which version is current, who owns it, and whether it remains authoritative.

---

# 2. Scope

## 2.1 In Scope

This standard applies to all authoritative documentation under `docs/`, including:

- control documents;
- architecture documents and decision records;
- API, REST, and OpenAPI contracts;
- runbooks;
- internal guides; and
- module documentation.

The same categories, lifecycle, filename convention, header, six-section template, and register field rules apply whenever this standard is adopted for Afenda-Lite or Afenda-Elite.

## 2.2 Out of Scope

This standard does not control:

- temporary working notes;
- personal notes;
- generated build output;
- transient meeting notes; or
- content under `docs/scratch/` that has not been promoted.

## 2.3 Edition posture

| Rule | Detail |
| ---- | ------ |
| Shared | `docs/` home, `_control` triad, categories, prefixes, lifecycle, versioning, header, six sections, seven-field register |
| Shared | Similar infra aliasing (monorepo Target, Neon shared-schema tenancy, Vercel app deployable, Neon Auth) — edition content may diverge; control shape must not |
| Distinct | Product maturity and release bar: Lite is beta; Elite is battle-proven |
| Forbidden | Parallel Accepted/Living SSOT under `doc/` · inventing a second control standard per edition · treating Lite as a documentation ceiling that blocks Elite |

Edition-specific architecture or module spines remain allowed. They shall still obey this standard’s IDs, homes, and lifecycle.

## 2.4 Authority

| ID      | Role                         |
| ------- | ---------------------------- |
| DOC-001 | Governing standard           |
| DOC-002 | Controlled register          |
| DOC-003 | Controlled document template |
| MOD-002 | Module category standard (10-MOD layout, AC ownership, evidence, Module Enterprise Readiness) |

Where a conflict exists, the order of authority is:

1. `DOC-001 Documentation Control Standard`;
2. an approved category-specific standard, if one exists — for Module-category spines, [MOD-002](../modules/MOD-002-modules-index.md);
3. `DOC-003 Controlled Document Template`; and
4. the individual document.

This standard was **explicitly approved** for Afenda-Lite on 2026-07-13 and is the shared control baseline for Afenda-Elite documentation when that edition adopts the same library shape.

---

# 3. Control Requirements

## 3.1 Register Fields

Every row in [DOC-002 Documentation Register](DOC-002-documentation-register.md) shall contain exactly seven fields.

| Field    | Required |
| -------- | -------- |
| ID       | Yes      |
| Category | Yes      |
| Title    | Yes      |
| Version  | Yes      |
| Status   | Yes      |
| Owner    | Yes      |
| Updated  | Yes      |

The register shall not contain path, slug, supersedes, related documents, tags, keywords, or priority fields. Such information belongs inside the controlled document when needed.

## 3.2 ID Allocation

A document ID shall not be permanently assigned or registered without explicit user approval.

| Allowed                                        | Forbidden                                  |
| ---------------------------------------------- | ------------------------------------------ |
| Propose a candidate ID for approval            | Auto-number a document into the register   |
| Use a clearly marked provisional ID in a draft | Commit a new register row without approval |
| Keep unapproved documents out of the register  | Reuse a retired or superseded ID           |
| Preserve agreed numbering gaps                 | Invent documents merely to fill gaps       |

The standing approved control documents are:

- `DOC-001 Documentation Control Standard`;
- `DOC-002 Documentation Register`; and
- `DOC-003 Controlled Document Template`.

## 3.3 Categories and Prefixes

| Category     | Prefix | Responsibility                                                                      |
| ------------ | ------ | ----------------------------------------------------------------------------------- |
| Control      | DOC    | Documentation governance, templates, and registers                                  |
| Architecture | ARCH   | Cross-system structure, target architecture, boundaries, and architecture registers |
| ADR          | ADR    | Explicit architecture decision records                                              |
| API          | API    | Cross-cutting interface boundaries, errors, types, and validation vocabulary        |
| REST         | REST   | Human-readable HTTP resource and endpoint catalogues                                |
| OPEN         | OPEN   | Machine-readable OpenAPI YAML or JSON exports                                       |
| Runbook      | RB     | Operational procedures and recovery instructions                                    |
| Guide        | GUIDE  | Internal implementation and working guidance                                        |
| Module       | MOD    | Module indexes and module-specific documentation spines                             |

Use the smallest category that accurately describes the document.

Use `API` for shared interface vocabulary that may cover REST handlers and Server Actions. Use `REST` for HTTP path and method catalogues. Use `OPEN` for machine-readable OpenAPI artifacts.

ADR is a valid document category. Approved ADR home is **`docs/architecture/adr/`** only. Do **not** use top-level `docs/adr/` (retired) or any folder named `decision` / `decisions` (forbidden vocabulary).

Module-qualified IDs may use a module prefix, for example `FFT-MOD-001`.

## 3.4 File Naming

Every authoritative Markdown document shall use:

```text
{ID}-{kebab-slug}.md
```

| Rule                                 | Example                              |
| ------------------------------------ | ------------------------------------ |
| Filename ID matches the header ID    | `ARCH-003-multi-tenant-ecosystem.md` |
| Prefix matches the approved category | Architecture → `ARCH-`               |
| Slug uses lowercase kebab-case       | `multi-tenant-ecosystem`             |
| Numeric padding is preserved         | `ARCH-003`, not `ARCH-3`             |
| H1 uses the ID and title             | `# ARCH-003 Multi-tenant Ecosystem`  |

Findability without a path column depends on this convention. Searching for `{ID}-` under `docs/` shall locate the authoritative file.

### Approved Filename Exceptions

| File                     | Reason                                           |
| ------------------------ | ------------------------------------------------ |
| `docs/README.md`         | Documentation entry point                        |
| `docs/scratch/**`        | Non-authoritative working material               |
| Folder `README.md` files | Navigation stubs pointing to authority documents |

Legacy authoritative basenames such as `DOC-CONTROL.md`, `RUNTIME.md`, or `01-boundaries.md` shall be renamed when materially revised.

## 3.5 Lifecycle

Only the following lifecycle states are permitted.

| Status     | Meaning                                                       |
| ---------- | ------------------------------------------------------------- |
| Draft      | Work is incomplete and not authoritative                      |
| Review     | Work is awaiting formal review or approval                    |
| Accepted   | Approved baseline that is not expected to change frequently   |
| Living     | Approved and actively maintained authority                    |
| Target     | Approved future-state architecture or intended implementation |
| Superseded | Replaced by a newer authority                                 |
| Retired    | No longer applicable and not authoritative                    |

A `Target` document shall clearly identify the current-state authority it is intended to replace or influence.

### 3.5.1 Control State Gate

Every controlled document shall declare **Control State** in its mandatory header. The field name is **Control State** so it cannot be confused with lifecycle **Status**.

| Control State | Meaning |
| ------------- | ------- |
| Open | Initial authorized work is actively underway. |
| Closed | Authoritative and edit-locked; explicit reopening is required. |
| Reopened | Temporarily editable under a named authorization and bounded purpose. It automatically returns to `Closed` after verification. |

Control State is an edit-control condition, not an additional lifecycle value and **not** an eighth DOC-002 register field. Lifecycle **Status** remains the catalogue authority field. The document retains its registered Status and remains authoritative according to that Status.

When Control State is `Reopened`, place this note directly below the metadata table:

```markdown
**Control-state note:** Reopened by <Name> on YYYY-MM-DD for <bounded purpose>. Automatically returns to Closed after successful verification.
```

While `Closed`, agents shall not change the document's content, metadata, path, register row, authority relationships, or generated artifacts. A controlled document may be edited only after the user or accountable owner explicitly reopens the named document or a clearly bounded document scope for a stated purpose.

Control State shall follow these rules:

1. Default to `Closed` unless the user has explicitly set `Open` or `Reopened` for the current task.
2. Name the document ID or bounded scope and the intended change before moving to `Open` or `Reopened`.
3. Check named locks before writing. Reopening the general closure gate does not override a roadmap, path, phase-order, owner, or decision lock.
4. Treat `Reopened` as temporary authorization for the named task only; keep the control-state note current while `Reopened`.
5. Apply the required semantic version increment and synchronize DOC-002 and the latest Change Log row.
6. Re-run the applicable consistency checks.
7. Return the document to `Closed` automatically when verification succeeds and remove the control-state note. A further edit requires another explicit reopen.

Draft and Review documents are not globally writable merely because of their lifecycle Status; they are `Open` only during an explicitly authorized documentation task. Navigation-only README files and generated artifacts may be refreshed only within the bounded task that authorizes their source change.

## 3.6 Versioning

All controlled documents shall use semantic versioning in `major.minor.patch` format.

| Change                                                  | Version Increment |
| ------------------------------------------------------- | ----------------- |
| Breaking governance, decision, or interpretation change | Major             |
| New controlled content or material extension            | Minor             |
| Editorial correction with no change in meaning          | Patch             |

The version in the document header, register row, and latest change-log entry shall match.

## 3.7 Mandatory Header

Every authoritative document shall begin with:

```markdown
# <ID> <Title>

| Field             | Value               |
| ----------------- | ------------------- |
| **ID**            | <ID>                |
| **Category**      | <Category>          |
| **Version**       | <major.minor.patch> |
| **Status**        | <Lifecycle status>  |
| **Control State** | <Open \| Closed \| Reopened> |
| **Owner**         | <Team or Function>  |
| **Updated**       | YYYY-MM-DD          |
```

When **Control State** is `Reopened`, place the control-state note immediately below the metadata table (see §3.5.1).

Allowed **Category** values: Control · Architecture · ADR · API · REST · OPEN · Runbook · Guide · Module.

Allowed **Status** values: Draft · Review · Accepted · Living · Target · Superseded · Retired.

Allowed **Control State** values: Open · Closed · Reopened.

**Control State** is mandatory in the document header and is enforced by the documentation validator. It is **not** added to the DOC-002 seven-field catalogue.

Older documents that omit **Control State** may retain that previous header until materially revised. New documents and material revisions shall use [DOC-003](DOC-003-controlled-document-template.md), including **Control State**. The validator shall require and validate **Control State** for all documents under `docs/_control/` and for any document that already declares the field.

## 3.8 Controlled Document Structure

Unless a category-specific standard requires otherwise, every controlled document shall use these six sections:

1. Purpose
2. Scope
3. Content or Control Requirements
4. References
5. Change Log
6. Notes

Section 3 may be renamed to describe the document’s authoritative subject, such as `Architecture`, `Decision`, `Procedure`, `API Contract`, or `Register`.

### 3.8.1 Module category standard

Product-module documentation under `docs/modules/` shall additionally obey [MOD-002 Modules Index](../modules/MOD-002-modules-index.md): fixed `MOD-001`…`010` roles, AC ownership and ID grammar, structured evidence ledger semantics, and Module Enterprise Readiness claim rules. DOC-003 remains the header and six-section baseline. Document lifecycle Status (`Draft` → `Living`) remains independent of Module Enterprise Readiness evidence results.

## 3.9 Folder Roles

| Folder                         | Role                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------- |
| `docs/_control/`               | Documentation governance, template, and register                                |
| `docs/architecture/`           | Flat home for Living/Target `ARCH-*` files (boundaries by ID + README packs, not sub-trunks) |
| `docs/architecture/adr/`       | ADR documents when explicitly approved (not `decisions/`; not top-level `docs/adr/`) |
| `docs/architecture/archive/`   | Superseded Architecture stubs only                                              |
| `docs/api/`                    | API, REST, and OpenAPI interface contracts                                      |
| `docs/runbooks/`               | Operational procedures                                                          |
| `docs/guides/`                 | Internal guides                                                                 |
| `docs/modules/`                | Module documentation and module-specific spines                                 |
| `docs/scratch/`                | Non-authoritative drafts and temporary notes                                    |

**Forbidden under `docs/architecture/`:** recreating trunk folders `backend/`, `frontend/`, `system/`, or `tech-stack/`. Pack reading order lives in `docs/architecture/README.md` only. Findability remains `{ID}-` search under `docs/`.

API-pack implementation and verification guides may be co-located under `docs/api/guides/` when they are registered in DOC-002 and linked from the API pack entry. They remain Guide-category documents subordinate to the governing architecture and API contracts. This category-specific exception does not permit other guides to bypass `docs/guides/`.

API-pack operational runbooks (OpenAPI drift, API incident response, API contract rollback, and future webhook replay) may be co-located under `docs/api/runbooks/` when they are registered in DOC-002 and linked from the API pack entry. They remain Runbook-category documents subordinate to ARCH-029 / OPEN-001 / Living API contracts. Platform runbooks (for example RB-001, RB-005) stay under `docs/runbooks/`. This exception does not permit other runbooks to bypass `docs/runbooks/`.

`docs/engineering/` is retired and shall not be recreated. Its controlled content belongs under `docs/guides/` (or archive).

## 3.10 Golden Rule

The register answers only four questions:

1. Does this document exist?
2. Which version is current?
3. Who owns it?
4. Is it still authoritative?

Everything else belongs inside the controlled document.

---

# 4. References

| ID      | Title                        | Relationship                                         |
| ------- | ---------------------------- | ---------------------------------------------------- |
| DOC-002 | Documentation Register       | Controlled catalogue governed by this standard       |
| DOC-003 | Controlled Document Template | Mandatory default structure for controlled documents |
| MOD-002 | Modules Index                | Stricter Module category standard (10-MOD + readiness) |

---

# 5. Change Log

| Version | Date       | Summary                                                                                                                                                              |
| ------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.6.0   | 2026-07-14 | Flat `docs/architecture/` for ARCH files; forbid `backend/`/`frontend/`/`system/`/`tech-stack/` trunks; register `archive/` role. |
| 2.5.0   | 2026-07-14 | ADR home = `docs/architecture/adr/` only; forbid `decision`/`decisions` directory names and top-level `docs/adr/`. |
| 2.4.0   | 2026-07-14 | Named MOD-002 as the Module category standard for the fixed 10-MOD spine, AC ownership, evidence semantics, and Module Enterprise Readiness (lifecycle independent of readiness). |
| 2.3.0   | 2026-07-14 | Approved `docs/api/runbooks/` co-location for API-pack runbooks (RB-006…008; reserved RB-009); platform runbooks remain under `docs/runbooks/`. |
| 2.2.0   | 2026-07-14 | Required header field **Control State** (Open · Closed · Reopened) distinct from lifecycle Status; kept DOC-002 at seven fields; validator must enforce the header field. |
| 2.1.0   | 2026-07-13 | Made Control State explicit as Open · Closed · Reopened without adding a register column. |
| 2.0.0   | 2026-07-13 | Breaking governance: controlled documents now close automatically after verified work and require explicit bounded reopening before further edits.                  |
| 1.7.0   | 2026-07-13 | Approved the registered `docs/api/guides/` co-location exception for API-pack implementation and verification guides.                                                |
| 1.6.0   | 2026-07-13 | User-approved shared Lite/Elite control: same `docs/` structure and similar infra aliasing; Lite = beta, Elite = battle-proven; forbids parallel `doc/` SSOT.         |
| 1.5.0   | 2026-07-13 | Added DOC-003 as a standing control document; aligned six-section structure; introduced Target lifecycle status; resolved ADR folder and register consistency rules. |
| 1.4.1   | 2026-07-13 | Retired `docs/engineering/`; consolidated GUIDE documents under `docs/guides/`.                                                                                      |
| 1.4.0   | 2026-07-13 | Assigned module documentation spines to `docs/modules/<slug>/`.                                                                                                      |
| 1.3.0   | 2026-07-13 | Added REST and OPEN categories.                                                                                                                                      |
| 1.2.0   | 2026-07-13 | Required explicit approval before document ID registration.                                                                                                          |
| 1.1.0   | 2026-07-13 | Added mandatory `{ID}-{kebab-slug}.md` filename convention.                                                                                                          |
| 1.0.0   | 2026-07-13 | Established the minimal documentation catalogue controls.                                                                                                            |

---

# 6. Notes

This standard intentionally keeps the register small. Additional metadata shall not be added merely for convenience.

Category-specific documents may add stricter requirements, but shall not weaken this standard.

Afenda-Lite remains the beta checkout that proves this control model. Afenda-Elite shall not invent a divergent catalogue; it shall reuse this structure when documenting the battle-proven edition.
