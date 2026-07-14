# Elite housekeeping — finding taxonomy

Local Elite finding classes for discovery and align/Slice D routing.

## Classes

| Class | Signal | Action | Mode |
|-------|--------|--------|------|
| `unused-export` | Knip / manual unused export | Unexport or Slice D | Delegate |
| `unused-file` | Knip / manual unused file | Slice D after `rg` | Delegate |
| `unused-dependency` | Unused package.json dep | Slice D / scoped fix | Delegate |
| `registry-drift` | Register lists missing path | Trim or fix path | **align** |
| `catalog-drift` | Seed/catalog vs tests | Fix catalog + rebuild | **align** |
| `skill-catalog-drift` | Disk / frontmatter / router / [catalog.md](../using-afenda-elite-skills/catalog.md) mismatch | Align catalog, router, and disk evidence | **align** |
| `glossary-farm-stale` | Generated MD/i18n ≠ YAML/seed | Sync from SSOT | **align** |
| `intentional-public` | Planned API / facade / allowed test doubles | Ignore tag; no delete | audit |
| `local-artifact-leak` | Accidental IDE/agent dumps tracked | Remove + prevent | audit / Fix |

## Triage

```text
Finding?
├── Register / skill catalog.md / glossary farm mismatch?
│   └── YES → *-drift / glossary-farm-stale → align (NOT Slice D)
├── Knip unused file/export/dep?
│   ├── rg finds consumers? → fix knip globs or intentional-public
│   └── else → unused-* → Slice D
└── Broken import to deleted path?
    └── P0 → Slice D
```

## Audit matrix template

```markdown
| Package / path | Class | Symbol | Recommended action |
|----------------|-------|--------|--------------------|
| | | | |
```
