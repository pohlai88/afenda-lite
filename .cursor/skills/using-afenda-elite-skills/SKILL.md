---
name: using-afenda-elite-skills
description: Routes Afenda-Lite / Elite overlay work to the correct farm skill. Use when starting product, docs, monorepo, or domain tasks in this repository before invoking vendor phase skills.
---

# Using Afenda Elite Skills

## Mode

Internal guide for agents and maintainers. **Enables:** pick the right farm and skill without inventing terms or a skill zoo.

**End-state:** this skill is the **only product entry**. Vendor phase skills under `agent-skills/skills/` are a **method library** after the farm is fixed — not Elite-named forks.

**Editions:** Afenda-Lite (this checkout, **beta**) and Afenda-Elite (**battle-proven**) share the DOC-001 control **model** ([doc-control-rules](../afenda-elite-doc-control/doc-control-rules.md)). Maturity differs; catalogue shape does not. Living `docs/**` bodies are **absent by design** on this checkout until Docs-lane reopen.

```text
LOAD:
  AGENTS.md
  docs-V2/README.md
  catalog.md
  living-docs-link-inventory.md
  ../afenda-elite-doc-control/doc-control-rules.md   # DOC-001…003 operative rules (skill-local)
SKIP:
  recreating doc/ · restoring Living docs/ without Docs-lane · treating Fumadocs MDX as Living DOC-001
  Storybook / Guardian Auth product restore · guardian-css-audit · recreating wiped Declarations/FFT product modules
  afenda-Xerp editorial bundles (different repo overlay)
  forking or syncing Xerp / vendor skills into afenda-elite-*
  LOAD / symlink / submodule paths into afenda-Xerp
  inventing categories outside DOC-001 · auto-registering IDs without user approval
  treating Lite and Elite as divergent documentation systems
  reduced-viability quality / proposal / planning frames (sole bar = enterprise production; no-mvp-quality-bar)
  parking / deferral-as-completion / false YAGNI deletes (no consumer ≠ unused; no-park-defer-false-yagni)
  inventing Sales/Purchasing/Inventory/Finance skill farms before controlled ARCH-006 ADR
  Collapse/legacy recover from git (incl. git show mining) unless user names that recovery this turn
  treating Cursor Grep/Glob hits under docs/architecture/{backend,frontend,system,tech-stack,archive}/ or docs/guides/archive/ as disk truth (trust Test-Path · git ls-files · pnpm check:docs-trunk-ban)
```

**Authority above skills:** documentation homes, lifecycle, and register rules from [doc-control-rules](../afenda-elite-doc-control/doc-control-rules.md). Product display names follow [AGENTS.md](../../../AGENTS.md) and the deprecation register — do not invent alternate product titles in skills. Day-to-day Scratch packs: [docs-V2/README.md](../../../docs-V2/README.md).

**Skill inventory:** [catalog.md](catalog.md) — statuses `keep` · `extend` · `candidate` · `planned` · `forbidden`. Scratch under `docs-V2/**` may justify candidates only; it is never Living architecture. Cutover evidence: [living-docs-link-inventory.md](living-docs-link-inventory.md).

## PREFLIGHT (before this router)

Any turn that loads this skill or other farms/MCP/rules MUST open the user-visible reply with `### PREFLIGHT` per [agent-authority-preflight](../../rules/agent-authority-preflight.mdc) and [AGENTS.md](../../../AGENTS.md). Name this skill under **Skills** and set **Router:** `using-afenda-elite-skills`. Product/package code turns also list **`coding-discipline`** under **Rules** ([coding-discipline.mdc](../../rules/coding-discipline.mdc)); list **`afenda-coding-discipline`** under **Skills** only when that skill was loaded.

## Invoke order

