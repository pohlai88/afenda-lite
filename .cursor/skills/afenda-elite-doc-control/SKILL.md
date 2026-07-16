---
name: afenda-elite-doc-control
description: Keeps authoritative docs/ work consistent with DOC-001, DOC-002, and DOC-003 — classify category/home, create or update register rows (only after ID approval), version and lifecycle changes, supersede/retire without drift. Use when writing, moving, renaming, accepting, updating, or retiring Markdown under docs/, or when documentation categories mix or diverge from the register.
disable-model-invocation: true
---

# Afenda — documentation control

## Mode

Operational workflow for the documentation system. **Authority is never this skill.**

**Editions:** Afenda-Lite (beta) and Afenda-Elite (battle-proven) share this control model ([DOC-001](../../../docs/_control/DOC-001-documentation-control-standard.md)). This checkout’s register (DOC-002) lists Lite documents.

```text
LOAD:
  docs/_control/DOC-001-documentation-control-standard.md   # governance · categories · lifecycle · folders
  docs/_control/DOC-002-documentation-register.md           # catalogue (seven fields only)
  docs/_control/DOC-003-controlled-document-template.md     # mandatory header + six sections
SKIP:
  recreating doc/ · Accepted/Living SSOT outside docs/ · inventing categories outside DOC-001
  auto-numbering IDs into DOC-002 without explicit user approval
  register path/slug/tags columns · copying DOC-001 into other skills as a twin SSOT
  mixing two categories in one file · restoring docs/engineering/ or docs/adr/ as a required home
VERIFY:
  header ↔ DOC-002 row (ID, Category, Title, Version, Status, Owner, Updated)
  header **Control State** (Open · Closed · Reopened) present — not a DOC-002 column
  when Reopened: control-state note directly below the metadata table
  filename {ID}-{kebab-slug}.md under the DOC-001 folder for that category
  six-section structure per DOC-003 (unless a stricter approved category standard applies)
CLOSE:
  set Control State to Closed, remove the control-state note after verified completion; later writes require explicit bounded reopening under DOC-001 §3.5.1
ROUTE:
  /using-afenda-elite-skills first for product farm
  documentation-and-adrs for deep prose / ADR composition (method library — not register SSOT)
  afenda-elite-doc-integrity for duplication / conflict / SSOT / register-drift audits — not this skill
```

## Owns

```text
Create · Revise · Format · Version · Register · Move · Supersede · Retire
```

Authorized controlled-document lifecycle writes: create with DOC-003, assign approved IDs, apply category/filename rules, control metadata, semantic versioning, change logs, DOC-002 register rows, moves/renames, ADR drafts under DOC-001 homes, supersede/retire, and approved documentation repair plans from integrity.

## Does Not Own

- Repository-wide conflict discovery or semantic comparison across multiple authorities → [afenda-elite-doc-integrity](../afenda-elite-doc-integrity/SKILL.md)
- Code-to-document validation → [afenda-elite-audit-orchestrator](../afenda-elite-audit-orchestrator/SKILL.md) / [afenda-elite-api-contract](../afenda-elite-api-contract/SKILL.md) for API surfaces
- General repository cleanup → [afenda-elite-repo-housekeeping](../afenda-elite-repo-housekeeping/SKILL.md)
- Deep inline / README / JSDoc craft as a competing SSOT → [documentation-and-adrs](../agent-skills/skills/documentation-and-adrs/SKILL.md) (method library; this skill owns governed write procedures)

## Why this skill exists

As `docs/` grows, agents mix categories, invent homes, register IDs without approval, skip register rows, recycle IDs, or update files without DOC-002. This skill forces one path: **classify → place → header ↔ register → lifecycle/version → verify**.

## Authority map (this repo)

| ID | Role | Path |
| --- | --- | --- |
| DOC-001 | Governing standard | `docs/_control/DOC-001-documentation-control-standard.md` |
| DOC-002 | Controlled register | `docs/_control/DOC-002-documentation-register.md` |
| DOC-003 | Controlled template | `docs/_control/DOC-003-controlled-document-template.md` |

