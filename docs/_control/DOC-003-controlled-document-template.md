# DOC-003 Controlled Document Template

| Field             | Value      |
| ----------------- | ---------- |
| **ID**            | DOC-003    |
| **Category**      | Control    |
| **Version**       | 1.4.0      |
| **Status**        | Living     |
| **Control State** | Closed     |
| **Owner**         | Platform   |
| **Updated**       | 2026-07-14 |


---

# 1. Purpose

This document defines the default structure for every controlled document in the Afenda documentation library.

The template is shared by Afenda-Lite (beta) and Afenda-Elite (battle-proven). Edition maturity does not change header fields, six-section layout, or filename rules.

The template is itself controlled and versioned. New authoritative documents shall use this template unless a stricter category-specific standard has been explicitly approved.

---

# 2. Scope

## 2.1 In Scope

This template applies to:

- control documents;
- architecture documents;
- architecture decision records;
- API, REST, and OpenAPI documentation;
- runbooks;
- guides; and
- module documentation.

## 2.2 Out of Scope

This template does not apply to:

- content under `docs/scratch/`;
- temporary notes;
- generated outputs;
- personal working documents; or
- navigation-only folder `README.md` files.

---

# 3. Controlled Document Template

Copy the block below into a new authoritative Markdown file.

```markdown
# <ID> <Title>

| Field             | Value                        |
| ----------------- | ---------------------------- |
| **ID**            | <Approved or Provisional ID> |
| **Category**      | <Category>                   |
| **Version**       | 1.0.0                        |
| **Status**        | <Lifecycle status>           |
| **Control State** | <Open \| Closed \| Reopened> |
| **Owner**         | <Team or Function>           |
| **Updated**       | YYYY-MM-DD                   |

**Control-state note:** Reopened by <Name> on YYYY-MM-DD for <bounded purpose>. Automatically returns to Closed after successful verification.

Allowed **Category** values: Control · Architecture · ADR · API · REST · OPEN · Runbook · Guide · Module.

Allowed **Status** values: Draft · Review · Accepted · Living · Target · Superseded · Retired.

Allowed **Control State** values: Open · Closed · Reopened.

**Control State** is a mandatory header field (DOC-001 §3.7). It is not a DOC-002 register column. Include the control-state note only while Control State is Reopened.

---

# 1. Purpose

State why this document exists, what problem it addresses, and what authority it provides.

---

# 2. Scope

## 2.1 In Scope

- <Included subject, process, system, or responsibility>

## 2.2 Out of Scope

- <Explicit exclusion>

---

# 3. <Authoritative Section Name>

Replace this heading with the subject appropriate to the document.

Examples:

- `Control Requirements`
- `Architecture`
- `Decision`
- `API Contract`
- `Procedure`
- `Implementation Guide`
- `Register`

Place the authoritative content here.

---

# 4. References

| ID      | Title                          | Relationship                                     |
| ------- | ------------------------------ | ------------------------------------------------ |
| DOC-001 | Documentation Control Standard | Governance                                       |
| <ID>    | <Title>                        | <Depends on / Implements / Supersedes / Related> |

When there are no references beyond DOC-001, retain only the DOC-001 row.

---

# 5. Change Log

| Version | Date       | Summary        |
| ------- | ---------- | -------------- |
| 1.0.0   | YYYY-MM-DD | Initial draft. |

Add one row for each released version. The latest row shall match the header version and updated date.

---

# 6. Notes

Record only information that does not belong in the authoritative body, such as:

- migration notes;
- temporary assumptions;
- known limitations; or
- future considerations.

When unused, write:

> None.
```

## 3.1 Template Rules

1. The document filename shall follow `{ID}-{kebab-slug}.md`.
2. The H1 ID, metadata ID, and filename ID shall match.
3. The version shall use `major.minor.patch`.
4. The latest change-log row shall match the header version.
5. The status shall use an approved lifecycle value.
6. **Control State** shall use Open · Closed · Reopened and shall not be confused with **Status**.
7. When Control State is `Reopened`, the control-state note shall appear directly below the metadata table.
8. Section 3 shall be renamed to reflect the document’s authoritative content.
9. A provisional ID shall not be added to DOC-002 until explicitly approved.
10. Unused sections shall remain present and state `None.` rather than being deleted.
11. The document returns to `Closed` after verified completion (remove the control-state note) and shall not be edited again until explicitly reopened.

---

# 4. References

| ID      | Title                          | Relationship                          |
| ------- | ------------------------------ | ------------------------------------- |
| DOC-001 | Documentation Control Standard | Governs this template                 |
| DOC-002 | Documentation Register         | Records approved controlled documents |

---

# 5. Change Log

| Version | Date       | Summary                                                                                               |
| ------- | ---------- | ----------------------------------------------------------------------------------------------------- |
| 1.4.0   | 2026-07-14 | Added mandatory **Control State** header field and Reopened control-state note; still not a DOC-002 column. |
| 1.3.0   | 2026-07-13 | Made Control State explicit in the template without adding a new mandatory header or register field.  |
| 1.2.0   | 2026-07-13 | Added the DOC-001 close/reopen gate to the controlled-document rules.                                  |
| 1.1.0   | 2026-07-13 | Clarified shared Lite/Elite template (same structure; editions differ by maturity only).              |
| 1.0.0   | 2026-07-13 | Established the controlled six-section document template with mandatory metadata and version control. |

---

# 6. Notes

This document shall not use a provisional ID in its own header.

Changes to this template shall follow the same review, versioning, ownership, and lifecycle requirements imposed on all other controlled documents.

This template is `Closed` after verification. Reopening must explicitly name DOC-003 and the intended template change.
