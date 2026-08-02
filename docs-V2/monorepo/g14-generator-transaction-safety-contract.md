# G14 — Generator transaction safety

| Field | Value |
|-------|-------|
| Surface | `docs-V2/monorepo/g14-generator-transaction-safety-contract.md` |
| Role | Shared mutation safety contract for generator write commands |
| Authority | `turbo/generators/engine/file-transaction.ts` |
| Mode | Internal write safety primitive |
| Status | In progress until committed with passing closure gates |

G14 centralizes generator file-write safety so write-capable commands do not
each invent their own overwrite and rollback behavior.

## Transaction policies

| Policy | Meaning |
|--------|---------|
| `create` | Write only when the file does not already exist. |
| `create-or-same` | Write when missing; skip when identical; fail when different. |
| `replace-if-current` | Replace only when the existing bytes still match the expected preflight bytes. |

## Guarantees

- Write paths must be unique.
- All writes are repository-relative paths supplied by the owning generator.
- Conflicts fail before writes.
- Partial write failure triggers rollback to the captured file snapshots.
- Created files are removed during rollback.
- Replaced files are restored during rollback.

## Exclusions

- No directory cleanup.
- No recursive delete.
- No broad repository mutation.
- No semantic conflict resolution.

## Exit criteria

G14 is sealed only when:

1. G10 package creation uses the transaction utility.
2. G11 feature creation uses the transaction utility.
3. G12 projection-lock apply uses the transaction utility.
4. G13 kernel adoption apply uses the transaction utility.
5. Transaction tests prove create, skip, replace, duplicate-path rejection, and
   rollback behavior.
6. Generator tests pass.
7. TypeScript, `generator:check`, module validation, docs trunk ban, and diff
   hygiene pass.
