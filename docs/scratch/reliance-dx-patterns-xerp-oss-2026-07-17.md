# Reliance / graph / DX patterns — Xerp + OSS (research notes)

**Posture:** Scratch only — not Living, Target, or Accepted. Not DOC-002 registered. Feed a future Docs-lane ADR only after explicit ID approval.

**Mission date:** 2026-07-17  
**Mode:** Research + notes only  
**Housekeeping lane:** `afenda-elite-repo-housekeeping` **audit** (discover/classify; no Slice D, no CI promote)

---

## Mission non-goals (explicit)

| Non-goal | Status this mission |
|----------|---------------------|
| Live exporters / revive `export:reliance-graph` | Deferred (Approved ADR only) |
| Gate revive (`check:reliance-*` → real scripts) | **Removed** 2026-07-17 with inventory retire |
| Snapshot rewrite of `docs/architecture/reliance-graph.snapshot.json` | **Retired/deleted** 2026-07-17 (not rewritten) |
| `package.json` / `apps/**` / `packages/**` edits | Not done |
| Collapse/legacy recover of wiped reliance scripts or banned trees | Forbidden |
| Xerp LOAD / copy / symlink / skill fork into Lite | Forbidden |
| Claim Living SSOT from the 2026-07-12 reliance snapshot | Forbidden |

---

## Access evidence (how sources were read)

| Channel | Result |
|---------|--------|
| Cursor MCP `user-github` | **Not registered** in this session (available MCP list had no GitHub server) |
| `gh` CLI | Unauthenticated after clearing bad injected `GITHUB_TOKEN` |
| Public GitHub REST + `raw.githubusercontent.com` | Used for read-only pattern cites (same content GitHub MCP would fetch) |

