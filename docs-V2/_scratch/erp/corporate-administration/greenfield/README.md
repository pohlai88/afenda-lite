# Corporate Administration Greenfield Source Set

This source set replaces the removed Corporate Administration implementation plan with a completely new enterprise design.

## What is included

| File | Purpose |
|---|---|
| `00-CORPORATE-ADMINISTRATION-AUTHORITY.md` | Binding mission, ownership, identity, history, approval, security and completion rules |
| `01-DOMAIN-MODEL-AND-DATA-AUTHORITY.md` | Aggregate map and proposed authoritative/operational table inventory |
| `02-PACKAGE-ARCHITECTURE-AND-CONTRACTS.md` | Target source structure, dependencies, ports, permissions, events, errors and tests |
| `03-ROADMAP-INDEX.md` | Nine phases and 47 sequential greenfield coding slices |
| `phases/*.md` | Self-contained phase plans and paste-ready Codex prompts |
| `90-VERIFICATION-ACCEPTANCE-AND-HANDOFF.md` | Fourteen-boundary matrix, verification lanes and required handoff |
| `CORPORATE-ADMINISTRATION-ALL-IN-ONE.md` | Concatenated single-document version |
| `SOURCE-PLACEMENT.md` | Recommended locations inside the Afenda source tree |

A proposed package README is also supplied at:

```text
packages/erp/corporate-administration/README.md
```

## Recommended use

1. Copy the documentation folder to the matching `docs-V2/_scratch/erp/` path.
2. Review and promote authority through Afenda’s normal documentation process if required.
3. Use `03-ROADMAP-INDEX.md` to select the next `OPEN` slice.
4. Paste only that slice’s prompt into a fresh Codex mission.
5. Keep the module lifecycle `scaffolded` until all 47 slices and 14 acceptance boundaries are green.

## Greenfield assumptions

- No previous Corporate Administration code is relied on.
- No previous slice is treated as complete.
- `ca_legal_company` is owned directly by Corporate Administration.
- Master Data remains the authority for parties, tax registrations and platform references.
- Other ERP packages interact only through public ports, events or registered read contracts.
- Every phase begins `OPEN`.
