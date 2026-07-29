# Afenda ERP Storybook stories — reference

Progressive disclosure for `afenda-erp-storybook-stories`. Load when classifying a suite, scoring, syncing contracts, or copying Overview recipes.

## Doctrine (repeat)

Metadata defines meaning. Storybook demonstrates only permitted ERP patterns. Play proves behaviour. Coverage prevents undocumented usage. Contract Docs render evidence as an internal guide — never a second meaning SSOT.

## Orchestra map

| Concern | Load | Do not absorb |
|---------|------|----------------|
| CSF3 Meta/StoryObj/play | `storybook-story-writing` | ERP hierarchy doctrine |
| Contract / Docs prose | `technical-writing` → **internal-guide** | Living ADR/spec/runbook · `apps/docs` · changelog |
| ERP evidence + sync | this skill | Product page compose (`afenda-elite-ui-compose`) |
| Primitive install | `shadcn-ui` | Story authorship |

## File map (disk truth)

| Path | Role |
|------|------|
| `packages/surfaces/ui-system/src/metadata/contracts/<name>.contract.ts` | Meaning SSOT via `defineManifestContract` |
| `packages/surfaces/ui-system/src/metadata/catalog.ts` | Registration / lifecycle / requiredStates authority |
| `packages/surfaces/ui-system/src/metadata/contract.ts` | Low-level contract types (not Storybook) |
| `apps/storybook/.storybook/storybook-evidence.ts` | Vite plugin + `StorybookContractEvidence` type |
| `apps/storybook/.storybook/storybook-evidence-loader.ts` | Projects metadata → JSON for the virtual module |
| `virtual:afenda-storybook-evidence` | Frozen runtime evidence map |
| `apps/storybook/src/stories/evidence.tsx` | `contractEvidence` · `evidenceDescription` · `StorySection` |
| `apps/storybook/src/stories/contract-docs.tsx` | `contractDocsParameters` · `ContractDocsPage` |
| `apps/storybook/src/stories/<name>.stories.tsx` | Approved usage evidence |
| `apps/storybook/__tests__/story-coverage.test.ts` | Sync / wiring gate |
| `apps/storybook/scripts/wire-contract-docs.mjs` | Bulk Docs wiring helper (evidence-driven) |

Never export metadata contracts from `@afenda/ui-system` barrel.

## Sync change-order matrix

### A — Meaning change

```text
1. Edit *.contract.ts (defineManifestContract fields only).
2. Confirm catalog / requiredStates still coherent.
3. Restart Storybook or invalidate evidence cache if projection looks stale.
4. Update stories:
   - argTypes options from evidence.variants / evidence.sizes
   - Variants / Sizes / StatesAndAccessibility / DoAndDoNot maps
   - docs.description.story paraphrases — no contradiction
5. Update story-coverage allow-lists if exports renamed (Usage ↔ SemanticUsage).
6. Focused verify: coverage + stories + ui-system metadata tests.
7. Visual update only if Overview composition changed.
```

### B — Evidence-only change

```text
1. Keep *.contract.ts unchanged.
2. Upgrade Overview / Composition / play / DoAndDoNot demos.
3. Still bind controls to evidence (no new axes).
4. Coverage only if story export names change.
5. Visual if Overview tagged `visual` changed.
```

### C — Docs chrome change

```text
1. Edit contract-docs.tsx / storybook.css only for shared Docs UX.
2. Keep section titles stable (coverage asserts them).
3. Component-specific meaning stays in contracts → evidence → page props.
```

### Drift FAIL signals

| Signal | Fix |
|--------|-----|
| Story uses variant/size absent from evidence | Remove from story **or** add to contract (meaning change) |
| Controls include axes not in contract | Narrow `controls.include` |
| Docs page invents purpose text | Use `evidence.purpose` via ContractDocsPage |
| `contractEvidence("ui.x")` missing | Add/register contract + catalog row |
| Both `Usage` and `SemanticUsage` | Keep one family; update coverage |
| Hand-copied ownership lists in story body | Delete — Docs page owns that render |

## technical-writing (internal-guide) for contracts

Primary mode: **`internal-guide`**. Audience: engineers composing ERP UI.

### Clause quality

| Field | Write for |
|-------|-----------|
| `purpose` | One sentence — what the primitive does in ERP workflows |
| `ownership.componentOwns` | Presentation / interaction the primitive guarantees |
| `ownership.consumerOwns` | Authz, policy, command execution the feature must own |
| `semanticBoundaries` | What visual treatment must **not** imply |
| `approvedVariants` / `approvedSizes` | `meaning` + `allowedWhen` (+ `prohibitedWhen` when sharp) |
| `rules` | Operator-facing composition duties |
| `accessibility` | Concrete a11y obligations |
| `prohibitedUsage` | Misuses with clear failure mode |