Primary Xerp repo: [pohlai88/afenda-Xerp](https://github.com/pohlai88/afenda-Xerp) (`main`, public).

---

## 1. Local Lite baseline (inventory, not authority)

| Artifact | Fact | Implication |
|----------|------|-------------|
| `docs/architecture/reliance-graph.snapshot.json` | `generatedAt`: **2026-07-12T06:32:12.310Z**; `fingerprint`: `9dc7bb8ceb3568a2`; `version`: `1.0.0` | Pre-Checkpoint-G Collapse-era materialization; **not** Living Target SSOT |
| Node types in snapshot | `server-action`, `domain`, `gate`, `ccp`, edges `materializes` / validates-style | Product surface → domain → gate graph (CCP-RG-001…003) |
| Root scripts | `export:reliance-graph`, `check:reliance-graph-drift`, `check:reliance-coverage` → `scripts/collapse-script-unavailable.mjs` | Unevaluated inventory aliases — do not treat as live DX |
| Mapping twin | `reliance-mapping.snapshot.json` **retired 2026-07-17**; mapping export/check aliases **removed** | Do not revive mapping lane without Approved slice |
| Living boundaries | [ARCH-024](../architecture/ARCH-024-package-boundaries.md) package DAG + `feature-db-boundary` test | Forward enforcement already exists without reliance exporters |
| Anti-contamination | [ARCH-028](../architecture/ARCH-028-implementation-slices.md) anti-contamination lock | No git recover of wiped reliance exporters / banned trees |

**Verdict on the snapshot:** historical evidence of a **control-plane graph** pattern (nodes + edges + CCP + gate commands + slices). It must not be cited as current architecture truth for `apps/web` Target tree.

---

## 2. Xerp patterns (cite + learn)

### 2.1 Integration graph = committed snapshot + live rebuild + drift gate

| Pin | URL / path |
|-----|------------|
| Repo | https://github.com/pohlai88/afenda-Xerp |
| Export | [`scripts/governance/export-integration-graph.mts`](https://github.com/pohlai88/afenda-Xerp/blob/main/scripts/governance/export-integration-graph.mts) |
| Drift check | [`scripts/governance/check-integration-graph-drift.mts`](https://github.com/pohlai88/afenda-Xerp/blob/main/scripts/governance/check-integration-graph-drift.mts) |
| Snapshot | [`docs/architecture/integration-graph.snapshot.json`](https://github.com/pohlai88/afenda-Xerp/blob/main/docs/architecture/integration-graph.snapshot.json) |
| Root scripts | `export:integration-graph`, `check:integration-graph-drift` in [package.json](https://github.com/pohlai88/afenda-Xerp/blob/main/package.json) |

**Shape (ADR-relevant):**

1. **Versioned snapshot contract** — `IntegrationGraphSnapshot` with `version`, `fingerprint`, `generatedAt`, `nodes`, `edges`, `slices`.
2. **Typed node vocabulary** — `api-operation` · `ccp` · `gate` · `lab-route` · `module-surface` · `package` · `spine-wiring`.
3. **Typed edge vocabulary** — `consumes` · `depends-on` · `materializes` · `validates`.
4. **Materialization from Living registries** — exporter `import()`s authority registries (foundation disposition, API contracts, PAS006 UI contract, context spine, lab route registries), then builds the graph. Snapshot is a **projection**, not a hand-edited SSOT.
5. **Deterministic compare** — normalize (sort edges/nodes/slices), JSON-stringify equality; stale message: `Run: pnpm export:integration-graph`.
6. **Self-referential CCP** — `FSI-CCP-010` = “Integration graph export freshness” gated by `check:integration-graph-drift` (graph validates its own freshness control).
7. **Slice ledger inside the graph** — `FSI-S*` rows with `status`/`priority`/`summary` (program tracking colocated with edges).

Xerp snapshot meta (read 2026-07-17): `fingerprint` `FOUNDATION-DISPOSITION-2026-07-06-v43`, `generatedAt` `2026-07-06T17:39:48.766Z`, `version` `1.0.0`.

**Lite parallel (historical only):** Lite `reliance-graph.snapshot.json` used the same family (`CCP-RG-*`, `gate:check:reliance-*`, `materializes`, `slices` RG-S1…S3) — likely the Collapse-era sibling of Xerp’s FSI integration graph, not a package DAG.

### 2.2 Package architecture authority = separate graph lane

| Pin | URL / path |
|-----|------------|
| Validate | [`scripts/quality/check-architecture.mjs`](https://github.com/pohlai88/afenda-Xerp/blob/main/scripts/quality/check-architecture.mjs) → `@afenda/architecture-authority` |
| Drift | [`scripts/architecture/drift.mjs`](https://github.com/pohlai88/afenda-Xerp/blob/main/scripts/architecture/drift.mjs) |
| Snapshot home | `packages/architecture-authority/dependency-snapshot.json` (compared live vs committed `runtimeEdges`) |
| Scripts | `quality:architecture`, `quality:architecture-drift`, `architecture:dependencies`, `architecture:cycles`, `architecture:report` |

**Learn:** Xerp splits **(A) product/control integration graph** (surfaces ↔ APIs ↔ CCPs ↔ gates) from **(B) workspace package dependency graph** (layers, cycles, registry). Lite already owns (B)-shaped rules in ARCH-024 + Vitest boundary tests; (A) is what the stale reliance snapshot attempted.

### 2.3 DX / housekeeping: Knip expand + classify → Slice D

| Pin | URL / path |
|-----|------------|
| Skill | [`.cursor/skills/afenda-repo-housekeeping/SKILL.md`](https://github.com/pohlai88/afenda-Xerp/blob/main/.cursor/skills/afenda-repo-housekeeping/SKILL.md) |
| Config | [`knip.jsonc`](https://github.com/pohlai88/afenda-Xerp/blob/main/knip.jsonc) — `ignoreWorkspaces` default-deny + `!packages/...` allowlist expand |
| Scripts | `housekeeping:knip*`, `housekeeping:audit`, `housekeeping:verify` |

**Learn (already partially local):**

- Modes: `audit` · `expand` · `plan` · `align` · `promote`.
- Hard stop: no repo-wide `knip --fix`; no `"turbo": true` in knip config.
- Removals always **Slice D** via monorepo-refactor — housekeeping never deletes.
- CI: advisory Knip first, promote to blocking only with explicit criteria.

Lite already rewrote this as `afenda-elite-repo-housekeeping` (catalog: Lite rewrite of Xerp, no Xerp LOAD).

### 2.4 Monorepo discipline skill (layer ranks + public surface)

| Pin | URL / path |
|-----|------------|
| Skill | [`.cursor/skills/monorepo-discipline/SKILL.md`](https://github.com/pohlai88/afenda-Xerp/blob/main/.cursor/skills/monorepo-discipline/SKILL.md) |

**Learn:** Ranked layers (Platform → … → Application), package-name-only imports, `index.ts` public surface, no app←package reverse deps, `workspace:*`, phantom-dep ban, scaffold + registry ownership split.

Lite equivalent: `afenda-elite-monorepo-discipline` + Living ARCH-024 (simpler six-package Target — **do not** import Xerp 7-tier ERP layer table wholesale).

### 2.5 What Xerp does *not* teach Lite to copy

- Storybook orphan housekeeping / PAS / foundation-registry-owner lanes (Lite: Storybook dormant; foundation disposition N/A).
- Supabase / ERP lab route / PAS006 UI contract graph inputs (Lite: Neon Auth + FFT/declarations Target).
- Operational skill LOAD from `afenda-Xerp/.cursor/skills` (router SKIP).

---

## 3. OSS references (≥2) — graph / config materialization / DX gates

### 3.1 dependency-cruiser — [sverweij/dependency-cruiser](https://github.com/sverweij/dependency-cruiser)

| Learn | Fit for Afenda-Lite |
|-------|---------------------|
| Rule-driven import validation (forbidden/allowed paths, cycles, orphans) with CI-friendly text + graph outputs | **Adapt** as optional implementer for ARCH-024 / feature↛db rules if Vitest-only coverage becomes insufficient |
| Config-as-policy (`.dependency-cruiser.js`) rather than committed mega-snapshots | Prefer **live rules** over stale JSON SSOT |
| Visualization is a side-effect, not the control | Matches Xerp: gates first, pretty graph optional (Lite RG-S3 was “planned viz”) |

### 3.2 Nx `@nx/eslint-plugin` — enforce-module-boundaries + dependency-checks

| Pin | URL |
|-----|-----|
| Boundaries rule | https://github.com/nrwl/nx/blob/master/packages/eslint-plugin/src/rules/enforce-module-boundaries.ts |
| Dep checks | https://github.com/nrwl/nx/blob/master/packages/eslint-plugin/src/rules/dependency-checks.ts |

| Learn | Fit for Afenda-Lite |
|-------|---------------------|
| Tag/layer constraints enforced at lint time on every import | **Adapt concept** — Lite already uses Vitest contract tests; ESLint boundary plugin is an alternative materialization path |
| `dependency-checks` aligns `package.json` deps with actual imports (phantom dep gate) | **Keep idea** — aligns with Xerp monorepo-discipline rule 6 |
| Deep Nx graph cache / project graph | **Reject** wholesale Nx adoption for this Turborepo Lite checkout |

### 3.3 Bonus (already in Lite): Knip — [webpro-nl/knip](https://github.com/webpro-nl/knip)

Unused export/file/dep discovery with workspace expand. Xerp and Lite both use Knip for housekeeping DX — **keep** scoped expand; do not conflate Knip with reliance/integration graphs.

---

## 4. Afenda-Lite fit matrix (keep / adapt / reject)

Against **ARCH-028** (scaffold closed, anti-contamination) + **Living Target** (ARCH-022…027, ARCH-024 DAG, GUIDE-018 program).

| Pattern | Source | Decision | Rationale |
|---------|--------|----------|-----------|
| Dual lanes: package DAG vs product/control graph | Xerp A+B | **Keep conceptual split** | Prevents overloading ARCH-024 with action/route CCP graphs |
| Export → commit snapshot → drift gate | Xerp integration graph; Lite historical reliance | **Adapt later only via Approved slice** | Pattern sound; current exporters wiped; stale snapshot must not gate CI |
| Typed nodes/edges + CCP↔gate self-check | Xerp FSI-CCP-010; Lite CCP-RG-* | **Adapt** vocabulary if/when graph returns | Prefer Target registries (`modules/*`, OpenAPI, route groups) as inputs — not Collapse `app/actions` |
| Hand-edit snapshot as Living SSOT | Anti-pattern | **Reject** | Snapshot is projection; Living SSOT = registries + ARCH docs + tests |
| Revive Collapse reliance scripts from git | — | **Reject** | ARCH-028 anti-contamination; greenfield only |
| Xerp architecture-authority package + multi-rank layer registry | Xerp | **Reject wholesale**; **adapt** thin Lite checks | Six-package Target + ARCH-024 + existing Vitest gates suffice until DAG complexity justifies a package |
| Knip expand / classify / Slice D / advisory→blocking | Xerp + Lite housekeeping | **Keep** | Already local Elite rewrite |
| Monorepo discipline (import direction, public barrel) | Xerp skill / ARCH-024 | **Keep** Living ARCH-024; skill already local | |
| Nx / dependency-cruiser as immediate blockers | OSS | **Defer** | Introduce only if Approved DX slice proves Vitest/ARCH gates insufficient |
| Claim 2026-07-12 reliance snapshot as Target truth | — | **Reject** | `generatedAt` pre-G; paths (`app/actions/...`) Collapse-era |

---

## 5. ADR-ready decision sketch (for a future Docs-lane ADR — not opened here)

**Proposed decision title (draft):** “Control-plane graph materialization vs package-boundary enforcement”

**Recommended stance to propose later:**

1. **Package boundaries** remain Living under ARCH-024 + Vitest (and optional future depcruiser/Nx-style lint) — **blocking**.
2. **Product/control reliance or integration graphs** are optional program tooling: only after an Approved GUIDE-018 / housekeeping slice that (a) defines Target registry inputs under `apps/web/**` + `packages/*`, (b) greenfields exporters (no Collapse recover), (c) treats `docs/architecture/*.snapshot.json` as generated evidence with drift gates, (d) never claims Living until DOC-001 Control State allows.
3. **Executed 2026-07-17:** root reliance/route-coverage/`check:import-boundaries` aliases and stale snapshots **removed** (mapping-retire parallel). Do not rewrite deleted snapshots; greenfield graph only via Approved ADR.

**Open questions for that ADR (not answered here):**

- Single graph (routes+actions+gates) vs split (OpenAPI honesty already GUIDE-018 I2) ?
- Fingerprint source on Lite (no foundation-disposition registry) ?
- Whether route-coverage snapshot follows the same contract family ?

---

## 6. Housekeeping completion (this mission)

| Item | Evidence |
|------|----------|
| Mode | `audit` (research notes) |
| Workspaces | `docs/scratch` only |
| Findings by class | Pattern inventory — no `unused-*` deletes |
| Delegated slices | none (no Slice D) |
| Gates | n/a (no code) |
| CI promotion | unchanged |
| Next recommended | Docs-lane ADR draft only when user orders ID + Control reopen; implement exporters only under Approved slice |

---

## Change log

| Date | Summary |
|------|---------|
| 2026-07-17 | Disposition execute: retired snapshots + removed gated aliases; greenfield graph remains deferred |
| 2026-07-17 | Initial research notes: Xerp integration/architecture/Knip patterns + OSS depcruiser/Nx; Afenda keep/adapt/reject vs ARCH-028/Living Target |
