# Biome + Ultracite OSS best practices

**Posture:** Scratch only. Not Living, Target, Accepted, or DOC-002 registered.

**Mission date:** 2026-07-17

**Scope:** Biome + Ultracite research via GitHub MCP, Context7 Ultracite `llms.txt`, and official Biome docs. Maps OSS practice to Afenda-Lite's current `@afenda/config` + Ultracite setup.

---

## Access evidence

| Channel | Result |
|---------|--------|
| Context7 MCP | Not registered in this session |
| Context7 web artifact | Used `https://context7.com/haydenbleasel/ultracite/llms.txt` |
| GitHub MCP | Used `user-github` for Ultracite repo discovery and OSS config examples |
| Official docs | Used Biome big-projects, CI, VCS, CLI, and VS Code docs |

## Source pins

| Source | Evidence |
|--------|----------|
| Ultracite | [haydenbleasel/ultracite](https://github.com/haydenbleasel/ultracite) |
| Ultracite Context7 | `/haydenbleasel/ultracite`, `https://context7.com/haydenbleasel/ultracite/llms.txt` |
| Biome monorepos | [Use Biome in big projects](https://biomejs.dev/guides/big-projects/) |
| Biome CI | [Continuous integration recipe](https://biomejs.dev/recipes/continuous-integration/) |
| Biome VCS scoping | [Integrate with a VCS](https://biomejs.dev/guides/integrate-in-vcs/) |
| Biome VS Code | [VS Code extension reference](https://biomejs.dev/reference/vscode/) |
| OSS consumer | [udecode/plate `biome.jsonc`](https://github.com/udecode/plate/blob/main/biome.jsonc) |
| Other OSS consumers | GitHub code search found `elie222/inbox-zero`, `nexmoe/VidBee`, and Adobe commerce starter-kit using `ultracite/biome/core` patterns |

---

## Biome best practices

### Monorepo configuration

- Use a root `biome.json` / `biome.jsonc` as the base project configuration.
- Use nested configs with `root: false` + `extends: "//"` when a package needs local overrides while inheriting the root.
- Use an NPM-exported shared config when multiple packages or repositories should share one standards package. Biome supports entries such as `extends: ["@org/shared-configs/biome"]`.
- Remember that paths in shared configs resolve from the extending config location, not from the shared config package.
- Use `files.includes` as the explicit include/ignore surface. Use forced ignore `!!` for generated outputs and build directories that must never be crawled.

### CI and local commands

- CI should be read-only: `biome ci .` or a read-only `biome check .` wrapper.
- Prefer `--changed`, `--since`, or `--staged` to constrain checks to branch or commit scope when appropriate.
- Local safe fix is `biome check --write <paths...>`; it formats and applies safe fixes/import organization.
- Do not use bulk `--unsafe` for repository-wide cleanup.

### Editor alignment

- VS Code should use Biome as the default formatter for JavaScript, TypeScript, JSON, JSONC, and CSS when Biome owns those surfaces.
- Keep Prettier only for surfaces outside Biome ownership, such as Markdown/MDX when that remains the local policy.
- Use explicit-on-save actions for Biome safe fixes and import organization so routine editing does not fight CI.

---

## Ultracite best practices

### What Ultracite contributes

Ultracite is an opinionated standards layer over Biome and other format/lint engines. For Afenda-Lite, the relevant surface is the Biome preset family:

- `ultracite/biome/core`
- `ultracite/biome/react`
- `ultracite/biome/next`
- `ultracite/biome/vitest`
- optional `ultracite/biome/type-aware`

### Version alignment

- Pin `@biomejs/biome` and Ultracite deliberately; bump them together.
- Ultracite `7.9.x` aligns with Biome `2.5.x` patterns in the current docs and examples.
- Avoid independent Biome major/minor upgrades without validating Ultracite preset compatibility.

### OSS override pattern

The `udecode/plate` config extends Ultracite presets, then uses targeted overrides for generated or vendored surfaces such as shadcn-style UI. This matches Afenda-Lite's current root override strategy for `packages/ui-system/src/components/ui/**` and `packages/ui-system/src/hooks/**`.

---

## Afenda-Lite fit

| Local surface | Current state | Decision |
|---------------|---------------|----------|
| `packages/config/biome.json` | Extends `ultracite/biome/core`, `react`, `next`, `vitest`; `root: false` | **Keep** |
| `biome.jsonc` | Extends `@afenda/config/biome.json` and adds ui-system shadcn overrides | **Keep** |
| Turbo package lint | Package scripts run `biome check .` | **Keep** |
| `.vscode/settings.json` | Biome disabled; Prettier is default for JS/TS/JSON/CSS | **Adapt** |
| Existing lint debt | Prior lint reported format/import-sort failures in env, emails, ui-system, and web | **Scoped fix** |
| Whole-repo `biome check --write` during unrelated WIP | Would touch too much | **Reject** |
| Replacing Ultracite with raw Biome recommended rules | Conflicts with ARCH-031 and current config investment | **Reject** |
| Per-package `extends: "//"` | Useful when packages need unique overrides | **Defer**; current NPM shared config is sufficient |

## Recommended local posture

1. Keep `@afenda/config` as the shared Biome/Ultracite standards package.
2. Keep root `biome.jsonc` as the workspace entry and override surface.
3. Enable Biome in editor settings for code/config surfaces so save-time formatting matches CI.
4. Use safe, path-scoped `biome check --write` on known failing packages only.
5. Keep CI read-only and Biome-backed; add a root `lint:ci` alias to make that intent explicit.

## Non-goals

- No Ultracite version bump.
- No Biome major/minor bump.
- No controlled DOC-002 ADR.
- No mass `--unsafe` write.
- No repo-wide style rewrite while unrelated WIP is present.

## Change log

| Date | Summary |
|------|---------|
| 2026-07-17 | Initial scratch research: Biome + Ultracite OSS practices, Afenda fit, and scoped remediation posture |
