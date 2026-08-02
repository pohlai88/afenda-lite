# G16 — Local generator command catalog

| Field | Value |
|-------|-------|
| Surface | `docs-V2/monorepo/g16-local-generator-command-catalog-contract.md` |
| Role | Local command inventory for generator entrypoints |
| Authority | `turbo/generators/engine/local-repo-governance.ts` |
| Mode | Read-only catalog |
| CI | Not required |
| Status | Complete when command catalog is generated from registrations |

G16 prevents generator entrypoint drift by deriving the local command catalog
from the registered generator families and explicit local generator commands.

## Required command classes

- Family registration commands: `doctor`, `plan-upgrade`, and
  `plan-upgrade-json` for each generator family.
- Explicit local ERP mutation commands: create package, add feature, reconcile
  projection locks.
- Explicit local kernel mutation command: apply adoption.

The catalog must record whether each command can write files. Read-only family
commands and explicit local mutation commands must not be mixed under the same
semantic label.

## Exclusions

- No second command inventory file.
- No generated command list committed as authority.
- No CI wiring.
- No hidden mutation command.