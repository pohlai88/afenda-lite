---
name: afenda-coding-discipline
description: >-
  Afenda TypeScript and coding discipline for typed refactors, brands/unions,
  boundary validation, and correctness hygiene in this monorepo. Use when fixing
  any/as smells, modeling states with discriminants, branding IDs at boundaries,
  or tightening correctness without changing product farm ownership. Not for PR
  review process (code-review-and-quality), clarity-only simplify
  (code-simplification), ActionResult/OpenAPI SSOT (afenda-elite-api-contract),
  or React runtime/perf (afenda-elite-react-best-practices).
disable-model-invocation: true
---

# Afenda coding discipline

Local-method skill: TypeScript and coding hygiene **after** the product farm is fixed. Does not own API contracts, UI compose, Next.js cache, or review process.

**L0 floor (always-apply):** [`.cursor/rules/coding-discipline.mdc`](../../rules/coding-discipline.mdc) — PREFLIGHT lists that stem under **Rules** for product/package code. This skill is the full table + patterns; list it under **Skills** only when loaded.

**Announce:** "I'm using afenda-coding-discipline — TS/coding hygiene only; not owning API SSOT, UI compose, or review process."

```text
LOAD:
  AGENTS.md                                                    # checkout · UI barrel · env floor
  ../afenda-elite-api-contract/brands-and-schemas.md · SKILL.md  # brands · ActionResult (API-003 operative)
  ../afenda-elite-monorepo-discipline/LAYERS.md · SKILL.md       # ARCH-024 DAG operative
  ../afenda-elite-ui-compose/SKILL.md                          # ADR-010 barrel operative
  @afenda/config · biome.jsonc  (lint/format SSOT)
  reference.md  (patterns by rule id — load only what you need)
SKIP:
  required Living docs/architecture · docs/api LOAD
  inventing REST { success, data } envelopes  → afenda-elite-api-contract
  inventing brands that duplicate api-contract brands → afenda-elite-api-contract
  deep-import / bypass @afenda/ui-system      → ADR-010 (ui-compose / AGENTS)
  PR multi-axis review process                → code-review-and-quality
  behavior-preserving clarity refactor        → code-simplification
  React waterfalls / bundle / hydration       → afenda-elite-react-best-practices
  App Router / cache / proxy                  → afenda-elite-nextjs-best-practice
  Collapse/legacy recover · shim/stub product paths · enterprise-production bar carve-outs
```

## Route-outs (binding)

| Need | Owner |
|------|-------|
| ActionResult, brand table, Zod schema map, OpenAPI/REST | `afenda-elite-api-contract` + [brands-and-schemas](../afenda-elite-api-contract/brands-and-schemas.md) |
| Product UI tokens / compose / handroll | `afenda-elite-ui-compose` |
| React runtime / perf evidence | `afenda-elite-react-best-practices` |
| Multi-axis PR review | `code-review-and-quality` |
| Clarity refactor, behavior unchanged | `code-simplification` |
| Package DAG / import surface | `afenda-elite-monorepo-discipline` |

## Discipline rules

| Id | Rule |
|----|------|
| `union-discriminant` | Model variants with a literal discriminant (`kind` / `type` / `ok`). No optional-field bags that allow impossible states. |
| `brand-boundary` | Brand primitives at the boundary; prefer existing api-contract brands (`OrganizationId`, `UserId`, …). Do not invent parallel brand shapes. |
| `unknown-not-any` | External data is `unknown`. `any` is forbidden in product paths unless justified in the change note. |
| `no-unearned-as` | Cast only after validation (schema parse or earned narrow). Prefer `satisfies` over widen-casts. |
| `narrowing-order` | Discriminant switch → `in` → `typeof`/`instanceof` → honest type guard → `as` last. |
| `exhaustive-never` | Default arms assign to `const _exhaustive: never = x`. |
| `boundary-then-trust` | Validate once at the wire/BFF boundary (Zod under owning module); trust types inside. |
| `schema-derived` | Prefer `z.infer` / `Pick` / `ReturnType` / `Awaited` before a new hand-written interface. |
| `immutable-updates` | Spread / functional `setState`; do not mutate props or shared objects. |
| `early-return` | Guard clauses over deep nesting; both branches of an `if` must be expected paths. |
| `named-constants` | No magic numbers/strings on control paths. |
| `correctness-hygiene` | No silent “shouldn’t happen” else; delete unused code; comments explain WHY only. No temporal/AI chat markers. |
| `object-args` | Prefer object args for multi-parameter APIs (skip hot loops). |

Patterns: [reference.md](reference.md).

## Afenda overrides (binding)

| Topic | Stance |
|-------|--------|
| UI imports | Product **must** `import { … } from "@afenda/ui-system"` (ADR-010 / AGENTS / ui-compose). Reject generic “avoid barrels” advice for this package. |
| API outcomes | Use `ActionResult<T>` (`ok: true \| false`) per api-contract — not tutorial `{ success, data }` envelopes. |
| Lint / format | Biome + `@afenda/config` only — do not invent ESLint/Prettier stacks. |
| Quality bar | Enterprise production only. No shim/stub/TODO-throw product paths. |
| Env | `import { env } from "@afenda/env"` — never raw `process.env` for product config. |
| Layout | Greenfield under `apps/web/**` and `packages/*` only. |

## Workflow

1. Confirm the product farm is fixed (router → owning `afenda-elite-*` / domain farm).
2. Apply the discipline table; load only matching sections in [reference.md](reference.md).
3. Prefer existing brands from [brands-and-schemas](../afenda-elite-api-contract/brands-and-schemas.md) and module Zod schemas — do not fork types.
4. When claiming typed close: scoped `pnpm lint` / `pnpm typecheck` (or package filter) green.

## Verify

- [ ] No new `any` without justification; no unearned `as`
- [ ] Discriminants / exhaustiveness where variants exist
- [ ] Brands not duplicated vs api-contract; ActionResult shape preserved
- [ ] No `@afenda/ui-system` barrel bypass; no ad-hoc REST envelope
- [ ] Route-outs respected (review / simplify / API / React perf not answered here)
