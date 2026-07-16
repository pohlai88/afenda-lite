You MUST use `/using-afenda-elite-skills`.

# REPAIR SLICE: `[SLICE_ID] — [SLICE_NAME]`

Repair only the closure findings listed below.

## Closure findings

[PASTE THE REJECTED FINDINGS]

## Rules

- Do not reopen already verified requirements.
- Do not refactor unrelated code.
- Do not implement the next slice.
- Repair root causes, not symptoms.
- Preserve public contracts unless the finding requires a controlled atomic migration.
- Add regression tests for every repaired defect.
- Re-run the complete slice verification set, not only the failing test.
- Return an updated acceptance-evidence matrix.

## Required output

1. Findings repaired
2. Root cause
3. Files changed
4. Tests added or changed
5. Full verification evidence
6. Remaining findings
7. Updated verified completeness
8. Readiness for independent closure audit

STOP. Do not self-approve the slice.
