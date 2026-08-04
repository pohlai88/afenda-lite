# Afenda package README template kit

Scaffold and refresh private `@afenda/*` package READMEs. This kit **orients**;
it does not own Living DOC-001 spines or product SSOT.

Flat layout (no nested folders):

| File | Role |
| --- | --- |
| [`readme.template.md`](./readme.template.md) | Marker-driven template |
| [`generate.readme.ts`](./generate.readme.ts) | Fills AUTO markers from `package.json` |
| [`quickstart.ts`](./quickstart.ts) | Embeddable example (replace before ship) |
| [`README.md`](./README.md) | This kit guide |

## Generate

```bash
pnpm exec tsx docs/template/readme/generate.readme.ts --package packages/foundation/errors
```

Drift check (CI / pre-merge):

```bash
pnpm exec tsx docs/template/readme/generate.readme.ts --package packages/foundation/errors --check
```

## Rules

1. Hand-write **Why / status / boundaries / authority** outside AUTO markers.
2. Consumers import `@afenda/<name>` (declared `exports` only) — never `../packages/...` or `@afenda/*/src/...`.
3. Script tables use `pnpm --filter <name> <script>` — never invent root `npm run` for workspace packages.
4. After generation, run `pnpm check:readme` and finish Diátaxis prose via `afenda-readme-diataxis`.
5. Do not restore retired `docs/erp/**`, `docs/kernel/**`, or `docs/_scratch/**` from this kit.
