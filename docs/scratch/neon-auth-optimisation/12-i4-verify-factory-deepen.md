# I4 verify factory deepen — evidence scratch (2026-07-17)

**Lane:** Test → Docs · **Program:** GUIDE-018 Phase I4 · **Not Neon N19**

## Disk deliverables

| Surface | Path |
|---------|------|
| Adverse inventory | `testing/e2e/adverse-matrix.ts` (A1–A11) |
| Wrong-role smoke | `e2e/smoke/wrong-role-gate.spec.ts` |
| Draft recovery journey | `e2e/journey/declarations-draft-recovery.spec.ts` |
| Adverse recovery journey | `e2e/journey/declarations-adverse-recovery.spec.ts` (A7–A9) |
| Concurrent race unit | `apps/web/__tests__/declaration-submit-read.test.ts` (A10) |
| INTERNAL_ERROR action unit | `apps/web/__tests__/submit-client-declaration-action.test.ts` (A11) |
| Fail-closed factory in CI | `testing/e2e/playwright-base.ts` (`E2E_REQUIRE_FACTORY=1`) |
| Standing CI gate | `.github/workflows/ci.yml` job `e2e-smoke` (main push) |
| Factory SSOT | `testing/README.md` (matrix + CI gate) |

## Acceptance vs GUIDE-018 DONE

| Criterion | State |
|-----------|-------|
| Standing CI E2E gate wired | ON DISK — job `e2e-smoke`; owner **Platform** |
| A1–A6 browser adverse / recovery | PASS (local verify) |
| A7–A9 invalid / stale / duplicate UX | PASS (unit + journey) |
| A10 concurrent race | PASS (unit) |
| A11 dependency throw → INTERNAL_ERROR | PASS (unit) |
| GUIDE-018 I4 status | Docs sync this mission → **DONE** |

## Verify (local — 2026-07-17)

```text
pnpm --filter @afenda/web test -- submit-client-declaration-action declaration-submit-read
# Test Files  2 passed (2) · Tests  7 passed (7)

$env:PLAYWRIGHT_REUSE_SERVER='1'; pnpm test:e2e:adverse
# 10 passed (2.3m) — A1–A4

$env:PLAYWRIGHT_REUSE_SERVER='1'; pnpm exec playwright test --project=journey e2e/journey/declarations-adverse-recovery.spec.ts e2e/journey/declarations-draft-recovery.spec.ts
# 2 passed (53.2s) — A6 · A7–A9
```

A5 invite→join ON DISK (`e2e/journey/invite-join.spec.ts`).

## Honesty

I4 exit closed at right layers. No N19. Standing CI green is post-merge Actions follow-through. I3.4 cut B / I5 remain separate.
