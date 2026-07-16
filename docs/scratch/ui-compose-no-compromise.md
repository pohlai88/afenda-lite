# Verdict

I agree with your rejection.

The proposed **LSC-1…3, F9 and C4 expansion puts product completeness inside the composition skill**. That crosses the boundary of `afenda-elite-ui-compose`.

The compose skill should answer:

> “Can the current `@afenda/ui-system` primitives and compounds compose this surface correctly, consistently and stably?”

It should **not** silently compensate for an incomplete component system by forcing page-level workarounds.

Your current skill already establishes that the intended barrel component must be used first, missing primitives must be added through the controlled package workflow, and product features must not create parallel UI implementations.

The scalable policy should therefore be:

> **Do not lower product composition quality to fit inadequate primitives. Detect the capability gap, stop the composition, and require a controlled `@afenda/ui-system` upgrade.**

---

# Why the LSC proposal is structurally wrong

## 1. It makes the compose skill understand product completeness

The proposed C4 gate attempts to infer:

- whether row data is “rich”;
- whether detail should exist;
- whether a row action is required;
- whether a dialog elsewhere represents a read path;
- whether four columns imply a more complete list.

Those are partly domain and product decisions.

A generic composition skill cannot reliably decide that from AST structure alone.

This creates false conclusions such as:

```text
Many fields → must have rowActions
Four columns → must expose View
Dialog exists → DataTable must link to it
```

These may often be sensible, but they are not universally true.

---

## 2. It encourages page-level compensation

If the current `DataTable` cannot properly support:

- controlled sorting;
- filtering;
- pagination;
- action slots;
- expandable detail;
- correct empty states;

the answer should not be:

> “Make every feature wire these manually until the page looks complete.”

The correct answer is:

> “The shared `DataTable` capability is below the required product composition level. Upgrade the shared compound first.”

That is **scalability-first** because the capability is solved once for all future feature surfaces.

---

## 3. F9 controls a symptom, not the system

A one-card three-column grid is clearly poor composition. But adding a special F9 gate for one layout symptom begins a pattern of endless rules:

```text
F9  one MetricCard in grid
F10 two cards in four columns
F11 incorrect responsive metric breakpoints
F12 mixed metric card heights
F13 empty metric shell
```

This becomes a visual exception catalogue.

A more scalable rule is:

> The metric-surface compound must own responsive density and item-count layout.

Then feature code supplies the metrics, not the grid rules.

---

## 4. C4 risks inventing product UI

The proposal correctly says not to invent fake actions, but its machine gate still pressures the agent to create a View path when it detects “rich detail.”

That can produce artificial dialogs solely to satisfy the gate.

Your current system properly separates generic presentation from feature-owned data fetching, permissions and domain actions. `DataTable` is explicitly constrained to presentation and interaction contracts only.

That boundary should remain intact.

---

# Recommended quality order

Retain the current quality order but strengthen the final step:

```text
1. AUTHORITY-FIRST
2. CONSISTENCY-FIRST
3. CORRECT-COMPONENT-FIRST
4. SUITABILITY-FIRST
5. SCALABILITY-FIRST
6. STABILITY-FIRST
```

## Meaning

### AUTHORITY-FIRST

Use the live ADRs, package boundary, token file and barrel.

### CONSISTENCY-FIRST

Do not deviate from the locked visual system.

### CORRECT-COMPONENT-FIRST

Use the component intended for the job.

### SUITABILITY-FIRST

Verify that the component fits the actual workflow.

### SCALABILITY-FIRST

When the intended component lacks an essential reusable capability, **do not compensate locally**. Report the capability gap and route it to controlled shared-component evolution.

### STABILITY-FIRST

Do not ship until the shared upgrade and its consumers pass the proportional verification matrix.

---

# The key policy: no local compensation

Use this as the governing rule:

## SCALABILITY-FIRST — No-Compromise Component Capability Policy

A product surface must not compensate locally for a missing or inadequate `@afenda/ui-system` primitive or shared compound.

When the correct barrel component exists but cannot satisfy an essential reusable interaction, state, density, accessibility, or composition requirement:

1. Stop the affected composition.
2. Do not handroll an alternative in `apps/web`.
3. Do not add feature-local wrappers that duplicate shared-component responsibility.
4. Do not hide the limitation with disabled, decorative, placeholder, or fake controls.
5. Record a UI-system capability finding.
6. Classify the finding as:
   - missing primitive;
   - incomplete primitive;
   - missing compound;
   - incomplete compound;
   - unsuitable component API;
   - missing token or shared state;
   - product-only requirement.

7. Route reusable gaps to the controlled `@afenda/ui-system` upgrade workflow.
8. Route product-only behavior to the owning feature or product mission.
9. Resume feature composition only after the shared capability is available, or after the requirement is explicitly confirmed as product-local.

A visually complete page created through local compensation is a failed change.

