# `packages/erp` PRD kit

| Field | Value |
| --- | --- |
| Kit | `packages/erp` product-requirements and delivery authority |
| Status | Reusable normative template kit |
| Parent governance | `packages/KERNEL-GOVERNANCE.md` |
| Cross-layer governance | `docs/architecture/ERP-WEB-GOVERNANCE.md` |
| Applies to | Every new or materially revised `packages/erp/<module-id>` package |
| Default package pattern | Feature-first modular monolith |
| Default web mirror | `apps/web/features/<module-id>/<feature-group>/<feature>` |

## 1. Purpose

This kit turns an accepted ERP concept into an executable delivery contract:

```text
business problem
  → domain architecture
  → module PRD
  → feature PRDs
  → development roadmap
  → implementation slices
  → operation registries
  → database and facade implementation
  → mirrored web capability
  → closure evidence
```

It prevents three failure modes:

1. **Documentation without behavior** — a package cannot claim progress from files, tables, or prose alone.
2. **Behavior without ownership** — every term, operation, mutation table, event, and workflow has one owner.
3. **Implementation without closure** — every completed slice carries reproducible evidence against its write set and acceptance criteria.

## 2. Kit contents

| File | Purpose |
| --- | --- |
| `ERP-FAMILY-PRD.md` | Product requirements governing the complete ERP package family |
| `MODULE-PRD-TEMPLATE.md` | Required PRD for one `packages/erp/<module-id>` package |
| `FEATURE-PRD-TEMPLATE.md` | Required feature-level product and behavior contract |
| `IMPLEMENTATION-SLICES-TEMPLATE.md` | Executable slice sequence, eligibility, write set, and closure rules |
| `DEVELOPMENT-ROADMAP-TEMPLATE.md` | Module roadmap and phase-exit authority |
| `OPERATION-REGISTRY-SPEC.md` | Canonical operation ownership and derived projections |
| `ACCEPTANCE-EVIDENCE-MATRIX.md` | Evidence requirements across package, DB, and web |
| `DIRECTORY-AUTHORITY.md` | Permanent backend and mirrored web directory rules |
| `PRD-VALIDATION-CHECKLIST.md` | Approval preflight and anti-placeholder checks |
| `module-admission.template.yaml` | Machine-readable module admission record |
| `feature-admission.template.yaml` | Machine-readable feature admission record |

## 3. Authority order

For one ERP module, the authority order is:

1. Kernel and ERP/web governance.
2. Accepted module domain architecture.
3. Accepted module PRD.
4. Accepted feature PRDs.
5. Accepted development roadmap.
6. Current eligible implementation slice.
7. Feature-owned `operation-registry.ts`.
8. Derived package manifest, catalogs, and documentation.
9. Implementation and evidence.

A lower surface cannot add product meaning absent from a higher surface.

## 4. Required use

### New module

1. Complete `module-admission.template.yaml`.
2. Write and approve the domain architecture.
3. Instantiate `MODULE-PRD-TEMPLATE.md`.
4. Create one `FEATURE-PRD-TEMPLATE.md` per admitted feature.
5. Complete the roadmap and implementation slices.
6. Scaffold only the first eligible slice.
7. Close each slice before starting an ineligible successor.

### Existing module

1. Inventory current features, operations, tables, consumers, and routes.
2. Classify each as accepted, legacy, orphaned, duplicated, or missing.
3. Reconstruct the module PRD from current accepted product authority.
4. Record gaps rather than silently legitimizing accidental implementation.
5. Create migration slices that preserve public behavior while converging ownership.

## 5. Completion language

Use only these terms:

| Term | Meaning |
| --- | --- |
| `ABSENT` | Required capability is not implemented |
| `SCAFFOLDED` | Ownership and executable structure exist |
| `IMPLEMENTED` | Required behavior exists |
| `VERIFIED` | All applicable requirements pass with evidence |
| `BLOCKED` | A named external prerequisite prevents closure |
| `NOT_APPLICABLE` | A machine-resolved trigger is false |
| `ACTIVE` | A separately approved rollout decision enabled the capability |

Avoid ambiguous claims such as “mostly done,” “production ready,” “complete except testing,” or “governance complete” when the behavior is absent.

## 6. Permanent path rule

```text
packages/erp/<module-id>/src/features/<feature-group>/<feature>/
apps/web/features/<module-id>/<feature-group>/<feature>/
```

The feature group is part of the permanent business taxonomy. It is not an optional folder used only when convenient.
