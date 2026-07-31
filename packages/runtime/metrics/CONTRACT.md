# Metrics kernel contract

`@afenda/metrics` is the canonical owner of the metric registry, instrument names, help text, label keys, bounded label values, buckets, recording behavior, and Prometheus exposition.

The permanent production surface is the package-root `metrics` capability. Consumers report bounded HTTP, database, and cache facts through `metrics.record`; they may render exposition through `metrics.exposition`. They cannot access Prometheus registries, instruments, constructors, names, arbitrary labels, service overrides, or collection configuration.

Organization and tenant labels are prohibited. Runtime ingress rejects `organizationId`, `organization_id`, `orgId`, `tenantId`, `tenant_id`, open `labels`, and consumer-provided metric names even from untyped JavaScript callers. Route templates and remaining label facts are normalized and bounded before recording.

The `./testing` entrypoint supplies isolated capabilities and default-state reset only. It does not expose registries or instruments. There is no alias policy because these are in-process calls; the final cutover deletes the old core/node facade, registry bundle, constructors, constants, and ERP-owned metric-name declarations.
