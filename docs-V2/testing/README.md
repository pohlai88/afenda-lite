# Testing practices (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/testing/README.md` |
| Authority | **Scratch** — test-driven-development · coding-standards + disk |
| Purpose | Lean layer map + day-to-day gates; not the factory |
| Updated | 2026-07-19 |
| Factory SSOT | [`testing/README.md`](../../testing/README.md) |

Do not restate factory modules, adverse catalogs, or secret keys here.

---

## Pyramid

| Layer | Runner | Place | Gate |
|-------|--------|-------|------|
| L0 | Vitest `node` | `<pkg\|app>/__tests__/**/*.test.ts` | `pnpm test:unit` · `pnpm --filter @afenda/<pkg> test` |
| L2 | Vitest `jsdom` | `**/__tests__/**/*.interaction.test.tsx` | `pnpm test:interaction` |
| L4 | Playwright | `e2e/**` (`@smoke` / `@journey`) | `pnpm test:e2e:smoke` · `pnpm test:e2e:journey` |

Prefer the **lowest** layer that captures the claim. No Cypress / Jest as new runners.

| Changed | Minimum gate |
|---------|--------------|
| Pure lib · contracts | L0 unit |
| Radix / options popout | L2 before L4 |
| Auth ingress · multi-route · hydration | L4 smoke |
| Release / pre-merge | `pnpm exec turbo run lint typecheck test` |

Name the **surface** for every gap. Options popout = `yes` for menus/dialogs/dropdowns.

---

## What tests assert

| Assert | How |
|--------|-----|
| API outcomes | `ActionResult` (`ok`) — not `{ success, data }` |
| External data | `unknown` → Zod at boundary |
| Casts | No unearned `as` weakening the SUT |
| UI | Product imports stay `@afenda/ui-system` |

---

## Verify

```text
1. pnpm --filter @afenda/web test
2. pnpm test:interaction   # options popout / Radix only
3. pnpm test:e2e:smoke     # auth / multi-route / hydration only
4. pnpm exec turbo run lint typecheck test   # release only
```

---

## Hard stops / Why

| Stop | Why |
|------|-----|
| Cypress / Jest / co-located `src/**/*.test.ts` | Pyramid + `__tests__/` homes |
| Playwright for Zod/registry Vitest can assert | Wrong layer |
| Fabricate auth PASS without factory env | CI fail-closed honesty |
| Copy factory matrices into this pack | Factory SSOT owns depth |

Companion: [../lint/README.md](../lint/README.md) · [../discipline/README.md](../discipline/README.md).
