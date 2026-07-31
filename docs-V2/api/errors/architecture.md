# Error kernel architecture

`@afenda/errors` is the single semantic owner for shared failure behavior.

Its authored registry owns canonical codes, message keys, public copy policy,
typed public details, retry policy, HTTP status, operational classification,
diagnostic policy, and OpenAPI metadata. TypeScript types and runtime
projections derive from that registry.

The permanent package-root surface contains five frozen capability objects:
`errorResult`, `errorIngress`, `errorProject`, `errorWire`, and
`errorOpenApi`. Implementation modules remain private.

`Failure<C>` is opaque and package-owned. Construction creates a frozen public
shell backed by private runtime identity. Only trusted failures can be projected
directly. Unknown objects, cross-realm values, and wire data enter through
normalization.

The flow is:

```text
known outcome -> errorResult
unknown/vendor input -> errorIngress -> opaque Failure
opaque Failure -> errorProject / errorWire
registry -> runtime types, HTTP, retry, diagnostics, wire, OpenAPI
```

Historical aliases exist only in the private ingress ledger and normalize
immediately to canonical codes. Current serialization emits one wire version.

PostgreSQL classification is exhaustive for the reviewed SQLSTATE set. No
consumer receives the table or parser.

Domain-specific outcomes remain owned by their domain packages and normalize to
canonical failures at their public boundary.
