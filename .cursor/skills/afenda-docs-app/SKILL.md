---
name: afenda-docs-app
description: >
  Operate and author the official Fumadocs application @afenda/docs under
  apps/docs. Covers hand-authored narrative MDX, generated OpenAPI and package
  reference pages, docs-app runtime code, link validation, environment and host
  constraints, and Afenda-specific MDX practices. Use for apps/docs/**,
  docs-V2/docs/** guidance, generate:openapi-docs, generate:package-docs,
  check:docs-app, port 3001, or Fumadocs work in this monorepo. Do not use for
  controlled Living docs/, package README Diátaxis, or product OpenAPI contract
  ownership.
---

# Afenda official docs application — `@afenda/docs`

## Mission

Operate the official Afenda Fumadocs site without creating a second documentation
authority, duplicating generated content, importing product UI accidentally, or
mixing publishing concerns with controlled Living documentation.

This skill is the **operational workflow and routing contract** for `@afenda/docs`.
It is not the content, architecture, or controlled-document SSOT.

## Authority and precedence

Use the following order:

1. `docs-V2/docs/README.md` and its linked chapters — docs-app rules and pipeline.
2. Disk under `apps/docs/**` — actual running application and current implementation.
3. `docs-V2/api/OPEN-001-openapi.yaml` — OpenAPI machine SSOT consumed by the docs app.
4. This skill — routing, execution sequence, safety locks, and verification requirements.

When Scratch guidance and disk disagree:

* do not silently choose one;
* inspect the relevant implementation and generators;
* report the drift;
* change only the surface authorized by the current mission.

Published MDX is human-facing site content. It is not the Living `DOC-001`
register or controlled-document lifecycle authority.

## Required loading

Before editing, load:

```text
1. This SKILL.md
2. docs-V2/docs/README.md
3. The relevant chapter from reference.md
4. Every target file before modifying it
5. The nearest meta.json when adding, removing, or relocating a page
6. The responsible generator before changing generated-page behavior
```

Do not load unrelated chapters merely to increase context.

## Operating modes

| Mode                   | Typical work                                               | Primary authority                                      |
| ---------------------- | ---------------------------------------------------------- | ------------------------------------------------------ |
| Narrative authoring    | Hand-authored MDX, guides, concepts, section introductions | `docs-V2/docs/content.md`, `practices.md`, target MDX  |
| OpenAPI publishing     | Regenerate `/docs/api/*` pages                             | `OPEN-001-openapi.yaml`, docs OpenAPI generator        |
| Package publishing     | Regenerate package reference pages                         | Package README/export surfaces, package docs generator |
| Docs application       | Routes, layouts, components, search, source configuration  | Disk `apps/docs/**`                                    |
| Environment/deployment | Docs env contract, port, Vercel host, feedback integration | `@afenda/env/docs`, deployment chapters                |

## Path ownership

| Surface                                                                | Ownership                          | Mutation rule                                |
| ---------------------------------------------------------------------- | ---------------------------------- | -------------------------------------------- |
| `apps/docs/content/docs/**` excluding generated trees                  | Hand-authored                      | May edit directly                            |
| `apps/docs/content/docs/api/index.mdx`                                 | Hand-authored section introduction | Preserve across regeneration                 |
| `apps/docs/content/docs/packages/index.mdx`                            | Hand-authored section introduction | Preserve across regeneration                 |
| `apps/docs/content/docs/api/**/*.mdx` excluding `api/index.mdx`        | Generated                          | Never hand-edit                              |
| `apps/docs/content/docs/packages/*.mdx` excluding `packages/index.mdx` | Generated                          | Never hand-edit                              |
| `apps/docs/{app,components,lib,scripts}/**`                            | Application implementation         | Edit only within named mission scope         |
| `docs-V2/api/OPEN-001-openapi.yaml`                                    | Product OpenAPI machine SSOT       | Route contract changes to API-contract skill |
| Root and package `README.md` files                                     | Package/repository documentation   | Route to README Diátaxis skill               |
| Living controlled `docs/**`                                            | Controlled-document system         | Route to document-control skill              |

## Routing

Always enter through:

```text
/using-afenda-elite-skills
```

Then route as follows:

| Request                                                             | Route                                             |
| ------------------------------------------------------------------- | ------------------------------------------------- |
| Living `docs/` ARCH, GUIDE, ADR, register or lifecycle work         | `afenda-elite-doc-control`                        |
| Living document/register integrity or cross-document drift          | `afenda-elite-doc-integrity`                      |
| Product Zod, ActionResult, OAS schema or `OPEN-001` contract change | `afenda-elite-api-contract`, then regenerate here |
| Root or package README                                              | `afenda-readme-diataxis`                          |
| Product UI primitives or application components                     | `shadcn-ui` / `afenda-elite-ui-compose`           |
| Fumadocs or Next.js vendor API uncertainty                          | Context7 after loading this skill                 |
| Monorepo boundaries, package wiring, or Tailwind exceptions         | `afenda-elite-monorepo-discipline`                |

## Hard locks

1. **No product secrets in the docs application.**

   Never add:

   ```text
   DATABASE_URL
   Neon Auth credentials
   CRON_SECRET
   product runtime secrets
   ```

2. **Docs environment access is centralized.**

   Use only:

   ```ts
   import { docsEnv } from "@afenda/env/docs";
   ```

3. **There is one OpenAPI machine copy.**

   Canonical source:

   ```text
   docs-V2/api/OPEN-001-openapi.yaml
   ```

   Never introduce `apps/docs/openapi/**` or another copied contract.

4. **There is one OpenAPI document identifier.**

   Use:

   ```text
   apps/docs/lib/openapi-document-id.ts
   ```

5. **English only until an explicit i18n slice is authorized.**

6. **Enterprise production quality is mandatory.**

   Do not reduce content quality, accessibility, validation, metadata, or build
   reliability to create a quicker partial implementation.

7. **The following are banned from docs MDX and application source:**

   ```text
   ComponentPreview
   CopyCommandButton
   @8bitcn/*
   8bit registry install commands
   fumadocs registry templates adapted from 8bitcn
   ```

8. **Generated pages are generator-owned.**

   Never patch generated operation or package pages directly.

9. **Product UI imports require explicit authorization.**

   Do not import `@afenda/ui-system` or product UI packages into docs MDX unless
   the current mission names:

   * the authorized docs integration slice;
   * the permitted component;
   * the dependency boundary;
   * the acceptance and verification criteria.

## MDX defaults

Every hand-authored page requires:

```mdx
---
title: Short page title
description: One-line purpose for navigation and metadata.
---
```

Use:

* stock components exposed by `getMDXComponents`;
* `Callout`, `Cards`, `Card`, `Tabs`, `Steps`, and other approved Fumadocs components;
* one clear job per section;
* fenced language identifiers such as `tsx`, `bash`, `json`, or `text`;
* links to generated API reference pages rather than copied operation tables;
* the nearest `meta.json` for navigation registration.

Do not:

* duplicate generated OpenAPI operation content;
* embed registry-install experiences;
* add decorative components without a content purpose;
* introduce a second syntax or design system for documentation examples;
* add pages without updating their navigation metadata.

Reference implementation:

```text
apps/docs/content/docs/guide.mdx
```

Component status:

```text
docs-V2/docs/ui-components.md
```

## Execution workflows

### A. Add or edit a narrative page

1. Read the target page and nearest `meta.json`.

2. Create or edit:

   ```text
   apps/docs/content/docs/<path>/<slug>.mdx
   ```

3. Include valid `title` and `description` frontmatter.

4. Add, remove, or reorder the slug in the nearest `meta.json` when necessary.

5. Run:

   ```bash
   pnpm --filter @afenda/docs generate:source
   pnpm --filter @afenda/docs lint:links
   ```

6. Run `pnpm check:docs-app` when the change affects navigation, shared MDX
   behavior, source configuration, or multiple pages.

7. Spot-check `/docs` locally when presentation or navigation changed.

### B. Publish an OpenAPI contract change

The product contract must be completed first through
`afenda-elite-api-contract`.

Then run:

```bash
pnpm openapi:generate
pnpm check:openapi
pnpm --filter @afenda/docs generate:openapi-docs
pnpm check:docs-app
```

Confirm:

* generated operation pages changed only through the generator;
* `api/index.mdx` remains preserved;
* no second OpenAPI copy was created;
* operation links resolve.

### C. Publish package documentation changes

After the responsible package README or export surface is updated:

```bash
pnpm --filter @afenda/docs generate:package-docs
pnpm check:docs-app
```

Confirm:

* package pages were generator-produced;
* `packages/index.mdx` remains preserved;
* removed packages do not leave orphan navigation entries;
* package links and exports match disk reality.

### D. Change docs application code

For changes under:

```text
apps/docs/app/**
apps/docs/components/**
apps/docs/lib/**
apps/docs/scripts/**
apps/docs/source.config.ts
```

At minimum run:

```bash
pnpm check:docs-app
```

Also run the most specific available tests for the touched implementation.

When UI, layout, search, navigation, or rendering changes:

```bash
pnpm --filter @afenda/docs dev
```

Spot-check:

```text
http://localhost:3001/docs
```

### E. Change docs environment or deployment behavior

Confirm:

* all environment reads use `docsEnv`;
* no product secrets are introduced;
* local port remains `3001`;
* deployment targets the authorized docs host;
* feedback integration remains docs-only;
* build and host assumptions are documented in the relevant Scratch chapter.

## Stop conditions

Stop and report rather than improvising when:

* `docs-V2/docs/README.md` or a required chapter is missing;
* Scratch and disk materially disagree;
* a requested edit belongs to Living `docs/`, a package README, or the product API contract;
* a generator overwrites a hand-owned index page;
* generated output requires manual repair to pass;
* a new OpenAPI copy or document identifier would be required;
* a request requires banned 8bitcn or registry components;
* a product UI dependency has no explicitly authorized slice;
* `check:docs-app`, link validation, type checking, or required tests remain failing;
* a Fumadocs API is uncertain and cannot be verified from the installed version or Context7.

Do not hide a failed verification behind unrelated passing commands.

## Completion gate

A docs-app mission is complete only when the applicable checks below are satisfied:

```text
[ ] Correct farm and route were used
[ ] Target and authority files were read before editing
[ ] Hand-authored versus generated ownership was preserved
[ ] Touched hand MDX has title and description frontmatter
[ ] Nearest meta.json matches the final page tree
[ ] No banned 8bitcn or registry strings were introduced
[ ] No product secrets or direct environment reads were introduced
[ ] No generated operation/package page was hand-patched
[ ] Required generator completed successfully
[ ] Link validation passed
[ ] pnpm check:docs-app passed when applicable
[ ] Local /docs spot-check completed when UI or navigation changed
[ ] Remaining warnings or failures are explicitly reported
```

## Completion report

Report:

```text
MODE:
TOUCHED:
GENERATED:
PRESERVED:
COMMANDS:
RESULT:
UNRESOLVED:
```

Do not report completion using only “done” or “build passed.”

## Progressive disclosure

Load deeper instructions from [`reference.md`](reference.md). Keep this file as the
stable operational contract; put detailed implementation guidance in the linked
Scratch chapters rather than duplicating it here.
