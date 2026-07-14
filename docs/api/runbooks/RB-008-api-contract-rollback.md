# RB-008 API Contract Rollback

| Field             | Value      |
| ----------------- | ---------- |
| **ID**            | RB-008     |
| **Category**      | Runbook    |
| **Version**       | 0.2.0      |
| **Status**        | Draft      |
| **Control State** | Closed     |
| **Owner**         | Backend    |
| **Updated**       | 2026-07-14 |

---

# 1. Purpose

Enable Backend maintainers to **revert a breaking API / BFF deployment** and restore prior Route Handler / Server Action behavior, OpenAPI artifact, and verification evidence with minimal consumer damage.

Aligns with [ARCH-029](../../architecture/ARCH-029-interface-api-architecture.md) change gates. Breaking-change vocabulary in Draft [API-009](../API-009-compatibility-deprecation-contract.md) is cited only until Living.

**Audience:** Backend · release operators.
**Action enabled:** decide and execute rollback; prove restored contract; record evidence.

---

# 2. Scope

## 2.1 In Scope

- Identifying a breaking field / path / status / auth change that already shipped
- Reverting the application deployment to a known-good revision
- Restoring prior handler / Action behavior (one-version rule — no dual `/api/v1` + `/api/v2`)
- Regenerating OpenAPI to match restored runtime ([OPEN-001](../OPEN-001-openapi.md))
- Consumer impact notes and post-rollback verification
- Database compatibility **checks** (forward/back) — not inventing a new migration SSOT

## 2.2 Out of Scope

- Routine OpenAPI drift without deploy rollback ([RB-006](RB-006-openapi-drift-detection-recovery.md))
- Full incident SEV communication wrapper ([RB-007](RB-007-api-incident-response.md) — invoke first when users are actively failing)
- Schema migrations owned solely by data-layer / tenancy runbooks ([RB-001](../../runbooks/RB-001-multi-org-ops.md))
- Promoting Draft Phase 2/3 contracts during an emergency

## 2.3 Preconditions / access

- Privilege to redeploy / promote prior production revision for Vercel project `afenda-lite`
- Ability to run `npm run openapi:generate` and `npm run check:openapi` on the restored branch
- Knowledge of which consumers (if any) called changed HTTP shapes

---

# 3. Procedure

## 3.1 Signals and symptoms

| Signal | Likely meaning |
| ------ | -------------- |
| Consumers fail parse after deploy | Removed/renamed field or status change |
| UI Actions return unexpected `code` set | Error contract or auth guard change |
| Health OK but primary journey broken | Behavioral break without readiness failure |
| OpenAPI green but clients red | Runtime rolled forward; machine spec lagged — still may need app rollback |
| OpenAPI red after intentional rollback | YAML not regenerated to match restored handlers |

## 3.2 Immediate checks

1. Confirm **what broke**: path, method, status, body field, or Action `code`.
2. Confirm **when**: deploy id / git SHA / time.
3. Confirm **blast radius**: api-now only vs contract-only docs vs external consumer.
4. Prefer RB-007 containment if SEV-1 user impact is ongoing while this checklist runs.
5. Check whether a feature flag can disable the change without full rollback — only if already instrumented; do not invent flags under pressure.

## 3.3 Standard operating procedure

| Step | Action | Pass criteria |
| ---- | ------ | ------------- |
| 1 | Freeze further contract edits on the bad branch | No new breaking commits |
| 2 | Redeploy **prior known-good** production revision (hosting dashboard or approved CLI) | App serves previous behavior |
| 3 | Smoke api-now: liveness, readiness, and one session-backed draft path if that surface changed | Health + golden path OK |
| 4 | On the git revision that matches production: regenerate OpenAPI | `npm run openapi:generate` |
| 5 | Validate | `npm run check:openapi` exit 0 |
| 6 | Align docs if Living prose claimed the broken shape — reopen named IDs (DOC-001); do not leave Living docs advertising the rolled-back break | Control State closed after verify |
| 7 | Notify consumers / owners: what reverted, what remains deferred | Written note without secrets |
| 8 | Plan forward fix: additive optional fields only; removals need controlled decision (ARCH-029) | Follow-up issue / PR |

## 3.4 Database compatibility

- If the bad deploy included a **forward-only** migration, app rollback alone may be unsafe — stop and involve data owners ([RB-001](../../runbooks/RB-001-multi-org-ops.md) / Neon ops). Do not run destructive SQL from this runbook.
- Prefer deployments that keep DB backward-compatible with the previous app revision.

## 3.5 Escalation path

| Condition | Escalate to |
| --------- | ----------- |
| Users still failing during rollback | [RB-007](RB-007-api-incident-response.md) SEV-1 |
| Spec mismatched after app restore | [RB-006](RB-006-openapi-drift-detection-recovery.md) |
| Migration / PITR needed | [RB-001](../../runbooks/RB-001-multi-org-ops.md) |
| Unclear compatibility rules | ARCH-029 owner; Draft API-009 cite only |

## 3.6 Rollback / recovery (definition of done)

Rollback is complete when **all** are true:

1. Prior app revision is live in production.
2. Health + affected golden path pass.
3. `OPEN-001-openapi.yaml` matches restored handlers (`check:openapi` green) **or** an explicit exception is recorded with Backend owner approval.
4. Incident / change note links deploy ids and PRs.
5. Forward fix path is scheduled (no silent dual URL versions).

---

# 4. References

| ID       | Title                                      | Relationship                 |
| -------- | ------------------------------------------ | ---------------------------- |
| DOC-001  | Documentation Control Standard             | Governance                   |
| ARCH-029 | Interface and API Architecture             | Change gate                  |
| API-001  | API Boundaries                             | Adapter / envelope           |
| API-002  | Error Contract                             | Error codes                  |
| API-009  | Compatibility and Deprecation Contract     | Breaking rules (Draft)       |
| OPEN-001 | OpenAPI                                    | Regenerate / publish         |
| REST-001 | REST Standards and Resource Index          | api-now paths                |
| GUIDE-014| API Contract Verification Standard         | Evidence (Draft)             |
| RB-006   | OpenAPI Drift Detection and Recovery       | Spec recovery                |
| RB-007   | API Incident Response                      | Incident wrapper             |
| RB-001   | Multi-org Ops                              | DB / restore sibling         |

---

# 5. Change Log

| Version | Date       | Summary                                                                 |
| ------- | ---------- | ----------------------------------------------------------------------- |
| 0.2.0   | 2026-07-14 | Composed actionable Draft procedure; relocated to `docs/api/runbooks/`. |
| 0.1.1   | 2026-07-14 | Added mandatory Control State header field (Closed).                    |
| 0.1.0   | 2026-07-13 | Draft shell (API ops backlog).                                          |

---

# 6. Notes

**Status:** Draft — usable under incident pressure; promote to Living with Backend owner + GUIDE-015 Phase 5.

**ID note:** Candidate label “RB-003 API Contract Rollback…” was remapped to **RB-008** because `RB-003` is FFT release readiness (module ops).

**Home:** API-pack runbooks live under `docs/api/runbooks/` (DOC-001 exception).
