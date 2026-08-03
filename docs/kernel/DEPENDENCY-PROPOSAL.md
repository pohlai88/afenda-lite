# Proposed Kernel Dependency Edges

These edges are package-specific implementation proposals derived from the admitted capabilities and band matrix. They are **not authoritative** until registered.

| Importer | Proposed dependencies | Authority condition |
| --- | --- | --- |
| `@afenda/errors` | None | Proposed only; freeze in both admission and workspace-edge registers |
| `@afenda/ids` | `@afenda/errors` | Proposed only; freeze in both admission and workspace-edge registers |
| `@afenda/money` | `@afenda/errors`, `@afenda/codes` | Proposed only; freeze in both admission and workspace-edge registers |
| `@afenda/quantity` | `@afenda/errors`, `@afenda/ids` | Proposed only; freeze in both admission and workspace-edge registers |
| `@afenda/temporal` | `@afenda/errors` | Proposed only; freeze in both admission and workspace-edge registers |
| `@afenda/codes` | `@afenda/errors` | Proposed only; freeze in both admission and workspace-edge registers |
| `@afenda/tenancy` | `@afenda/errors`, `@afenda/ids` | Proposed only; freeze in both admission and workspace-edge registers |
| `@afenda/authz` | `@afenda/errors`, `@afenda/tenancy` | Proposed only; freeze in both admission and workspace-edge registers |
| `@afenda/idempotency` | `@afenda/errors`, `@afenda/ids`, `@afenda/temporal`, `@afenda/tenancy` | Proposed only; freeze in both admission and workspace-edge registers |
| `@afenda/events` | `@afenda/errors`, `@afenda/ids`, `@afenda/temporal`, `@afenda/tenancy` | Proposed only; freeze in both admission and workspace-edge registers |
| `@afenda/observability` | `@afenda/errors`, `@afenda/temporal`, `@afenda/tenancy` | Proposed only; freeze in both admission and workspace-edge registers |
| `@afenda/env` | `@afenda/errors` | Proposed only; freeze in both admission and workspace-edge registers |
| `@afenda/db` | `@afenda/errors`, `@afenda/tenancy`, `@afenda/env` | Proposed only; freeze in both admission and workspace-edge registers |
| `@afenda/outbox` | `@afenda/errors`, `@afenda/ids`, `@afenda/temporal`, `@afenda/tenancy`, `@afenda/events`, `@afenda/db` | Proposed only; freeze in both admission and workspace-edge registers |
| `@afenda/audit` | `@afenda/errors`, `@afenda/ids`, `@afenda/temporal`, `@afenda/tenancy`, `@afenda/db` | Proposed only; freeze in both admission and workspace-edge registers |
| `@afenda/numbering` | `@afenda/errors`, `@afenda/ids`, `@afenda/temporal`, `@afenda/tenancy`, `@afenda/db` | Proposed only; freeze in both admission and workspace-edge registers |
| `@afenda/read-models` | `@afenda/errors`, `@afenda/ids`, `@afenda/temporal`, `@afenda/tenancy`, `@afenda/events` | Proposed only; freeze in both admission and workspace-edge registers |

## Enforcement

- Foundation packages never import runtime or data-plane packages.
- Runtime packages never import data-plane packages.
- Same-band edges require explicit registration.
- Every edge must appear in both `package.json` and the workspace-edge register.
- No app import, internal-path import, or direct/transitive cycle is permitted.
