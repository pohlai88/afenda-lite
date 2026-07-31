# `@afenda/search` kernel contract

`@afenda/search` is the canonical owner of product search-document entities, validation, Unicode/whitespace normalization, sensitive-metadata filtering, PostgreSQL full-text projection, ranking, stable ordering, and projection lifecycle. The permanent production surface is the package-root `search` capability.

Producers select an entity from `search.entities` and submit source facts. They do not invent entity strings, construct search vectors, choose dictionaries or ranking weights, sanitize metadata, access stores, or interpret persistence failures. Search documents are tenant-scoped derived projections: producers may upsert, rebuild, list IDs for pruning, and delete through the capability; source records remain authoritative.

Title terms use PostgreSQL weight A, descriptions use weight B, queries use the registry-owned English dictionary and cover-density rank, and ties order by `documentId`. The memory testing capability implements the same ordering priorities. Normalization applies NFKC, collapsed whitespace, nullable empty descriptions/URLs, and recursive sensitive-key removal before persistence.

`@afenda/search/testing` is an authorized test-only capability, not a production API. It exports `searchTesting.createMemory()` and never exposes the memory store class or store injection. Repository checks reject production imports of `/testing`.

There is no historical entity alias ledger today. Any future rename must normalize at ingress to one canonical entity and preserve reads/rebuild behavior without exposing the alias for new construction.
