---
name: afenda-elite-react-best-practices
description: >-
  Afenda-scoped React runtime and performance practices. Governs async
  waterfalls, rerender reduction, client/server serialization, bundle
  efficiency, hydration cost, and JavaScript performance while preserving
  Afenda UI-system, tenancy, authentication, and Next.js architecture
  authorities. Use when profiling or refactoring React/Next.js runtime
  performance in this repo — not for product UI styling, component API
  architecture, or App Router/cache policy.
disable-model-invocation: true
---

# Afenda Elite — React Best Practices (runtime & performance)

Afenda-controlled wrapper over the vendor `vercel-react-best-practices` catalogue. Vendor rule bodies are **reference only**, loaded by rule id after the Afenda override filter below. This skill owns runtime/performance interpretation; it never owns UI styling, component API shape, or Next.js caching.

**Announce:** "I'm using afenda-elite-react-best-practices — React runtime/perf only; not touching UI-system barrel, component API, or App Router authority."

```text
LOAD:
  ADR-010 operative: @afenda/ui-system barrel only (non-negotiable) — AGENTS.md
  afenda-elite-ui-compose (UI ownership)  ·  afenda-elite-nextjs-best-practice (App Router/cache)
  reference.md  (override matrix · packing · evidence rule)
  vercel-react-best-practices rules/<id>.md  (reference bodies — by id, after O-filter)
SKIP:
  product UI styling / tokens / recipes / Compose Score  → afenda-elite-ui-compose
  component API / boolean modes / compound / providers   → afenda-elite-react-composition
  App Router / route handlers / cache directives / proxy → afenda-elite-nextjs-best-practice
  copying vendor rule files · inventing rule ids · Collapse recover
```

## Authority ladder (this skill never outranks 1–3)

```text
1. ADR-010 · ARCH-024 · tokens.css · approved architecture
2. afenda-elite-ui-compose
3. afenda-elite-nextjs-best-practice
4. afenda-elite-react-composition
5. afenda-elite-react-best-practices   (this skill)
6. vercel-react-best-practices         (reference)
```

Levels 3–5 are **task-selected**, not a fixed override among peers. Pick by task:

| Task | Owner |
|------|-------|
| Product styling, tokens, density, UI component choice | `afenda-elite-ui-compose` |
| Component modes, compound API, providers, context contracts | `afenda-elite-react-composition` |
| App Router, route handlers, cache directives, proxy | `afenda-elite-nextjs-best-practice` |
| Fetch waterfalls, rerenders, bundle/hydration cost, serialization | **this skill** |
| Product data, permissions, commands | Feature/domain mission |
| Auth/session/security semantics | Auth architecture (ARCH-026 · Neon Auth) |

## Afenda overrides (binding — see reference.md for full matrix)

Apply vendor rules **except** these. Full stance + notes: [reference.md](reference.md).

| Vendor id / topic | Stance | Afenda rule |
|-------------------|--------|-------------|
| `bundle-barrel-imports` | override | Product **must** `import { … } from "@afenda/ui-system"`. Mega-barrel / deep-import advice applies to **third-party** kits only (`lucide-react`, MUI…), via `optimizePackageImports` or package-internal relative imports inside `packages/ui-system`. Never deep-import or bypass the Afenda barrel from features. |
| `server-cache-lru` | reject | No cross-request LRU for tenant/org/user data on serverless (ARCH-023). |
| `client-swr-dedup` | defer | Requirement is dedupe + coherent cache ownership, not a forced SWR dependency. Use the approved data layer. |
| composition topics | route-out | Boolean props / compound / providers → `afenda-elite-react-composition` (never vendor as task authority). |
| feature-local UI copy | reject | No `next/dynamic` copies of barrel primitives into `apps/web/features/**`. `next/dynamic` only for genuinely heavy optional modules, still composed from the barrel where possible. |

## Evidence rule (binding)

No performance rewrite without one of:

- measured bundle contribution;
- profiler evidence;
- repeated rendering evidence;
- network waterfall evidence;
- known high-impact vendor rule with a directly matching code smell.

This protects DRY/KISS — do not apply low-value JavaScript micro-optimizations merely because a rule exists.

## Workflow

1. Confirm the task is runtime/performance (else route-out per table above).
2. Match category by impact: async > bundle > server > client > rerender > rendering > js > advanced.
3. Check the override matrix — drop/narrow any `override|reject|defer|route-out` id.
4. Load only the vendor `rules/<id>.md` you need (avoid `AGENTS.md` full dump).
5. Require evidence before rewriting (rule above).
6. Preserve `@afenda/ui-system` barrel, Neon Auth, ARCH-023, and Next.js ownership.

Compact machine index + override rows: [SKILL.toon](SKILL.toon). Full matrix + packing: [reference.md](reference.md).

## Verify

- No advice to deep-import or bypass `@afenda/ui-system`.
- No cross-request LRU for tenant data; no forced SWR.
- Composition / App Router topics routed out, not answered here.
- Every applied rule cites a real vendor id and evidence.
