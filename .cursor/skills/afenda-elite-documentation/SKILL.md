---
name: afenda-elite-documentation
description: Keeps authoritative doc/ work consistent with DOC-001 and DOC-002 — classify type/home, create or update registry rows, version and lifecycle changes, supersede/deprecate/archive without drift. Use when writing, moving, renaming, accepting, updating, or retiring Markdown under doc/, or when documentation categories mix or diverge from the registry.
disable-model-invocation: true
---

# Afenda Elite — documentation governance

## Mode

Operational workflow for the documentation system. **Authority is never this skill.**

```text
LOAD:
  doc/REGISTRY.md                                          # DOC-001 inventory
  doc/register/DOC-002-documentation-system.md             # types · metadata · procedures
  doc/register/DOC-003-glossary.md                         # term.* when naming
SKIP:
  inventing a sixth type · second ID scheme · folder README · docs/ as Accepted SSOT
  copying DOC-002 procedures into other skills as a twin SSOT
  mixing ADR + Architecture (or any two types) in one file
VERIFY:
  npm run check:doc-registry   # non-zero → STOP
ROUTE:
  /using-afenda-elite-skills first for Elite farm
  documentation-and-adrs for prose craft only (method library)
```

## Why this skill exists

As `doc/` grows, agents mix types, invent homes, skip registry rows, recycle IDs, or update files without the registry. This skill forces one path: **classify → place → header ↔ registry → lifecycle/version → check**.

## Anti-drift rules

1. One subject → one primary type → one home under `doc/<home>/`.
2. Filename: `DOC-NNN-<short-slug>.md` (only `doc/REGISTRY.md` is exempt).
3. Header fields and registry row must match (ID, Type, Lifecycle, Version, Owner, Updated).
4. Next free ID from DOC-001 (currently after retired `DOC-005`–`DOC-009`). Never reuse IDs.
5. Cite `term.*` from DOC-003; do not redefine product names.
6. Link related docs; do not duplicate their authority.
7. No secrets in documentation.
8. New type → amend DOC-002 and the validator in the same change — do not invent a home.

## Classify (before any write)

| Reader must… | Type | Home |
| --- | --- | --- |
| Accept one binding decision | ADR | `doc/adr/` |
| Maintain a governed list | Register | `doc/register/` |
| Understand system shape / boundaries | Architecture | `doc/architecture/` |
| Operate / recover / escalate | Runbook | `doc/runbooks/` |
| Integrate against a stable interface | API Contract | `doc/api/` |

Ambiguous? Prefer two linked documents over a hybrid.

## Workflows

Copy and track:

```text
Docs task:
- [ ] Classify type + home
- [ ] LOAD DOC-001 + DOC-002 (+ DOC-003 if naming)
- [ ] Create | Update | Move | Supersede/Deprecate/Archive
- [ ] Header ↔ registry agree
- [ ] npm run check:doc-registry → 0
```

### Create

1. Allocate next unused `DOC-NNN` from DOC-001.
2. Write `doc/<home>/DOC-NNN-<slug>.md` with lifecycle `Draft`, version `0.1.0`, required header.
3. Add registry row in the same change.
4. Run `npm run check:doc-registry`.

### Review → Accept

1. `Draft` → `Review` while feedback pending.
2. On approval: lifecycle `Accepted`, first Accepted version normally `1.0.0`.
3. Sync header + registry dates/versions; record material change in DOC-001 history.
4. Run the check.

### Update (Accepted)

| Change | Version bump |
| --- | --- |
| Wording, links, formatting, clarification | Patch |
| New material guidance, backward-compatible | Minor |
| Scope, authority, contract, binding decision | Major |

Update header and registry together. Prefer links to volatile code/schemas over copies.

### Move or rename

Keep the ID. Change path only when type or subject changed materially. Update registry path and repair inbound links in the same change. Run the check.

### Supersede / deprecate / archive

1. Keep original file and ID (never delete Accepted history silently).
2. Set lifecycle; name successor or reason in both docs + DOC-001 (`Supersedes` / history).
3. IDs are never recycled.
4. Run the check.

## Header template

```markdown
# <Title>

| Field | Value |
| --- | --- |
| ID | `DOC-NNN` |
| Type | ADR \| Register \| Architecture \| Runbook \| API Contract |
| Lifecycle | Draft \| Review \| Accepted \| Superseded \| Deprecated \| Archived |
| Version | `0.1.0` |
| Owner | <team or role> |
| Updated | YYYY-MM-DD |
```

Minimal section outlines: follow DOC-002 “Minimal structures” — do not invent alternate ADR/register shapes.

## Verification

- [ ] Type/home match DOC-002
- [ ] File registered in DOC-001; header matches row
- [ ] Terms cited via DOC-003 when used
- [ ] `npm run check:doc-registry` exits 0
- [ ] No Accepted work under `docs/` as SSOT

## Additional resources

- System SSOT: [DOC-002](../../../doc/register/DOC-002-documentation-system.md)
- Inventory: [DOC-001](../../../doc/REGISTRY.md)
- Glossary: [DOC-003](../../../doc/register/DOC-003-glossary.md)
- Skill boundaries: [DOC-004](../../../doc/architecture/DOC-004-skills-architecture.md)
- Entry: [using-afenda-elite-skills](../using-afenda-elite-skills/SKILL.md)
- Prose method: [documentation-and-adrs](../agent-skills/skills/documentation-and-adrs/SKILL.md)
