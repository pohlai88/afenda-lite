---
name: afenda-readme-diataxis
description: >
  Write, revise, and audit Afenda README surfaces with Diátaxis triage, a
  four-slot product intro, QUALITY ORDER gates, and README Score /100% with
  Path to 100%. Use for root README.md, packages/*/README.md, apps/*/README.md,
  and folder README stubs — not for controlled ARCH/GUIDE/ADR/runbook bodies
  under docs/. Triggers on: README, package readme, Diátaxis, README score,
  README rating, Path to 100%, audit/revise README, how-to vs tutorial vs
  reference vs explanation. Hand controlled docs/ lifecycle to
  afenda-elite-doc-control and internal prose modes to technical-writing /
  documentation-and-adrs (method only).
disable-model-invocation: true
---

# Afenda — README + Diátaxis

Consolidated from three upstream ideas, adapted for this monorepo:

| Upstream | Keep | Drop |
|----------|------|------|
| Diátaxis docs skill | Four-type triage; approach ≠ empty template | Generic non-Afenda homes |
| Diátaxis README intro | Four semantic intro slots (what / does / need / who) | Lorem placeholders as shipped text |
| Indexion README construction | Discover → assemble → verify additive edits | `indexion` CLI · `doc.json` · MoonBit · `.indexion/` |

**Authority is never this skill.** Product SSOT stays under `docs/` ([DOC-001](../../../docs/_control/DOC-001-documentation-control-standard.md)). READMEs orient and link; they do not replace ARCH / GUIDE / MOD spines.

