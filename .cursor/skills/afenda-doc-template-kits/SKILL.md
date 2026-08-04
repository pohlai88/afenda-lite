---
name: afenda-doc-template-kits
description: >
  Bootstrap and refresh Afenda package/folder README.md and AGENTS.md surfaces
  from markdown-only templates under docs/template/. Hand-copy workflow — no
  generator scripts. Use when creating or standardizing a package README,
  folder README (e.g. governance/), root or package AGENTS.md stub, or when the
  user asks for README/AGENTS templates, template kits, or scalable doc stubs.
disable-model-invocation: true
---

# Afenda — doc template kits (README + AGENTS)

Markdown-only kits. **Orient and standardize.** Do not invent Living DOC-001
spines or fork root `AGENTS.md` doctrine into packages.

```text
LOAD:
  docs/template/README.md
  docs/template/readme/README.md · matching *.readme.template.md
  docs/template/agents/README.md · matching agents.*.template.md
  target package.json / folder purpose (facts for fill)
  ../afenda-readme-diataxis/SKILL.md  (QUALITY ORDER + README Score after fill)
SKIP:
  generate.readme.ts · AUTO-marker generators · indexion / doc.json assemblers
  dumping kit/temp scripts into root scripts/ (directory-local-scripts hook)
  replacing living root AGENTS.md from the root stub without explicit order
  MVP framing · shim/stub product paths · Collapse recovery
ROUTE:
  /using-afenda-elite-skills first for product farm
  README prose quality / score → afenda-readme-diataxis
  Controlled docs/ IDs → afenda-elite-doc-control
  Spec · ADR · runbook prose → technical-writing
```

## When to use

| Need | Template |
|------|----------|
| New / rewrite `@afenda/*` package README | `docs/template/readme/package.readme.template.md` |
| Folder tooling README (e.g. `governance/`) | `docs/template/readme/folder.readme.template.md` |
| Package-local `AGENTS.md` (deltas only) | `docs/template/agents/agents.package.template.md` |
| Shape reference for root `AGENTS.md` | `docs/template/agents/agents.root.template.md` (diff vs living root; do not blind-replace) |

## When not to use

| Request | Use instead |
|---------|-------------|
| Score / audit an existing README | `afenda-readme-diataxis` |
| Controlled ARCH / GUIDE / ADR body | `afenda-elite-doc-control` |
| Full agent operating contract (living) | Root [`AGENTS.md`](../../../AGENTS.md) |

## Workflow (binding)

1. **Classify** surface: `package-readme` | `folder-readme` | `agents-package` | `agents-root-shape`.
2. **Copy** the matching template to the target path as `README.md` or `AGENTS.md`.
3. **Replace** every `{{TOKEN}}` with verified on-disk facts (engines from root `package.json`, real scripts, real links).
4. **Omit** optional sections that do not apply — do not leave empty Diátaxis scaffolding.
5. **README only:** run `pnpm check:readme`, then finish QUALITY ORDER + README Score via `afenda-readme-diataxis`.
6. **AGENTS package only:** keep deltas short; nearest `AGENTS.md` wins; link root doctrine instead of restating it.

## Tokens

| Token | Meaning |
|-------|---------|
| `{{PACKAGE_NAME}}` | `@afenda/...` from `package.json` `name` |
| `{{ONE_LINE}}` | One-sentence purpose |
| `{{FOLDER_NAME}}` | Folder basename (e.g. `governance`) |
| `{{FOLDER_REL}}` | Repo-relative path (e.g. `governance`) |
| `{{ENGINES_NODE}}` / `{{ENGINES_PNPM}}` | Root `package.json` `engines` |
| `{{PRIMARY_COMMAND}}` | Main verify or consume command |
| `{{LICENSE}}` | License line or `UNLICENSED` |

## Anti-patterns

- Generator scripts under `docs/template/`
- Absolute machine paths in package/folder READMEs
- Pasting Living Decision locks into README
- Package `AGENTS.md` that restates full root PREFLIGHT / skill zoo
- Teaching retired `docs-V2/` or Collapse trees as live layout

## Done

- [ ] Target file exists; every `{{TOKEN}}` filled or its section omitted
- [ ] Links resolve (`Test-Path` / relative check)
- [ ] README: `pnpm check:readme` green + Diátaxis score path noted
- [ ] No generator / AUTO-marker tooling introduced
