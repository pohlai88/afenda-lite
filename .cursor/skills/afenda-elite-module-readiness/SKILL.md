---
name: afenda-elite-module-readiness
description: >-
  Module evidence ledgers and Module Enterprise Readiness claim rules. Use when
  updating *-MOD-009 / *-MOD-010, recording PASS/FAIL/BLOCKED evidence, checking
  whether a module is claimable, or when the user mentions Module Enterprise
  Readiness, MOD-002 evidence, or afenda-elite-module-readiness.
---

# Afenda Elite — module readiness

**SSOT (this checkout):** [mod-readiness-rules.md](mod-readiness-rules.md) (MOD-002 §3 operative). Living `docs/modules/**` packs are **dormant** until Docs-lane reopen — do not invent them. This skill operationalizes claim and evidence rules.

```text
LOAD:
  mod-readiness-rules.md                         # MOD-002 · 009 · 010 operative
  ../afenda-elite-doc-control/doc-control-rules.md  # when touching Controlled headers
SKIP:
  required LOAD of Living docs/modules/**
  scratch QG-01…18 as skill or gate authority
  inventing PASS from prose, wiring, or historical narrative
  Afenda-Lite / Afenda-Elite edition or release certification from one module
  redefining AC text inside MOD-009
  copying full requirement or evidence tables into MOD-010
  retired env:compose as Living evidence (ARCH-027 — use @afenda/env + .env.local)
PLACE (when Living packs restored):
  evidence rows → *-MOD-009 only
  claim narrative → *-MOD-010 only
VERIFY:
  when Living packs present: pnpm check:module-quality
  when Living packs absent: claim/evidence work BLOCKED — Docs-lane reopen required
```

Cite `term.afenda-elite`. Lifecycle edits still go through [afenda-elite-doc-control](../afenda-elite-doc-control/SKILL.md). Integrity conflicts → [afenda-elite-doc-integrity](../afenda-elite-doc-integrity/SKILL.md).

## Scope · axes · claim rules · evidence table

All operative rules: [mod-readiness-rules.md](mod-readiness-rules.md).

## Agent procedure

1. **Identify module** — when Living MOD-002 catalog exists, load that slug’s MOD-009 + MOD-010; else STOP (Docs-lane).
2. **Confirm active profiles + dimension coverage** — Enterprise Core plus every optional profile declared on MOD-010; each active dimension has ≥1 AC in its sole owning role.
3. **Confirm AC ownership** — criterion text only in 001–008; 009 records result state; 010 summarizes claims/gaps.
4. **Run or attempt verify commands** listed in MOD-009. On docs-first checkout, absent product trees → record `BLOCKED` (ARCH-028). Do not recover wiped Collapse roots.
5. **Update evidence rows** — never invent `PASS`. Prefer `NOT EVIDENCED` when evidence is missing or stale.
6. **Env-related ACs** — cite ARCH-027 only: `@afenda/env` + `.env.local`.
7. **Claims** — update MOD-010 readiness aggregation only after coverage + 009 rows are honest.
8. **Verify** — `pnpm check:module-quality` when Living packs exist; fix join/ownership/schema findings before closing Control State.

## Concrete module example — living domains

IDs and roles in [mod-readiness-rules.md](mod-readiness-rules.md). Living product modules on this checkout are **platform** and **identity** only. Declarations / Feed Farm Trade (and the deleted `feed-farm-trade` skill) are nuclear wipe — do not route readiness work there. This skill owns **evidence/claim semantics**, not product reopen.

## Hard rules

See [mod-readiness-rules.md](mod-readiness-rules.md).

## Verification

- [ ] Loaded [mod-readiness-rules.md](mod-readiness-rules.md) before changing 009/010 claim language
- [ ] Living packs present, or STOP with Docs-lane note
- [ ] Enterprise Core + every declared optional profile; each active dimension has ≥1 AC in its sole owning role
- [ ] Every Core / in-claim Conditional AC has a 009 row
- [ ] No `PASS` without reference + revision + ISO date
- [ ] Env ACs cite ARCH-027 (`@afenda/env` + `.env.local`, not compose)
- [ ] MOD-010 claim matches coverage + 009 (Claimable only when rules pass)
- [ ] `pnpm check:module-quality` clean for the touched pack (when Living present)
