<!--
  Afenda package README template (SOURCE).
  Generate: pnpm exec tsx docs/template/readme/generate.readme.ts --package packages/<band>/<name>
  Check:    … --check

  Marker legend:
    <!-- AUTO:X --> … <!-- /AUTO:X -->  regenerated; hand edits inside are discarded
    Outside AUTO markers                hand-rolled; preserved

  Method: afenda-readme-diataxis (orient · link · do not fork Living SSOT).
  Boundaries: import `@afenda/<name>` only — never relative into another package.
-->

# `<!-- AUTO:NAME -->@afenda/package<!-- /AUTO:NAME -->`

<!-- AUTO:DESCRIPTION -->
One-line description from package.json.
<!-- /AUTO:DESCRIPTION -->

<!-- AUTO:TOC -->
<!-- /AUTO:TOC -->

## Who it is for

<!-- hand-rolled: consumers (apps/web Actions, approved ports). Not UI shells unless Surfaces. -->

## Requires

- Node `24.x` · pnpm `>=10.33.4` (root `package.json` engines)
- Workspace import only (`workspace:*`) — this is a private `@afenda/*` package

## Current status

<!-- hand-rolled: honest enterprise status table. No MVP framing. -->

| Surface | State |
| --- | --- |
| Public root export | _fill_ |
| Package gates | _fill_ |

## Consume

<!-- AUTO:IMPORT -->
<!-- /AUTO:IMPORT -->

### Quick start

<!-- AUTO:CODE:docs/template/readme/quickstart.ts -->
<!-- /AUTO:CODE:docs/template/readme/quickstart.ts -->

Replace the kit embed with this package's real public exports before shipping the README.

## Scripts

<!-- AUTO:SCRIPTS -->
<!-- /AUTO:SCRIPTS -->

## Boundaries

<!-- hand-rolled: Owns / Does not own. Peer ERP packages do not import each other. -->

| Owns | Does not own |
| --- | --- |
| _this package's capability_ | UI (`@afenda/ui-system` in `apps/web`), peer ERP tables, raw `process.env` |

## Authority

<!-- hand-rolled: link package docs/, KERNEL projections, ERP-SCAFFOLDING, AGENTS — do not paste Living locks -->

| Topic | Link |
| --- | --- |
| Package docs | [`docs/`](./docs/) when present |
| Kernel doctrine | [`packages/KERNEL-GOVERNANCE.md`](../../../KERNEL-GOVERNANCE.md) |
| Agent checkout | [`AGENTS.md`](../../../AGENTS.md) |

## License

<!-- AUTO:LICENSE -->
<!-- /AUTO:LICENSE -->
