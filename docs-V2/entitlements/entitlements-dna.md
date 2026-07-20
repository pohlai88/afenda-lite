# Entitlements DNA (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/entitlements/entitlements-dna.md` |
| Authority | **Scratch** — monorepo-discipline · shipping boundary + disk `@afenda/env` |
| Source DNA | `_reference/packages/feature-flags` (`@vierp/feature-flags`) — read-only historical; not a product package |
| Updated | 2026-07-20 |

Borrow/reject matrix for plan/tier gates and ops toggles. Operator path: [README.md](README.md).

---

## Verdict

**Do not create `@afenda/feature-flags`.** The reference is a static plan/tier entitlement catalog (~210 lines, one file), not progressive delivery. Keep ops kill switches on [`@afenda/env`](../../packages/foundation/env). Afenda does not sell by module — org capacity **position** is [`@afenda/admin/usage`](../../packages/control-plane/admin) ([../usage/usage-position-dna.md](../usage/usage-position-dna.md)), not an entitlements package. Progressive delivery (%, targeting, remote kill switches) is a separate design — do not grow a tier matrix into that.

| Concern | Owner (today) |
|---------|----------------|
| Boolean ops toggles | [`@afenda/env`](../../packages/foundation/env) (`PORTAL_ORG_SWITCHER_ENABLED` · `GUARDIAN_AUTH_SHELL` · `PLAYGROUND_ENABLED`) |
| Session / playground path gate | `apps/web/proxy.ts` · `session-gate-policy.ts` |
| Plan/tier entitlement matrix | **Absent** — Afenda does not sell by module |
| Org usage position (capacity bands) | [`@afenda/admin/usage`](../../packages/control-plane/admin) — [../usage/usage-position-dna.md](../usage/usage-position-dna.md) |
| Progressive-delivery flags SDK | **Absent** — no LD / Unleash / `@vercel/flags` / OpenFeature |

---

## Absorb (DNA only — no package this slice)

| Idea | Afenda shape when built |
|------|-------------------------|
| Fail-closed unknown keys | Missing key → deny / `false` (never fail-open) |
| Structured deny error | Typed error: `code` · HTTP-ish `status` (403) · upgrade/hint metadata for API/UI |
| Eval vs catalog listing | Pure sync helpers: “can use X?” separate from “what does my plan include?” |
| Explicit context argument | Caller passes org plan/tier resolved from auth — never client-trusted, never module globals |
| Guard helper `{ allowed, error?, upgradeUrl? }` | Server Action / UI pre-check before throw — **not** Next middleware / `proxy.ts` |
| Single SSOT + contract tests | One catalog; tests lock keys across env, billing, and UI (reference failed this) |

---

## Reject (do not port)

| Pattern | Why |
|---------|-----|
| `@afenda/feature-flags` name for tier matrices | Overclaims progressive delivery; confuses Ops |
| Vierp module keys (`hrm-*`, `mrp`, `crm-*`, …) | Wrong product; no living SaaS module packs |
| Triple SSOT (`FEATURES` vs `MODULE_TIERS` vs pricing keys) | Already drifted in the reference |
| Untyped `string` feature keys | Typos silently deny |
| Membership vs ordinal ladder mismatch | `includes(tier)` vs `requireTier` ≥ levels — pick one model |
| Static `isEnabled` with no control plane | Looks dynamic; all entries hardcoded `true` |
| Fake “Next middleware” guard | Reference oversell; Afenda edge gate is `apps/web/proxy.ts` |
| Unused `@vierp/database` / dead imports | Dead DAG weight |
| Rename `_reference` into `@afenda/*` | Greenfield under `apps/web/**` · `packages/*` only |
| Port as progressive-delivery platform | No %, targeting, org overrides, storage, React hooks, or tests in DNA |

---

## Hard stops / Why

| Stop | Why |
|------|-----|
| No product `@afenda/feature-flags` from this DNA | Name + shape wrong; entitlements ≠ flags |
| No stub/empty entitlements / feature-flags package | Enterprise bar — ops toggles stay on `@afenda/env`; usage position stays on admin |
| No client-supplied tier as authority | Spoofable; resolve from Neon Auth org / billing SSOT |
| No `_reference` upload to `@afenda/docs` / Vercel | Official docs must not ship historical trees |

---

## Staged capability (gates, not placeholders)

| Stage | Gate | Surface |
|-------|------|---------|
| Ops toggles | Already on disk | Named booleans in `@afenda/env` + Zod defaults + local-only rules (`PLAYGROUND_*`) |
| Usage position | Living | `@afenda/admin/usage` matrix — not entitlements |
| Progressive delivery | Ops need for % / targeting / remote kill | Separate layer: env+admin and/or OpenFeature-style + `@afenda/cache` eval cache + `@afenda/audit` on changes |

---

## Verify

```text
1. Test-Path packages/feature-flags → False
2. Test-Path packages/entitlements → False
3. rg "@afenda/feature-flags" apps packages — ban product imports (Scratch/README only)
4. rg "isFeatureEnabled|requireFeature|FeatureFlagError" apps/web packages — expect no product ports from Vierp
5. Confirm ops toggles remain in packages/foundation/env/src/web.ts (PORTAL_ORG_SWITCHER_ENABLED · GUARDIAN_AUTH_SHELL · PLAYGROUND_ENABLED)
```

Companion: [README.md](README.md) · [../usage/README.md](../usage/README.md) · [../system/README.md](../system/README.md) · [../monorepo/README.md](../monorepo/README.md) · [../deploy/README.md](../deploy/README.md).
