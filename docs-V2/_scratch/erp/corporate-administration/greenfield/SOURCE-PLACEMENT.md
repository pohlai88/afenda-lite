# Source Placement

The generated bundle mirrors the recommended repository paths.

## Documentation authority

Copy:

```text
docs-V2/_scratch/erp/corporate-administration-greenfield/
```

to the same path in the Afenda repository.

This is initially Scratch authority. Promote or link it through the repository’s documentation-governance process before treating it as Living authority.

## Package README

Copy:

```text
packages/erp/corporate-administration/README.md
```

when scaffolding the new package. Keep its lifecycle statement accurate as slices are delivered.

## Suggested first mission

Start with:

```text
CA-0.1 — Authority, catalog and package scaffold
```

Do not begin schema or business commands before the package manifest, module roadmap, dependency edges and ownership reservation are approved.

## Generated files

Do not hand-edit generated catalogs or manifests. Use the repository’s owning generators and then run governance validation.
