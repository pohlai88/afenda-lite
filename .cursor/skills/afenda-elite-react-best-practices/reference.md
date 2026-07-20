# afenda-elite-react-best-practices — reference

Detailed authority, override matrix, rule-packing rules, and the evidence gate. The lean [SKILL.md](SKILL.md) is the index; load this only when applying overrides or resolving a vendor conflict.

## Source layout

- **Vendor catalogue (reference bodies):** `.cursor/skills/vercel-react-best-practices/react-best-practices/` — `SKILL.md` quick-ref, `SKILL.toon` R-table (69 local rules · 8 categories), `rules/<id>.md` incorrect/correct examples.
- **This wrapper:** stores **only** Afenda exceptions. It does not fork or copy the 69 vendor rules. Everything not overridden is vendor-owned and loaded by id.

Never invent a rule id. Upstream may list `bundle-analyzable-paths` (70th); do not use it until it is synced into the local vendor catalogue.

## Override / reject / defer / route-out matrix

| Vendor id / topic | Stance | Afenda rule | Why |
|-------------------|--------|-------------|-----|
| `bundle-barrel-imports` | **override** | Product code imports from the flat `@afenda/ui-system` barrel (ADR-010). The vendor "avoid barrel imports" cost applies to **third-party mega-kits** (`lucide-react`, `@mui/*`, `react-icons`, `date-fns`…) — solve those with Next.js `optimizePackageImports` or package-internal relative imports **inside** `packages/surfaces/ui-system`, never by deep-importing or bypassing the Afenda barrel from `apps/web/**`. | ADR-010 barrel is the single public door; forking it re-creates drift the barrel exists to prevent. |
| `server-cache-lru` (Cross-Request LRU) | **reject** | Do not add process-level LRU caches keyed by tenant/org/user data. Per-request `React.cache()` dedupe is allowed. | ARCH-023 shared-schema tenancy on serverless: cross-request memory can leak one org's data into another's response. Matches `vercel-perf.md`. |
| `client-swr-dedup` | **defer** | The requirement is request **dedupe + coherent cache ownership**, not a mandatory `swr` dependency. Use the approved data layer for the surface. | Avoid forcing a library choice the architecture may not have adopted. |
| Composition topics (`architecture-*`, compound, providers, boolean props) | **route-out** | Hand to `afenda-elite-react-composition`; that skill wraps `vercel-composition-patterns`. Never invoke the vendor composition package as task authority. | Keeps API-shape authority in one Afenda skill. |
| feature-local UI copy | **reject** | No `next/dynamic` duplication of barrel primitives into `apps/web/features/**`. `next/dynamic` is for genuinely heavy optional modules (editors, charts), still composed from the barrel where possible. | Prevents shadow UI outside the barrel. |

All other vendor rules apply as written, subject to the evidence gate.

## Evidence gate (binding)

No performance rewrite without at least one:

1. measured bundle contribution (analyzer / build output);
2. profiler evidence (React Profiler / flame chart);
3. repeated rendering evidence (render count / re-render trace);
4. network waterfall evidence (sequential awaits shown in a trace);
5. a known high-impact vendor rule with a directly matching code smell in the diff.

Low-value JS micro-optimizations (§7 `js-*`) stay proportional to measured cost. Do not apply them speculatively.

## Rule-packing (how to load vendor rules)

1. Category priority by impact: `async` > `bundle` > `server` > `client` > `rerender` > `rendering` > `js` > `advanced`.
2. Resolve the id against the override matrix first; drop/narrow if listed.
3. Load only the specific `rules/<id>.md` for the active task. Do not paste the vendor `AGENTS.md` full compile into context unless a full expansion is explicitly required.
4. Cite the id + the evidence class when proposing the change.

## Boundaries (route-out, do not answer here)

| Topic | Owner |
|-------|-------|
| Product styling, tokens, density, UI component choice, Compose Score | `afenda-elite-ui-compose` |
| Component modes, compound API, providers, `state`/`actions`/`meta` contracts | `afenda-elite-react-composition` |
| App Router, route handlers, cache directives, RSC boundaries, proxy | `afenda-elite-nextjs-best-practice` (Accelint × App Router crosswalk in its `reference/vercel-perf.md`; this skill owns the full RBP override matrix) |
| Product data, permissions, commands | Feature/domain mission |
| Auth/session/security semantics | ARCH-026 · Neon Auth |
