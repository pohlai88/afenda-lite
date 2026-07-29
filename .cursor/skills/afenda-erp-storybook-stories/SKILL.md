---
name: afenda-erp-storybook-stories
description: >-
  Orchestrate Afenda `@afenda/ui-system` Storybook suites with metadata
  contracts: CSF3 story writing, contract↔story sync, ContractDocs internal
  guides, ERP evidence levels (benchmark/governed/primitive), hierarchical
  Overviews, Card compositions, sparse StatusBadge, title/scroll ownership.
  Use when authoring or upgrading apps/storybook stories, editing
  packages/surfaces/ui-system/src/metadata/contracts, wiring
  contractDocsParameters, fixing story-coverage drift, or when the user asks
  for ERP Storybook quality, contract evidence, or story/metadata
  synchronization.
---

# Afenda ERP Storybook stories

**Doctrine:** Metadata defines what a component means. Storybook demonstrates only permitted ERP patterns. Play tests prove behaviour. Coverage tests prevent undocumented usage. Contract Docs render the contract as an internal guide — never a second SSOT.

**Orchestra (binding load order)**

| Layer | Skill / surface | Owns |
|-------|-----------------|------|
| CSF3 mechanics | vendor `storybook-story-writing` | Meta/StoryObj, args, decorators, play shape |
| Contract prose | vendor `technical-writing` (`internal-guide` mode) | Clause clarity in `*.contract.ts` · Docs page scanability |
| ERP evidence + sync | **this skill** | Levels, Overview hierarchy, contract↔story matrix, verify |

Product screens stay on `afenda-elite-ui-compose`. Never mount Storybook into product routes.

**Canonical suites**

| Level | File | Proves |
|-------|------|--------|
| Benchmark | `apps/storybook/src/stories/status-badge.stories.tsx` · `button.stories.tsx` | Sparse status · command hierarchy |
| Governed | `apps/storybook/src/stories/card.stories.tsx` | Hierarchical workbench · summary/record/exception |

```text
LOAD:
  this SKILL.md · reference.md
  storybook-story-writing
  technical-writing (internal-guide only — contract clauses + Docs sections)
  packages/surfaces/ui-system/src/metadata/contracts/<component>.contract.ts
  apps/storybook/src/stories/<component>.stories.tsx
  apps/storybook/src/stories/contract-docs.tsx · evidence.tsx
  apps/storybook/__tests__/story-coverage.test.ts
  primitive implementation · @afenda/ui-system barrel
  status-badge + button (benchmark) · card (governed)
  afenda-elite-ui-compose (CORRECT-COMPONENT · StatusBadge vs Badge)
SKIP:
  mounting Storybook into product routes · Studio DNA into apps/storybook
  beauty / marketing dashboards · decorative chart walls
  inventing parallel MetricCard / StatusBadge / tokens in stories
  requiring a full control centre for every primitive
  flat N-card state galleries as governed Overview
  hand-duplicating contract clauses in stories or Docs pages
  exporting metadata contracts from the ui-system barrel
  Living docs/ ARCH bodies as contract SSOT
  MVP / shim / park language in contracts or stories
```

Announce: `I'm using afenda-erp-storybook-stories with storybook-story-writing (+ technical-writing for contract prose) — syncing metadata contract and Storybook evidence.`

## Authority chain (binding)

```text
defineManifestContract (*.contract.ts)
  → catalog registration / requiredStates / family
  → virtual:afenda-storybook-evidence (build-time projection)
  → contractEvidence("ui.<id>") in *.stories.tsx
  → stories + play = approved usage evidence
  → contractDocsParameters(evidence, Title) = Docs internal guide
  → story-coverage.test.ts = sync gate
```

| Surface | Role |
|---------|------|
| `packages/surfaces/ui-system/src/metadata/contracts/*.contract.ts` | **Meaning SSOT** — purpose, ownership, variants, sizes, rules, a11y, prohibited |
| `virtual:afenda-storybook-evidence` | Frozen projection — do not edit by hand |
| `apps/storybook/src/stories/*.stories.tsx` | **Approved usage evidence** — demonstrate only what the contract allows |
| `contract-docs.tsx` | Renders evidence — never hardcode purpose/variants/rules |
| `__tests__/story-coverage.test.ts` | Enforces wiring, exports, controls, Docs structure |

**Button (and peers):** metadata contract defines semantics; the private Storybook suite is the authoritative approved-usage evidence. Product code must pick a demonstrated pattern — or add the pattern to Storybook with the contract in the same change.

## Sync orchestra (binding)

Always classify the change first:

