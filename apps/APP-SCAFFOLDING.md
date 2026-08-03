# Application (Next.js composition-root) scaffolding requirements

| Field | Value |
| --- | --- |
| Surface | `apps/APP-SCAFFOLDING.md` |
| Status | Draft internal guide |
| Applies to | New or structurally reworked `apps/<app>` composition roots (today: `apps/web`) |
| Does not authorize | A new app, a peer composition root, package-boundary exceptions, or lifecycle promotion |
| Method | Next.js App Router battle-proven conventions + semantic-first repository rules |

## 1. Required outcome

An application is the **sole composition root** for its deployable surface. It owns
routing, request/response boundaries, cross-package wiring, and UI composition — it
does not own business vocabulary, mutation logic, or persistence. Every business
decision it needs comes from an `@afenda/*` package; the app assembles, authorizes,
and renders.

Every accepted app provides:

- one route tree per access shell, each with an explicit access boundary;
- Server Actions as the sole mutation entrypoint, each returning canonical
  `ActionResult<T>`;
- one edge gate (`proxy.ts`) enforcing session/tenant admission before any route
  handler runs;
- UI composed only from `@afenda/ui-system` (no parallel component primitives);
- product configuration read only through `@afenda/env`;
- cross-package sagas and adapters that belong nowhere else, kept thin and
  explicit;
- feature-first application modules that mirror, not duplicate, package-level
  bounded contexts;
- rendering/caching choices made deliberately (Server Component by default,
  Client Component only for interactivity) and documented at the boundary.

Internal route/UI refactors require zero package-level edits. Only a deliberate
package public-contract change may require app-level consumer work — never the
reverse.

## 2. Admission contract

Freeze and verify this from disk before creating files:

```yaml
app_mission:
  target: apps/<app>
  deployable: <hosting target, e.g. Vercel project>
  shells: <route groups and their access boundary, e.g. (client)/(operator)/(public)>
  owner: <application composition root>
  consumed_packages: <@afenda/* packages this app composes>
  mutation_surface: <Server Actions inventory, ActionResult<T> only>
  edge_gate: apps/<app>/proxy.ts
  ui_source: "@afenda/ui-system"
  env_source: "@afenda/env"
  rendering_defaults: <Server Component default; Client Component exceptions and why>
  caching_policy: <fetch/revalidate/tag strategy per route class>
  dependency_edges: <package.json + authorized workspace edges, downward only>
  invariants: <security, tenancy, session, observability>
  acceptance: <focused commands and observable outcomes>
```

Stop when a route's access shell, a mutation's authorization owner, or an
app-vs-package boundary is ambiguous. An app never becomes the tie-breaker for
undecided business ownership — that decision belongs to the owning package.

## 3. Layer position and dependency direction

```text
consumer (browser/client) → apps/<app> (composition root)
                                   │
                    Surfaces (@afenda/ui-system, @afenda/emails)
                                   │
                    Platform (@afenda/erp/*, @afenda/env, @afenda/errors, @afenda/db, …)
```

- The app sits at the top rank. Imports flow **down** only: app → surfaces →
  platform. No package imports `apps/*`.
- Cross-package composition (multi-package sagas, adapters that depend on
  Next.js, request state, or higher-rank services) lives at the app composition
  root — this is the one place it is authorized, never inside a package.
- The app never writes to a domain table directly; persistence goes through the
  owning package's public API.
- Peer-app imports are denied. Shared behavior is either promoted to a package
  (if it is a real bounded capability) or duplicated deliberately — never
  imported across `apps/*`.
- A route group (shell) never imports another shell's server-only internals;
  shared UI/logic used by multiple shells lives under `features/<name>/shared`
  or a consumed package, not by reaching across shells.

## 4. Mandatory topology

```text
apps/<app>/
├── package.json               # private; declares every @afenda/* dependency
├── tsconfig.json               # extends @afenda/config
├── next.config.ts
├── proxy.ts                    # edge gate: session/tenant admission (not middleware.ts)
├── README.md                   # boundary, shells, consume, maintain, prohibitions
├── app/
│   ├── (shell)/…                # one route group per access boundary
│   ├── actions/                 # Server Actions, flat, <verb>-<noun>.ts, ActionResult<T> only
│   ├── api/                     # route handlers only where a Server Action cannot apply
│   ├── layout.tsx, global-error.tsx
├── features/<feature>/          # app-level feature composition (UI + action wiring)
│   └── shared/                  # cross-shell composition explicitly authorized
├── modules/<module>/            # app-owned cross-cutting concerns (identity, platform, …)
├── lib/                         # thin app-only glue; never a business-logic dump
├── __tests__/                   # route, action, contract, and composition tests
└── public/
```

