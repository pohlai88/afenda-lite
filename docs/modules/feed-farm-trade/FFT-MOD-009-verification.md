# FFT-MOD-009 Verification

| Field | Value |
|-------|-------|
| ID | FFT-MOD-009 |
| Category | Module |
| Version | 1.0.0 |
| Status | Living |
| Owner | Feed Farm Trade |
| Updated | 2026-07-13 |
| Spine | MOD-009 Verification |

## Purpose

Prove FFT slices with recorded evidence. Wiring alone ≠ done ([ADR-005](../../adr/frontend/ADR-005-feed-farm-trade-roadmap.md)).

## Commands

```bash
npm run test:unit -- modules/fft
npm run test:unit -- modules/fft/auth/fft-session
npm run test:unit -- modules/fft/domain/rbac
npm run test:interaction -- features/fft
npm run test:e2e:smoke
npm run test:e2e:journey
npm run check:fft-ui-registry
node scripts/gate-7-production-smoke.mjs
```

Env: `npm run env:compose` before E2E. Identities: [FFT-MOD-008](FFT-MOD-008-ops-runtime.md) — do not conflate admin with sales allowlist.

## Residue guards

```bash
rg "FftShell|locale-switcher" features/fft app/fft
```

## Gate evidence

| Need | Doc |
|------|-----|
| Gate 1–7 SSOT / SQL | [RB-002](ops/RB-002-feed-farm-trade-gate-register.md) |
| Rollout checklist | [RB-004](ops/RB-004-feed-farm-trade-ops-rollout.md) |
| Promotion order | [RB-003](ops/RB-003-feed-farm-trade-release-readiness.md) |

## Done definition

- AC observable (Given/When/Then) with evidence per skill [verify.md](../../../.cursor/skills/feed-farm-trade/verify.md)
- Unit and/or interaction covering the changed domain/UI
- Smoke or journey when route/auth surface changes
- No forbidden flags flipped in prod without gate checklist

## Testing pyramid

Authority: [AGENTS.md](../../../AGENTS.md) § Testing · skill [verify.md](../../../.cursor/skills/feed-farm-trade/verify.md).
