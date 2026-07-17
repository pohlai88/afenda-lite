# N17 — Declarations submit/read evidence

| Field | Value |
| --- | --- |
| Slice | N17 Declarations vertical |
| Mode | Path-to-100% repair (Path C scratch pack) |
| Date | 2026-07-17 |
| Living authority | ARCH-023 · GUIDE-018 I3.2 (program) · AGENTS |
| Scratch role | Evidence / OPS ledger only — **not** Living SSOT |
| Module readiness | **Not claimable** (DECL-MOD-010) |

## 1. Product path (implementation)

| Step | Implementation evidence |
| --- | --- |
| Client list | `apps/web/modules/declarations/domain/list-client-assignments.ts` · `apps/web/features/declarations/declarations-shell.tsx` · `apps/web/app/(client)/client/(workspace)/declarations/page.tsx` |
| Draft save/load | `apps/web/modules/declarations/domain/declaration-draft.ts` · `apps/web/app/actions/declaration-draft.ts` (`declarations.read` / `declarations.manage`) · `apps/web/app/api/client/declaration-draft/route.ts` |
| Submit | `apps/web/modules/declarations/domain/submit-client-declaration.ts` · `apps/web/app/actions/submit-client-declaration.ts` (`declarations.manage`) · `apps/web/features/declarations/submit-declaration-form.tsx` |
| Confirmation read | `apps/web/modules/declarations/domain/get-client-declaration.ts` · `apps/web/features/declarations/declaration-detail-shell.tsx` · `apps/web/app/(client)/client/(workspace)/declarations/[assignmentId]/page.tsx` |
| Hard tenancy | Domain predicates stamp/filter `organization_id`; unit isolation in `apps/web/__tests__/declaration-submit-read.test.ts` |
| Browser journey | `e2e/journey/declarations-submit-read.spec.ts` · `testing/e2e/declaration-fixture.ts` |

## 2. Acceptance evidence matrix

| Criterion | Implementation evidence (path) | Test / command evidence | Status |
| --- | --- | --- | --- |
| List assignments under hard org | `list-client-assignments.ts` · `declarations-shell.tsx` | `declaration-submit-read` · journey | PASS |
| Draft save/load gated by permission | `declaration-draft.ts` · `declaration-draft` Action | `declaration-submit-read` · journey Save draft | PASS |
| Submit under org + `declarations.manage` | `submit-client-declaration.ts` · Action | `declaration-submit-read` · journey Submit | PASS |
| Confirmation read after submit | `get-client-declaration.ts` · detail shell | `declaration-submit-read` · journey Confirmation | PASS |
| Cross-org fail-closed | two-org cases in `declaration-submit-read.test.ts` | `pnpm --filter @afenda/web test -- declaration-submit-read` | PASS |
| Product authz wiring (declarations.*) | Actions + `product-authorization-wiring` | `pnpm --filter @afenda/web test -- product-authorization-wiring` | PASS |
| Feature → domain → db boundary | Vitest gate | `pnpm --filter @afenda/web test -- feature-db-boundary` | PASS |
| Tenancy isolation suite | Vitest | `pnpm --filter @afenda/web test -- tenancy-isolation` | PASS |
| Web typecheck | `@afenda/web` | `pnpm --filter @afenda/web typecheck` | PASS |
| Tenant-root null org audit | script | `pnpm audit:tenancy-nulls` | PASS |
| Living module-quality (docs/modules) | FFT Living pack only | `pnpm check:module-quality` | PASS |
| Authenticated browser submit/read | Playwright journey | `pnpm exec playwright test --project journey e2e/journey/declarations-submit-read.spec.ts` (`PLAYWRIGHT_REUSE_SERVER=1`) | PASS |
| Scratch pack non-SSOT honesty | this file · README · DECL-MOD-010 Not claimable | Path C + map pointer | PASS |
| Living Declarations MOD promoted | — | Docs-lane later | N/A |

## 3. Floor verify commands (paste)

### declaration-submit-read

```text
pnpm --filter @afenda/web test -- declaration-submit-read
Test Files  1 passed (1)
Tests  5 passed (5)
Duration  5.21s
exit 0 — 2026-07-17
```

### product-authorization-wiring

```text
pnpm --filter @afenda/web test -- product-authorization-wiring
Test Files  1 passed (1)
Tests  12 passed (12)
Duration  1.82s
exit 0 — 2026-07-17
```

### feature-db-boundary

```text
pnpm --filter @afenda/web test -- feature-db-boundary
Test Files  1 passed (1)
Tests  4 passed (4)
Duration  935ms
exit 0 — 2026-07-17
```

### tenancy-isolation

```text
pnpm --filter @afenda/web test -- tenancy-isolation
Test Files  1 passed (1)
Tests  8 passed (8)
Duration  3.37s
exit 0 — 2026-07-17
```

### web typecheck

```text
pnpm --filter @afenda/web typecheck
tsc --noEmit -p tsconfig.json
exit 0 — 2026-07-17
```

### audit:tenancy-nulls

```text
pnpm audit:tenancy-nulls
PASS surveys / client_invitations / client_profiles / client_assignments /
     fft_event / fft_sales_member / fft_role / fft_role_assignment (null_org=0)
audit:tenancy-nulls PASS — zero nulls on eight hard tenant roots
exit 0 — 2026-07-17
```

### check:module-quality

```text
pnpm check:module-quality
Scope: docs/modules — Primary coverage: 25/25 — Findings: 0
exit 0 — 2026-07-17
```

### Playwright declarations-submit-read @journey

```text
PLAYWRIGHT_REUSE_SERVER=1
pnpm exec playwright test --project journey e2e/journey/declarations-submit-read.spec.ts
(or: pnpm test:e2e:journey -- --grep declarations-submit-read)
ok 1 [journey] › declarations submit/read @journey › client list → draft → submit → confirmation on detail (7.5s)
1 passed (12.5s)
exit 0 — 2026-07-17
```

## 4. Path to 100% (N17)

OPS/AUTHORITY gap for N17 closed by this scratch evidence ledger + neon-auth-slice-map pointer while Living ARCH-023 / GUIDE-018 remain SSOT. Living Declarations MOD promotion remains a later Docs-lane mission (GUIDE-018 Closed — no I3.2 body edit this turn).

## 5. Closure posture

| Item | Value |
| --- | --- |
| Implementer state | SCORED (not APPROVED) |
| Neon Slice Score | 100% / 100% (see response matrix) |
| Next | Fresh independent audit chat (neon-command-sheet MODE: audit) |
| Forbidden | Self-APPROVE · N18 · Living MOD invent · GUIDE-018 reopen without Docs lane |
