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
- exactly one action runner per actor class, owning session admission,
  authorization, correlation, and the internal-error envelope (§5);
- one edge gate (`proxy.ts`) enforcing session/tenant admission before any route
  handler runs;
- UI composed only from `@afenda/ui-system` (no parallel component primitives);
- product configuration read only through `@afenda/env`;
- an unbroken correlation chain from ingress to audit fact (§7);
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
  action_runners: <one per actor class; feature-specific runners are prohibited>
  edge_gate: apps/<app>/proxy.ts
  ui_source: "@afenda/ui-system"
  env_source: "@afenda/env"
  rendering_defaults: <Server Component default; Client Component exceptions and why>
  caching_policy: <fetch/revalidate/tag strategy per route class>
  dependency_edges: <package.json + authorized workspace edges, downward only>
  traceability: <correlation source, log events, audit facts>
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
│   ├── actions/                 # Server Actions — see §4.1 for layout
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
declares who can reach it before any page is added. Never recreate a removed
surface (e.g. a prior `playground` route/feature) without an explicit reopened
decision.

Server-only loaders (session reads, package facade calls feeding a page) use a
`.server.ts` suffix so their boundary is visible from the filename. Dynamic
segments use descriptive names (`[assignmentId]`, not an overloaded `[id]`).
`layout.tsx` is the one owner of shared providers (theme, etc.) for its
segment — it does not perform per-page data waterfalls. A route's `page.tsx`
and a sibling `route.ts` never coexist in the same folder.

`package.json` must declare every `@afenda/*` package it consumes explicitly (no
transitive reliance), use the workspace catalog for shared externals, and expose
package-local `lint`, `typecheck`, `test`, `dev`, and `build` scripts.

### 4.1 Action directory layout

`app/actions/` groups by **consumed package**, one directory per package facade
the app calls:

```text
app/actions/
├── _runtime/                    # the runners and shared action plumbing (§5)
├── human-resources/             # mirrors @afenda/human-resources
├── corporate-administration/    # mirrors @afenda/corporate-administration
├── sales/
└── …
```

This is a **projection of the package DAG, not a domain hierarchy**. The
directory name is the package the actions call; it carries no business meaning
of its own, and it never grows sub-levels to mirror a package's internal feature
structure — that structure belongs to the package.

Within a group, files stay flat and are named `<verb>-<noun>.ts`. Two limits
keep a group navigable and reviewable:

| Limit | Value | Why |
| --- | --- | --- |
| Files per group directory | ≤ 40 | Beyond this the group is really two consumed contexts |
| Lines per action file | ≤ 400 | A larger file is batching unrelated mutations |

A group directory that exceeds its limit is a signal that the *package* boundary
is wrong, not that the app needs another folder level. Resolve it in the package.

> **Historical note.** This section previously required `app/actions/` to be
> entirely flat. That rule was correct at ~20 actions and became actively harmful
> at 200 files / ~33k lines in one directory, where it defeated navigation and
> hid the runner proliferation §5 now forbids. The rule it replaced was aimed at
> a real failure — recreating domain hierarchy in the app — which §4.1 still
> forbids by binding the one permitted level to the package DAG.

## 5. Server Actions, runners, and the `ActionResult<T>` contract

### 5.1 The action contract

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

### 5.2 One runner per actor class

Session admission, permission evaluation, correlation creation, denial
telemetry, and the internal-error envelope are **one decision, owned once**. The
app declares exactly one runner per actor class, and no more:

| Actor class | Runner | Admits |
| --- | --- | --- |
| Operator | `runOperatorPermissionAction` | staff session + product permission |
| Member | `runMemberPermissionAction` | client-org member + product permission |
| Member (session only) | `runMemberSessionAction` | authenticated member, no permission code |

Adding a fourth runner requires a genuinely new actor class — not a new feature,
domain, package, or permission family.

**Feature-specific runners are prohibited.** A wrapper that exists to bind a
schema, a permission constant, a safe message, or a result key is not a new
authorization decision; it is a call-site configuration and belongs in the
declarative helper below.

### 5.3 The declarative action helper

Parsing input, mapping a package `Result` into `ActionResult`, and naming the
returned value are mechanical. They are expressed once, as data:

```ts
export const createTalentProfileAction = defineAction({
  runner: "operator",
  path: "createTalentProfileAction",
  permission: talentAdminPermission,
  schema: createTalentProfileInputSchema,
  safeMessage: "Could not create talent profile.",
  validationMessage: "Enter a valid talent profile.",
  resultKey: "profile",
  execute: (input, context) =>
    createTalentProfile(input, createHumanResourcesCommandOptions(context)),
});
```

Every field above is configuration. None of it is a policy decision the call site
is entitled to make differently, which is precisely why it must not be expressed
as a hand-written wrapper function per feature.

> **Historical note.** This section previously specified the action contract but
> named no owner for it. The result was 34 distinct `run*Action` wrappers across
> `app/actions/`, most of them per-feature clones of the same parse → authorize →
> call-facade → wrap-result sequence, each free to diverge on error mapping,
> telemetry, and correlation. §5.2 and §5.3 close that gap by naming the owner.

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

### 6.1 Feature composition — how a shell reaches a package

A feature is the only place the route tree and the mutation surface meet. The
direction is fixed:

```text
app/(shell)/…/page.tsx          server component: awaits params, calls the loader
   └── features/<feature>/*.server.ts    server loader: one package facade read
         └── features/<feature>/*.tsx    client island: props in, action reference in
               └── app/actions/<package>/<verb>-<noun>.ts
```

