# Error governance

Two permanent repository gates protect the cutover.

`pnpm check:errors-boundary` enforces:

- root-only imports;
- one package export;
- no public constructors or `AppError`;
- no duplicate shared `Result`, code registry, status registry, serializer,
  normalizer, PostgreSQL parser, or shared factory;
- no forbidden dependency from schema, migration, or reusable UI layers;
- no stale documentation describing deleted surfaces.

`pnpm check:errors-semantics` combines repository analysis with the TypeScript
compiler capability inspector. It rejects identifiable manual serialization,
raw leakage, dynamic public copy, local HTTP/retry/operational maps,
PostgreSQL guessing, unsafe details, capability escape, and business
interpretation after normalization.

Allowed code carriage, endpoint code declarations, type-only contracts, and
tests are not semantic duplication.

Changes to the registry require package contract, type, runtime, hostile-input,
bundle, repository-boundary, and repository-semantic evidence.

The protection digest is refreshed only after the final repository checks are
green.
