# Foundation (R1-A)

Foundation is the repository category for the smallest, most stable workspace
capabilities: build configuration, typed environment access, shared failure
semantics, and test policy. Package and application maintainers consume these
capabilities by published name; this directory is only an ownership and
navigation boundary.

There is no `@afenda/foundation` package. Each child owns one canonical concern
and exposes its own durable surface.

## Packages

| Package | Semantic responsibility | Consumer surface |
|---------|-------------------------|------------------|
| [`config`](./config/README.md) | Canonical Biome and TypeScript profile registry | Explicit JSON `extends` paths from `@afenda/config` |
| [`env`](./env/README.md) | Typed product/docs environment contracts and Neon posture | `@afenda/env` · `@afenda/env/docs` |
| [`errors`](./errors/README.md) | Canonical failures, results, ingress, projections, wire, and OpenAPI | Root-only `@afenda/errors` capabilities |
| [`testing`](./testing/README.md) | Test lanes, runner projections, and database evidence | Root capabilities plus two setup entrypoints |

## Dependency rule

- Import by declared package export, never by `packages/foundation/**` or
  another package's `src/**` path.
- A foundation package must not become a grab-bag shared layer.
- Consumers carry or invoke centrally owned semantics; they do not reproduce
  environment, error, or testing policy locally.
- The category has no combined build, test, or release lifecycle. Run the
  owning package's documented commands.

## Authority

- [Workspace package catalog](../README.md)
- [Monorepo boundaries](../../docs-V2/monorepo/README.md)
- [Repository operating rules](../../AGENTS.md)
