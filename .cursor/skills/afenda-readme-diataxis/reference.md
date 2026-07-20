# Afenda README + Diátaxis — reference

Companion to [SKILL.md](SKILL.md). **SKILL** = QUALITY ORDER, workflow, Done contract, score emit template. **This file** = Diátaxis map, score rubric, anti-claims, public vs private, examples.

## Diátaxis dimensions

Two axes → four types:

| | Acquisition (learning) | Application (working) |
|--|------------------------|------------------------|
| **Action** (doing) | **Tutorial** — guided learning | **How-to** — goal-oriented steps |
| **Cognition** (knowing) | **Explanation** — understanding | **Reference** — accurate lookup |

Practical tests:

- If the reader must finish a learning path → Tutorial (usually **link** a GUIDE/runbook; do not cram into root README).
- If the reader already knows the product and needs an outcome → How-to.
- If the reader needs a fact (command, URL, export) → Reference.
- If the reader asks “why is it shaped this way?” → Explanation + link to ARCH.

Diátaxis is an **approach**, not a mandatory four-heading template. Empty sections are a smell.

## Afenda documentation map (do not blur)

| Surface | Owner skill | Job |
|---------|-------------|-----|
| `README.md` (root / package / app) | `afenda-readme-diataxis` | Orient · quickstart · link · score |
| `docs/**` controlled IDs | `afenda-elite-doc-control` | SSOT lifecycle |
| Spec / ADR / runbook / migration prose | `technical-writing` | Mode-structured internal docs |
| ADR / docs prose craft (method) | `documentation-and-adrs` | Method only — not README SSOT |
| Conflict / register drift | `afenda-elite-doc-integrity` | Audit |
| Agent checkout doctrine | `AGENTS.md` | Agent operating contract |

Folder `README.md` under `docs/` may be a stub index (DOC-001 allows exceptions for `docs/README.md` and folder stubs). Still: do not invent `{ID}-*.md` without DOC-001 + ID approval.

## Root README section budget (typical)

Keep the first screen honest and short:

1. Identity + four-slot intro
2. What you get
3. Local development how-to (with engines)
4. Auth / DB / env pointer table
5. Architecture / docs index links
6. CI / GitHub / Vercel facts

Defer deep tenancy locks, slice matrices, and module readiness claims to controlled docs.

## Public vs operator-private

| Content | Public root README | Keep elsewhere |
|---------|--------------------|----------------|
| Product identity, quickstart, docs pointers | Yes | — |
| Repo / Vercel / production URL (verified) | Yes | — |
| Absolute disk paths (`C:\…`) | No | AGENTS / private ops |
| Clone-rename scripts | No | AGENTS / private ops |
| Agent PREFLIGHT / skill zoo | No | AGENTS / `/using-afenda-elite-skills` |
| Neon org/project/branch ops cards | Prefer link | RB-001 · RB-005 · ARCH-023 |

## Anti-claims

| Forbidden claim / teaching | Correct stance |
|----------------------------|----------------|
| Multi-DB / project-per-tenant isolation | Shared schema; organization-scoped rows — link ARCH-023 |
| Vague “hard tenant boundaries” implying separate DBs | “Organization-scoped (`organization_id`)” + ARCH-023 |
| MVP / good-enough-later quality | Enterprise production bar only |
| Restore `/playground` by hand | Absent by design — AGENTS ban |
| Revive `@afenda/ui` gateway | `@afenda/ui-system` only (ADR-010) |
| Compose / multi-file env SSOT | `@afenda/env` + `.env.local` + ARCH-027 |
| Collapse trees as current layout | Forbidden without named recovery this turn |
| `collapse-script-unavailable` names as live controls | Inventory only until Approved forward slice |

## Package README minimal skeleton

Score still applies; expect lighter BREVITY/AUDIENCE pressure than root (consumer focus).

```markdown
# @afenda/<name>

One-sentence purpose for package consumers.

## Consume

\`\`\`ts
import { … } from '@afenda/<name>'
\`\`\`

## Maintain

\`\`\`bash
pnpm --filter @afenda/<name> <script>
\`\`\`

## Authority

- Link owning ARCH / module spine / ADR
```

## README Score rubric