Route groups are access-boundary decisions, not organizational sugar — each one
declares who can reach it before any page is added. `app/actions/` stays flat;
domain nesting belongs in the owning package, not in the action file layout.
Never recreate a removed surface (e.g. a prior `playground` route/feature)
without an explicit reopened decision.

Server-only loaders (session reads, package facade calls feeding a page) use a
`.server.ts` suffix so their boundary is visible from the filename. Dynamic
segments use descriptive names (`[assignmentId]`, not an overloaded `[id]`).
`layout.tsx` is the one owner of shared providers (theme, etc.) for its
segment — it does not perform per-page data waterfalls. A route's `page.tsx`
and a sibling `route.ts` never coexist in the same folder.

`package.json` must declare every `@afenda/*` package it consumes explicitly (no
transitive reliance), use the workspace catalog for shared externals, and expose
package-local `lint`, `typecheck`, `test`, `dev`, and `build` scripts.

## 5. Server Actions and the `ActionResult<T>` contract

Every mutation entrypoint is a Server Action. It:

- validates external input as `unknown` through a package-owned or app-owned Zod
  schema before use;
- performs authorization inside the Action — a route-level check alone is
  insufficient;
- stamps organization/actor/correlation identity from trusted session state,
  never from client-supplied fields;
- calls into exactly one `@afenda/*` package facade for the business mutation;
- returns `ActionResult<T>` (`{ ok: true, value } | { ok: false, error }`) —
  never `{ success, data }` or a thrown exception across the action boundary.

Query-only reads that back a Server Component may call a package facade
directly; they still return canonical `Result` types and never reinterpret
package-owned status, retry, or error wording.

## 6. UI, environment, and rendering boundaries

- All UI is composed from `@afenda/ui-system`'s flat barrel; global consumers
  load `@afenda/ui-system/styles.css` then `@afenda/ui-system/base.css`. No
  parallel component primitives, no owned copies of shadcn/Radix source inside
  the app. Third-party mega-barrel imports (large icon kits, broad UI
  libraries) are avoided the same way — deep-import or `next/dynamic` heavy
  widgets instead.
- Product configuration reads through `@afenda/env` only — never raw
  `process.env` in route, action, or component code.
- Server Component is the default for every route; a Client Component boundary
  requires an explicit interactivity reason (`"use client"` is a deliberate
  decision, not a default). A Client Component is never `async`.
- `params`, `searchParams`, `cookies()`, and `headers()` are always `await`ed
  (Next 16 async request APIs) — never accessed synchronously.
- Props crossing the RSC → Client boundary are serializable POJOs limited to
  fields the client actually uses: ISO date strings (never `Date`/`Map`), no
  function props other than a Server Action reference, and no client component
  redefined inside another component's render.
- Client components that call `useSearchParams` (or otherwise read
  request-varying browser state) are wrapped in `<Suspense>`; secondary panels
  stream via `<Suspense>` paired with a segment `loading.tsx` rather than
  blocking the primary render.
- `React.cache()` may dedupe a session/org read within one request; it takes
  only primitive arguments and is not a substitute for cross-request caching.
- Non-blocking work (audit logging, analytics) after a response uses `after()`
  — it never hides or defers an authorization failure.
- Runtime defaults to **Node** for any route/action touching DB or session
  state; Edge is an explicit, justified exception, never the default.
- Caching and revalidation follow one explicit mode for the whole app, matched
  to its ADR: **Mode A (default)** — request-time rendering, `force-dynamic`
  where needed, Suspense for streaming, no `'use cache'`/PPR. **Mode B**
  (`cacheComponents` / `'use cache'` / PPR) is enabled only behind its own ADR
  and org-scoped tag-graph review — never partially, never on tenant-varying
  output keyed by `orgId` alone when role/user/locale/flags also affect it.
- The edge gate (`proxy.ts`) is the sole admission checkpoint before shell
  routing; do not add a parallel `middleware.ts` or a second gate.

## 7. Ingress, errors, and security

- External input (form data, search params, webhook payloads) starts as
  `unknown` and is parsed before any business call.
- Session, organization, and actor identity are trusted context established at
  the edge gate or session helpers — never trusted from client input.
- Unknown, package, and vendor failures normalize once through
  `@afenda/errors`; the app surfaces canonical `Result`/`ActionResult` outcomes,
  it does not invent its own error shapes.
- Sensitive data, secrets, and vendor payloads never reach client bundles, logs,
  or error boundaries.
- Every Server Action and scoped Server Component read enforces its
  permission through the owning package's authorization port; UI-level hiding
  is not a substitute.

## 8. Required artifacts

- private `package.json` with every `@afenda/*` dependency declared, `dev` /
  `build` / `lint` / `typecheck` / `test` scripts;
