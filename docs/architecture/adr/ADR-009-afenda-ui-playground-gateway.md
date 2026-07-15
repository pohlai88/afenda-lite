# ADR-009 `@afenda/ui` Playground Gateway as the Sole Public UI Import Surface

| Field             | Value        |
| ----------------- | ------------ |
| **ID**            | ADR-009      |
| **Category**      | ADR          |
| **Version**       | 1.0.1        |
| **Status**        | Accepted     |
| **Control State** | Closed       |
| **Owner**         | Platform     |
| **Updated**       | 2026-07-15   |

---

# 1. Purpose

Record the decision to (a) consolidate `packages/design-system` and `packages/ui` into a single canonical `@afenda/ui` package (`packages/design-system`), and (b) trim `@afenda/ui`'s public `package.json#exports` map so that `@afenda/ui/playground` (and the dedicated `@afenda/ui/playground/providers` subpath) is the **only** public runtime door for UI primitives — reversing the prior "any file under `packages/ui/src` may be deep-imported" precedent.

---

# 2. Scope

## 2.1 In Scope

- Name-collision resolution: `packages/design-system` is canonical `@afenda/ui`; `packages/ui` is retired
- Trimmed `@afenda/ui` exports map: `.` (`cn`), `./style.css`, `./playground`, `./playground/providers`, `./playground/types`
- The `*Contract` type pattern (`./playground/types.ts`): each gateway component's `Props` type `extends` a curated `*Contract`, enforced by `tsc` structural typing — not a runtime validator
- Why `Providers` lives at a dedicated `./playground/providers` subpath instead of the primitives barrel
- Architecture/boundary tests that pin the exports map and barrel contents to an explicit allowlist
- Disambiguation between this package subpath and the pre-existing, unrelated `/playground` Next.js dev-harness routes

## 2.2 Out of Scope

- Promoting additional `packages/design-system/src/**` templates into the gateway (future, incremental — each addition is its own bounded change, not blanket-authorized here)
- Any change to `PLAYGROUND_ENABLED` gating or the `/playground` Next.js route harness itself (unrelated surface, see § 3 disambiguation)
- Rewriting the template surface (`views/`, `fake-db/`, etc.) — preserved on disk exactly as-is, simply not public

---

# 3. Decision

## Context

Two packages both claimed the `@afenda/ui` name: `packages/ui` (thin, `Button` + `globals.css` + `components.json`) and `packages/design-system` (the mature, full shadcn-derived template surface). The build broke (`Export Button doesn't exist in target module`) because a consumer imported from the thin package while intending the mature one.

The user's explicit, final decision: `packages/design-system` is canonical — "he is already the most mature package," and `packages/ui` "must be removed immediately." Once consolidated, the user asked how to preserve every template under `packages/design-system/src` while making the package safe to consume without overbloat, standardizing on a "playground" concept as the single import gateway, and requiring components to import a **contract** type rather than depend on each other's full prop surface directly.

## Decision (binding)

### D1 — Canonical package

`packages/design-system` is `@afenda/ui`. `packages/ui` is retired (removed from `pnpm-workspace.yaml`, git-ignored on disk; a Node.js file lock prevented full deletion, see Consequences). No content from `packages/ui` was carried forward — `packages/design-system` already contained the mature superset.

### D2 — Trimmed exports map (the only public API)

```json
"exports": {
  ".": { "types": "./src/index.ts", "default": "./src/index.ts" },
  "./style.css": "./src/styles/style.css",
  "./playground": { "types": "./src/playground/index.ts", "default": "./src/playground/index.ts" },
  "./playground/providers": { "types": "./src/playground/providers.ts", "default": "./src/playground/providers.ts" },
  "./playground/types": { "types": "./src/playground/types.ts", "default": "./src/playground/types.ts" }
}
```

Everything else under `src/` (`components/*`, `shared/*`, `layout/*`, `providers`, `hooks/*`, `lib/*`, `utils/*`, `configs/*`, `contexts/*`, `types/*`, `store/*`, `views/*`, `fake-db/*`, `assets/*`) stays on disk — the full template surface is preserved exactly as the user required — but is **not** in the exports map, so it does not resolve for any importer outside the package. Node's `exports` field is the enforcement mechanism: this is a hard resolution failure, not a lint warning.

### D3 — Two gateway subpaths, one reason

`@afenda/ui/playground` re-exports primitives (`Button`, `buttonVariants`, `ProfileDropdown`, `NotificationDropdown`, `ActivityDialog`, `cn`). `Providers` is re-exported separately from `@afenda/ui/playground/providers`. This split is not stylistic: `Providers`'s dependency chain (`settingsContext` → `fonts.ts` → `next/font/google` / `geist/font/pixel`) uses Next.js compiler-only macros that cannot be evaluated outside Next's own bundler (they throw in plain Node/Vitest). Keeping `Providers` out of the primitives barrel lets every other gateway member be imported and unit-tested without pulling in a Next.js-only build step.

### D4 — Contract-type pattern (enterprise resolution, not a runtime cost)

