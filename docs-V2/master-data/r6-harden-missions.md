# R6 harden missions (Scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/master-data/r6-harden-missions.md` |
| Authority | **Scratch** — optional harden; not §23 Absent stages |
| Mode | Mission briefs (one row per chat) |
| Updated | 2026-07-20 |
| Parents | [remaining-slices.md](remaining-slices.md) R6 · [development-method.md](development-method.md) · DNA §7.2 · §13 |

**Action this doc enables:** `/cursor-mission-compile` a single R6 row without bundling R4/R5.

---

## Rules

- One harden row per Agent chat.
- Never reopen spine or use R6 to redesign Authority B.
- No free JSON as item commercial truth.
- Bulk-import **approve** is R6 (Q2 resolved — not R2).

---

## R6-import-approve — SHIPPED 2026-07-20

| | |
|--|--|
| **DNA** | §13 lifecycle `uploaded → parsed → validated → approved → applied → reconciled` |
| **Ship** | Explicit approve step and/or permission before `apply` import; keep dry-run + reconcile |
| **Surfaces** | `packages/erp/master-data` import primitives if needed · `apps/web` validate/apply Actions · RBAC code (e.g. extend `master_data.manage` or add `master_data.import_approve`) |
| **Must not** | Auto-apply on validate; bypass CAS; unbounded one-TX files |
| **Pattern** | Existing `import-bulk.ts` · `validate-master-data-import.ts` · `apply-master-data-import.ts` |
| **Verify** | Deny apply without approve · dry-run unchanged · org bind · web permission tests |
| **Status** | **SHIPPED** |
| **Evidence** | `import-bulk.ts` (`approved` required when `dryRun: false` → `MASTER_IMPORT_NOT_APPROVED`) · `platform-permission-catalog.ts` (`master_data.import_approve`) · validate Action `master_data.manage` · apply Action `master_data.import_approve` + stamps `approved: true` · `__tests__/import-bulk.test.ts` · `apps/web/__tests__/master-data-import.test.ts` |

```bash
pnpm --filter @afenda/master-data typecheck test
pnpm --filter @afenda/web test -- master-data-import
```

---

## R6-item-optional

| | |
|--|--|
| **DNA** | §7.2 optional controlled relationships |
| **Ship** | Typed columns or typed extension tables on `md_item`: brand, manufacturer `party_id`, tax classification (code/ref — not registration engine), country of origin, shelf-life metadata, weight/dimensions |
| **Must not** | `variant_json` / unrestricted JSON bag; tax **registration** (that is R4) |
| **Pattern** | Item update commands + migration + hard-tenant if new child tables |
| **Verify** | Schema tests · CAS · same-org manufacturer party · pageSize lists unchanged |

```bash
pnpm --filter @afenda/db test -- master-data-schema
pnpm --filter @afenda/master-data typecheck test
pnpm audit:tenancy-nulls
```

---

## R6-dna-prose

| | |
|--|--|
| **DNA** | Stale §13 line: “Bulk APIs are a named importer slice…” |
| **Ship** | Doc-only edit of [master-data-dna.md](master-data-dna.md) §13 to match §23 **Shipped** import |
| **Must not** | Product code changes |
| **Verify** | `rg` shows no contradictory “not required / named importer slice” claim vs Shipped matrix |

---

## Compile hints

```text
MISSION: Ship R6-<row> per docs-V2/master-data/r6-harden-missions.md
ATTACH: /afenda-elite-backend-modules   # or none for R6-dna-prose doc-only
KNOWN CONTEXT:
- docs-V2/master-data/r6-harden-missions.md
- docs-V2/master-data/remaining-slices.md
```

Default product calendar when undecided: prefer **R6-import-approve** or **R6-item-optional** before tax-heavy R4 implement.
