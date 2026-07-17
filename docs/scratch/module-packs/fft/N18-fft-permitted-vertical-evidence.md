# N18 — FFT Phase-2A permitted vertical evidence

| Field | Value |
| --- | --- |
| Slice | N18 FFT permitted vertical |
| Mode | Path-to-100% repair (browser deny/allow) |
| Date | 2026-07-17 |
| Living authority | FFT-MOD-008 · ARCH-023 · GUIDE-018 I3.3 · AGENTS |
| Scratch role | Evidence / OPS ledger only — **not** Living SSOT |
| Module readiness | **Not claimable** |

## 1. Product path (implementation)

| Step | Implementation evidence |
| --- | --- |
| Edge session | `apps/web/proxy.ts` matcher `/fft/:path*` |
| Operator coarse role | `apps/web/app/(operator)/layout.tsx` → `requireRole("operator")` |
| Module entry `fft.access` | `apps/web/modules/fft/auth/require-fft-access.ts` · `apps/web/app/(operator)/fft/layout.tsx` · `apps/web/features/fft/fft-events-shell.tsx` |
| Org-scoped event list | `apps/web/modules/fft/domain/list-events.ts` (`withOrg`) · `fft-events-panel.tsx` |
| Hard tenancy | `withOrg` empty-org fail-closed · two-org isolation in `tenancy-isolation.test.ts` |
| Browser proof | `e2e/smoke/fft-permitted-vertical.spec.ts` (entitled shell · deny → `/403`) |
| Forbidden | No 2B–2D · no Trade RBAC catalog invent · no Collapse recover |

## 2. Acceptance evidence matrix

| Criterion | Implementation evidence (path) | Test / command evidence | Status |
| --- | --- | --- | --- |
| Module entry `fft.access` fail-closed → `/403` | `require-fft-access.ts` · fft layout · shell | `fft-permitted-vertical` · `product-authorization-wiring` · browser deny | PASS |
| Operator read shell under hard org | `/fft` → shell → `listEvents` | unit wiring · browser entitled · typecheck | PASS |
| Empty orgId fail-closed | `list-events.ts` + `withOrg` | `fft-permitted-vertical` · `tenancy-isolation` | PASS |
| Cross-org FFT isolation | `listEvents` + `fft_event` | `tenancy-isolation` FFT case | PASS |
| Feature → domain → db boundary | features/fft SQL-free | `feature-db-boundary` | PASS |
| Nav gated on `fft.access` | `portal-chrome/nav-config.ts` | `portal-chrome` | PASS |
| Authenticated browser entitled `/fft` | events shell heading | `e2e/smoke/fft-permitted-vertical.spec.ts` | PASS |
| Authenticated browser deny `/fft` → `/403` | limited editor factory | same smoke spec | PASS |
| Web typecheck | `@afenda/web` | `pnpm --filter @afenda/web typecheck` | PASS |
| Tenant-root null org audit | script | `pnpm audit:tenancy-nulls` | PASS |
| Neon env contract | script | `pnpm validate:neon-env` | PASS |
| Scratch pack non-SSOT honesty | this file · README · Not claimable | Path + map pointer | PASS |
| Living FFT MOD promoted / 2B–2D | — | Docs-lane / program reopen only | N/A |

## 3. Floor verify commands (paste)

### floor Vitest (5 files)

```text
pnpm --filter @afenda/web test -- fft-permitted-vertical product-authorization-wiring tenancy-isolation feature-db-boundary portal-chrome
Test Files  5 passed (5)
Tests  34 passed (34)
Duration  3.04s
exit 0 — 2026-07-17
```

### browser smoke (N18 Path-to-100%)

```text
PLAYWRIGHT_PORT=3015 PLAYWRIGHT_BASE_URL=http://localhost:3015
pnpm exec playwright test e2e/smoke/fft-permitted-vertical.spec.ts --project smoke
2 passed (14.5s)
exit 0 — 2026-07-17
```

### typecheck · audit · validate

```text
pnpm --filter @afenda/web typecheck
exit 0 — 2026-07-17

pnpm audit:tenancy-nulls
PASS — zero nulls on eight hard tenant roots
exit 0 — 2026-07-17

pnpm validate:neon-env
Result: 14 passed, 0 failed
exit 0 — 2026-07-17
```

## 4. Path to 100% (N18)

**Closed** by authenticated browser deny/allow on `/fft` under platform `fft.access` (`e2e/smoke/fft-permitted-vertical.spec.ts`). Living MOD promotion remains later Docs-lane; independent auditor APPROVED required for neon-auth-slice-map close.
