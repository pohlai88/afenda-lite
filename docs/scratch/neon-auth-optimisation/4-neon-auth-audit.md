You MUST use `/using-afenda-elite-skills` to execute the instruction below.

# VERIFY AND CLOSE SLICE: `[SLICE_ID] — [SLICE_NAME]`

This is an independent closure audit.

Do not trust the previous implementation summary. Verify the repository directly.

## Required work

1. Reload the applicable architecture, package and program authorities.
2. Read the slice acceptance criteria.
3. Inspect every file changed for this slice.
4. Inspect neighboring callers and consumers.
5. Verify that no later-slice scope was implemented.
6. Verify that no required behavior was deferred behind placeholders.
7. Verify that no silent fallback weakens security, tenancy or data integrity.
8. Run all applicable tests and builds.
9. Check for:
   - duplicate implementation;
   - dead compatibility code;
   - accidental public API change;
   - missing migration or index;
   - cross-tenant access risk;
   - missing permission enforcement;
   - incomplete audit evidence;
   - incorrect server/client boundary;
   - unsafe redirect;
   - raw environment access;
   - unverified operational assumptions.

10. Recalculate completeness from evidence only.

## Closure rules

Return `APPROVED` only when:

- all acceptance criteria are verified;
- all required tests pass;
- the consuming application passes;
- no P0/P1 finding remains within the slice;
- architecture and implementation agree;
- no unauthorized future scope was introduced;
- rollback or failure behavior is understood.

Otherwise return:

- `REJECTED — REPAIR REQUIRED`, or
- `BLOCKED — EXTERNAL DEPENDENCY`.

## Required output

### Closure verdict

`APPROVED | REJECTED — REPAIR REQUIRED | BLOCKED — EXTERNAL DEPENDENCY`

### Acceptance evidence matrix

| Criterion | Implementation evidence | Test evidence | Verdict |
| --------- | ----------------------- | ------------- | ------- |

### Drift findings

| Finding | Severity | Owner | Required repair |
| ------- | -------- | ----- | --------------- |

### Scope-control findings

State whether later-slice work or unrelated refactoring entered the change.

### Security proof

Confirm:

- session handling;
- role and permission handling;
- hard tenancy;
- redirect safety;
- secret handling;
- auditability.

### Database proof

Confirm:

- migration integrity;
- indexes and constraints;
- pooled connection assumptions;
- rollback/recovery effect.

### Verification commands

List commands and actual outcomes.

### Verified completeness

Calculate from acceptance criteria, not changed file count.

### Authorization

If APPROVED:

- close `[SLICE_ID]`;
- authorize `[NEXT_SLICE_ID]` as the next available slice;
- do not execute it.

If rejected:

- provide one bounded repair command for `[SLICE_ID]`;
- do not authorize the next slice.
