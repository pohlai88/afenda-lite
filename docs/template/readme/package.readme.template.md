<!--
  Afenda package README template (hand-copy).
  Target: packages/<band>/<name>/README.md
  Skill: afenda-doc-template-kits → afenda-readme-diataxis
  Replace every {{TOKEN}}. Omit sections that do not apply.
-->

# `{{PACKAGE_NAME}}`

{{ONE_LINE}}

## Who it is for

<!-- Consumers: apps/web Actions, approved ports, sibling packages via package name only. -->

## Stability

`Internal` — workspace-only package unless a published policy is documented here.

## Requires

- Node `{{ENGINES_NODE}}` | pnpm `{{ENGINES_PNPM}}` (root `package.json` engines)
- Workspace consumption (`workspace:*`) for private `@afenda/*` packages

## Consume

```ts
import { /* public exports */ } from "{{PACKAGE_NAME}}";
```

Import from the package name or a declared `exports` subpath only. Never deep-import `@afenda/*/src/...`.

## Quickstart

```bash
{{PRIMARY_COMMAND}}
```

## Maintain

| Command | Purpose |
| --- | --- |
| `pnpm --filter {{PACKAGE_NAME}} lint` | Lint |
| `pnpm --filter {{PACKAGE_NAME}} typecheck` | Types |
| `pnpm --filter {{PACKAGE_NAME}} test` | Package tests |

Add only scripts that exist in this package's `package.json`.

## Boundaries

| Owns | Does not own |
| --- | --- |
| _this package's capability_ | UI shells (`@afenda/ui-system` in `apps/web`), peer ERP tables, raw `process.env` |

## Authority

| Topic | Link |
| --- | --- |
| Package docs | [`docs/`](./docs/) when present |
| Kernel doctrine | [`packages/KERNEL-GOVERNANCE.md`](../../KERNEL-GOVERNANCE.md) |
| Agent checkout | [`AGENTS.md`](../../../AGENTS.md) |

Adjust relative links for package depth (`packages/<band>/<name>` vs `packages/<name>`).

## Support

| Topic | Where |
| --- | --- |
| Owning surface | Package maintainers |
| Report an issue | Repository issue tracker for `afenda-lite` |

## License

{{LICENSE}} — private workspace package unless published explicitly.
