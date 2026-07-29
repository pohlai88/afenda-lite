# @afenda/errors implementation review

## Verdict

The uploaded implementation was a strong kernel draft, but not end-to-end safe because `Result.fail` and `httpErrorBody` accepted unsanitized details, generic normalization depended on an infrastructure adapter, and PostgreSQL authentication errors were mapped to the caller-facing `UNAUTHORIZED` code.

## Repaired architecture

- `core/*`: codes, AppError, generic normalization, safe detail policy, serialization, retry-after.
- `adapters/postgres`: explicit duck-typed SQLSTATE mapping only.
- `common`: stable factories.
- `result`: one canonical Result wire with safe failure construction.
- `http`: status/body projection with safe details.
- root: kernel and compatibility exports only.

## Integration rule

For database catches, compose explicitly:

```ts
const mapped = fromPostgresUnknown(error);
return mapped
  ? failFromAppError(mapped)
  : failFromUnknown(error, "Unable to save the record");
```

This keeps the core leaf transport-neutral and prevents every unknown failure from being interpreted as a PostgreSQL failure.