---

# Capability assessment before composition

The skill should perform a **capability check**, not list-completeness inference.

## Required check

Before composing a shared surface such as a list, form or detail page:

```text
1. Does the intended barrel component exist?
2. Does its current public API support the required reusable behavior?
3. Are the required states already represented?
4. Can the feature supply its domain state through existing component ports?
5. Would implementation require duplicating shared visual or interaction logic locally?
```

## Decision

| Finding                                        | Required action                    |
| ---------------------------------------------- | ---------------------------------- |
| Existing component is sufficient               | Compose normally                   |
| Component is sufficient; domain port missing   | Product/feature finding            |
| Component lacks generic capability             | UI-system upgrade required         |
| No suitable component exists                   | New primitive/compound assessment  |
| Requirement is one-off and domain-specific     | Keep in feature                    |
| Requirement is likely reusable across features | Promote through shared UI workflow |

---

# Capability-gap output

Instead of adding F9 and C4, require the skill to produce a formal finding.

## Example: inadequate metric layout

```text
UI CAPABILITY FINDING

Surface:
Declarations summary

Required component:
MetricCard collection / metric strip

Current capability:
MetricCard exists, but the UI system has no shared responsive metric-strip
composition that adapts columns to metric count.

Observed workaround:
Feature-local grid classes would need to encode count-based layout.

Classification:
Missing shared compound

Required upgrade:
Add MetricStrip or MetricGrid to @afenda/ui-system with count-aware responsive
layout and semantic spacing.

Composition status:
BLOCKED — do not ship sparse feature-local grid.
```

## Example: inadequate DataTable

```text
UI CAPABILITY FINDING

Surface:
Declarations list

Required component:
DataTable

Current capability:
DataTable renders rows and columns but lacks an approved row-action port.

Product capability:
A real declaration detail route already exists.

Classification:
Incomplete shared compound

Required upgrade:
Add typed rowActions support to DataTable without adding routing or domain logic.

Feature responsibility after upgrade:
Provide the real View action and route.

Composition status:
BLOCKED until shared capability is available.
```

## Example: no domain action exists

```text
UI CAPABILITY FINDING

Surface:
Declarations list

Current UI-system capability:
DataTable supports rowActions.

Product capability:
No assign, survey-open or edit route/action currently exists.

Classification:
Product capability gap — not a UI-system gap

Required action:
Do not invent or disable fake actions.
Report to the owning product mission.

Composition status:
List-only is permitted if it accurately represents current product capability.
```

This gives you clear ownership without forcing fake completeness.

---

# Recommended capability classifications

Use only these classifications:

| Code        | Finding                                    |
| ----------- | ------------------------------------------ |
| `UI-CAP-01` | Primitive missing                          |
| `UI-CAP-02` | Primitive API incomplete                   |
| `UI-CAP-03` | Shared compound missing                    |
| `UI-CAP-04` | Shared compound API incomplete             |
| `UI-CAP-05` | Token/foundation capability missing        |
| `UI-CAP-06` | Accessibility capability insufficient      |
| `UI-CAP-07` | Product/domain port missing                |
| `UI-CAP-08` | Existing component unsuitable for workflow |

These are enough. Do not create dozens of component-specific gate IDs.

---

# How to handle the three list shortfalls

## 1. Sparse metric strip

### Do not

Add F9 to detect every grid arrangement.

### Do

Create a reusable shared compound only when metric surfaces recur:

```tsx
<MetricStrip metrics={metrics} density="comfortable" />
```

The component owns:

- one metric → one column;
- two metrics → two columns;
- three or more → responsive layout;
- consistent gaps;
- consistent card height;
- semantic empty behavior if appropriate.

The feature owns:

- metric labels;
- metric values;
- formatting;
- domain data;
- permissions.

Until that compound exists, the compose skill should return:

```text
UI-CAP-03: shared metric-strip compound missing
```

It should not quietly prescribe feature-local responsive layout.

---

## 2. Sort, filter and pagination

These should be capability ports on `DataTable`, not compose checkboxes.

The shared component may provide generic APIs such as:

```tsx
<DataTable
  columns={columns}
  data={rows}
  sorting={sorting}
  onSortingChange={setSorting}
  filters={filters}
  onFiltersChange={setFilters}
  pagination={pagination}
  onPaginationChange={setPagination}
/>
```

The UI system owns:

- control presentation;
- interaction contracts;
- accessibility;
- consistent placement;
- empty/loading/error treatment.

The feature owns:

- whether sorting is needed;
- row volume;
- URL persistence;
- server queries;
- permissions;
- filter semantics.

The compose skill should ask:

```text
Does DataTable expose the generic port required by the approved product behavior?
```

It should not enforce:

```text
More than approximately 20 rows means filter.
More than approximately 25 rows means pagination.
```

Those numeric thresholds are product heuristics, not design-system authority.

---

