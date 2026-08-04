# AGENTS template kit

Hand-copy stubs for agent instruction files. Nearest `AGENTS.md` wins on conflict
for that package. Do not fork root doctrine into package files.

Kit ownership: [`afenda-doc-template-kits`](../../../.cursor/skills/afenda-doc-template-kits/SKILL.md).
Living root contract: [`AGENTS.md`](../../../AGENTS.md).

## Files

| File | Use when |
| --- | --- |
| [`agents.root.template.md`](./agents.root.template.md) | Shape reference when reviewing or proposing root `AGENTS.md` changes — **diff against living root**; never blind-replace without an explicit order |
| [`agents.package.template.md`](./agents.package.template.md) | New package-local `AGENTS.md` with **deltas only** |

## Steps

1. Copy the package stub to `packages/<…>/AGENTS.md` (or app path) when package-specific rules are required.
2. Fill `{{TOKEN}}` values; keep the file short.
3. Link root `AGENTS.md` for PREFLIGHT, coding floor, and farm routing — do not restate them.
4. Prefer Biome + `@afenda/config` — do not invent Prettier/ESLint stacks.

## Do not

- Teach Prettier, Changesets, or non-Afenda package managers as defaults
- Paste the full skill catalog into a package `AGENTS.md`
- Replace living root `AGENTS.md` from the root shape stub without an explicit user order