| Intent | Edit order | Forbidden |
|--------|------------|-----------|
| **Meaning change** (new variant, rule, ownership, prohibited) | 1) `*.contract.ts` → 2) stories (map clauses) → 3) coverage allow-lists → 4) visual if Overview changed | Story-only “new meaning”; Docs-only clause text |
| **Evidence change** (better ERP Overview, play, Do/Don’t demos) | 1) stories (± play) → 2) coverage if exports renamed → 3) visual if Overview changed | Inventing variants/sizes/controls not in evidence |
| **Docs chrome** (ContractDocs layout/a11y) | `contract-docs.tsx` + storybook.css + coverage assertions | Embedding component-specific rules in the Docs template |

### Sync checklist (copy per component)

```text
[ ] contractEvidence("ui.<id>") matches defineManifestContract component id
[ ] contractDocsParameters(evidence, "<Title>") on meta.parameters
[ ] argTypes options ⊆ evidence.variants / evidence.sizes (never extras)
[ ] controls.include only approved interactive axes
[ ] Every approved variant appears exactly once in Variants (or VariantsAndSizes)
[ ] Every approved size appears with hierarchy explanation
[ ] requiredStates visibly covered in StatesAndAccessibility
[ ] Each semanticBoundaries + rules clause maps to SemanticUsage/Usage or DoAndDoNot
[ ] prohibitedUsage each has a DoAndDoNot contrast
[ ] Story docs descriptions paraphrase evidence — do not contradict or invent
[ ] No hand-copied purpose/ownership tables outside ContractDocsPage
[ ] story-coverage + story play + lint + typecheck green
```

### technical-writing slice (when necessary)

Use `technical-writing` only as **`internal-guide`** for:

- Contract clause prose (`purpose`, `meaning`, `allowedWhen`, `prohibitedWhen`, `rules`, `accessibility`)
- Story `docs.description.story` lines that explain ERP intent

Do **not** stretch into Living ADR/spec/runbook modes, `apps/docs` publishing, or product marketing copy.

Clause rules (compact):

- One decision or constraint per clause; name the operator outcome
- Prefer concrete ERP verbs (Approve, Void, Post) over vague UI words (Click, Nice)
- Label assumptions only when the contract cannot yet decide
- Keep Docs page sections stable — content comes from evidence, not rewritten narratives

## Canonical workflow

```text
1. Read storybook-story-writing (CSF3).
2. Read this skill (+ reference.md for recipes / sync matrix).
3. If editing meaning or clause prose → load technical-writing (internal-guide).
4. Read *.contract.ts THEN the story suite THEN story-coverage.
5. Classify suite: benchmark | governed | primitive.
6. Apply sync orchestra for the change intent.
7. Replace gallery / abstract Overview with hierarchical ERP evidence.
8. Map every contract clause to a story (matrix below).
9. Wire Docs via contractDocsParameters(evidence) — never duplicate SSOT.
10. Verify: stories · coverage · lint · typecheck · visual if Overview changed.
```

## Evidence levels (binding)

Not every component needs a full administrative control centre.

| Level | Components | Overview expectation |
|-------|------------|----------------------|
| **Benchmark** | StatusBadge, Button, DataTable, MetricCard, FilterBar, Dialog | Full operational ERP composition |
| **Governed** | Card, Alert, Sheet, FormField, PageHeader | Focused **hierarchical** ERP workbench (2–4 sections, distinct jobs) |
| **Primitive** | Separator, Skeleton, Tooltip, Avatar | Compact realistic composition |

### Proportional operational questions

```text
What requires attention?
What is financially material?
What is blocked?
What is unhealthy?
What completed successfully?
```

| Level | How to apply |
|-------|----------------|
| Benchmark | Multi-region composition for the primitive’s domain |
| Governed | Hierarchical sections — summaries ≠ records ≠ exceptions ≠ quiet complete |
| Primitive | Single realistic placement — no fake admin dashboard |

Do **not** open with decorative charts, growth percentages, CVA matrices, or a **flat gallery of the same layout with different statuses**.

## Governed Overview hierarchy (binding)

```text
Operational summary
→ restrained aggregate subjects (no lifecycle badges by default)

Priority / detailed subject
→ one rich record or primary surface

Exception
→ one consequence + recovery surface

Completed / quiet state (optional)
→ visible but lower visual weight; no intervention theatre
```

Reject: 2×2 identical Record Cards that only swap StatusBadge labels.

## Composition types (Card; apply by analogy)

A Card means: **one independently meaningful subject, bounded for comprehension and composition.**

| Composition | Purpose |
|-------------|---------|
| **Summary** | One aggregate metric or operational fact |
| **Record** | One named business record with metadata and action |
| **Exception / Decision** | One issue or approval with consequence and next action |

