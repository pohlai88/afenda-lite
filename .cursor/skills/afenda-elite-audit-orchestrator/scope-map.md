# Audit Orchestrator — Scope Map

Farm routing per domain keyword. Always also load: main [SKILL.md](SKILL.md) and [reference.md](reference.md).

## Scope routing table

| Scope keyword | LOAD farms (order) | Tier A authority | Farm evidence | Minimum checks |
|---------------|-------------------|------------------|---------------|----------------|
| `repository` | router → doc-integrity → repo-housekeeping | DOC-001…003 · AGENTS.md | — | `check:docs-naming`, `check:docs-trunk-ban`, `check:doc-integrity`, `pnpm lint`, `pnpm typecheck` |
| `ui-system` | router → frontend-scaffold | ADR-010 · ARCH-024 § ui-system | — | `pnpm --filter @afenda/ui-system test`, `pnpm --filter @afenda/web test` (ui-boundary), `pnpm --filter @afenda/web build` |
| `api` | router → api-contract | ARCH-029 · API-* · REST-* · OPEN-* | [`completeness.md`](../afenda-elite-api-contract/completeness.md) | `check:doc-integrity`, `check:openapi`, `pnpm typecheck` |
| `modules` | router → backend-modules → module-readiness | ARCH-006 · ARCH-022 · MOD-002 | per-pack `*-MOD-009/010` | `check:module-quality` |
| `fft` | router → feed-farm-trade | FFT-MOD-* | [`completeness.md`](../feed-farm-trade/completeness.md) · [`verify.md`](../feed-farm-trade/verify.md) | farm verify commands from skill |
| `phase-I` | router → implementation-slices | GUIDE-018 | [`slice-map.md`](../afenda-elite-implementation-slices/slice-map.md) | per-row Verify column |

## Check inventory (repository level)

Available `pnpm` checks and their typical exit codes:

| Check | Type | Gated? | Typical scope |
|-------|------|--------|---------------|
| `check:docs-naming` | Live | No | DOC-002 filename/ID validation |
| `check:docs-trunk-ban` | Live | No | Validates no docs/architecture/backend etc. (trunk-ban rule) |
| `check:doc-integrity` | Live | No | doc↔doc SSOT drift audit |
| `check:module-quality` | Live | No | MOD-002 module pack validation |
| `check:openapi` | Live | No | OpenAPI YAML + schema validation |
| `validate:neon-env` | Live | No | Neon Cloud ids vs `.env.local` |
| `check:tenancy-residue` | Gated | Yes | → `collapse-script-unavailable` |
| `check:copy` | Gated | Yes | → `collapse-script-unavailable` |
| `check:tsconfig-no-baseurl` | Live | No | TypeScript config validation |
| `check:nav` | Gated | Yes | → `collapse-script-unavailable` |
| `check:proxy` | Gated | Yes | → `collapse-script-unavailable` |
| `check:db-schema` | Gated | Yes | → `collapse-script-unavailable` |
| `check:playground` | Gated | Yes | → `collapse-script-unavailable` |
| `check:production:*` | Gated | Yes | → `collapse-script-unavailable` |
| `check:brand-icons` | Gated | Yes | → `collapse-script-unavailable` |
| `check:import-boundaries` | Gated | Yes | → `collapse-script-unavailable` |
| `check:ui-sync` | Gated | Yes | → `collapse-script-unavailable` |
| `check:fft-ui-registry*` | Gated | Yes | → `collapse-script-unavailable` |
| `check:reliance-*` | Gated | Yes | → `collapse-script-unavailable` |
| `check:route-coverage-drift` | Gated | Yes | → `collapse-script-unavailable` |

**Gated script rule:** Scripts that route through `collapse-script-unavailable.mjs` are inventory, not live controls. They exit non-zero and report as **Unevaluated**, pushing coverage to **Incomplete**.

Total root scripts: ~99 in `package.json`. Gated count: ~62. Live controls: ~37.

## Scope discovery patterns

### By file pattern
- `.md` under `docs/` → `repository`
- `packages/ui-system/**` → `ui-system`
- `docs/api/**` → `api`
- `docs/modules/**` → `modules`
- `docs/modules/feed-farm-trade/**` → `fft`
- `docs/guides/GUIDE-018-*` → `phase-I`

### By user keyword
- "audit", "alignment", "doc-to-code" → auto-select based on mentioned domains
- "ui-system", "design-system", "ADR-010" → `ui-system`
- "API contract", "REST", "OpenAPI" → `api`
- "modules", "MOD-002", "Enterprise Readiness" → `modules`
- "FFT", "Feed Farm Trade" → `fft`
- "Phase I", "GUIDE-018", "implementation slices" → `phase-I`

### By plan reference
- Plan cites ADR-010 / ui-system → `ui-system`
- Plan cites ARCH-029 / API-* → `api`
- Plan cites GUIDE-018 → `phase-I`

## Exclusion patterns (negative controls built-in)

### Forward-recorded exclusions
- API completeness: items marked "Recorded (forward)", "Draft — not Living SSOT"
- FFT completeness: "Intentional", "contract-only until needed"
- Module packs: "Draft" lifecycle docs with forward claims

### Absent-by-design exclusions
- Root paths: `app/`, `modules/`, `features/`, `components-V2/` (AGENTS.md explicit list)
- Collapse residue: `lib/`, `db/`, `e2e/`, `testing/`, `messages/`, script bodies
- Playground: any `/playground/` trees (removed 2026-07-15 per deprecation register)

### Docs-first vs Target exclusions
- Module paths: logical `modules/*` documented vs physical `apps/web/modules/*`
- Package existence: Target `@afenda/db` vs docs-first checkout without it

## Precise pattern library

### Package import patterns
- Retired gateway: `from ["']@afenda/ui["']` or `@afenda/ui/` (NOT `@afenda/ui\b`)
- Active package: `from ["']@afenda/ui-system["']` (distinct from retired)
- Route imports: `from ["']@/` (app-internal relative imports)

### File existence commands
```bash
# Preferred: tracked files only
git ls-files packages/ui-system

# Existence check
Test-Path "packages/ui-system" # PowerShell
test -e packages/ui-system     # bash

# Structure validation
pnpm check:docs-trunk-ban
```

### Pattern precision rules
- Use exact string patterns, not word boundaries near punctuation
- Cite the exact command in every finding's evidence cell
- Prefer `git ls-files` over Cursor index (may have ghosts)

## Usage workflow

1. **Discover** → parse user scope → select row(s) from routing table
2. **Baseline** → load Tier A authorities + farm evidence + check inventory  
3. **Audit** → run applicable checks + apply negative controls + classify findings
4. **Plan** → delegate next steps to LOAD farms (no direct controlled-doc writes)
5. **Verify** → re-run + diff against prior audit

Each mode produces structured output per the main SKILL.md contract.