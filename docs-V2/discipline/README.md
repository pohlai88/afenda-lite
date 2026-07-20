# Coding discipline (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/discipline/README.md` |
| Authority | **Scratch** — coding-standards · `coding-discipline` rule + disk |
| Purpose | Lean TS / typing hygiene for day-to-day product edits |
| Updated | 2026-07-19 |

Re-probe after ActionResult or env contract change.

---

## Binding floor

| Topic | Rule |
|-------|------|
| External data | `unknown` → Zod / owning schema; no product-path `any` without change-note |
| Casts | No unearned `as`; prefer `satisfies`; brand only after parse |
| Variants | Discriminated unions (`kind` / `type` / `ok`); exhaust `never` |
| Brands | Prefer existing API brands at boundaries — no parallel shapes |
| API outcomes | `ActionResult<T>` (`ok: true \| false`) — not `{ success, data }` |
| UI / Env | `@afenda/ui-system` barrel · `import { env } from "@afenda/env"` |
| Lint / Layout | Biome + `@afenda/config` · greenfield `apps/web/**` · `packages/*` only |
| Correctness | No silent “shouldn’t happen”; delete dead code; comments = WHY |

Key rule ids: `union-discriminant` · `brand-boundary` · `unknown-not-any` · `no-unearned-as` · `exhaustive-never` · `boundary-then-trust` · `schema-derived` · `early-return`.

---

## Disk evidence

| Contract | Path |
|----------|------|
| `ActionResult<T>` | `apps/web/modules/platform/schemas/action-result.ts` |
| Contract test | `apps/web/__tests__/action-result-contract.test.ts` |
| Env schema | `packages/foundation/env` |

---

## Route-outs

| Need | Owner |
|------|-------|
| Biome / Ultracite | [../lint/README.md](../lint/README.md) |
| Package DAG | [../monorepo/README.md](../monorepo/README.md) |
| Action / RH contracts | [../api/README.md](../api/README.md) · [../nextjs/data.md](../nextjs/data.md) |
| UI barrel | [../nextjs/ui.md](../nextjs/ui.md) |
| Accelint hard stops | [../nextjs/practices.md](../nextjs/practices.md) |

---

## Verify

```text
1. pnpm --filter @afenda/web typecheck
2. pnpm lint
3. rg "\bany\b" apps packages --glob "*.{ts,tsx}"
4. rg "process\\.env" apps packages --glob "*.{ts,tsx}"
5. rg "success:\\s*true|\\{\\s*success" apps/web --glob "*.{ts,tsx}"
6. rg "from [\"']@afenda/[^\"']+/src/" apps packages --glob "*.{ts,tsx}"
```

---

## Hard stops / Why

| Stop | Why |
|------|-----|
| Product `any` / unearned `as` | Hides boundary bugs |
| `{ success, data }` | Breaks `ActionResult` consumers |
| Raw `process.env` / barrel bypass | Skips Zod + public door |
| Incomplete throw-only product paths | Real behavior required end-to-end |

Companion: [../lint/README.md](../lint/README.md) · [../monorepo/README.md](../monorepo/README.md) · [../api/README.md](../api/README.md).