- A `page.tsx` composes; it does not query. Data comes from a `.server.ts`
  loader in the owning feature.
- A client island receives a Server Action **reference** as a prop and renders
  its `ActionResult`. It never constructs a fetch to an internal route handler
  to reach behaviour a Server Action already exposes.
- `features/<feature>/` never imports another feature's non-`shared` internals,
  and never imports from `app/(shell)/`. Composition flows one way.
- A feature owns no business rule. If a feature needs a decision the package
  does not expose, the fix is a package contract change, not app-side logic.

## 7. Ingress, errors, security, and traceability

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

### 7.1 The correlation chain

A mutation must be reconstructable end to end from one identifier. The chain is
unbroken and has exactly one source:

| Stage | Obligation |
| --- | --- |
| Creation | The runner (§5.2) calls `http.correlation.create()` **once** per action invocation. No call site creates its own. |
| Propagation | The correlation id is passed to the package facade in command options — never re-derived, never regenerated mid-action. |
| Logging | Every `logger.event` emitted during the action carries `correlationId`, `orgId`, `actorUserId`, and `path`. |
| Audit | Every audit fact written by the package carries the same correlation id, through the audit port. |
| Failure | A failed `ActionResult` returns the correlation id so a user-reported failure maps to a server trace. |

A Server Action that does not participate in this chain is not traceable and is
not accepted, regardless of whether it returns a well-formed `ActionResult`.

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
| Runners | Exactly one runner per actor class; no feature-local `run*Action` wrapper. |
| Action layout | Every `app/actions/` group maps to a consumed package; group and file limits hold (§4.1). |
| Traceability | Correlation created once per invocation, propagated to facade, present on every log event and audit fact, returned on failure. |
| Loaders | Every server-only loader carries the `.server.ts` suffix. |
| UI source | No component primitives outside `@afenda/ui-system`; barrel-only imports. |
| Env | No raw `process.env` reads for product config. |
| Ingress | Hostile input rejected before use; no client-trusted identity fields. |
| Errors | Unknown/package/vendor failures normalize once; no app-invented error shapes. |
| Rendering | Client Component boundaries are justified, not default. |
| Composition | Features flow page → loader → island → action; no reverse or cross-feature internal import. |
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

### 9.1 Enforcement

The rows above that are mechanically decidable — runners, action layout,
traceability, loader suffix, UI source, env, layer direction, composition
direction — must be enforced by a registered governance gate, not by review. An
unenforced convention in a 75k-line app is a rule that has already been broken
somewhere: §5.2 and §4.1 both exist because prose rules drifted unobserved for
months.

**Status: partial.** `check:app-scaffolding` does not exist as one aggregate yet.
Enforced rows so far:
- Identity stamp order — `pnpm check:action-identity-stamp-order`
- Loaders `.server.ts` suffix — `pnpm check:app-loader-server-suffix`

Until the remaining rows below are registered with negative fixtures proving they
fire, those rows stay review-enforced. Do not cite `pnpm check:app-scaffolding`
as an available command.

Enforcement scope when built, in dependency order — each row is a static scan
over `apps/<app>/**`:

| Rule | Decidable by |
| --- | --- |
| Runners | No `run*Action` declaration outside `app/actions/_runtime/` |
| Action layout | Every `app/actions/<group>/` matches a declared `@afenda/*` dependency; group/file limits |
| Loaders | Every module named `load-*.ts` under `features/` uses `*.server.ts` — enforced by `check:app-loader-server-suffix` |
| Traceability | No `correlation.create()` outside `_runtime/`; every `logger.event` call site carries the four required fields |
| Identity stamp order | `organizationId` / actor stamps appear after `...parsed.data` — enforced by `check:action-identity-stamp-order` |
| Composition | No `features/**` import of `app/(shell)/**`; no cross-feature non-`shared` import |
| UI source / env | Already covered by `check:ui-system` and `check:env-consumers` — do not duplicate |

Rows that require judgement (route shells, rendering boundaries, caching mode,
snapshot) stay with review and are named here so the split is explicit.

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
- A feature-local, domain-local, or package-local `run*Action` wrapper
  duplicating the runner sequence; a fourth actor-class runner added for
  anything short of a genuinely new actor class.
- A Server Action that creates its own correlation id, regenerates one
  mid-action, or omits it from a failed `ActionResult`.
- Sub-levels under an `app/actions/<package>/` group mirroring that package's
  internal feature structure.
- A second edge gate (`middleware.ts`) alongside `proxy.ts`.
- A client island calling an internal route handler to reach behaviour an
  existing Server Action already exposes.
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
  pending Docs-lane reopen; treat as historical authority until restored
- [Governance gate registry](../scripts/lib/governance-gates.mjs) — where §9.1
  enforcement is declared
- [`afenda-elite-nextjs-best-practice`](../.cursor/skills/afenda-elite-nextjs-best-practice/SKILL.md)
  — App Router mechanics this document's §4/§6/§9/§10 additions are drawn
  from; see its `reference/nextjs-conventions.md`, `reference/rendering-caching.md`,
  and `reference/composition.md` for full detail and worked examples
- [`afenda-elite-frontend-scaffold`](../.cursor/skills/afenda-elite-frontend-scaffold/SKILL.md)
- [`afenda-elite-api-contract`](../.cursor/skills/afenda-elite-api-contract/SKILL.md)
- [Human Resources package README exemplar](../packages/erp/human-resources/README.md)
