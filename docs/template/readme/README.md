# README template kit

Hand-copy workflow for package and folder `README.md` files.

Method after fill: [`afenda-readme-diataxis`](../../../.cursor/skills/afenda-readme-diataxis/SKILL.md) (QUALITY ORDER + README Score).
Kit ownership: [`afenda-doc-template-kits`](../../../.cursor/skills/afenda-doc-template-kits/SKILL.md).

## Files

| File | Use when |
| --- | --- |
| [`package.readme.template.md`](./package.readme.template.md) | `packages/**/README.md` for an `@afenda/*` package |
| [`folder.readme.template.md`](./folder.readme.template.md) | Non-package tree (e.g. `governance/README.md`) |

## Steps

1. Copy the matching template to the target as `README.md`.
2. Fill every `{{TOKEN}}` from on-disk facts (`package.json`, root engines, real commands).
3. Omit sections that do not apply.
4. Run `pnpm check:readme`.
5. Complete Diátaxis QUALITY ORDER + README Score.

## Do not

- Add a README generator under this kit
- Deep-import guidance (`@afenda/*/src/...`)
- Absolute local disk paths in consumer-facing READMEs
- Duplicate Living ARCH / Decision locks — link instead
