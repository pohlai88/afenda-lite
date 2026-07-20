# `afenda-docs-app` reference

This file is the progressive-disclosure index for [`SKILL.md`](SKILL.md).

It does not create another documentation authority. The linked Scratch chapters
and the implementation on disk remain authoritative for their respective
subjects.

## Start here

| Need                                                | Load                                                               |
| --------------------------------------------------- | ------------------------------------------------------------------ |
| Overall rules, commands, pipeline, and disk map     | [`docs-V2/docs/README.md`](../../../docs-V2/docs/README.md)        |
| Content ownership and hand/generated classification | [`content.md`](../../../docs-V2/docs/content.md)                   |
| MDX frontmatter, syntax, and banned patterns        | [`practices.md`](../../../docs-V2/docs/practices.md)               |
| Page placement and `meta.json` conventions          | [`page-conventions.md`](../../../docs-V2/docs/page-conventions.md) |
| Link validation                                     | [`validate-links.md`](../../../docs-V2/docs/validate-links.md)     |
| CI and generator automation                         | [`automation.md`](../../../docs-V2/docs/automation.md)             |

## Chapter map

| Topic                                         | Chapter                                                              |
| --------------------------------------------- | -------------------------------------------------------------------- |
| Markdown defaults                             | [`markdown.md`](../../../docs-V2/docs/markdown.md)                   |
| Approved MDX components                       | [`ui-components.md`](../../../docs-V2/docs/ui-components.md)         |
| Theme, layout, and search UI                  | [`ui.md`](../../../docs-V2/docs/ui.md)                               |
| Layout implementation                         | [`ui-layouts.md`](../../../docs-V2/docs/ui-layouts.md)               |
| OpenAPI document wiring and page generation   | [`openapi.md`](../../../docs-V2/docs/openapi.md)                     |
| Feedback and GitHub Discussions               | [`feedback.md`](../../../docs-V2/docs/feedback.md)                   |
| Vercel deployment and host contract           | [`deploying.md`](../../../docs-V2/docs/deploying.md)                 |
| Next.js application shell                     | [`next.md`](../../../docs-V2/docs/next.md)                           |
| Fumadocs MDX integration                      | [`fumadocs-mdx-next.md`](../../../docs-V2/docs/fumadocs-mdx-next.md) |
| Internationalization, currently outside scope | [`i18n.md`](../../../docs-V2/docs/i18n.md)                           |

## Ownership quick reference

| Path                                                    | Classification                         |
| ------------------------------------------------------- | -------------------------------------- |
| `apps/docs/content/docs/**` excluding generated trees   | Hand-authored                          |
| `apps/docs/content/docs/api/index.mdx`                  | Hand-authored section introduction     |
| `apps/docs/content/docs/api/**/*.mdx` excluding index   | Generated                              |
| `apps/docs/content/docs/packages/index.mdx`             | Hand-authored section introduction     |
| `apps/docs/content/docs/packages/*.mdx` excluding index | Generated                              |
| `apps/docs/{app,components,lib,scripts}/**`             | Docs application implementation        |
| `docs-V2/api/OPEN-001-openapi.yaml`                     | External machine SSOT consumed by docs |
| Root/package `README.md`                                | README Diátaxis ownership              |
| Living `docs/**`                                        | Controlled-document ownership          |

## Command matrix

| Change                               | Required commands                                                                 |
| ------------------------------------ | --------------------------------------------------------------------------------- |
| Single narrative MDX page            | `generate:source` → `lint:links`                                                  |
| Navigation or shared MDX behavior    | `generate:source` → `check:docs-app`                                              |
| OpenAPI contract publication         | `openapi:generate` → `check:openapi` → `generate:openapi-docs` → `check:docs-app` |
| Package reference publication        | `generate:package-docs` → `check:docs-app`                                        |
| Docs application code                | Most specific tests → `check:docs-app`                                            |
| UI, layout, navigation, or rendering | Applicable checks → local `/docs` spot-check on port `3001`                       |

Canonical command forms:

```bash
pnpm --filter @afenda/docs generate:source
pnpm --filter @afenda/docs lint:links
pnpm --filter @afenda/docs generate:openapi-docs
pnpm --filter @afenda/docs generate:package-docs
pnpm check:docs-app
pnpm --filter @afenda/docs dev
```

## Related skills

| Skill                                   | Use for                                                                 |
| --------------------------------------- | ----------------------------------------------------------------------- |
| `afenda-elite-doc-control`              | Living controlled-document creation, lifecycle, register, and status    |
| `afenda-elite-doc-integrity`            | Living document/register drift and integrity                            |
| `afenda-elite-api-contract`             | Product Zod, ActionResult, OpenAPI schema, and `OPEN-001` ownership     |
| `afenda-readme-diataxis`                | Root and package README surfaces                                        |
| `afenda-elite-monorepo-discipline`      | Package boundaries, scripts, dependency wiring, and Tailwind exceptions |
| `shadcn-ui` / `afenda-elite-ui-compose` | Product UI primitives and compositions                                  |

## Vendor research

Use Context7 only after loading this skill and the relevant local chapter.

Preferred vendor target:

```text
fuma-nama/fumadocs
```

Use vendor research to verify installed APIs, configuration, or behavior. It does
not override Afenda path ownership, bans, generators, environment rules, or
routing decisions.

The following vendor-derived workflows remain prohibited:

```text
fumadocs-component-docs
fumadocs-registry-integration
8bitcn ComponentPreview
8bitcn CopyCommandButton
@8bitcn/* imports
8bit registry install templates
```

## Scope note

Internationalization remains outside the active scope until an explicit i18n
slice reopens it. The existence of `i18n.md` is planning/reference evidence, not
authorization to implement multilingual docs.
