# DNA ledger — agent / HITL protocol

**Machine SSOT:** [`dna-ledger.json`](dna-ledger.json)  
**Narrative audit:** [`11-studio-admincn-possibility-audit.md`](../../../docs/scratch/neon-auth-optimisation/11-studio-admincn-possibility-audit.md)  
**Pattern ancestor (not a merge target):** historical FFT ui-registry (skill removed with nuclear wipe) — platform DNA stays lean here.

## Own install registry — DEFERRED

Do **not** create or wire an Afenda-hosted shadcn registry (`@afenda/*` JSON host). Do **not** add `registries` to [`packages/surfaces/ui-system/components.json`](../../../packages/surfaces/ui-system/components.json) without an explicit ADR-010 reopen. Studio `@ss-*` registries belong only on the DNA forwarder `apps/web/components.json` (Method A staging).

Metadata ROI now = this ledger. Install-registry hosting = later ADR mission only.

## When to load

Before any Studio `/iui` / `/cui` / `/rui` promote or Method A/B land:

1. Read `dna-ledger.json` for the matching `studioId` / `id`.
2. Honor `verdict`, `status`, `landPath`, `strip`, `method`.
3. After a real promote to disk, update the row (`status`, `updated`, evidence) in the **same** change — do not leave ledger stale.

## Status meanings

| Status | Meaning |
|--------|---------|
| `candidate` | Audited; not yet staged/promoted |
| `staged` | Present under `apps/web/shadcn-studio/` only — not product runtime |
| `promoted` | Upgraded and landed at `landPath`; product may compose via barrel/features |
| `rejected` | Do not stage or promote |
| `deferred` | Parked with explicit reason — not REJECT forever |

## Field contract (high ROI)

| Field | Required | Notes |
|-------|----------|-------|
| `id` | yes | `AFN-DNA-<SLUG>` |
| `studioId` / `studioNs` | yes | Studio name + namespace |
| `verdict` / `method` / `status` | yes | For REJECT rows, `method` = how audited (usually `B`), not “install this” |
| `landPath` | yes | Single primary path; `""` when rejected |
| `feZones` / `barrelDeps` / `strip` | yes | Arrays (may be empty) |
| `evidenceRef` | yes | Repo-relative file path — **no** heading anchors |
| `updated` | yes | `YYYY-MM-DD` |
| `notes` | no | Secondary lands, strip rationale |

## Compulsory rules

1. Namespace **`AFN-DNA-*` only** in this file. Do not invent parallel DNA namespaces (FFT / Declarations product farms removed).
2. **Never** product-import `apps/web/shadcn-studio/**`.
3. Do **not** self-set `status: promoted` without: (a) files on disk at `landPath`, (b) upgrade checklist done, (c) user/HITL acknowledgment in the mission.
4. `verdict: REJECT` / `status: rejected` — do not reopen without user order this turn; do not stage.
5. Themes / `install-theme` / `@ss-themes` — stay rejected vs owned `tokens.css`.
6. Auth: chrome DNA only (`AFN-DNA-LOGIN-PAGE-CHROME`); Neon `AuthView` stays; Studio login forms stay stripped.
7. New `AFN-DNA-*` row → ask human before inventing id; seed from audit + Studio evidence.
8. No Vitest/pnpm ledger gate this revision — do not invent `check:dna-ledger` without an Approved slice.
9. Keep `landPath` a single concrete path (not `a + b`); put secondary homes in `notes`.

## Promote flow (ledger)

```text
LOAD dna-ledger.json row
  → Method B or A per row.method
  → stage apps/web/shadcn-studio/ (optional) → status staged
  → upgrade checklist (shadcn-ui reference) → land at landPath
  → strip[] applied · prune DNA residue
  → status promoted · updated · evidenceRef
  → afenda-elite-ui-compose QUALITY ORDER
```

## Enforcement

Agent discipline + HITL only. Floor after promote: `pnpm check:ui-system`.