```text
Task arrives (this repo / Afenda-Lite)
    │
    ├── Product routing, monorepo, docs types, apps/docs? ──→ THIS skill first
    ├── Raw prose / HTML / ticket / log / screenshot → Cursor mission compile? ──→ cursor-mission-compile (compile only; then new Agent chat with paste)
    ├── Docs create/update/deprecate/classify? ─────────────→ afenda-elite-doc-control → documentation-and-adrs (prose)
    ├── Docs duplication / conflict / SSOT / register drift? → afenda-elite-doc-integrity
    ├── Authority / plan / code alignment · coverage matrix? → afenda-elite-audit-orchestrator
    ├── One mission / commit mixing risk? ──────────────────→ bounded-agent-lanes
    ├── Dead code / Knip / skill-catalog drift? ────────────→ afenda-elite-repo-housekeeping
    ├── Cross-package import / DAG / new packages/*? ───────→ afenda-elite-monorepo-discipline
    ├── Cross-package move / extract / Slice D delete? ─────→ afenda-elite-monorepo-refactor
    ├── ARCH-028 residual / GUIDE-018 Phase I / Neon Auth optimisation (S* / I* / N* / command-sheet / neon-command-sheet)? → afenda-elite-implementation-slices (then farms from slice-map or neon-auth-slice-map; N* → Neon Slice Score + independent audit)
    ├── FE scaffold / wipe / app routes? ───────────────────→ afenda-elite-frontend-scaffold (consume `@afenda/ui-system` barrel per ADR-010)
    ├── Product UI compose / handroll fix / visual consistency / UI rating (features/* · product pages)? → afenda-elite-ui-compose (SCALABILITY-FIRST / UI-CAP-* / rule 15; Compose Score /100% + Path to 100%; then frontend-ui-engineering for a11y/state/responsive method only); done = capability check + verification matrix + score (floor `pnpm check:ui-system` = F*+C*+package/web tests; `pnpm --filter @afenda/web build` when matrix requires RSC/structural/CSS-font)
    ├── Shadcn Studio DNA / Pro blocks / dual components.json / Method A|B promote? → shadcn-ui (stage under `apps/web/shadcn-studio` → promote → prune; then ui-compose for product QUALITY ORDER); never product-import DNA; never registries on ui-system without ADR-010 reopen
    ├── Next.js App Router / RSC / rendering / proxy / MCP routes? → afenda-elite-nextjs-best-practice
    ├── Modules / ports / residue? ─────────────────────────→ afenda-elite-backend-modules
    ├── API contract / ActionResult / brands / OpenAPI / REST-001? ─→ afenda-elite-api-contract
    ├── Module evidence / MOD-009–010 / Module Enterprise Readiness claims? → afenda-elite-module-readiness
    ├── UI primitives / `@afenda/ui-system` (add/regenerate shadcn·Radix, tokens, barrel)? → shadcn-ui + ADR-010 owned-source workflow (`pnpm --filter @afenda/ui-system ui:add` → relative → barrel → tests); do not restore the retired `@afenda/ui` gateway / Collapse Studio-promote pipeline
    ├── React composition / compound-component / provider API architecture? → afenda-elite-react-composition (after `afenda-elite-ui-compose` classifies capability; vendor `vercel-composition-patterns` is progressive disclosure only)
    ├── React runtime / performance (waterfalls · rerenders · bundle · serialization · hydration)? → afenda-elite-react-best-practices (App Router/cache stays with `afenda-elite-nextjs-best-practice`; vendor `vercel-react-best-practices` is progressive disclosure only)
    ├── Root / package / app README · Diátaxis intro / compose · audit · README Score / Path to 100%? → afenda-readme-diataxis (not controlled Living docs/ bodies)
    ├── Internal technical docs prose (spec · ADR · runbook · migration)? → technical-writing (after `afenda-elite-doc-control` / `documentation-and-adrs` farm is fixed)
    ├── TS / coding discipline (brands · unions · any/as · boundary hygiene) after farm fixed? → afenda-coding-discipline (not PR review / simplify / API SSOT / React perf)
    ├── Generic engineering lifecycle? ─────────────────────→ using-agent-skills
    └── Domain farm (Neon tenancy)? ────────────────────────→ neon-tenancy-efficiency
```

