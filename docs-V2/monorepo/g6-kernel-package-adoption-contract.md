# G6 — Kernel Package Adoption Contract

## Boundary

G6 adopts registered kernel packages into the generator authority.

It does not create kernel packages, repair public exports, write contracts,
change package metadata, or claim kernel readiness. G6 is read-only discovery and
adoption diagnostics.

## Semantic owner

`turbo/generators/kernel-generator/adoption-authority.ts`

## Schema

`afenda.kernel-adoption-authority/v1`

## Registered package set

The generator adopts the registered kernel packages named by the Afenda kernel
farm:

- `@afenda/config`
- `@afenda/errors`
- `@afenda/env`
- `@afenda/testing`
- `@afenda/db`
- `@afenda/audit`
- `@afenda/events`
- `@afenda/search`
- `@afenda/notifications`
- `@afenda/logger`
- `@afenda/http`
- `@afenda/security`
- `@afenda/metrics`
- `@afenda/openapi`
- `@afenda/rate-limit`
- `@afenda/cache`
- `@afenda/auth`
- `@afenda/admin`

## Adoption checks

For each registered kernel:

- package exists in the expected workspace path;
- package name matches the registered package name;
- README exists;
- `CONTRACT.md` exists;
- root entrypoint file exists where the kernel contract requires `src/index.ts`;
- package exports expose `"."` unless the package is explicitly non-root in a
  later kernel contract.

## Diagnostics

| Code | Severity | Treatment | Meaning |
| --- | --- | --- | --- |
| `AFG-KERNEL-001` | blocked | semantic-decision-required | registered kernel package is missing |
| `AFG-KERNEL-002` | warning | unsupported | extra kernel candidate is not registered |
| `AFG-KERNEL-003` | warning | auto-upgrade | root entrypoint file is missing |
| `AFG-KERNEL-004` | warning | auto-regenerate | `CONTRACT.md` is missing |
| `AFG-KERNEL-005` | warning | auto-upgrade | package root export is missing |

## Closure evidence

- Kernel adoption report is deterministic.
- Live repository reports 18 registered kernels and 18 discovered kernel
  candidates.
- Known maturity gaps are diagnostic output, not silent assumptions.
- Tests live under `turbo/generators/__tests__`.
- Generator tests, Biome, TypeScript, `generator:check`, module validation,
  kernel doctor, and diff hygiene pass.

