## Afenda-Lite PR checklist (docs-first / anti-contamination)

Agent entry: [`/using-afenda-elite-skills`](../.cursor/skills/using-afenda-elite-skills/SKILL.md) · skill catalog: [`catalog.md`](../.cursor/skills/using-afenda-elite-skills/catalog.md).

Authorities: [AGENTS.md](../AGENTS.md) · [ARCH-028](../docs/architecture/ARCH-028-implementation-slices.md) · [deprecation register](../.cursor/skills/agent-skills/skills/deprecation-and-migration/reference.md).

- [ ] No restore of Collapse-banned roots (`app/`, `modules/`, `features/`, `components-V2/`) or wiped Collapse-era ops scripts from git
- [ ] No closed journey / Portal Atmosphere / Guardian Auth / Storybook product restore unless explicitly reopened
- [ ] No invention of new bounded contexts beyond ARCH-006 without a controlled ADR
- [ ] Skills: catalog status is `keep` / `extend` / approved `planned` — no Xerp fork, no `doc/` DOC-004 recreate
- [ ] Docs changes cite DOC-001 / DOC-002 / DOC-003; no parallel SSOT under `doc/`
- [ ] One agent lane per mission (Ops / Fix / Docs / Test / Normalize); no FFT 2B–2D without program reopen