Conflict order: DOC-001 → category-specific standard (if any) → DOC-003 → the individual document.

**Do not recreate `doc/`.** Product SSOT is `docs/` only ([AGENTS.md](../../../AGENTS.md)). Lite and Elite share catalogue shape; they do not maintain twin Accepted trees.

## Anti-drift rules

1. One subject → one primary category → one home under the DOC-001 folder table.
2. Filename: `{ID}-{kebab-slug}.md` (exceptions: `docs/README.md`, folder `README.md` stubs, `docs/scratch/**`).
3. Header fields and DOC-002 row must match (ID, Category, Version, Status, Owner, Updated). Title lives in H1 and the Title column. **Control State** is header-only (not a register column).
4. **Never** permanently assign or register an ID without explicit user approval. Propose candidates; keep unapproved work out of DOC-002 (or mark provisional in Draft only).
5. Never reuse Retired or Superseded IDs. Preserve agreed numbering gaps.
6. Link related docs; do not duplicate their authority. Prefer links to volatile code/schemas over copies.
7. No secrets in documentation.
8. New category → amend DOC-001 (and any checker) in the same change — do not invent a home.
9. Lifecycle **Status** is not write permission. **Control State** gates edits: while `Closed`, do not change content, metadata, path, register, or authority. Outside an explicitly reopened task, every controlled document is Closed.

## Classify (before any write)

| Reader must… | Category | Prefix | Home |
| --- | --- | --- | --- |
| Govern docs themselves | Control | DOC | `docs/_control/` |
| Understand system shape / Target architecture | Architecture | ARCH | `docs/architecture/` (Target packs under `docs/architecture/` when applicable) |
| Accept one binding decision | ADR | ADR | `docs/architecture/adr/` (only when explicitly approved; **no** top-level `docs/adr/`; **no** `decisions/` folder) |
| Integrate against shared interface vocabulary | API | API | `docs/api/` |
| Read HTTP path/method catalogues | REST | REST | `docs/api/` |
| Consume machine-readable OpenAPI | OPEN | OPEN | `docs/api/` |
| Operate / recover / escalate | Runbook | RB | `docs/runbooks/` |
| Follow internal implementation guidance | Guide | GUIDE | `docs/guides/` |
| Navigate a product module spine | Module | MOD (or module-qualified, e.g. `FFT-MOD-001`) | `docs/modules/<slug>/` |

Ambiguous? Prefer two linked documents over a hybrid. Use the smallest accurate category (API vs REST vs OPEN per DOC-001).

## Workflows

Copy and track:

```text
Docs task:
- [ ] Classify category + home (DOC-001)
- [ ] LOAD DOC-001 + DOC-002 + DOC-003
- [ ] ID approved by user (or clearly provisional Draft, not in register)
- [ ] Create | Update | Move | Supersede/Retire
- [ ] Explicit reopen names the document(s), bounded scope, and intended change; set **Control State** to `Reopened` and add the control-state note
- [ ] Header ↔ DOC-002 agree (seven catalogue fields only)
- [ ] Filename + six sections per DOC-003; **Control State** in header
- [ ] Verify, then set Control State to `Closed` and remove the control-state note
```

### Scaffold a module pack

MOD-002 is the human authority. The subordinate `module-pack-contract.json` drives both validation and provisional templates.

```powershell
pnpm plan:module-pack -- -- --prefix INV --slug inventory --title "Inventory" --owner Platform --profiles "Enterprise Core,ERP"
pnpm scaffold:module-pack -- -- --prefix INV --slug inventory --title "Inventory" --owner Platform --profiles "Enterprise Core,ERP" --apply
```