**Done:** VERIFY green + **README Score** emitted + Path to 100% (or “None — hold”). Rubric: [reference.md](reference.md#readme-score-rubric).

```text
LOAD:
  this SKILL.md · reference.md (score rubric · anti-claims · public vs private)
  existing target README (Read before Write)
  root or package package.json (engines + scripts)
  AGENTS.md · docs/README.md only as link targets / orientation — do not re-author them here
SKIP:
  inventing controlled doc IDs · rewriting Closed docs/ without reopen
  duplicating ARCH/GUIDE/MOD authority into README prose
  MVP / “good enough later” framing · Collapse path recovery
  installing or invoking indexion / doc.json assemblers
  absolute local machine paths / clone-rename scripts in public root README
ROUTE:
  /using-afenda-elite-skills first for product farm
  Controlled Markdown under docs/ (create/update/retire) → afenda-elite-doc-control
  Spec · ADR · runbook · migration · architecture prose → technical-writing (after doc-control)
  Optional prose polish (method only, no register) → documentation-and-adrs
  Doc↔doc conflict / register drift → afenda-elite-doc-integrity
  Generic lifecycle after farm fixed → /using-agent-skills
```

## QUALITY ORDER (binding)

A readable README that violates a higher rule is a **failed change**. Do not skip ahead.

```text
1. AUTHORITY-FIRST     Link docs/ + AGENTS.md; never duplicate Living locks / Decision locks
2. ACCURACY-FIRST      Commands, paths, URLs, package names verified on disk
3. DIATAXIS-FIRST      One primary type; no empty four-type scaffolding; intro serves real need
4. AUDIENCE-FIRST      Root = contributors+operators; package = consumers; stub = navigators
5. BREVITY-FIRST       Section budget; first screen honest; deep ops → runbooks/ARCH
6. VERIFY-FIRST        Diff intentional; links resolve; no secrets; anti-claims hold
```

| Step | Rejects |
|------|---------|
| AUTHORITY | Pasted Decision lock; second env SSOT; forked AGENTS doctrine |
| ACCURACY | Dead scripts; broken links; stale `db/migrations/` / missing runbooks |
| DIATAXIS | Empty Tutorial/How-to/Reference/Explanation headings |
| AUDIENCE | Machine-local paths in public root; agent-only noise as product guidance |
| BREVITY | Roadmap fiction; Collapse inventory taught as live controls |
| VERIFY | Missing score; unverified claims; invented cloud ids |

## When to use

- Root `README.md` create / revise / audit / rate
- Package or app README (`packages/*/README.md`, `apps/*/README.md`)
- Folder stub README that only indexes links (e.g. `docs/api/README.md`) — still: no new controlled ID without DOC-001 path
- User asks for Diátaxis-shaped intro, how-to vs tutorial vs reference vs explanation, **README Score**, or Path to 100% on a README surface

## When not to use

| Request | Use instead |
|---------|-------------|
| New/updated ARCH, GUIDE, ADR, API, MOD, runbook under `docs/` | `afenda-elite-doc-control` (+ `technical-writing` for prose) |
| Register / Control State / ID approval | `afenda-elite-doc-control` |
| Agent operating doctrine | Point to `AGENTS.md` — do not fork into README |
| Marketing / GTM landing copy | Out of scope |

## Agent flow

```text
Need README
  → /using-afenda-elite-skills → afenda-readme-diataxis
  → QUALITY ORDER → Read target + package.json engines/scripts + Test-Path links
  → compose / revise / audit
  → if controlled docs/ body needed → STOP → afenda-elite-doc-control
  → optional prose polish method: documentation-and-adrs (method only; no register)
  → VERIFY → README Score + Path to 100%
```

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
3. Read root or package `package.json` — capture `engines` (Node/pnpm) and scripts cited in how-tos.
4. For packages: read `name`, `exports`, and one canonical import example from consumers under `apps/web` or sibling packages.
5. Prefer **links** to `docs/**`, `AGENTS.md`, runbooks over copied doctrine.
6. Tenancy wording: organization-scoped / hard `organization_id` + link [ARCH-023](../../../docs/architecture/ARCH-023-multi-tenancy.md) — never “multi-DB isolation” or vague “hard tenant boundaries” that imply DB-per-tenant.
7. Volatile inventories (full route maps): keep a short table only if verified against `apps/web`; otherwise link ARCH / docs index.

### 3. Intro (when writing or rewriting the opening)

Cover four semantic slots — **what / does / need / who** — with natural product voice (no lorem).

Allowed shapes:

- Bold lead-ins: `**What it is** — …` (only if they still read as prose, not a form), **or**
- Equivalent short paragraphs / lead under the H1 without mechanical labels

Reject mechanical cadence that sounds like a filled template when the product voice is flat.

Root README must keep Afenda identity clear: **Afenda-Lite** (this checkout) vs Elite; retired name “Client Declaration Portal” only as a deprecate pointer to the deprecation register — never as current product title.

### 4. Body shape by surface

**Root `README.md`**

1. Four-slot intro (above)
2. What you get (bullets — product surfaces, not roadmap fiction)
3. Quickstart how-to: install → **engines note** (from `package.json`) → `.env.local` → `pnpm validate:neon-env` → `pnpm --filter @afenda/web dev`
4. Pointers table: Architecture → `docs/README.md` + key ARCH; Auth/DB → runbook + ARCH-025/026/027; CI → workflows
5. Hard facts only (repo URL, Vercel project, production URL) — verify against `AGENTS.md` / existing README before changing
6. **Public root ban:** absolute local disk paths and clone-rename scripts — those belong in AGENTS / private ops notes ([reference.md](reference.md#public-vs-operator-private))

**Package / app README**

1. One-sentence package purpose (`@afenda/<name>`)
2. Install / consume (workspace import example)
3. How-to for the 1–3 commands maintainers actually run (cite engines if package-local tools need them)
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
- Do not teach `scripts/collapse-script-unavailable.mjs` wrappers as live operator controls.

### 6. Verify (Indexion “drift” without Indexion)

After edits:

1. Diff against previous content — removals must be intentional (no silent section deletes).
2. Every command cited must exist in root or package `package.json` scripts (or be documented as filter scripts).
3. Every internal link path must resolve (`Test-Path`).
4. How-to present → engines (Node/pnpm) cited when declared in `package.json`.
5. No absolute local machine paths in public root README.
6. Anti-claims hold (see [reference.md](reference.md#anti-claims)).
7. No secrets; no invented APP_URL / org / branch ids — copy only from verified sources (`AGENTS.md`, existing README, env example keys without values).

## README Score (binding — out of 100)

Emit after compose / revise / audit / evaluate. Measures QUALITY ORDER — not marketing polish.

| Dimension | Max | Dimension | Max |
|-----------|-----|-----------|-----|
| AUTHORITY | 20 | AUDIENCE | 15 |
| ACCURACY | 25 | BREVITY | 10 |
| DIATAXIS | 15 | VERIFY | 15 |

**Caps:** any broken internal link → overall ≤70 · any secret or invented cloud id → VERIFY = 0 and overall ≤50 · multi-DB isolation claim → AUTHORITY = 0.

```text
### README Score: <N>% / 100%
| Dimension | Score | Note |
| AUTHORITY | x/20 | … |
| ACCURACY | x/25 | … |
| DIATAXIS | x/15 | … |
| AUDIENCE | x/15 | … |
| BREVITY | x/10 | … |
| VERIFY | x/15 | … |
**Path to 100%:** <one short sentence, or two max>
```

If already 100%: `**Path to 100%:** None — hold; do not restyle for vanity.`

Rubric + examples: [reference.md](reference.md#readme-score-rubric).

## Output checklist

- [ ] Surface + Diátaxis primary type classified
- [ ] Existing README read (or greenfield confirmed); `package.json` engines/scripts checked
- [ ] Intro covers four semantic slots when intro was in scope (natural voice)
- [ ] No empty Diátaxis section scaffolding
- [ ] Controlled doctrine linked, not duplicated
- [ ] Commands, links, engines, anti-claims verified
- [ ] No public machine paths / rename scripts in root README
- [ ] README Score + Path to 100% emitted
- [ ] Routed away from this skill if the real job was `docs/` controlled write

## Additional resources

- [reference.md](reference.md) — Diátaxis dimensions, score rubric, anti-claims, public vs private, anti-patterns
