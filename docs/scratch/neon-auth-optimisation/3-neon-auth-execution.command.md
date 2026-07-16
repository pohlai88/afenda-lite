You MUST use `/using-afenda-elite-skills` to execute the instruction below.

# EXECUTE AFENDA NEON ERP SLICE: `[SLICE_ID] — [SLICE_NAME]`

## Program posture

- Development mode: NO-MVP
- Quality bar: enterprise production
- Current slice: `[SLICE_ID]`
- Previous verified slice: `[PREVIOUS_SLICE_ID or NONE]`
- Next slice: `[NEXT_SLICE_ID]`
- Allowed scope: this slice only
- Forbidden scope: later slices, speculative Neon services, unrelated refactors

## Slice objective

[PASTE THE SLICE OBJECTIVE]

## Required outcomes

[PASTE THE REQUIRED OUTCOMES]

## Acceptance criteria

[PASTE THE ACCEPTANCE CRITERIA]

## Expected authorities

Read and apply the latest applicable versions of:

- `AGENTS.md`
- `docs/architecture/ARCH-023-multi-tenancy.md`
- `docs/architecture/ARCH-026-auth-session.md`
- `docs/guides/GUIDE-018-fullstack-e2e-integration-program.md`
- relevant ADRs;
- relevant runbooks;
- relevant package-boundary documents;
- relevant package `README`, tests and public exports.

Do not assume the listed filenames are complete. Discover additional directly applicable authorities from repository references.

## Mandatory instructions

1. Conduct a full preflight before writing.
2. Compare the slice requirements with actual repository state.
3. Reuse valid existing implementation.
4. Repair incomplete, duplicated, unstable or authority-conflicting implementation.
5. Implement the smallest complete architecture-aligned solution.
6. Do not reduce quality to close the slice faster.
7. Do not create placeholders, fake success states or permissive fallbacks.
8. Do not implement future slices.
9. Do not change controlled architecture unless the slice explicitly authorizes it.
10. Keep implementation DRY, KISS, typed and fail-closed.
11. Preserve Neon, tenancy, Auth, permission and package boundaries.
12. Add all tests required to prove the slice.
13. Run the required consuming-application build when structural behavior changes.
14. Return verified evidence rather than an implementation narrative.

## Capability-gap handling

If the slice requires a capability that does not currently exist:

- identify the correct ownership layer;
- implement it only when it is inside this slice;
- otherwise issue a bounded finding;
- do not introduce local compensation;
- do not invent backend, route, permission or UI capability.

Finding types:

- architecture gap;
- database capability gap;
- auth/session gap;
- tenancy gap;
- permission gap;
- audit gap;
- UI-CAP gap;
- product/domain gap;
- operational gap;
- external Neon limitation.

## Completion condition

This slice is COMPLETE only when:

- every acceptance criterion is implemented;
- every criterion has executable evidence;
- relevant regression tests pass;
- consuming application behavior is verified;
- no unresolved P0/P1 issue remains inside this slice;
- documentation and operations evidence required by this slice are aligned.

If any completion condition fails, return PARTIAL or BLOCKED. Do not describe it as complete.

## Required response structure

### Slice

`[SLICE_ID] — [SLICE_NAME]`

### Verdict

`COMPLETE | PARTIAL | BLOCKED | NOT STARTED`

### Load confirmation

List authorities, packages, routes, migrations and tests read.

### Before-state findings

List confirmed gaps with file evidence.

### Implementation

Explain completed work by acceptance criterion.

### Gap matrix

| ID  | Requirement | Before | After | Verification | Status |
| --- | ----------- | ------ | ----- | ------------ | ------ |

### Files changed

| File | Change | Reason |
| ---- | ------ | ------ |

### Contracts changed

| Contract | Before | After | Compatibility impact |
| -------- | ------ | ----- | -------------------- |

### Verification

| Command | Result | Evidence |
| ------- | ------ | -------- |

### Security and tenancy proof

Explain authentication, membership, authorization, tenant scope and audit behavior.

### Unimplemented findings

List findings that belong to later slices or other owners.

### Residual risks

List remaining risks and their containment.

### Completion

- Requirements total:
- Implemented:
- Verified:
- Verified completeness:
- Next authorized slice:

STOP after reporting. Do not begin the next slice.
