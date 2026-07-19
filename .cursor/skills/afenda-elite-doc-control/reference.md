# afenda-elite-doc-control — quick reference

Afenda-specific controlled workflow only. Deep prose, inline comments, README craft, and JSDoc/OpenAPI examples stay in [documentation-and-adrs](../agent-skills/skills/documentation-and-adrs/SKILL.md). Authority: [doc-control-rules.md](doc-control-rules.md) (DOC-001 · DOC-002 · DOC-003 operative). Living bodies dormant until Docs-lane reopen.

## Controlled-document header (DOC-003)

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

When **Control State** is `Reopened`:

```markdown
**Control-state note:** Reopened by <Name> on YYYY-MM-DD for <bounded purpose>. Automatically returns to Closed after successful verification.
```

Six sections: Purpose · Scope · Content · References · Change Log · Notes.

## Module-pack scaffold

`module-pack-contract.json` is the executable mirror subordinate to MOD-002. Use `plan:module-pack` for deterministic preview and `scaffold:module-pack -- --apply` only for scratch generation **when Living `docs/` exists**. Never promote placeholders, auto-register provisional IDs, create MOD-011, or create depth folders. While `docs/` is absent, treat `--apply` as **N/A**.

## ADR shape (when category ADR is approved)

Same mandatory header. Prefer home `docs/architecture/adr/` only when Living docs restored and explicitly approved — **no** top-level `docs/adr/`; **no** `decisions/` folder. Record Context · Decision · Consequences under Content (or equivalently named subsections). Link successor/predecessor IDs; never recycle Retired or Superseded IDs.

## Workflow checklist

```text
- [ ] Living docs/ present (else STOP — Docs-lane)
- [ ] Classify category + home (doc-control-rules)
- [ ] LOAD doc-control-rules.md
- [ ] ID approved by user (or provisional Draft, not in register)
- [ ] Create | Update | Move | Supersede/Retire
- [ ] Explicit reopen: named document(s), bounded scope, intended change
- [ ] Set Control State to Reopened + control-state note
- [ ] Header ↔ DOC-002 (seven catalogue fields only)
- [ ] Filename {ID}-{kebab-slug}.md; Control State in header
- [ ] Verify, then Closed; remove control-state note
```

## Version bumps (Accepted / Living / Target)

| Change | Bump |
| --- | --- |
| Wording, links, formatting, clarification | Patch |
| New controlled content, backward-compatible | Minor |
| Breaking governance, decision, or interpretation | Major |

## Hand-offs

| Need | Owner |
| --- | --- |
| Detect / plan / verify doc↔doc conflicts | [afenda-elite-doc-integrity](../afenda-elite-doc-integrity/SKILL.md) |
| Deep prose / ADR composition craft | [documentation-and-adrs](../agent-skills/skills/documentation-and-adrs/SKILL.md) |
| Repo hygiene | [afenda-elite-repo-housekeeping](../afenda-elite-repo-housekeeping/SKILL.md) |
| Code↔doc drift (generic) | [afenda-elite-audit-orchestrator](../afenda-elite-audit-orchestrator/SKILL.md) |
| API contract surfaces | [afenda-elite-api-contract](../afenda-elite-api-contract/SKILL.md) |
| Scratch engineering packs | [docs-V2/README.md](../../../docs-V2/README.md) |