**Rule:** This router chooses *which farm*. Vendor phase skills choose *how to engineer* once the farm is fixed. Housekeeping never deletes — it hands **Slice D** to monorepo-refactor. Day-to-day `@afenda/*` import/DAG checks use `afenda-elite-monorepo-discipline`. GUIDE-018 Phase I / residual ARCH-028 / Neon Auth `N*` serial implement uses `afenda-elite-implementation-slices` as the mission loop; it **loads** scaffold/modules/nextjs/neon/api per [slice-map](../afenda-elite-implementation-slices/slice-map.md) or [neon-auth-slice-map](../afenda-elite-implementation-slices/neon-auth-slice-map.md) — it does not replace those farms. `N*` closes only via Neon Slice Score + independent audit. Retired names: `portal-*-*` → use `afenda-elite-*` above. Wave 3: `afenda-elite-documentation` → `afenda-elite-doc-control`; `afenda-elite-docs-consistency` → `afenda-elite-doc-integrity`. Next.js mechanics: local `afenda-elite-nextjs-best-practice` (Vercel + Accelint + Cache Components; not an Xerp overlay).

## Docs filesystem (Docs lane)

Living Controlled `docs/**` is **dormant** on this checkout (cutover `71176a0`) until explicit Docs-lane reopen. Operative DOC rules live in [doc-control-rules](../afenda-elite-doc-control/doc-control-rules.md). Day-to-day Scratch = `docs-V2/**`. Official site = `@afenda/docs` (not DOC-001 SSOT).

```text
LOAD skill → afenda-elite-doc-control (doc-control-rules.md) → documentation-and-adrs (deep prose/ADR composition)
Authority  → DOC-001 + DOC-002 + DOC-003 operative rules (skill-local; Living bodies absent)
Classify   → Control | Architecture | ADR | API | REST | OPEN | Runbook | Guide | Module
Place      → docs/_control | docs/architecture [| /adr] | docs/api | docs/runbooks | docs/guides | docs/modules/<slug>
             (homes apply only when Living docs/ is restored via Docs-lane — do not invent the tree)
Write      → DOC-003 header (incl. Control State) + six sections; cite related IDs; no secrets
Register   → DOC-002 seven fields only — after explicit ID approval (no Control State column)
Lifecycle  → Status: Draft | Review | Accepted | Living | Target | Superseded | Retired
Control    → Control State: Open | Closed | Reopened (header-only; ≠ Status)
Verify     → header ↔ DOC-002; Control State enforced; filename {ID}-{kebab-slug}.md; no SSOT under doc/
Integrity  → afenda-elite-doc-integrity (N/A while Living docs/ absent)
Scratch    → docs-V2/** (engineering packs — not Living DOC-001)
Prose      → documentation-and-adrs (method library only — not register SSOT)
```

## Layers

| Layer | Owns |
|-------|------|
| L0 Rules / `AGENTS.md` | Always-on boundaries |
| L1 This skill + `using-agent-skills` | Product routing vs vendor lifecycle |
| L2 Documentation control · lanes · deprecation | Stability SSOT (skill-local DOC rules while Living dormant) |
| L3 Platform / module / housekeeping+discipline+refactor / catalog `keep|extend` (+ `planned` after approval) | Domain workflows |

## Local skill build (no Xerp fork)

| Allowed | Forbidden |
|---------|-----------|
| Rewrite patterns against Lite ARCH/API/Neon/DOC (skill-local + Scratch) | Copy Xerp trees · keep `afenda-Xerp/...` LOAD paths |
| Cite AGENTS · docs-V2 · farm companions · this repo only | Symlink / submodule / git-subtree / “sync from Xerp” |
| Prefer catalog **extend** before new `afenda-elite-*` | Fork vendor phase skills into Elite names |
| One-line historical provenance (optional) | “See Xerp for details” as incomplete body |
| `candidate → planned` only after user acceptance | Ad-hoc farms outside [catalog.md](catalog.md) |

Local skills must remain operable if `afenda-Xerp` is deleted **and** if Living `docs/` is absent. Inventory and gap rows live in [catalog.md](catalog.md); invoke order stays here.

## Operating contract

