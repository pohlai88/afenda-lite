# Documentation templates

Markdown-only kits for standardized Afenda README and AGENTS surfaces.
**Hand-copy** into the target path, fill `{{TOKEN}}` placeholders, then verify.

| Kit | Path | Skill |
| --- | --- | --- |
| Package / folder README | [`readme/`](./readme/README.md) | [`afenda-doc-template-kits`](../../.cursor/skills/afenda-doc-template-kits/SKILL.md) then [`afenda-readme-diataxis`](../../.cursor/skills/afenda-readme-diataxis/SKILL.md) |
| Root / package AGENTS | [`agents/`](./agents/README.md) | [`afenda-doc-template-kits`](../../.cursor/skills/afenda-doc-template-kits/SKILL.md) |

## Rules

1. Templates **orient**. They are not Living DOC-001 SSOT.
2. No generator scripts in this tree (markdown-only). Do not dump kit scripts into root `scripts/`.
3. Enterprise production quality bar only — no MVP framing.
4. Allowed under `docs/template/`: `readme/**` and `agents/**` only.
5. Placement gate: `.cursor/hooks/directory-local-scripts.mjs` · rule `directory-local-scripts`.
