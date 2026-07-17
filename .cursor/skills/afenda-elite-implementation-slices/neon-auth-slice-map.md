# Neon Auth slice map (`N1`–`N18`)

Load with [SKILL.md](SKILL.md) + [neon-slice-score.md](neon-slice-score.md) when `SLICE_ID` is `N*`.

**Posture:** every row starts **UNEVALUATED**. GUIDE-018 / ARCH-028 checkboxes do not set APPROVED. Update last score / verdict only after scored missions + auditor.

**Discovery (not Living SSOT):** `docs/scratch/neon-auth-optimisation/`.

## Farm short names

Reuse [slice-map.md](slice-map.md) § Farm short names. Additional:

| Short | Skill |
|-------|--------|
| neon-vendor | `.agents/skills/neon` · `neon-postgres` (method; not product SSOT) |

## Program waves

| Wave | IDs | Theme |
|------|-----|--------|
| 0 | N1–N4 | Neon / DB foundation |
| 1 | N5–N8 | Identity / session |
| 2 | N9–N12 | Tenancy / authz / evidence |
| 3 | N13–N15 | Verification / ops |
| 4 | N16–N18 | ERP verticals (FFT freeze applies) |

## Slice table

| ID | Objective (short) | Lane | LOAD farms (order) | Living authority | Floor verify (minimum) | State | Last score | Auditor |
|----|-------------------|------|--------------------|------------------|------------------------|-------|------------|---------|
| **N1** | Typed Neon env contract | Ops | router → slices → neon → neon-vendor | ARCH-027 · AGENTS | `@afenda/env` typecheck/tests · `pnpm validate:neon-env` · web build if env structural | APPROVED | 100% | independent audit 2026-07-16 |
| **N2** | Connection + migration discipline | Ops | router → slices → neon → modules | ARCH-025 · ARCH-023 | db package tests · migration inventory · no `0000_*` baseline on prod branch | APPROVED | — | human waiver Closed 2026-07-17 (do not reopen) |
| **N3** | Backup / recovery evidence | Ops | router → slices → neon | ARCH-025 · RB-001 | Restore/RPO path rehearsed or BLOCKED named | APPROVED | 98% | independent audit 2026-07-17 |
| **N4** | DB performance baseline | Ops | router → slices → neon | ARCH-023 · RB-001 | Pooler posture · CU evidence discipline | APPROVED | 100% | independent audit 2026-07-17 · Path-to-100% 2026-07-17 |
| **N5** | Auth BFF + browser client | Ops | router → slices → nextjs → neon → neon-vendor | ARCH-026 | auth package tests · `/api/auth` path · web typecheck | APPROVED | 100% | independent audit 2026-07-17 |
| **N6** | Session contract | Ops | router → slices → nextjs → neon | ARCH-026 · ARCH-023 | session helpers · proxy gate tests · fail-closed | APPROVED | 100% | independent audit 2026-07-17 |
| **N7** | Post-login routing | Ops | router → slices → nextjs → neon → scaffold | ARCH-026 | role home redirect · safe callback · signed-in `/` bounce · web build · browser proof | APPROVED | 100% | independent audit 2026-07-17 |
| **N8** | Organization membership | Ops | router → slices → nextjs → neon → modules | ARCH-026 · ARCH-023 | invite/join path · Origin=`APP_URL` · tests | APPROVED | 100% | independent audit 2026-07-17 · Path-to-100% closed (ARCH-026 2.0.0 Zoho SMTP lock) |
| **N9** | Hard tenancy enforcement | Ops | router → slices → neon → modules | ARCH-023 | org predicate audits · isolation tests | APPROVED | 100% | independent audit 2026-07-17 |
| **N10** | Permission kernel | Ops | router → slices → neon → modules → api | ARCH-023 | permission codes · hasPermission surface | APPROVED | 100% | independent audit 2026-07-17 |
| **N11** | Product authorization wiring | Ops | router → slices → modules → neon → readiness | ARCH-023 · GUIDE-018 I3.1 | product ports use permissions beyond coarse role | APPROVED | 100% | independent audit 2026-07-17 |
| **N12** | Audit / security evidence | Ops | router → slices → security → neon | GUIDE-017 · ARCH-023 | audit evidence · secret/unsafe-error closed or evidenced | APPROVED | 100% | independent audit 2026-07-17 · Path-to-100% repair SCORED 2026-07-17 (re-audit required) |
| **N13** | Authenticated E2E factory | Test | router → slices → tdd · lanes | GUIDE-018 I4 · testing/ | factories under `testing/` · smoke green | APPROVED | 100% | independent audit 2026-07-17 at 95% · Path-to-100% repair SCORED 2026-07-17 (re-audit required) |
| **N14** | Security / failure verification | Ops | router → slices → security → neon | GUIDE-017 | denial / failure cases evidenced | UNEVALUATED | — | — |
| **N15** | Production operations | Ops | router → slices → neon → ship | RB-001 · RB-005 · AGENTS | domains · deploy health · validate scripts | UNEVALUATED | — | — |
| **N16** | Shared ERP platform shell | Ops | router → slices → scaffold → modules | ARCH-015/018 as needed | shell composes ports · ui-compose if UI | UNEVALUATED | — | — |
| **N17** | Declarations vertical | Ops | router → slices → modules → readiness → neon | Declarations MOD · ARCH-023 | submit/read under hard tenancy | UNEVALUATED | — | — |
| **N18** | FFT permitted vertical | Ops | router → slices → fft → modules | FFT-MOD-008 | Phase 2A envelope only — no 2B–2D | UNEVALUATED | — | — |

## Serial order

```text
N1 → N2 → N3 → N4 → N5 → N6 → N7 → N8 → N9 → N10 → N11 → N12 → N13 → N14 → N15 → N16 → N17 → N18
```

Skip only with explicit user waiver **this turn**. One `N*` per chat. Do not start next until auditor APPROVED (or human waiver).

**Program pointer:** last APPROVED = **N13** (independent audit 2026-07-17 at 95%; Path-to-100% repair SCORED 100% 2026-07-17 — **re-audit required** before treating Path-to-100% as closed). Next = **N14** — authorize only after Path-to-100% re-audit APPROVED in a fresh mission chat; do **not** sneak-start here.

## Related I* (load hints only — not APPROVED transfer)

| N* | May overlap GUIDE-018 |
|----|------------------------|
| N5–N6 | I1.1–I1.4 surfaces |
| N7 | Post-login gap (not a separate I* today) |
| N8 | I1.3 invite/join |
| N11 | I3.1 |
| N13 | I4 |
| N17 | I3.2 |
| N18 | I3.3 + FFT freeze |

Re-score against this map’s acceptance; do not inherit GUIDE checkboxes as Neon APPROVED.