1. **Do not invent product display names** — follow AGENTS.md / deprecation register.
2. **DOC control model** — categories and folders per [doc-control-rules](../afenda-elite-doc-control/doc-control-rules.md). Living `docs/` writes require Docs-lane reopen + tree on disk. Do **not** recreate `doc/` or invent Living trees.
3. **`@afenda/docs` = official docs site** (active Fumadocs config) — not Living DOC-001 SSOT; no DB/Auth/`CRON_SECRET` on docs project; no `_reference/` upload; enterprise production bar only.
4. **Scratch `docs-V2/**`** — day-to-day engineering authority packs; not a second published docs app and not DOC-001 register SSOT.
5. **One lane per mission** — Ops / Fix / Docs / Test / Normalize; no mixing.
6. **Before creating a skill** — require a catalog row (`planned` after review), prefer **extend** an existing farm, then add a router bullet. Do not fork vendor or Xerp skills into `afenda-elite-*`.

## Non-goals

- Parallel Accepted/Living SSOT under `doc/` for either edition  
- Hand-maintained MD+JSON glossary twins as documentation SSOT  
- Per-module documentation control standards that weaken DOC-001  
- Treating Lite beta vs Elite battle-proven as an excuse for divergent catalogue rules  
- Duplicating vendor lifecycle inside Elite skills  
- Maintaining parity with or loading skills from `afenda-Xerp`  
- Requiring absent Living `docs/**` paths for Elite skills to function  

## Verification

- [ ] Invoked this skill (or equivalent LOAD) before product farm work  
- [ ] Docs work cites [doc-control-rules](../afenda-elite-doc-control/doc-control-rules.md), not a reinvented scheme  
- [ ] Lane named; no lane mixing  
- [ ] Skill chosen from [catalog.md](catalog.md) status (`keep` / `extend` / `planned`; never `forbidden` or unapproved `candidate`)  
- [ ] No operational path into `afenda-Xerp/.cursor/skills`  
- [ ] No required LOAD into absent Living `docs/**`  

## Additional resources

- Inventory: [catalog.md](catalog.md)  
- Living-link cutover: [living-docs-link-inventory.md](living-docs-link-inventory.md)  
- Pointer: [reference.md](reference.md)  
- Documentation governance: [afenda-elite-doc-control](../afenda-elite-doc-control/SKILL.md) · [doc-control-rules](../afenda-elite-doc-control/doc-control-rules.md)
- Documentation conflict audits: [afenda-elite-doc-integrity](../afenda-elite-doc-integrity/SKILL.md)
- Scratch packs: [docs-V2/README.md](../../../docs-V2/README.md)
- Housekeeping: [afenda-elite-repo-housekeeping](../afenda-elite-repo-housekeeping/SKILL.md)
- Discipline: [afenda-elite-monorepo-discipline](../afenda-elite-monorepo-discipline/SKILL.md) — ARCH-024 import/DAG/export surface
- Refactor: [afenda-elite-monorepo-refactor](../afenda-elite-monorepo-refactor/SKILL.md)
- Phase I / residual scaffold / Neon Auth N*: [afenda-elite-implementation-slices](../afenda-elite-implementation-slices/SKILL.md) — [command-sheet](../afenda-elite-implementation-slices/command-sheet.md) · [neon-command-sheet](../afenda-elite-implementation-slices/neon-command-sheet.md)
- FE scaffold: [afenda-elite-frontend-scaffold](../afenda-elite-frontend-scaffold/SKILL.md)
- Next.js App Router: [afenda-elite-nextjs-best-practice](../afenda-elite-nextjs-best-practice/SKILL.md) — Accelint + Cache Components Mode A default / Mode B ADR-gated
- Modules: [afenda-elite-backend-modules](../afenda-elite-backend-modules/SKILL.md)
- API contract: [afenda-elite-api-contract](../afenda-elite-api-contract/SKILL.md) — `docs-V2/api` Scratch + disk + companions; `pnpm check:openapi`
- Module readiness: [afenda-elite-module-readiness](../afenda-elite-module-readiness/SKILL.md) — MOD-002 evidence + Module Enterprise Readiness claims (`*-MOD-009` / `*-MOD-010`)
- Vendor lifecycle: [using-agent-skills](../agent-skills/skills/using-agent-skills/SKILL.md)
- Docs prose: [documentation-and-adrs](../agent-skills/skills/documentation-and-adrs/SKILL.md)
- Lanes: [bounded-agent-lanes](../agent-skills/skills/bounded-agent-lanes/SKILL.md)