`./playground/types.ts` defines one `*Contract` type per gateway component (`ButtonContract`, `ProfileDropdownContract`, `NotificationDropdownContract`, `ActivityDialogContract`, `ProvidersContract`). Each component's own `Props` type is defined as `SomePrimitiveProps & SomeContract` (an intersection/extension), for example:

```typescript
type ButtonProps = ButtonPrimitive.Props & VariantProps<typeof buttonVariants> & ButtonContract
```

This is enforced entirely by `tsc` structural typing at compile time — there is no runtime validator, no wrapper function, and no additional bundle weight. The cost is exactly what it looks like: one `types.ts` file, and each of the five current gateway components' existing `Props` type gains one `& XContract` term. Nothing else changes. Future components added to the gateway pay the same fixed, one-line cost — it does not compound per component.

### D5 — `@afenda/ui/playground` vs `/playground` routes — different things, same word

`@afenda/ui/playground` (this package subpath) is exports-map-enforced, always-bundled, and has no relationship to environment gating. At decision time, Next.js `/playground` routes (`apps/web/app/playground/`, `apps/web/features/playground/`) were a separate local harness. **Those trees were removed 2026-07-15** and must not be handrolled; any future harness requires an explicit Shadcn Studio MCP slice. See the single canonical paragraph in [ARCH-024 § `@afenda/ui`](../ARCH-024-package-boundaries.md#afendaui).

### D6 — Boundary enforcement via tests, not convention alone

`packages/design-system/__tests__/architecture.test.ts` statically parses `./playground/index.ts` and `./playground/providers.ts` and asserts their re-exports match `PLAYGROUND_INFRA_EXPORTS` / `PLAYGROUND_PROVIDERS_EXPORTS` (and consumer side `PLAYGROUND_PROVEN_EXPORTS`) in `./playground/types.ts`. `apps/web/__tests__/ui-boundary.test.ts` asserts the same allowlists and bans deep imports outside `ALLOWED_UI_SUBPATHS`. Both tests fail on any drift between the exports map and the barrel — the allowlist cannot silently expand.

## Alternatives considered

| Option | Verdict |
|--------|---------|
| **A** Keep both packages, alias one to the other | Rejected — preserves the name collision and gives no enforcement boundary |
| **B** Export everything from `packages/design-system` (no trim) | Rejected — reintroduces unlimited deep-import surface the consolidation was meant to close |
| **C** Runtime prop validator instead of `*Contract extends` | Rejected — adds bundle weight and a second source of truth; `tsc` already enforces the same contract for free |
| **D** One flat `./playground` barrel including `Providers` | Rejected — breaks any Vitest/Node consumer of the barrel via the Next.js font-loader macro chain (see D3) |

## Consequences

| | |
|--|--|
| **+** | Single canonical `@afenda/ui`; hard (not conventional) public-API boundary via `exports`; full template surface preserved on disk; contract pattern costs one line per component, enforced by `tsc` |
| **−** | `packages/ui` directory remains on disk (Node.js process file lock prevented `rmdir`) — git-ignored and excluded from `pnpm-workspace.yaml`, so it is inert; delete manually once no process holds a lock on it |
| **=** | Template files under `views/`, `fake-db/`, `hooks/*` (etc.) keep their pre-existing, unrelated typecheck errors, untouched by this change — those files were never part of the public surface before or after |

---

# 4. References

| ID | Title | Relationship |
| --- | --- | --- |
| DOC-001 | Documentation Control Standard | Governance |
| DOC-003 | Controlled Document Template | Structure |
| ARCH-024 | Package Boundaries | Canonical `@afenda/ui` exports-map and disambiguation paragraph |
| ARCH-009 | Modules Ownership Map | Former Next.js harness paths — now absent |
| ARCH-012 | App Router Routes | § 3.10 Playground — removed |
| ARCH-015 | Shadcn Studio / AdminCN Alignment | Local harness posture — see ARCH-024 |
| ARCH-017 | Frontend Folder Map | `app/playground/`, `features/playground/` — absent |
| ARCH-027 | Environment Variable Model | `PLAYGROUND_*` reserved local env — routes may be absent |
| ARCH-031 | Technology Stack Catalogue | § 3.4 UI and design system — updated to cite canonical package |

---

# 5. Change Log

| Version | Date | Summary |
| ------- | ---- | ------- |
| 1.0.1 | 2026-07-15 | D5 / References honesty: Next.js harness trees removed 2026-07-15; gateway decision unchanged; boundary tests cite proven+infra allowlists. |
| 1.0.0 | 2026-07-15 | Accepted — records the `packages/ui` retirement, `@afenda/ui` exports trim to the `./playground` gateway, and the `*Contract extends` pattern already implemented and verified (tests + typecheck green). |

---

# 6. Notes

- This ADR documents a decision already implemented and verified in the same working session (tests green, typecheck green) — it is the binding record of that decision, not a proposal awaiting separate implementation.
- `packages/ui` on-disk removal is blocked by an OS-level file lock from a running Node process; it is git-ignored and workspace-excluded in the meantime, so it has no effect on builds, tests, or resolution.
