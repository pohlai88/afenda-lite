# Afenda Elite — React composition (reference)

Progressive disclosure for `afenda-elite-react-composition`. SKILL.md is the lean index.

## Conflict matrix (binding)

| Vendor principle | Afenda adaptation |
| ---------------- | ----------------- |
| Avoid boolean props | Reject behavioral mode combinations, not ordinary intrinsic booleans such as `disabled`, `required`, or `modal` |
| Explicit variants | Product-local thin shells by default; shared only through UI-CAP promotion evidence |
| Compound components | Require composition/state-sharing justification gate |
| Lift state into providers | Lift only to the necessary lifecycle and sharing boundary |
| Generic context interface | Capability-specific typed contract; `state/actions/meta` advisory only |
| Children over render props | Children for structure; callbacks when supplying scoped data or behavior |
| React 19 refs | Prefer ref-as-prop for new React 19 code; preserve compatibility |
| `use(Context)` | Allowed, not mandatory; do not mechanically replace `useContext` |
| Raw vendor components | Translate to existing `@afenda/ui-system` exports |
| Missing reusable capability | Issue or resolve UI-CAP; never compensate in feature code |

## Intrinsic vs behavioral booleans

**Allowed intrinsic (examples):** `disabled`, `required`, `modal`, `open` / controlled open when a single binary attribute does not change the component’s fundamental workflow.

**Forbidden behavioral mode soup (examples):** `isEditing` + `isThread` + `isForwarding` + `showFormatting` on one public surface — use explicit variants or a justified compound instead (`RC-COMP-01`, `RC-COMP-02`).

## Provider contract

Providers own the workflow state implementation and expose a narrow,
capability-specific context contract. `state/actions/meta` is an advisory
pattern, not a mandatory schema.

Prefer:

```ts
interface ApprovalEditorContextValue {
  draft: ApprovalDraft
  status: ApprovalStatus
  commands: {
    updateReason(reason: string): void
    submit(): Promise<void>
    cancel(): void
  }
}
```

Avoid generic dumping grounds:

```ts
{
  state: unknown
  actions: Record<string, Function>
  meta: Record<string, unknown>
}
```

Providers must never own tokens, type scale, density, or parallel CSS kits.

## Children vs render callbacks

Prefer children for structural composition. Use a render callback only when the
component must provide scoped data, measurement, state, or behavior to
consumer-rendered output.

Appropriate:

```tsx
<DataTable
  renderExpandedRow={({ row }) => <AuditDetail record={row.original} />}
/>
```

```tsx
<PermissionBoundary permission="role.assign">
  {({ allowed, reason }) =>
    allowed ? <AssignRoleForm /> : <p>{reason}</p>
  }
</PermissionBoundary>
```

Misuse of many `renderHeader` / `renderFooter` / `renderActions` props when ordinary children suffice → `RC-COMP-07`.

## React 19

For new or materially changed React 19 components, prefer `ref` as a regular
prop. `use(Context)` is permitted, especially where conditional context reading
is useful. Existing correct `useContext` code does not require mechanical
migration. Preserve compatibility where package peer ranges or external APIs
still require `forwardRef`.

Compatibility risk without justification → `RC-COMP-10`.

## Compound-component justification gate

Use a compound component only when one or more apply:

- consumers require materially different child arrangements;
- multiple children coordinate non-trivial shared state;
- actions must exist outside the visual frame;
- accessibility behavior must be coordinated across parts;
- two or more explicit variants share the same internal contract;
- the existing API is becoming boolean-heavy or callback-heavy.

Do not create a compound for one stable structure that ordinary props and
children can express clearly.

Compound without justification → `RC-COMP-08`.

## Explicit-variant ownership

Explicit workflow variants remain product-local by default.

Promote a reusable variant or shared compound into `@afenda/ui-system` only when:

- two or more independent features need it;
- the behavior is intrinsic to the generic component;
- approved architecture defines it as common ERP behavior; or
- local implementation would duplicate shared interaction, accessibility,
  responsive, token, or state logic.

Thin feature shells must import from `@afenda/ui-system` only — no handrolled
Button/Input/chrome. Product semantics leaked into ui-system → `RC-COMP-09`.

## Finding namespace (`RC-COMP-*`)

Do not add these to `UI-CAP-*`, F*, or C*. Dual-classify with UI-CAP when both apply.

| Code | Finding |
|------|---------|
| `RC-COMP-01` | Behavioral boolean mode proliferation |
| `RC-COMP-02` | Impossible public prop combinations |
| `RC-COMP-03` | Monolithic reusable component API |
| `RC-COMP-04` | State trapped below required consumers |
| `RC-COMP-05` | UI coupled to state implementation |
| `RC-COMP-06` | Overly generic context contract |
| `RC-COMP-07` | Render-callback misuse |
| `RC-COMP-08` | Compound API without justification |
| `RC-COMP-09` | Product semantics leaked into ui-system |
| `RC-COMP-10` | React-version compatibility risk |

Example dual finding:

```text
UI-CAP-04
Shared compound API incomplete

RC-COMP-01
Current API contains four behavioral mode booleans

Required action
Replace mode matrix with explicit variants over a controlled shared contract.
```

## Vendor rule map (progressive disclosure)

Open only the matched file. Do not load all rules by default.

| Vendor rule | Afenda adapter |
|-------------|----------------|
| [architecture-avoid-boolean-props](../vercel-composition-patterns/rules/architecture-avoid-boolean-props.md) | Behavioral modes → variants/compound; keep intrinsic booleans |
| [architecture-compound-components](../vercel-composition-patterns/rules/architecture-compound-components.md) | Apply justification gate; shared compounds via UI-CAP / package upgrade |
| [state-decouple-implementation](../vercel-composition-patterns/rules/state-decouple-implementation.md) | UI consumes contract; provider owns implementation |
| [state-context-interface](../vercel-composition-patterns/rules/state-context-interface.md) | Capability-specific types; `state/actions/meta` advisory only |
| [state-lift-state](../vercel-composition-patterns/rules/state-lift-state.md) | Lift only to needed boundary; no effect-synced duplicates |
| [patterns-explicit-variants](../vercel-composition-patterns/rules/patterns-explicit-variants.md) | Product-local shells by default; barrel-only chrome |
| [patterns-children-over-render-props](../vercel-composition-patterns/rules/patterns-children-over-render-props.md) | Children for structure; callbacks when parent supplies data |
| [react19-no-forwardref](../vercel-composition-patterns/rules/react19-no-forwardref.md) | Prefer ref-as-prop for new code; do not force `use()` / rewrite |

## Incorrect / correct (Afenda)

**Incorrect — feature-local compound compensating for missing shared API:**

```tsx
// features/approvals/local-composer.tsx — handrolled chrome + mode booleans
function ApprovalsComposer({ isEdit, isReview }: { isEdit?: boolean; isReview?: boolean }) {
  return <div className="rounded-2xl border p-8">...</div>
}
```

**Correct — ui-compose classifies; this skill designs package or product-local shell:**

- `BLOCKED_UI_SYSTEM` → propose controlled `@afenda/ui-system` compound API; issue `UI-CAP-*` + `RC-COMP-*`; no feature substitute
- `CAPABLE` / `LOCAL_COMPOSITION_PERMITTED` → thin product variant composing barrel exports only

## Non-goals

- Token / type / density / color locks
- F* / C* Vitest gates
- UI-CAP ownership classification
- Compose Score emission
- Performance rule inventory (`vercel-react-best-practices`)