Binding response shape and caps live in [SKILL.md](SKILL.md#readme-score-binding--out-of-100). Use this rubric to assign each dimension. Award partial points only when the note names the residual gap.

| Dimension | Max | Full points when | Deduct when |
|-----------|-----|------------------|-------------|
| AUTHORITY | 20 | Controlled doctrine linked not copied; AGENTS not forked; anti-claims clean | Pasted Decision lock (−15); second env SSOT (−10); invented category/home (−10); multi-DB claim → **0** |
| ACCURACY | 25 | Scripts exist; links `Test-Path`; facts match AGENTS/existing; schema paths correct | Broken link (−15, overall ≤70); dead command (−15); wrong schema home (−10); stale runbook path (−10) |
| DIATAXIS | 15 | Primary type clear; intro slots covered when in scope; no empty scaffold | Empty four-type headings (−10 → ≤5); missing intro when rewrite scoped (−8); mechanical form voice (−5) |
| AUDIENCE | 15 | Surface-appropriate depth; package = consume; root = contributors+operators | Machine-local paths in public root (−10 → ≤8); agent-only noise as product guidance (−8); doctrine dump in package README (−8) |
| BREVITY | 10 | Section budget held; no roadmap fiction | Duplicate tables (−4); Collapse inventory as live guidance (−6 → ≤4); oversized route inventory without verify (−4) |
| VERIFY | 15 | Checklist complete; engines when how-to; anti-claims; score emitted | Missing engines in how-to (−8); missing score (−15 → **0**); secret / invented cloud id → **0** and overall ≤50 |

**Path to 100%:** one short sentence (two max) naming the highest-impact fix(es) in QUALITY ORDER (fix AUTHORITY/ACCURACY before polishing BREVITY). Prefer concrete language (`add engines Node 24 / pnpm ≥10.33`, `remove C:\\ path`, `reword tenancy → organization_id + ARCH-023`).

**Examples (advisory):**

```text
### README Score: 100% / 100%
| Dimension | Score | Note |
| AUTHORITY | 20/20 | Docs linked; ARCH-023 tenancy wording |
| ACCURACY | 25/25 | Scripts + links Test-Path; packages/data-plane/db/drizzle |
| DIATAXIS | 15/15 | mixed-index · four-slot intro · natural voice |
| AUDIENCE | 15/15 | No machine paths; public root clean |
| BREVITY | 10/10 | Section budget held |
| VERIFY | 15/15 | Engines cited; anti-claims green |
**Path to 100%:** None — hold; do not restyle for vanity.
```

```text
### README Score: 86% / 100%
| Dimension | Score | Note |
| AUTHORITY | 18/20 | Links OK; “hard tenant boundaries” soft isolation risk |
| ACCURACY | 23/25 | Commands live; engines missing from how-to |
| DIATAXIS | 14/15 | Intro present; slightly mechanical lead-ins |
| AUDIENCE | 10/15 | Absolute C:\ path + rename script in public root |
| BREVITY | 9/10 | Route table kept (verified) |
| VERIFY | 12/15 | Links OK; engines/prereqs gate incomplete |
**Path to 100%:** Add Node/pnpm engines to Local development; remove machine path/rename script; reword tenancy to organization-scoped + ARCH-023.
```

## Upstream provenance (do not reinstall as competing skills)

| Idea | Source | Afenda adaptation |
|------|--------|-------------------|
| Four-type triage | sammcj `writing-documentation-with-diataxis` | Classify; no empty scaffold; hand off `docs/` |
| Four-slot intro | trogonstack `diataxis-gen-readme` | Semantic slots; natural voice |
| Construct + verify additive | trkbt10 `indexion-readme` | Manual discover/diff verify; **no** indexion toolchain |
| QUALITY ORDER + Score / Path | `afenda-elite-ui-compose` pattern | README dimensions — not UI locks |

Prefer this skill over installing those three separately in this repo.

## Anti-patterns

| Anti-pattern | Fix |
|--------------|-----|
| Paste Living ARCH Decision lock into README | Link ARCH-023 / owning doc |
| “MVP README” / temporary quality | Enterprise production bar only |
| Second env SSOT | Link `@afenda/env` + ARCH-027 |
| Generate MoonBit / `doc.json` assembler | Out of scope |
| Rewrite Closed controlled doc via README mission | Stop → doc-control reopen |
| Teach Collapse trees as current layout | Forbidden without named recovery |
| Skip README Score after compose/audit | Emit Score + Path — Done requires it |
| Absolute disk paths in public root | Move to AGENTS / private ops |