Dry-run is the default. `--apply` is scratch-only under `docs/scratch/module-packs/<slug>/`, refuses overwrite, and does not approve IDs or create DOC-002 rows. Promotion remains a bounded controlled-document operation under MOD-002. Run `pnpm test:module-pack` and `pnpm check:module-quality` before closing.

### Create

1. Propose a candidate ID; **stop** until the user approves registration (DOC-001 §3.2).
2. Write `{home}/{ID}-{slug}.md` from DOC-003: lifecycle usually `Draft`, version `0.1.0` or `1.0.0` per intent, mandatory header + six sections.
3. On approval: add the seven-field row to DOC-002 in the same change.
4. Verify header ↔ row and filename convention.

### Review → Accept / Living / Target

1. `Draft` → `Review` while feedback pending.
2. On approval: set Status to `Accepted`, `Living`, or `Target` as appropriate (DOC-001 §3.5). First stable version is normally `1.0.0`.
3. Sync header + DOC-002; record material change in the document Change Log.
4. A `Target` doc must name the current-state authority it replaces or influences.

### Update (Accepted / Living / Target)

Before writing, require an explicit bounded reopen under DOC-001 §3.5.1. A general request to improve documentation does not reopen every controlled document.

| Change | Version bump |
| --- | --- |
| Wording, links, formatting, clarification | Patch |
| New controlled content, backward-compatible | Minor |
| Breaking governance, decision, or interpretation | Major |

Update header and DOC-002 together.

After verification, close the document automatically. A later edit requires another explicit reopen.

### Move or rename

Keep the ID. Change path only when category or subject changed materially. Repair inbound links in the same change. Register has **no path column** — findability is `{ID}-` under `docs/`.

### Supersede / retire

1. Keep original file and ID (never delete Accepted/Living history silently).
2. Set Status to `Superseded` or `Retired`; name successor or reason in the document (and Change Log).
3. Sync DOC-002. IDs are never recycled.

## Header template

Use DOC-003. Minimal:

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

When **Control State** is `Reopened`, place directly below the table:

```markdown
**Control-state note:** Reopened by <Name> on YYYY-MM-DD for <bounded purpose>. Automatically returns to Closed after successful verification.
```

Allowed **Category**: Control · Architecture · ADR · API · REST · OPEN · Runbook · Guide · Module.

Allowed **Status**: Draft · Review · Accepted · Living · Target · Superseded · Retired.

Allowed **Control State**: Open · Closed · Reopened.

**Control State** is mandatory in the header and enforced by the validator. It is **not** a DOC-002 column.

Six sections: Purpose · Scope · Content (or renamed subject) · References · Change Log · Notes.

## Verification

- [ ] Category/home match DOC-001 §3.3 / §3.9
- [ ] ID approved; row in DOC-002 when registered; header matches row
- [ ] Filename `{ID}-{kebab-slug}.md` (or approved exception)
- [ ] Structure follows DOC-003 (including **Control State** header field)
- [ ] No new Accepted/Living/Target SSOT under `doc/`
- [ ] No secrets
- [ ] Control State returned to `Closed` after verification

Automated `pnpm check:doc-registry` is **not** the Lite gate unless restored to validate `docs/_control` — do not invent Elite `doc/` trees to satisfy an old checker.

## Additional resources

- Quick templates / checklist: [reference.md](reference.md)
- Standard: [DOC-001](../../../docs/_control/DOC-001-documentation-control-standard.md)
- Register: [DOC-002](../../../docs/_control/DOC-002-documentation-register.md)
- Template: [DOC-003](../../../docs/_control/DOC-003-controlled-document-template.md)
- Docs entry: [docs/README.md](../../../docs/README.md)
- Entry router: [using-afenda-elite-skills](../using-afenda-elite-skills/SKILL.md)
- Prose method: [documentation-and-adrs](../agent-skills/skills/documentation-and-adrs/SKILL.md)
- Conflict audits: [afenda-elite-doc-integrity](../afenda-elite-doc-integrity/SKILL.md)
