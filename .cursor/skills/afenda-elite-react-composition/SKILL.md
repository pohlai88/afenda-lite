---
name: afenda-elite-react-composition
description: >-
  Afenda-scoped React component API and state-composition practices. Governs
  boolean-mode proliferation, explicit variant components, compound components,
  provider/context contracts (state/actions/meta advisory), children-over-render
  callbacks, and React 19 ref/use() where the project React version allows —
  while preserving Afenda UI-system, tenancy, and Next.js authorities. Use when
  shaping a component's public API or state architecture after ui-compose
  classifies capability; not for product styling, runtime performance, or App
  Router policy.
disable-model-invocation: true
---

# Afenda Elite — React Composition (component API & state architecture)

Afenda-controlled adapter over vendor `vercel-composition-patterns`. Vendor rule bodies are **reference only**, loaded by rule id after the Afenda override filter. This skill owns *how the feature API is shaped* once composing approved primitives; it never decides *which* barrel component or visual capability to use — that stays with `afenda-elite-ui-compose`.

The new skill may recommend an API shape, but it cannot classify UI-CAP ownership, approve a feature-local substitute, alter visual locks, or declare product UI complete.

**Announce:** "I'm using afenda-elite-react-composition — component API/state shape only; UI-CAP/barrel choice stays with ui-compose."

```text
LOAD:
  afenda-elite-ui-compose (capability status first)  ← required before this skill guides implementation
  docs/architecture/adr/ADR-010-afenda-ui-system-flat-barrel.md
  reference.md  (conflict matrix · gates · RC-COMP-* · vendor rule map)
  vercel-composition-patterns rules/<id>.md  (reference bodies — by id, after O-filter)
SKIP:
  product styling / tokens / density / recipes / Compose Score → afenda-elite-ui-compose
  waterfalls / rerenders / bundle / serialization              → afenda-elite-react-best-practices
  App Router / route handlers / cache / proxy                  → afenda-elite-nextjs-best-practice
  handrolling chrome or parallel tokens · Collapse recover
```

## Authority ladder

```text
1. ADR-010 · ARCH-024 · tokens.css · approved architecture
2. afenda-elite-ui-compose            (which component / UI-CAP capability)
3. afenda-elite-nextjs-best-practice  (App Router / cache / boundaries)
4. afenda-elite-react-composition     (this skill — API/state shape)
5. afenda-elite-react-best-practices  (runtime/perf)
6. vercel-composition-patterns        (reference only)
```

## Capability gate (after ui-compose)

```text
CAPABLE / LOCAL_COMPOSITION_PERMITTED
  → this skill may guide product-local API / variant / provider shape

BLOCKED_UI_SYSTEM
  → this skill may design the controlled @afenda/ui-system API upgrade
  → no feature-local substitute (esp. UI-CAP-02/03/04/06/08)

BLOCKED_PRODUCT
  → product mission supplies the missing domain port — no fake UI
```

## What this skill owns

- Behavioral boolean-mode proliferation → explicit variants (keep ordinary intrinsic booleans such as `disabled`, `required`, `modal`).
- Compound components — only when the [justification gate](reference.md#compound-component-justification-gate) passes.
- Lifting state to the necessary provider boundary; provider over visual nesting.
- Capability-specific context contracts; `state`/`actions`/`meta` is **advisory**, not mandatory.
- `children` for structure; render callbacks only when supplying scoped data/behavior.
- React 19 `ref`-as-prop / `use()` where supported — do not mechanically rewrite correct `useContext`.
- Explicit workflow variants are **product-local by default**; promote via UI-CAP evidence only.

## Afenda overrides (binding)

| Topic | Stance | Rule |
|-------|--------|------|
| product chrome / component choice | route-out | *Which* primitive comes from ui-compose (`UI-CAP-*`). This skill shapes API around approved primitives. |
| boolean-mode product shells | reject | No boolean-mode mega-components that violate QUALITY ORDER — split into explicit variants. |
| `react19-no-forwardref` | defer-to-version | Apply only when repo React supports React 19 APIs; preserve compatibility. |
| parallel tokens / handrolled chrome | reject | Consume `@afenda/ui-system` only (ADR-010). |
| feature substitute for missing shared API | reject | Under `BLOCKED_UI_SYSTEM`, design package upgrade — never compensate in feature code. |

## Workflow

1. Confirm the task is **component API / state shape** (else route-out).
2. Get capability status from `afenda-elite-ui-compose` first.
3. Branch on the capability gate above.
4. Apply conflict matrix + gates in [reference.md](reference.md); load only needed vendor `rules/<id>.md`.
5. Prefer explicit variants + justified compounds + providers; keep state dependency-injected.
6. Emit `RC-COMP-*` (dual-classify with `UI-CAP-*` when both apply). Preserve barrel, tokens, QUALITY ORDER.

## Verify

- Intrinsic booleans kept; behavioral mode soup removed or variant-split.
- Shared state at the needed provider boundary with a narrow typed contract (`state`/`actions`/`meta` only if it fits).
- Compound APIs have justification; variants product-local unless promotion evidence.
- No parallel tokens / handrolled chrome; no feature-local substitute under `BLOCKED_UI_SYSTEM`.
- UI-CAP / Compose Score still owned by ui-compose; runtime perf deferred to react-best-practices.

Gates, `RC-COMP-*`, vendor rule map: [reference.md](reference.md).
