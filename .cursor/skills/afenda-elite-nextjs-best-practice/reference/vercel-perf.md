# Vercel + Accelint performance crosswalk (App Router–scoped)

Condensed Accelint × Vercel rule-id map for **App Router / Actions / Route Handlers / RSC boundaries** only.

**Not a second React Best Practices SSOT.** Full vendor RBP catalogue + Afenda override matrix (barrel, LRU, SWR, evidence gate) live in [`afenda-elite-react-best-practices`](../../afenda-elite-react-best-practices/SKILL.md). Load that skill for non-App-Router React runtime/perf (rerenders, bundle hot paths, client fetch, JS micro-opts).

**Primary playbook for Agents on Next surfaces:** [accelint-perf.md](accelint-perf.md) (security → waterfalls → serialization).  
**Overrides:** Neon Auth · ARCH-023 · no Collapse recover · no tenant process LRU · ADR-010 barrel (see react-best-practices).

---

## P0 — always on product App Router surfaces

| Vercel id | Accelint # | Rule | Afenda note |
|-----------|------------|------|-------------|
| `server-auth-actions` | 2.1 | Auth every Server Action | Session + org/FFT **inside** Action |
| `async-api-routes` | 1.1 | Start promises early | RH + Actions |
| `async-parallel` | 1.2 | Parallel independent work | Prefer `Promise.allSettled` when fully independent |
| `async-suspense-boundaries` | 1.3 | Stream secondary UI | AdminCN / FFT panels |
| `server-parallel-fetching` | 2.4 | Sibling RSC composition | Prefer over layout waterfalls |
| `server-serialization` | 2.3 | Minimize client props | Only used fields |
| *(dedupe refs)* | 2.2 | Avoid duplicate serialization | Share refs; transform client when safe |
| `server-cache-react` | 2.5 | `React.cache()` | Primitive keys only |
| `server-after-nonblocking` | 2.6 | `after()` | Audit/log — never hide auth failure |
| `bundle-barrel-imports` | 3.1 | Avoid mega barrels | Third-party kits only (`lucide` / large UI kits). Product UI stays on `@afenda/ui-system` barrel — full stance in `afenda-elite-react-best-practices` |
| `bundle-dynamic-imports` | — | `next/dynamic` | Heavy charts / optional widgets — not feature-local copies of barrel primitives |
| `async-defer-await` | 1.1 | Await where needed | Don’t block on unused branches |

## P1 — when profiling shows cost

| Vercel id | Rule |
|-----------|------|
| `bundle-defer-third-party` | Analytics after hydration |
| `bundle-conditional` | Feature-gated modules |
| `server-hoist-static-io` | Module-level static assets |
| `rerender-transitions` / `useDeferredValue` | Non-urgent client UI → prefer `afenda-elite-react-best-practices` |
| `rendering-content-visibility` | Long lists → prefer `afenda-elite-react-best-practices` |

## Do not apply blindly

| Suggestion | Afenda stance |
|------------|---------------|
| Cross-request LRU (`server-cache-lru`) | **Reject** for tenant data on serverless — same as `afenda-elite-react-best-practices` |
| Swap Neon Auth → Clerk | **Reject** |
| `force-cache` without org tags | **Reject** until ADR |
| Enable `cacheComponents` casually | **Reject** until ADR — [cache-components.md](cache-components.md) |
| Global `cacheTag('orders')` | **Reject** — require `org:{id}:…` |
| `cookies()` inside `'use cache'` | **Reject** — pass org/session ids as args |
| Accelint `@/lib/auth` examples | Use Living Neon session helpers / `modules/*` — do not restore Collapse `lib/` |

---

## Verify

- Accelint security + waterfall checklists pass on touched files ([accelint-perf.md](accelint-perf.md))  
- MCP `get_errors` clean  
- No new sequential independent awaits  
- Client leaves receive minimal props  
- Broader RBP / evidence gate → `afenda-elite-react-best-practices`