### Good clause

```text
Destructive styling does not determine whether confirmation is required.
```

### Bad clause

```text
Be careful with destructive buttons and make sure UX is nice.
```

### Story description pairing

Story `parameters.docs.description.story` should:

- Name the ERP scenario or rule being evidenced
- Stay consistent with contract wording
- Avoid marketing tone and Living ARCH citations as SSOT

## Canonical exemplars

| Level | Path | Load when |
|-------|------|-----------|
| Benchmark | `status-badge.stories.tsx` · `button.stories.tsx` | Sparse status · command hierarchy · contract Docs exemplar |
| Governed | `card.stories.tsx` | Hierarchical workbench · Card compositions · chrome restraint |

Agents upgrading a **governed** suite must read the Card exemplar before inventing a new Overview shape. Agents upgrading a **benchmark** suite must read StatusBadge and/or Button (and Card if composing cards inside the dashboard).

## Button sync exemplar (pattern)

```tsx
const evidence = contractEvidence("ui.button");

const meta = {
  title: "UI System/Button",
  component: Button,
  args: { /* defaults within evidence */ },
  argTypes: {
    variant: { control: "select", options: evidence.variants },
    size: { control: "select", options: evidence.sizes },
  },
  parameters: {
    controls: { include: ["variant", "size", "disabled"], sort: "none" },
    ...contractDocsParameters(evidence, "Button"),
  },
} satisfies Meta<typeof Button>;
```

Product adoption rule (AGENTS.md): inspect the private Button suite; pick a demonstrated pattern; if none matches, extend Storybook + contract together before product use.

## ERP Story Score rubric (/100%)

| Band | Weight | Binding pass criteria |
|------|--------|------------------------|
| Operational Overview | 20 | Real ERP scenario with structural hierarchy at the suite’s level — not a flat status gallery |
| Sparse status | 15 | Status colour only for authoritative state; aggregates usually unbadged |
| Dimension hygiene | 10 | One status per named dimension; Badge ≠ StatusBadge |
| Surface fitness | 15 | Correct primitive; distinct compositions; action-slot/footer priority; table-first queues |
| CSF3 and coverage | 10 | Flat title, contract evidence, exact approved exports, one visual Overview |
| Contract sync | 20 | Meaning SSOT ↔ stories ↔ Docs ↔ coverage agree; no invented axes; no duplicated SSOT |
| Accessibility and copy | 10 | Valid IDs, title-ownership, one scroll owner, business labels, MYR consistency |

### Level-aware scoring notes

| Level | Overview band expectation |
|-------|---------------------------|
| Benchmark | Full multi-region operational composition |
| Governed | Hierarchical sections (summary → priority → exception → quiet complete) |
| Primitive | Compact realistic placement; do not require workbench regions |

## Evidence-level catalog

| Level | Components (SSOT seed) | Overview scale |
|-------|------------------------|----------------|
| Benchmark | StatusBadge, Button, DataTable, MetricCard, FilterBar, Dialog | Full operational ERP composition |
| Governed | Card, Alert, Sheet, FormField, PageHeader | Focused hierarchical ERP workbench |
| Primitive | Separator, Skeleton, Tooltip, Avatar | Compact realistic composition |

### Primitive Overview examples

| Component | Sufficient Overview |
|-----------|---------------------|
| Tooltip | ERP toolbar / truncated invoice id with keyboard access |
| Skeleton | Loading row inside a table or form field |
| Separator | Section break inside a card or page header |
| Avatar | Operator identity in a directory row or page header |

## Card doctrine (governed exemplar)

A Card should mean:

> **One independently meaningful subject, bounded for comprehension and composition.**

### Owns / does not own

| Owns | Does not own |
|------|----------------|
| Visual boundary | Lifecycle meaning |
| Internal spacing | Navigation |
| Header/content/footer hierarchy | Permissions |
| Contextual action placement | Workflow decisions |
| Collection consistency | Entire-row click behaviour |
| | Arbitrary spacing |
| | Overlay elevation |

### Composition types

