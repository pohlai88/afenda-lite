# `@afenda/errors`

Transport-neutral error kernel for Platform packages and BFF adapters: closed codes, `AppError`, safe serialize, `Result`, HTTP status/body helpers, and a duck-typed Postgres SQLSTATE map — **without** Next.js or database drivers.

Use this package when you need a shared ok/fail wire shape or HTTP-safe error vocabulary across `@afenda/*` and `apps/web`. Domain `ok` / `reason` unions stay in domain modules; map them at adapters. Maintainers run lint / typecheck / Vitest via the filter scripts below (Node `24.x`, pnpm `≥10.33.4` from the repo root `engines`).

## Consume

Workspace dependency — import by export path:

```ts
import {
  AppError,
  ERROR_CODES,
  normalizeUnknown,
  serializeAppError,
  rateLimited,
  serviceUnavailable,
} from "@afenda/errors";
import { ok, fail, failFromUnknown, type Result } from "@afenda/errors/result";
import { ERROR_HTTP_STATUS, httpErrorBody, retryAfterSeconds } from "@afenda/errors/http";
import { fromPostgresUnknown } from "@afenda/errors/adapters/postgres";
```

Factories also re-export from `@afenda/errors/common` (same symbols as the root barrel).

**Living consumers:** `@afenda/admin` (`Result` / `ok` / `fail` / `failFromUnknown`); `apps/web` re-exports codes/HTTP for Zod OpenAPI and sets `Retry-After` from `retryAfterSeconds` when `details.retryAfter` is a positive integer.

## Maintain

```bash
pnpm --filter @afenda/errors lint
pnpm --filter @afenda/errors typecheck
pnpm --filter @afenda/errors test
```

Requires root engines: **Node `24.x`**, **pnpm `≥10.33.4`**.

## Exports

| Path | Role |
|------|------|
| `@afenda/errors` | `AppError`, `ERROR_CODES` / `ErrorCode` (+ `ApiErrorCode` aliases), normalize, serialize, common factories |
| `@afenda/errors/result` | `Result` / `ok` / `fail` / `failFromUnknown` (same wire as ActionResult) |
| `@afenda/errors/http` | `ERROR_HTTP_STATUS`, `httpErrorBody`, `retryAfterSeconds` — no `NextResponse` |
| `@afenda/errors/common` | Factories only (`badRequest` … `rateLimited` · `serviceUnavailable`) |
| `@afenda/errors/adapters/postgres` | SQLSTATE → `AppError` duck-map — no `pg` / Drizzle / Prisma |

Closed codes include `RATE_LIMITED` (429) and `SERVICE_UNAVAILABLE` (503). Rate-limit / outage **policy** lives in consumers; this package owns vocabulary, factories, and safe `details` only.

## Ownership

| Surface | Owner |
|---------|-------|
| Kernel codes · `AppError` · normalize · serialize · Result · HTTP helpers · Postgres duck-map | `@afenda/errors` |
| Domain `ok` / `reason` unions | Domain packages / `apps/web/modules/*` |
| Next `jsonError` / Zod OpenAPI wrappers | `apps/web` |

**Layer:** Rank-1 Platform **leaf** (no `@afenda/*` runtime deps). Must not import Surfaces or `apps/*`. See [docs-V2/monorepo](../../docs-V2/monorepo/README.md).

## Out of scope

Do not add to this package: Next.js handlers, ORM clients, UI/locale copy as contract, domain error codes, Zod schemas, tutorial `{ success, data }` envelopes, or a kernel `withErrorHandler`.

## Authority

| Topic | Link |
|-------|------|
| ActionResult · OpenAPI · REST error wire | [docs-V2/api](../../docs-V2/api/README.md) |
| Package DAG / leaf rules | [docs-V2/monorepo](../../docs-V2/monorepo/README.md) · [LAYERS.md](../../.cursor/skills/afenda-elite-monorepo-discipline/LAYERS.md) |
| API contract farm | [afenda-elite-api-contract](../../.cursor/skills/afenda-elite-api-contract/SKILL.md) |
| Agent checkout posture | [AGENTS.md](../../AGENTS.md) |
