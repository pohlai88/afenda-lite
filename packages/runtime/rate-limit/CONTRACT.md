# `@afenda/rate-limit` kernel contract

`@afenda/rate-limit` is the canonical owner of quota policies, bucket-specific key construction, opaque quota decisions, bounded reset/retry timing, backend selection, and Upstash normalization. The permanent production surface is the root `rateLimit` capability; `/testing` only constructs opaque decisions for consumer tests.

Consumers submit identity facts and branch only on `decision.ok`. They request failure, quota, and diagnostics through `rateLimit.project`; they never construct keys, read decision metadata, copy quota fields, calculate retry timing, select a store, or normalize vendor output.

`@afenda/http` owns safe `X-RateLimit-*` serialization. `@afenda/errors` owns canonical error codes, status/body/retry policy, and `Retry-After`. The quota projection is transport-neutral and structurally accepted by the HTTP capability, so neither package gains a new dependency.

There is no historical alias ledger because bucket names and identity inputs are in-process capability values, not persisted wire identifiers. The cutover deletes flat functions, public policy registries, public stores/backend resolution, raw quota results, retry helpers, and consumer-owned key construction. Compile-time fixtures and `check:rate-limit-boundary` prevent their return.