- repository-derived `tsconfig.json`;
- `proxy.ts` edge gate with session/tenant admission;
- README covering shells, boundary, consumption pattern, maintenance, and
  prohibitions (see exemplar pattern in package READMEs, e.g.
  [`packages/erp/human-resources/README.md`](../packages/erp/human-resources/README.md));
- workspace-edge registration matching `package.json` (when the monorepo
  boundary register is active — see §9 note);
- route, Server Action, and composition tests proving the boundary, not just
  that a page renders.

## 9. Required verification

| Gate | Required proof |
| --- | --- |
| Layer | No package imports `apps/*`; no peer-app import. |
| Route shells | Every route group's access boundary is enforced by the edge gate, not by page-level convention alone. |
| Actions | Every Server Action returns `ActionResult<T>`; authorization and identity stamping happen inside the Action. |
| UI source | No component primitives outside `@afenda/ui-system`; barrel-only imports. |
| Env | No raw `process.env` reads for product config. |
| Ingress | Hostile input rejected before use; no client-trusted identity fields. |
| Errors | Unknown/package/vendor failures normalize once; no app-invented error shapes. |
| Rendering | Client Component boundaries are justified, not default. |
| Consumers | Package-level contract changes are reflected with zero business-logic reinvention in the app. |
| Caching mode | The app is entirely Mode A or entirely Mode B for a given segment class — no partial `'use cache'` adoption; no tenant-varying output cached under an orgId-only key. |
| Runtime | App Router edits produce zero `next dev`/MCP runtime errors, not just a clean compile. |
| Static | App lint and typecheck pass. |
| Snapshot | Final route tree, action inventory, dependencies, and working-tree state are recorded. |

```bash
pnpm --filter @afenda/web lint
pnpm --filter @afenda/web typecheck
pnpm --filter @afenda/web test
pnpm governance:packages
```

After any App Router edit (routes, layouts, loaders, Actions, Route Handlers,
rendering/cache config), also run the Next.js MCP check before calling the
change done:

```text
nextjs_index → get_routes → get_errors
```

A clean `get_errors` is a runtime-error guard, not tenant-isolation or
authorization proof — add route-specific, session, or live-database evidence
when correctness depends on runtime session/tenant behavior. A static grep is
a guard, not behavior proof.

## 10. Rejected designs

- Treating `proxy.ts` or layout-level auth as sufficient for a Server Action —
  every Action re-verifies session and authorization inside its own body,
  with no exception. This is the single most-violated boundary in App Router
  code and is never satisfied by route-level or layout-level checks alone.
- A second edge gate (`middleware.ts`) alongside `proxy.ts`.
- Component primitives or a copied shadcn/Radix source tree outside
  `@afenda/ui-system`; third-party mega-barrel imports for icon/UI kits.
- Raw `process.env` reads for product configuration.
- `{ success, data }` or thrown-exception mutation contracts instead of
  `ActionResult<T>`.
- Business mutation logic, schema ownership, or persistence written directly in
  the app instead of behind a package facade.
- Peer-app imports, or shared logic duplicated into `@afenda/shared` /
  `@afenda/common` mega-packages instead of a real bounded package.
- Recreating a deliberately removed route/feature surface without an explicit
  reopened decision.
- Client Component used as the default instead of a deliberate interactivity
  boundary; an `async` Client Component; a component redefined inside another
  component's render.
- A `page.tsx` and a sibling `route.ts` in the same route folder.
- Enabling `cacheComponents` / `'use cache'` / PPR outside an explicit,
  ADR-approved Mode B migration; `force-static` or an untagged shared cache on
  session-varying output; `cookies()`/`headers()` used inside `'use cache'`.

## 11. References

- [Reusable kernel package requirements](../packages/KERNEL-SCAFFOLDING.md)
- [ERP package scaffolding requirements](../packages/erp/ERP-SCAFFOLDING.md)
- [AGENTS.md](../AGENTS.md) — skill router, Server Action exemplars, ActionResult contract
- [Monorepo boundaries](../docs-V2/monorepo/README.md) — currently absent on disk
  pending Docs-lane reopen; treat as historical authority until restored
- [`afenda-elite-nextjs-best-practice`](../.cursor/skills/afenda-elite-nextjs-best-practice/SKILL.md)
  — App Router mechanics this document's §4/§6/§9/§10 additions are drawn
  from; see its `reference/nextjs-conventions.md`, `reference/rendering-caching.md`,
  and `reference/composition.md` for full detail and worked examples
- [`afenda-elite-frontend-scaffold`](../.cursor/skills/afenda-elite-frontend-scaffold/SKILL.md)
- [`afenda-elite-api-contract`](../.cursor/skills/afenda-elite-api-contract/SKILL.md)
- [Human Resources package README exemplar](../packages/erp/human-resources/README.md)
