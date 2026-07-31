# HTTP kernel contract

`@afenda/http` is the canonical leaf owner of framework-neutral Fetch transport mechanics: correlation identity, bounded pagination, middleware composition, response stamping, and validated `Retry-After`, rate-limit, and timing header attachment.

The permanent consumer surface is the package-root `http` capability. Consumers carry correlation and caller-owned quota/timing values through that capability; they do not import internal functions or header registries. Pagination returns only `{ limit, offset }`; domains retain ownership of sorting and filtering.

`@afenda/errors` remains the sole owner of error-to-HTTP status, public body, retryability, and error-derived `Retry-After` projection. The HTTP kernel neither imports errors nor accepts error values. Its generic `applyRetryAfter` operation only validates and attaches caller-supplied delta seconds.

There is no historical-input alias ledger because these APIs are in-process capabilities, not persisted semantic values. The cutover deletes the stale `@afenda/errors` dependency, flat function/constant facade, duplicated auth correlation resolver, and transport-owned sorting. Contract and repository gates prevent their return.
