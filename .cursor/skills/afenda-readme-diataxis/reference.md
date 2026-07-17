# Afenda README + Diátaxis — reference

## Diátaxis dimensions

Two axes → four types:

| | Acquisition (learning) | Application (working) |
|--|------------------------|------------------------|
| **Action** (doing) | **Tutorial** — guided learning | **How-to** — goal-oriented steps |
| **Cognition** (knowing) | **Explanation** — understanding | **Reference** — accurate lookup |

Practical tests:

- If the reader must finish a learning path → Tutorial (usually **link** a GUIDE/runbook; do not cram into root README).
- If the reader already knows the product and needs a outcome → How-to.
- If the reader needs a fact (command, URL, export) → Reference.
- If the reader asks “why is it shaped this way?” → Explanation + link to ARCH.

Diátaxis is an **approach**, not a mandatory four-heading template. Empty sections are a smell.

## Afenda documentation map (do not blur)

| Surface | Owner skill | Job |
|---------|-------------|-----|
| `README.md` (root / package / app) | `afenda-readme-diataxis` | Orient · quickstart · link |
| `docs/**` controlled IDs | `afenda-elite-doc-control` | SSOT lifecycle |
| Spec / ADR / runbook / migration prose | `technical-writing` | Mode-structured internal docs |
| Conflict / register drift | `afenda-elite-doc-integrity` | Audit |
| Agent checkout doctrine | `AGENTS.md` | Agent operating contract |

Folder `README.md` under `docs/` may be a stub index (DOC-001 allows exceptions for `docs/README.md` and folder stubs). Still: do not invent `{ID}-*.md` without DOC-001 + ID approval.

## Root README section budget (typical)

Keep the first screen honest and short:

1. Identity + four-paragraph intro
2. What you get
3. Local development how-to
4. Auth / DB / env pointer table
5. Architecture / docs index links
6. CI / GitHub / Vercel facts

Defer deep tenancy locks, slice matrices, and module readiness claims to controlled docs.

## Package README minimal skeleton

```markdown
# @afenda/<name>

**What it is** — …

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

## Upstream provenance (do not reinstall as competing skills)

| Idea | Source | Afenda adaptation |
|------|--------|-------------------|
| Four-type triage | sammcj `writing-documentation-with-diataxis` | Classify; no empty scaffold; hand off `docs/` |
| Four-paragraph intro | trogonstack `diataxis-gen-readme` | Bold lead-ins; real product copy |
| Construct + verify additive | trkbt10 `indexion-readme` | Manual discover/diff verify; **no** indexion toolchain |

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
