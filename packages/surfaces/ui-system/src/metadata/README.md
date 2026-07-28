# UI system metadata

This directory contains the build-time governance model for `@afenda/ui-system`. It keeps the owned component inventory, public barrel, semantic contracts, quality evidence, design tokens, shared surface capabilities, and ERP module coverage synchronized.

The model exists so maintainers can change the UI system without relying on an informal component list or treating visual availability as production approval. Use this README when adding or reviewing metadata; package consumers should use the public guidance in the [`@afenda/ui-system` README](../../README.md).

## At a glance

| Path | Responsibility |
|------|----------------|
| [`contract.ts`](./contract.ts) | Low-level metadata types, controlled vocabularies, and governance result shapes |
| [`catalog.ts`](./catalog.ts) | Registration, lifecycle, baseline evidence, capabilities, profiles, module coverage, and token families |
| [`contracts/manifest.contract.ts`](./contracts/manifest.contract.ts) | Mandatory authoring gateway for semantic component contracts |
| [`contracts/*.contract.ts`](./contracts) | One semantic contract per governed component |
| [`contracts/index.ts`](./contracts/index.ts) | Internal contract registration barrel |
| [`validate.ts`](./validate.ts) | Catalog drift and component-governance validation |
| [`index.ts`](./index.ts) | Internal metadata barrel |
| [`__type-tests__/`](./__type-tests__) | Compile-time checks for required manifest sections |

The locked `erp-ui-v1` catalog is the registration authority. Contract files enrich registered components; they do not form a second catalog.

## Keep the boundary intact

Metadata is internal package tooling, not a browser or consumer API. The package exposes only `@afenda/ui-system` and `@afenda/ui-system/styles.css`; do not export metadata from [`../index.ts`](../index.ts) or add a metadata package subpath.

The private `apps/storybook` startup adapter is the only downstream visual-
evidence exception: Node tooling validates this catalog and serializes a narrow,
immutable projection for Storybook. Story rendering still imports components
only from the public barrel, and the projection is not a package export or a
second registration authority.

The ownership split is:

| Layer | Owns | Does not own |
|-------|------|--------------|
| Catalog | Component registration, exact public exports, lifecycle, capabilities, profiles, evidence, and token coverage | Feature policy or business behavior |
| Semantic contract | Reusable component responsibility, consumer responsibility, semantic boundaries, approved options, accessibility, and prohibited usage | Registration, discovery, lifecycle promotion, or evidence acceptance |
| Consuming feature | Domain vocabulary, authorization, data access, workflow decisions, and persistence | Reusable component mechanics |

`defineComponentContract()` in [`contract.ts`](./contract.ts) is the low-level type helper. Ordinary component contracts must use `defineManifestContract()` so the versioned standard, normalization, non-empty clauses, duplicate detection, and immutable output are applied consistently.

## Understand lifecycle and evidence

Component governance uses four states:

| Lifecycle | Meaning enforced by the model |
|-----------|-------------------------------|
| `candidate` | Registered work under evaluation; a draft contract may be attached |
| `approved` | Requires an accepted semantic contract |
| `verified` | Requires an accepted semantic contract and baseline catalog evidence |
| `deprecated` | Requires a valid, non-deprecated replacement through `deprecatedBy` |

Baseline evidence is derived from the component's quality profile. Use `governance.evidence` only for additional component-specific proof; candidate-specific evidence produces a warning. Lifecycle promotion is a deliberate review decision, not an automatic result of creating a contract file.

Capability lifecycle is separate and uses `specified`, `implemented`, `verified`, and `deprecated`. Do not infer component approval from capability delivery, or the reverse.

## Author a component contract

Use Node `24.x` and pnpm `>=10.33.4`, as declared by the repository root.

