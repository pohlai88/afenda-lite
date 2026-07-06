# S2 — Portal UI shell and copy doctrine

| Field | Value |
|-------|-------|
| **Status** | shipped |
| **Sequence** | 3 (parallel with S3 after S1) |
| **Depends on** | S1 |
| **Feeds into** | All UI slices |

## Purpose

Consistent layout, terminology, and accessibility across operator and client surfaces.

## Inputs / outputs

- **Inputs:** `lib/portal-copy.ts`
- **Outputs:** Branded pages; no hardcoded user strings in components

## Owned files

- `components/portal-*.tsx`
- `components/ui/*`
- `docs/portal-writing.md`

## Critical control points

- Copy changes only in `portal-copy.ts`
- UI must not embed business rules

## Failure modes

- Terminology drift (`survey`, `admin`, `operator` in user-facing UI)

## Required tests

- Grep gate: banned terms absent from `components/` (CI script in S13)

## Acceptance proof

- [ ] Build passes
- [ ] Dashboard and client surfaces use declaration/client/submission language
- [ ] No inline marketing or help copy in components

## Rollback

Revert `portal-copy.ts` changes only.

## Drift risk

Hardcoded strings in new components instead of `portalCopy`.
