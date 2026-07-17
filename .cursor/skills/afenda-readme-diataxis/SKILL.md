---
name: afenda-readme-diataxis
description: >
  Write and revise Afenda README surfaces with Diátaxis triage and a fixed
  four-paragraph product intro. Use for root README.md, packages/*/README.md,
  apps/*/README.md, and folder README stubs that orient humans — not for
  controlled ARCH/GUIDE/ADR/runbook bodies under docs/. Triggers on: README,
  package readme, Diátaxis, how-to vs tutorial vs reference vs explanation,
  docs intro paragraph. Hand controlled docs/ lifecycle to afenda-elite-doc-control
  and internal prose modes to technical-writing.
disable-model-invocation: true
---

# Afenda — README + Diátaxis

Consolidated from three upstream ideas, adapted for this monorepo:

| Upstream | Keep | Drop |
|----------|------|------|
| Diátaxis docs skill | Four-type triage; approach ≠ empty template | Generic non-Afenda homes |
| Diátaxis README intro | Four-paragraph bold lead-in intro | Lorem placeholders as shipped text |
| Indexion README construction | Discover → assemble → verify additive edits | `indexion` CLI · `doc.json` · MoonBit · `.indexion/` |

**Authority is never this skill.** Product SSOT stays under `docs/` ([DOC-001](../../../docs/_control/DOC-001-documentation-control-standard.md)). READMEs orient and link; they do not replace ARCH / GUIDE / MOD spines.

```text
LOAD:
  this SKILL.md · reference.md when classifying type or package README shape
  existing target README (Read before Write)
  AGENTS.md · docs/README.md only as link targets / orientation — do not re-author them here
SKIP:
  inventing controlled doc IDs · rewriting Closed docs/ without reopen
  duplicating ARCH/GUIDE/MOD authority into README prose
  MVP / “good enough later” framing · Collapse path recovery
  installing or invoking indexion / doc.json assemblers
ROUTE:
  /using-afenda-elite-skills first for product farm
  Controlled Markdown under docs/ (create/update/retire) → afenda-elite-doc-control
  Spec · ADR · runbook · migration · architecture prose → technical-writing (after doc-control)
  Doc↔doc conflict / register drift → afenda-elite-doc-integrity
```

## When to use

- Root `README.md` create/revise
- Package or app README (`packages/*/README.md`, `apps/*/README.md`)
- Folder stub README that only indexes links (e.g. `docs/api/README.md`) — still: no new controlled ID without DOC-001 path
- User asks for Diátaxis-shaped intro, how-to vs tutorial vs reference vs explanation on a README surface

## When not to use

| Request | Use instead |
|---------|-------------|
| New/updated ARCH, GUIDE, ADR, API, MOD, runbook under `docs/` | `afenda-elite-doc-control` (+ `technical-writing` for prose) |
| Register / Control State / ID approval | `afenda-elite-doc-control` |
| Agent operating doctrine | Point to `AGENTS.md` — do not fork into README |
| Marketing / GTM landing copy | Out of scope |

## Workflow

### 1. Classify the surface

```yaml
readme_job:
  surface: root | package | app | folder-stub
  path: <verified on disk>
  primary_diataxis: tutorial | how-to | reference | explanation | mixed-index
  audience: contributors | operators | package-consumers | mixed
```

Diátaxis quick map (see [reference.md](reference.md)):

| Need | Type | README role |
|------|------|-------------|
| Learn by doing | Tutorial | Rare in root README — link a GUIDE / runbook instead of embedding a course |
| Achieve a goal | How-to | Short “Local development” / “Validate env” command blocks |
| Look up facts | Reference | Tables of commands, env keys, URLs — prefer link to ARCH-027 / env package |
| Understand why | Explanation | Architecture blurb + links to ARCH-022 / docs index — do not paste Living locks |

**Rule:** Do not invent empty Tutorial / How-to / Reference / Explanation headings. Only write sections that serve a real need on that surface.

### 2. Discover before drafting

1. `Read` the target README if it exists.
2. Confirm paths with `Test-Path` / `git ls-files` — do not trust stale index ghosts.
3. For packages: read `package.json` `name`, `exports`, and one canonical import example from consumers under `apps/web` or sibling packages.
4. Prefer **links** to `docs/**`, `AGENTS.md`, runbooks over copied doctrine.

### 3. Intro (when writing or rewriting the opening)

Use this four-paragraph Diátaxis product intro — **bold lead-in + product-specific body** (no lorem):

```markdown
**What it is** — one memorable sentence naming the product/edition.

**What it does** — one to three short sentences on capabilities.

**Need it meets** — one to three short sentences on the problem / operating context.

**Who it is for** — one to three short sentences on audience (operators, maintainers, package consumers).
```

Root README must keep Afenda identity clear: **Afenda-Lite** (this checkout) vs Elite; retired name “Client Declaration Portal” only as a deprecate pointer to the deprecation register — never as current product title.

### 4. Body shape by surface

**Root `README.md`**

1. Four-paragraph intro (above)
2. What you get (bullets — product surfaces, not roadmap fiction)
3. Quickstart how-to (install → env → `pnpm validate:neon-env` → `pnpm --filter @afenda/web dev`)
4. Pointers table: Architecture → `docs/README.md` + key ARCH; Auth/DB → runbook + ARCH-025/026/027; CI → workflows
5. Hard facts only (repo URL, Vercel project, production URL) — verify against `AGENTS.md` / existing README before changing

**Package / app README**

1. One-sentence package purpose (`@afenda/<name>`)
2. Install / consume (workspace import example)
3. How-to for the 1–3 commands maintainers actually run
4. Reference: key exports or “see `src/index.ts`”
5. Link out to owning ARCH / module spine — do not restate Decision locks

**Folder stub**

- Job = navigation index. Short purpose + link table. No second SSOT.

### 5. Afenda hard constraints

- Enterprise production quality only — never MVP framing.
- No shims/stubs language as product guidance.
- No Collapse / legacy path teaching (`app/`, `modules/` at repo root, etc.).
- Env: teach `@afenda/env` + `.env.local` — never compose / raw secret dumps.
- UI: `@afenda/ui-system` barrel only if the README is for that package — do not revive `@afenda/ui`.
- Do not claim multi-DB isolation or reopen ARCH-023 locks.

### 6. Verify (Indexion “drift” without Indexion)

After edits:

1. Diff against previous content — removals must be intentional (no silent section deletes).
2. Every command cited must exist in root or package `package.json` scripts (or be documented as filter scripts).
3. Every internal link path must resolve (`Test-Path`).
4. No secrets; no invented APP_URL / org / branch ids — copy only from verified sources (`AGENTS.md`, existing README, env example keys without values).

## Output checklist

- [ ] Surface + Diátaxis primary type classified
- [ ] Existing README read (or greenfield confirmed)
- [ ] Intro uses four bold lead-ins when intro was in scope
- [ ] No empty Diátaxis section scaffolding
- [ ] Controlled doctrine linked, not duplicated
- [ ] Commands and links verified
- [ ] Routed away from this skill if the real job was `docs/` controlled write

## Additional resources

- [reference.md](reference.md) — Diátaxis dimensions, Afenda surface map, anti-patterns
