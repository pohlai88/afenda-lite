---
name: afenda-elite-doc-control
description: Keeps authoritative docs/ work consistent with DOC-001, DOC-002, and DOC-003 — classify category/home, create or update register rows (only after ID approval), version and lifecycle changes, supersede/retire without drift. Use when writing, moving, renaming, accepting, updating, or retiring Markdown under docs/, or when documentation categories mix or diverge from the register.
disable-model-invocation: true
---

# Afenda — documentation control

## Mode

Operational workflow for the documentation system. **Authority is never this skill.**

**Editions:** Afenda-Lite (beta) and Afenda-Elite (battle-proven) share this control model ([doc-control-rules](doc-control-rules.md)). Living Controlled `docs/**` is **dormant** on this checkout until Docs-lane reopen — do not invent the tree.

```text
LOAD:
  doc-control-rules.md          # DOC-001 · DOC-002 · DOC-003 operative rules (skill-local)
  reference.md                  # header template · checklist
  AGENTS.md                     # checkout posture
SKIP:
  recreating doc/ · restoring Living docs/ without Docs-lane · Accepted/Living SSOT outside docs/
  inventing categories outside DOC-001 · auto-numbering IDs into DOC-002 without explicit user approval
  register path/slug/tags columns · copying DOC-001 into other skills as a twin SSOT
  mixing two categories in one file · restoring docs/engineering/ or docs/adr/ as a required home
  scaffold:module-pack --apply while docs/ absent
VERIFY:
  when Living docs/ present: header ↔ DOC-002; Control State; filename; six sections
  when Living docs/ absent: controlled writes BLOCKED — report Docs-lane reopen required
CLOSE:
  set Control State to Closed, remove the control-state note after verified completion
ROUTE:
  /using-afenda-elite-skills first for product farm
  documentation-and-adrs for deep prose / ADR composition (method library — not register SSOT)
  afenda-elite-doc-integrity for duplication / conflict / SSOT / register-drift audits — not this skill
```

## Owns

```text
Create · Revise · Format · Version · Register · Move · Supersede · Retire
```

Authorized controlled-document lifecycle writes (when Living `docs/` is restored): create with DOC-003, assign approved IDs, apply category/filename rules, control metadata, semantic versioning, change logs, DOC-002 register rows, moves/renames, ADR drafts under DOC-001 homes, supersede/retire, and approved documentation repair plans from integrity.

## Does Not Own

- Repository-wide conflict discovery or semantic comparison across multiple authorities → [afenda-elite-doc-integrity](../afenda-elite-doc-integrity/SKILL.md)
- Code-to-document validation → [afenda-elite-audit-orchestrator](../afenda-elite-audit-orchestrator/SKILL.md) / [afenda-elite-api-contract](../afenda-elite-api-contract/SKILL.md) for API surfaces
- General repository cleanup → [afenda-elite-repo-housekeeping](../afenda-elite-repo-housekeeping/SKILL.md)
- Deep inline / README / JSDoc craft as a competing SSOT → [documentation-and-adrs](../agent-skills/skills/documentation-and-adrs/SKILL.md) (method library; this skill owns governed write procedures)
- Scratch engineering packs → [`docs-V2/`](../../../docs-V2/README.md) (not DOC-001 register)

## Why this skill exists

Agents mix categories, invent homes, register IDs without approval, skip register rows, recycle IDs, or update files without DOC-002. This skill forces one path: **classify → place → header ↔ register → lifecycle/version → verify**. On this checkout the Living tree is dormant — operative rules still load from [doc-control-rules](doc-control-rules.md).

## Authority map (this checkout)

| ID | Role | Offline SSOT |
| --- | --- | --- |
| DOC-001 | Governing standard | [doc-control-rules.md](doc-control-rules.md) |
| DOC-002 | Controlled register | [doc-control-rules.md](doc-control-rules.md) (seven fields) |
| DOC-003 | Controlled template | [doc-control-rules.md](doc-control-rules.md) · [reference.md](reference.md) |

Conflict order: DOC-001 → category-specific standard (if any) → DOC-003 → the individual document.

**Do not recreate `doc/`.** Living Controlled product SSOT is `docs/` only when Docs-lane restores it ([AGENTS.md](../../../AGENTS.md)). Lite and Elite share catalogue shape; they do not maintain twin Accepted trees.

## Anti-drift rules

See [doc-control-rules](doc-control-rules.md). Summary: one category/home; filename `{ID}-{kebab-slug}.md`; header ↔ register; ID approval required; no ID recycle; no secrets; Control State gates writes.

## Classify (before any write)

Full table in [doc-control-rules](doc-control-rules.md). Ambiguous? Prefer two linked documents over a hybrid.

## Workflows

Copy and track:

```text
Docs task:
- [ ] Living docs/ present? If no → STOP (Docs-lane reopen). Scratch edits use docs-V2 only.
- [ ] Classify category + home (DOC-001)
- [ ] LOAD doc-control-rules.md (+ Living DOC bodies if restored)
- [ ] ID approved by user (or clearly provisional Draft, not in register)
- [ ] Create | Update | Move | Supersede/Retire
- [ ] Explicit reopen names the document(s), bounded scope, and intended change; set Control State to Reopened
- [ ] Header ↔ DOC-002 agree (seven catalogue fields only)
- [ ] Filename + six sections per DOC-003; Control State in header
- [ ] Verify, then set Control State to Closed and remove the control-state note
```

### Scaffold a module pack

MOD-002 is the human authority. The subordinate `module-pack-contract.json` drives both validation and provisional templates.

```powershell
pnpm plan:module-pack -- -- --prefix INV --slug inventory --title "Inventory" --owner Platform --profiles "Enterprise Core,ERP"
pnpm scaffold:module-pack -- -- --prefix INV --slug inventory --title "Inventory" --owner Platform --profiles "Enterprise Core,ERP" --apply
```

Dry-run is the default. `--apply` is scratch-only under `docs/scratch/module-packs/<slug>/` — **N/A while Living `docs/` is absent** (script requires that root). It refuses overwrite and does not approve IDs or create DOC-002 rows. Promotion remains a bounded controlled-document operation. Run `pnpm test:module-pack` and `pnpm check:module-quality` when Living module packs exist.

### Create / Review / Update / Move / Supersede

Procedures unchanged from DOC model — see [doc-control-rules](doc-control-rules.md) and [reference.md](reference.md). All require Living `docs/` on disk.

## Header template

See [reference.md](reference.md) and [doc-control-rules](doc-control-rules.md).

## Verification

- [ ] When Living present: category/home, ID/register, filename, DOC-003 structure, Control State Closed after verify
- [ ] When Living absent: no controlled writes attempted; Scratch only under `docs-V2/**`
- [ ] No new Accepted/Living/Target SSOT under `doc/`
- [ ] No secrets

Automated `pnpm check:doc-registry` is **not** the Lite gate unless restored to validate `docs/_control` — do not invent Living trees to satisfy an old checker.

## Additional resources

- Operative rules: [doc-control-rules.md](doc-control-rules.md)
- Quick templates / checklist: [reference.md](reference.md)
- Scratch packs: [docs-V2/README.md](../../../docs-V2/README.md)
- Entry router: [using-afenda-elite-skills](../using-afenda-elite-skills/SKILL.md)
- Prose method: [documentation-and-adrs](../agent-skills/skills/documentation-and-adrs/SKILL.md)
- Conflict audits: [afenda-elite-doc-integrity](../afenda-elite-doc-integrity/SKILL.md)