Owns: visual boundary, spacing, header/content/footer, contextual actions, collection consistency.  
Does **not** own: lifecycle meaning, navigation, permissions, workflow decisions, entire-row clicks, overlay elevation.

## Chrome restraint

| Topic | Rule |
|-------|------|
| Borders | Zone borders only when zones are distinct. Summaries: usually none |
| Elevation | Ordinary groups: `shadow-none` |
| Status colour | Sparse. StatusBadge only when state changes operator duty |
| Badge vs StatusBadge | Badge = taxonomy. StatusBadge = authoritative lifecycle |
| Title ownership | Plain title `div` → text + `id` + `aria-labelledby`; never nest `<h2>` inside |
| Action slots | Compact contextual only — not primary workflow buttons |
| Footer priority | left: nav/low · right: workflow — or right-aligned decision pair |
| Tables | Queues / audit → `Table` / `DataTable` |
| Currency / copy | Prefer **MYR**; labels name the **business condition** |
| Imports | `@afenda/ui-system` barrel only |

### StatusBadge contract (benchmark doctrine)

```text
StatusBadge presents authoritative state.
It never invents state.
It never substitutes for taxonomy.
It never names colour.
It never stacks synonyms.
It remains adjacent to the business record or dimension it describes.
```

## Contract → story traceability (binding)

| Story | Required evidence |
|-------|-------------------|
| Overview | Purpose, ownership, operational composition **with hierarchy** |
| SemanticUsage | Semantic boundaries and usage rules |
| Variants | Every approved variant exactly once |
| Sizes | Every approved size with hierarchy explanation |
| StatesAndAccessibility | Required states and accessibility clauses |
| Composition | Consumer-owned composition rules **and** distinct composition types |
| DoAndDoNot | Prohibited usage and correct alternative |

## Usage vs SemanticUsage (deterministic)

| Export | When required |
|--------|----------------|
| **`SemanticUsage`** | Split `Variants` + `Sizes` |
| **`Usage`** | Combined `VariantsAndSizes` / standard family |

Never both. On split promotion, rename `Usage` → `SemanticUsage` and update coverage allow-lists in the same change.

Other CSF3 rules: one visual Overview; flat `UI System/<Name>`; `contractEvidence` + `evidenceDescription`; living allow-lists in `story-coverage.test.ts`.

## Enforceable ownership tests

**Single-scroll-owner:** do not wrap `Table` with a second `overflow-x-auto` / `tabIndex` / region when the primitive already owns scroll.

**Title-ownership:** read the title slot; plain `div` → no nested headings; landmarks own real `h1`/`h2`.

## Hard rejects

- Flat gallery Overview; StatusBadge on every aggregate; Badge as lifecycle
- Story args/controls exposing contract-prohibited variants or sizes
- Hand-duplicated contract meaning outside `*.contract.ts` / ContractDocsPage
- Docs page hardcoding component-specific clauses instead of `evidence`
- Both `Usage` and `SemanticUsage`; nested Storybook titles; second Table scroll owner
- Studio DNA / product-route mounts; story-local mock barrel duplicates
- Primary workflow actions in CardAction; nested headings in plain title wrappers

## Done checklist

- [ ] Change intent classified; sync orchestra order followed
- [ ] Contract and stories agree (variants/sizes/states/prohibited)
- [ ] Level classified; exemplar for that level reviewed
- [ ] Overview hierarchical; composition types distinct
- [ ] Title-ownership + single-scroll-owner passed
- [ ] Contract → story matrix covered; Docs wired via evidence
- [ ] `Usage` / `SemanticUsage` rule matched
- [ ] Hard-reject list clean
- [ ] Verify green; visual baseline only if approved Overview changed

## Score

```text
ERP Story Score: NN%
Level: benchmark | governed | primitive
Sync: contract↔story PASS | FAIL (gaps…)
Gaps: …
Path to 100%: …
```

Rubric + sync matrix detail: [reference.md](reference.md).

## Verify (focused)

```bash
pnpm --filter @afenda/storybook exec vitest run --config vitest.storybook.config.ts src/stories/<component>.stories.tsx
pnpm --filter @afenda/storybook exec vitest run --config vitest.coverage.config.ts __tests__/story-coverage.test.ts
pnpm --filter @afenda/storybook lint
pnpm --filter @afenda/storybook typecheck
```

After contract edits also run the owning ui-system package checks selected by `afenda-focused-verification` (typically `@afenda/ui-system` lint/typecheck/test that cover metadata).

Visual refresh only when the approved Overview changed: `pnpm --filter @afenda/storybook test:visual:update`.
