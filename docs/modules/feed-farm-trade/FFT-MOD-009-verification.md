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

Prove FFT slices with recorded evidence. Wiring alone ≠ done ([FFT-MOD-010](FFT-MOD-010-module-docs-index.md)).

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

Use [FFT-MOD-008](FFT-MOD-008-ops-runtime.md) for gate history, rollout, and promotion order.

## Done definition

- AC observable (Given/When/Then) with evidence per skill [verify.md](../../../.cursor/skills/feed-farm-trade/verify.md)
- Unit and/or interaction covering the changed domain/UI
- Smoke or journey when route/auth surface changes
- No forbidden flags flipped in prod without gate checklist

## Testing pyramid

Authority: [AGENTS.md](../../../AGENTS.md) § Testing · skill [verify.md](../../../.cursor/skills/feed-farm-trade/verify.md).
