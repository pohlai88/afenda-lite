<!--
  Afenda folder README template (hand-copy).
  Target: <folder>/README.md (e.g. governance/README.md)
  Skill: afenda-doc-template-kits → afenda-readme-diataxis
  Replace every {{TOKEN}}. Omit sections that do not apply.
-->

# `{{FOLDER_NAME}}`

{{ONE_LINE}}

## Who it is for

<!-- Maintainers and agents working this tree. State who must not treat it as a package import. -->

## Stability

`Internal` — repository-local documentation or tooling; not a publishable `@afenda/*` package.

## Requires

- Node `{{ENGINES_NODE}}` | pnpm `{{ENGINES_PNPM}}` (root `package.json` engines)
- Repo-local tree — not an `@afenda/*` workspace package

## Consume

This tree (`{{FOLDER_REL}}`) is **not** a publishable `@afenda/*` package.

Use it through the repository scripts or entry points listed under **Maintain**. Do not treat a repo-local folder as a package export boundary.

## Quickstart

```bash
{{PRIMARY_COMMAND}}
```

## Maintain

| Command | Purpose |
| --- | --- |
| `{{PRIMARY_COMMAND}}` | Primary verify or operate command for this folder |

List only root or local commands that reference this folder path.

### Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| _symptom_ | _cause_ | _fix_ |

## Boundaries

| Owns | Does not own |
| --- | --- |
| _this folder's register / scripts / contracts_ | Product runtime packages, Living DOC-001 spines, UI shells |

## Authority

| Topic | Link |
| --- | --- |
| Child trees | Link immediate child directories that matter |
| Agent instructions | [`AGENTS.md`](../AGENTS.md) |
| Documentation map | [`docs/README.md`](../docs/README.md) |
| Kernel doctrine | [`packages/KERNEL-GOVERNANCE.md`](../packages/KERNEL-GOVERNANCE.md) when relevant |

Adjust `../` depth for the folder location.

## Support

| Topic | Where |
| --- | --- |
| Owning surface | Folder maintainers |
| Report an issue | Repository issue tracker for `afenda-lite` |

## License

{{LICENSE}} — repository-local tree (not a published package).