1. Choose the nearest established contract in [`contracts/`](./contracts) as a semantic pattern.
2. Create `<component>.contract.ts` with exactly one exported contract authored through `defineManifestContract()`.
3. Set `id` to `ui.<component>.contract` and `component` to the matching catalog ID.
4. Separate the component's reusable responsibility from the consuming feature's responsibility under `ownership`.
5. State interpretations or decisions that the component must not imply under `semanticBoundaries`.
6. Cover every cataloged variant and size when `approvedVariants` or `approvedSizes` applies.
7. Register the contract in [`contracts/index.ts`](./contracts/index.ts), import it in [`catalog.ts`](./catalog.ts), and attach it in `componentGovernanceById`.
8. Keep the contract out of the package's public [`../index.ts`](../index.ts) barrel.

The required shape is:

```ts
import { defineManifestContract } from "./manifest.contract";

export const exampleContract = defineManifestContract({
	id: "ui.example.contract",
	component: "ui.example",
	purpose: "Describes the reusable presentation responsibility.",
	ownership: {
		componentOwns: ["Reusable presentation and interaction mechanics."],
		consumerOwns: ["Domain meaning, authorization, and workflow policy."],
	},
	semanticBoundaries: ["Presentation does not imply business authority."],
	rules: ["Compose the component through its public API."],
	accessibility: ["Preserve the component's semantic structure."],
	prohibitedUsage: ["Do not infer domain state from visual treatment alone."],
});
```

Each required clause collection is non-empty. Clauses are whitespace-normalized and duplicates within the same semantic section are rejected.

## Update the catalog

When a component source or public export changes, update [`catalog.ts`](./catalog.ts) in the same change:

1. Register the exact `src/components/ui/*` source and public export names.
2. Select the render mode, layer, family, capabilities, and quality profile that match the implementation.
3. Add token families only when their variables exist in both required themes.
4. Extend capability, surface-profile, or module coverage only when the shared UI outcome actually changes.
5. Point evidence to existing package test files; do not use metadata as a claim that unsupported evidence exists.

`validateUiCatalog()` compares this model with a repository snapshot and reports component, export, capability, quality, surface, module, token, boundary, and baseline drift. `validateGovernance()` separately checks semantic contract content, option parity, lifecycle requirements, deprecation replacements, and component-specific evidence.

## Inspect and verify

Print a human-readable summary or machine-readable JSON:

```bash
pnpm --filter @afenda/ui-system metadata:report
pnpm --filter @afenda/ui-system metadata:report -- --json
```

Run the focused metadata gate after every catalog or contract change:

```bash
pnpm --filter @afenda/ui-system metadata:check
```

Before handoff, run the package checks:

```bash
pnpm --filter @afenda/ui-system lint
pnpm --filter @afenda/ui-system typecheck
pnpm --filter @afenda/ui-system test
```

The executable checks live in [`../../package.json`](../../package.json). [`../../__tests__/metadata-contract.test.ts`](../../__tests__/metadata-contract.test.ts) is the integration contract for manifest authoring, internal registration, public-boundary protection, repository synchronization, lifecycle rules, evidence, and drift detection. [`../../scripts/report-ui-metadata.mts`](../../scripts/report-ui-metadata.mts) owns report output.

## Common failure modes

- A component file exists but has no catalog entry, or its cataloged exports differ from the public barrel.
- A contract is authored directly with `defineComponentContract()` instead of `defineManifestContract()`.
- A contract is created but not exported internally and attached by stable component ID.
- Contract variants or sizes do not exactly match the component metadata.
- A component is marked `approved` or `verified` without a contract.
- A deprecated component names itself, a missing component, or another deprecated component as its replacement.
- Metadata is added to the public package barrel or a new package export is introduced.

## Related guidance

- [`@afenda/ui-system` README](../../README.md) — package consumption, ownership, primitive workflow, and full verification gate
- [`AGENTS.md`](../../../../../AGENTS.md) — repository operating constraints and UI-system authority boundaries
- [`docs-V2/nextjs/ui.md`](../../../../../docs-V2/nextjs/ui.md) — product UI consumption guidance

These sources own repository and package policy. This README is the maintainer guide and navigation index for the metadata implementation only.
