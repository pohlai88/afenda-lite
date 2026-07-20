# Control plane (R1-D)

For engineers locating R1-D packages. Category folder for identity and control-plane packages. Organizes the repository only — not a dependency or ownership unit. Do not publish `@afenda/control-plane`. Package identity remains `@afenda/<name>`; consumers never import this folder path.

| Package | Identity | Role |
|---------|----------|------|
| [`auth`](./auth/README.md) | `@afenda/auth` | Neon Auth adapter · session · BFF · Path A credentials |
| [`admin`](./admin/README.md) | `@afenda/admin` | Org-console services · RBAC audit · health / provision |

Import by package name only (`@afenda/<name>` or a declared `exports` subpath). Catalog: [packages/README.md](../README.md) · DAG: [LAYERS.md](../../.cursor/skills/afenda-elite-monorepo-discipline/LAYERS.md) · edges: [WORKSPACE-EDGE-REGISTER.yaml](../../docs-V2/modules/WORKSPACE-EDGE-REGISTER.yaml).
