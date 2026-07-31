# `@afenda/cache` kernel contract

`@afenda/cache` is the canonical owner of cache namespaces, structured key construction, TTLs, L1/L2 selection, JSON serialization, tag invalidation, backend failure normalization, and the private Upstash prefix. The permanent production surface is the package-root `cache` capability; `/testing` provides isolated stores without weakening production types.

Consumers submit organization or user identity facts to a named key operation. They never construct raw keys or tags, select TTLs or backends, encode entries, inspect stores, scan Redis, or interpret Upstash failures. L1 and L2 use the same JSON round-trip so backend selection cannot change value semantics.

The package uses L1 plus Upstash L2 when credentials exist, permits L1-only outside production, and fails closed with canonical `SERVICE_UNAVAILABLE` in production without Upstash. Invalid keys or non-JSON values normalize to `VALIDATION_ERROR`. `@afenda/cache:v1:` is private and prefix-scoped deletion is the only bulk-delete behavior; `FLUSHDB` is forbidden because rate limiting shares the vendor instance without sharing cache semantics.

There is no historical alias ledger because cache keys are ephemeral internal data. The final cutover deletes the public manager, backend resolver, raw key/TTL tables, L2 types, pattern invalidation, cursor helpers, batch loader, and request deduplicator. Contract fixtures and `check:cache-boundary` prevent those surfaces from returning.