## 3. Row actions

The correct rule is:

```text
If a real action or route exists and DataTable exposes an approved generic
row-action port, the feature should connect it.

If the port exists but the feature does not connect an available required action,
report a product composition omission.

If the port does not exist, report an incomplete DataTable capability.

If the product action does not exist, do not invent it.
```

That cleanly separates three cases.

---

# Replace LSC with a capability-escalation section

I recommend replacing LSC-1…3 with this:

## Shared Component Capability Gate

Before composing a product surface, verify that the intended barrel primitive or compound provides the reusable capabilities required by the approved workflow.

### Capability outcomes

**CAPABLE**

The component supports the required shared behavior through its existing public API. Compose the feature and provide product-owned state, data, permissions and routes.

**UI-SYSTEM GAP**

The intended component is missing or lacks a reusable capability that would otherwise be duplicated in feature code.

Required response:

- stop the affected composition;
- issue a `UI-CAP-*` finding;
- identify the smallest reusable component or API upgrade;
- route the finding through the controlled `@afenda/ui-system` workflow;
- do not create a feature-local substitute.

**PRODUCT GAP**

The shared component supports the behavior, but no real domain action, route, permission port or data capability exists.

Required response:

- do not invent fake or disabled actions;
- report the missing product capability;
- preserve an honest list-only or read-only surface where appropriate.

**UNSUITABLE COMPONENT**

The barrel contains a component, but its interaction model is inappropriate for the workflow.

Required response:

- choose another valid barrel component where available;
- otherwise issue a capability finding rather than forcing the wrong component.

### Completion rule

Chrome consistency alone is insufficient. However, product completeness must not be simulated through feature-local UI compensation.

A surface is complete only when:

1. its shared UI capabilities come from `@afenda/ui-system`;
2. its product actions and data ports are real;
3. no fake, disabled or decorative controls are used to conceal missing capability;
4. all applicable stability evidence is green.

---

# Recommended hard rule 15

Do not use the proposed LSC wording.

Use:

```text
15. NO LOCAL CAPABILITY COMPENSATION

When the correct barrel primitive or compound lacks an essential reusable
capability, stop and issue a UI-system capability finding. Do not reproduce
the missing behavior in apps/web, add a feature-local substitute, or invent
fake domain controls. Reusable capability is upgraded in @afenda/ui-system;
domain capability is supplied by the owning product feature.
```

This is clearer and scales beyond list pages.

It applies equally to:

- tables;
- metric strips;
- form layouts;
- selectors;
- date ranges;
- approval steppers;
- audit timelines;
- bulk actions;
- navigation;
- empty/error states.

---

# Verification policy

You still need machine gates, but they should guard **boundary violations**, not infer product completeness.

## Keep machine-enforced

- local `apps/web/components/ui` tree;
- deep imports;
- fake buttons;
- handrolled table when `DataTable` exists;
- direct auth CSS leakage;
- dynamic or raw token violations;
- feature-local copies of shared compounds;
- barrel API drift;
- RSC boundary violations.

## Do not machine-enforce broadly

- a minimum number of row actions;
- filter requirement based on row count;
- pagination requirement based on estimated row count;
- View action based on field count;
- metric-grid column count through fragile JSX scanning;
- existence of an action when backend ports may not exist.

Those belong in capability review and product acceptance.

---

# Scalability-first routing model

```text
Product UI requirement
        ↓
Correct barrel component identified
        ↓
Capability sufficient?
   ┌────┴────┐
  Yes        No
   ↓          ↓
Compose    Is gap reusable?
feature     ┌────┴────┐
           Yes        No
            ↓          ↓
     Upgrade ui-system Product mission
            ↓          ↓
       tests + barrel  real ports/routes
            └────┬─────┘
                 ↓
          Resume composition
                 ↓
        stability matrix green
```

---

# Final recommendation

Reject:

- LSC-specific F9;
- heuristic C4;
- forced row-action inference;
- row-count filter/pagination thresholds as binding skill rules.

Adopt:

1. **SCALABILITY-FIRST** in the quality order.
2. **No local capability compensation.**
3. A formal `UI-CAP-*` finding model.
4. Controlled shared-component upgrade before feature workaround.
5. Clear separation between reusable UI gaps and domain/product gaps.
6. Machine gates focused on objective architecture violations.
7. Product acceptance responsible for real action availability and workflow completeness.

## Recommended final quality order

```text
AUTHORITY-FIRST
→ CONSISTENCY-FIRST
→ CORRECT-COMPONENT-FIRST
→ SUITABILITY-FIRST
→ SCALABILITY-FIRST
→ STABILITY-FIRST
```

This is genuinely **non-compromise-first**:

> Do not compromise the feature with weak primitives.
> Do not compromise the design system with domain logic.
> Do not compromise product truth with fake actions.
> Upgrade the correct ownership layer, then compose the feature.
