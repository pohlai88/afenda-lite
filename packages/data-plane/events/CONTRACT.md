# `@afenda/events` kernel contract

`@afenda/events` is the canonical owner of the event registry, envelope validation, serialization, outbox lifecycle, and atomic claim policy. The permanent production surface is the package-root `events` capability. `@afenda/events/schemas` is the client-safe, pure schema projection derived from the same registry; it is not a second event registry or operational facade.

Producers declare a registered event type, its canonical source module, and payload. The registry validates those declarations at ingress. Consumers do not construct stores, mutate outbox rows, serialize envelopes, or interpret lifecycle transitions. Application composition injects handlers into `events.dispatcher.create`; domain packages never own the handler map.

Claims transition `pending` rows to `processing` atomically with `FOR UPDATE SKIP LOCKED`, a bounded lease, an opaque claim token, and a registry-owned attempt ceiling. Completion and failure require the matching organization, processing state, and token. Expired processing leases may be reclaimed; a missing handler fails visibly for operator retry without exposing lease state to the handler envelope.

The outbox is tenant-scoped. Historical persisted envelopes remain readable through the canonical deserializer when their registered type and payload remain valid. There is no event-name alias ledger today; introducing a historical event name must add an ingress-only alias that normalizes to one canonical type, never a second handler or schema.

The final cutover deletes public store factories, store types, standalone publishers, dispatchers, query functions, ID helpers, and direct operational subpaths. Contract fixtures and `check:events-boundary` prevent those surfaces and package-owned handler composition from returning. Same-transaction ERP outbox statements remain producer adapters and must carry registry-owned event types; consolidating those statements belongs to each ERP cutover because changing their transaction boundary here would weaken atomicity.
