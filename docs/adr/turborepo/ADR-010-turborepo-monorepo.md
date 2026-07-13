# ADR-010 Turborepo Multi-Package Monorepo

| Field | Value |
|-------|-------|
| ID | ADR-010 |
| Category | ADR |
| Version | 1.1.0 |
| Status | Accepted |
| Owner | Platform |
| Updated | 2026-07-13 |

> **Forward-writing.** Accepted target decision for the Turborepo rebuild. Ignore legacy flat-monolith residue.


## Decision Metadata

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-07-13 |
| **Deciders** | Platform |
| **Scope** | Repository structure and build system |

## Context

We are building a multi-tenant SaaS with one deployable (Next.js on Vercel) but multiple distinct infrastructure concerns: a database client, an auth layer, a design system, email templates, and shared tooling config. These concerns need hard boundaries so that a change to the UI package does not rebuild the database package, and so that app code cannot accidentally import database internals.

We also need incremental builds and remote caching from day one — multiple engineers and agents work concurrently, and a full rebuild on every change is not acceptable.

## Decision

Use **Turborepo** with **pnpm workspaces**.

One app (`apps/web`) and six shared packages (`packages/*`). Turborepo orchestrates the task graph. pnpm enforces workspace isolation. The root `package.json` holds devDeps only.

## Consequences

### Positive

- Build cache boundaries: changing `@afenda/ui` does not rebuild `@afenda/db`
- Package boundary enforcement: `src/` internals unreachable across package lines
- One command from root: `turbo run build`, `turbo run test`, `turbo run typecheck`
- Vercel Turborepo remote cache reduces CI time as the codebase grows

### Negative / accepted costs

- pnpm workspace requires `pnpm` as the package manager — npm and yarn are not equivalent
- Adding a new package requires updating `pnpm-workspace.yaml` and this register
- Turborepo task graph must be kept accurate — stale `dependsOn` causes incorrect cache hits

## Alternatives rejected

| Alternative | Why rejected |
|-------------|--------------|
| Flat monolith (single `package.json`) | No build cache boundaries; shared infra bleeds into domain; any file change can trigger a full rebuild |
| Nx | Higher configuration overhead; Turborepo is sufficient for this team size and product scope |
| Microservices | No operational justification at this product stage; adds latency, deployment complexity, and distributed tracing overhead without corresponding benefit |
| Multi-repo (separate git repos per package) | Cross-package changes require coordinated versioning and publishing; slows iteration when infra and product change together |

## Constraints that must not be broken

- `apps/web` is the only Vercel deploy target until a new ADR adds another app
- Packages under `packages/*` are private workspace packages — not published to npm without a separate decision
- Root `package.json` holds devDeps only (turbo, biome, tsx, …) — no runtime product deps at root
- Cross-package imports use `@afenda/*` names only — never relative `../../../packages/`

## References

- [ARCH-022 System Overview](../../architecture/turborepo/ARCH-022-system-overview.md)
- [ARCH-024 Package Boundaries](../../architecture/turborepo/ARCH-024-package-boundaries.md)

## Change Log

| Version | Date | Summary |
|---------|------|---------|
| 1.1.0 | 2026-07-13 | Constraints that must not be broken |
| 1.0.0 | 2026-07-13 | Accepted |
