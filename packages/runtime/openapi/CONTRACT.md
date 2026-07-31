# `@afenda/openapi` kernel contract

`@afenda/openapi` is the canonical Rank-1 leaf owner of OpenAPI schema registration, success envelopes, Afenda operation/document metadata, and document generation. The permanent universal consumer surface is the package-root `openapi` capability. Deterministic YAML emission is isolated as the same capability style at `@afenda/openapi/node`.

The package exposes operations rather than the vendor registry, generator, or definitions array. Consumers register schemas, security schemes, and paths through a narrowed registry capability; document generation always validates and stamps operation metadata and `x-afenda-document` in one projection.

`@afenda/errors` remains the sole owner of error definitions and derived status, body, header, retry, description, and OpenAPI response policy. `@afenda/openapi` has no dependency on errors. Repository composition roots import both leaves and place `errorOpenApi.responses(codes)` directly into registered path responses.

There is no historical-input alias ledger because the capability accepts in-process schemas and authored document metadata, not persisted semantic identifiers. The cutover deletes raw vendor-class exports, flat helpers, `/zod`, and the stale errors dependency. Contract tests and `check:openapi-boundary` prevent their return and reject duplicated generator error schemas.