| Type | Purpose | Chrome defaults |
|------|---------|-----------------|
| Summary | Aggregate metric / operational fact | No internal borders; no StatusBadge by default; one outline queue action |
| Record | Named business record | Footer border only or header **or** footer; StatusBadge when state drives action |
| Exception / Decision | Issue or approval with consequence | Tonal inset for consequence; primary recovery dominant |

### CardAction may contain

- StatusBadge · taxonomy Badge · small menu · compact secondary

### CardAction must not contain

- Long button groups · essential explanation · primary workflow actions · large metrics

### Footer priority

```text
left: navigation or low-priority action
right: workflow actions
```

or right-aligned decision pair (Reject / Approve).

### Title ownership (CardTitle today)

Disk truth: `CardTitle` is a styled `div` (no heading / `asChild`).

```tsx
<Card aria-labelledby="invoice-title">
  <CardTitle id="invoice-title">Invoice INV-1042</CardTitle>
</Card>
```

Do **not** nest `<h2>` inside `CardTitle`.

### Gallery anti-pattern (FAIL)

```text
[Record][Record]
[Record][Record]
```

Same chrome; only StatusBadge and copy change → not a workbench.

### Hierarchy pattern (PASS)

```text
[Summary][Summary][Summary]

[Detailed Record ........][Exception]

[Quiet completed record ................]
```

## Benchmark Overview patterns

### Control summary strip

One StatusBadge only when state changes operator duty. Prefer value + detail without badges when possible.

### Approval / activity tables

Columns: identity · owner/actor · amount/reference · age/time · **State/Outcome**.

### Command hierarchy (Button)

One dominant default action per local decision context (page header, card footer, dialog). Destructive only for difficult-to-recover harm. Navigation uses `asChild` + real anchor.

## Contract → story validation checklist

```text
[ ] Purpose / ownership          → Overview + ContractDocsPage
[ ] Semantic boundaries          → SemanticUsage (or Usage until promotion)
[ ] Each approved variant once   → Variants (or VariantsAndSizes)
[ ] Each approved size + hierarchy → Sizes (or VariantsAndSizes)
[ ] Required states + a11y       → StatesAndAccessibility
[ ] Consumer composition rules   → Composition (distinct types when applicable)
[ ] Prohibited + alternative     → DoAndDoNot
[ ] Controls ⊆ evidence axes     → meta.argTypes + controls.include
[ ] Docs page from evidence only → contractDocsParameters(evidence, Title)
```

## Usage vs SemanticUsage + coverage families

| Family | Semantic story |
|--------|----------------|
| Split-axis | **SemanticUsage** only |
| Standard Phase-1 (`VariantsAndSizes`) | **Usage** only |

Read `apps/storybook/__tests__/story-coverage.test.ts` before renaming.

## Enforceable tests (agent procedures)

### Single-scroll-owner

```text
1. Open Table implementation.
2. Confirm overflow-x-auto owner.
3. Grep story for overflow-x-auto|role="region"|tabIndex near Table wrappers.
4. FAIL if story adds a second owner.
```

### Title-ownership

```text
1. Open title slot implementation.
2. Branch: heading/asChild vs plain div.
3. FAIL nested h* inside plain title wrappers.
```

### Contract-control sync

```text
1. Read evidence.variants / evidence.sizes.
2. Compare meta.argTypes options and controls.include.
3. FAIL extras or missing required interactive axes the suite exposes.
```

### Non-interactive root (Card and analogues)

```text
1. Grep Overview/Composition for onClick|role="button"|tabIndex on Card root.
2. FAIL interactive Card roots; require Button/Link children.
```

## Hard rejects (full list)

- Flat gallery Overview; StatusBadge on every aggregate
- StatusBadge as count/category/tag/filter; Badge as lifecycle
- Story axes outside evidence; Docs hardcoding meaning
- Hand-duplicated ownership/purpose outside contract/Docs projection
- Mechanical double borders; primary actions in CardAction
- Nested headings in plain title `div`s; clickable Card roots
- Story-local mock barrel duplicates; helper-dominated Overview
- Benchmark Overview as centred toy / CVA matrix
- Nested Storybook titles; second Table scroll owner
- USD vs sibling MYR inconsistency (unless domain requires otherwise)
- Studio DNA or product-route mounts
- Both `Usage` and `SemanticUsage`; `Usage` after split axes

## Related farms

- `storybook-story-writing` — CSF3 mechanics
- `technical-writing` — internal-guide prose for contracts/Docs descriptions
- `afenda-elite-ui-compose` — product compose + StatusBadge contract
- `shadcn-ui` — primitive ownership / future heading APIs
- `afenda-focused-verification` — check selection
