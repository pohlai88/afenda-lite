# Closed scope register (Afenda-Lite)

**Status:** Active — 2026-07-12  
**Purpose:** Formally dispose items that are **not** incompleteness. Agents must not treat these as open gaps.

Related: [deprecation register](../../.cursor/skills/agent-skills/skills/deprecation-and-migration/reference.md) · [portal-backend-modules completeness](../../.cursor/skills/portal-backend-modules/completeness.md) · [FFT gate-register](../../docs/fft/ops/gate-register.md)

---

## 1. `/client` workspace product restore

| Field | Value |
|-------|-------|
| **Disposition** | **Closed** — stubs only |
| **Phase** | `client-post-login` / `onboarding` |
| **Disk** | Thin stubs under `app/client/(workspace)/**` — holding UI only |
| **Forbidden** | Restoring product client workspace UI, `features/client-workspace/`, or wiring domain into stubs without reopen |
| **Why closed** | Frontend wipe (2026-07-11); Declarations operator + FFT modules reopened first |

### Reopen checklist (all required)

1. Explicit user reopen of phase `client-post-login` (and `onboarding` if included)
2. Spec slice under `doc/frontend/` (or phase tasks doc) with AC
3. Vertical slice: RSC → `modules/declarations` + `modules/identity` · Actions · `loading.tsx` · session gates
4. No mixed reopen with FFT P3 flag promotion or SaaS billing/2FA
5. Update this register + completeness matrices in the same PR

---

## 2. Feed Farm Trade P3 flag promotion (prod)

| Field | Value |
|-------|-------|
| **Disposition** | **Closed** — leave flags default off in production |
| **Authority** | [docs/fft/ops/gate-register.md](../../docs/fft/ops/gate-register.md) § Prod flag promotion · [doc/frontend/14](../frontend/14-feed-farm-trade-phase3-ops-flags.md) |
| **Code** | P3 surfaces may exist behind flags; **prod enablement** is ops, not a scaffold gap |
| **Forbidden** | Enabling prod `FFT_DEPOSIT_*` / pickup / notifications / ERP flags without gate-register checklist + explicit approval |

### Reopen checklist (all required)

1. Explicit user approval to run gate-register promotion
2. `npm run audit:fft-promotion` → `{ ok: true }`
3. Ordered enablement per gate-register (one phase at a time + smoke)
4. No mixing with `/client` restore or unrelated refactors
5. Update this register when production flags flip

---

## 3. SaaS billing / 2FA (and social-connection chrome)

| Field | Value |
|-------|-------|
| **Disposition** | **Intentional deferred chrome** — not product Identity |
| **Disk** | AdminCN tabs / `ComingSoonPanel` — plan column defaults `Basic` / `Manual` |
| **Forbidden** | Inventing SaaS billing fields, 2FA product flows, or social-connect in Identity without a product ADR |
| **Neon** | Neon Auth owns credential/self-service MFA paths if/when enabled in Neon — do not duplicate under AdminCN |

### Reopen checklist (all required)

1. Product ADR for billing and/or 2FA scope
2. Explicit reopen naming billing vs 2FA (may be separate)
3. Wire via Identity / Neon Auth contracts — not fake AdminCN plan columns
4. Update this register + org-admin chrome copy

---

## Agent rule

When a completeness matrix lists these rows, status must read **Closed (registered)** or **Intentional (registered)** — never “missing” or “TODO.” Option **B** (reopen / promote) requires an explicit user letter in the turn.
