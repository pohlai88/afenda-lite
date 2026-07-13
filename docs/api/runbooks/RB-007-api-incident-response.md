# RB-007 API Incident Response

| Field             | Value      |
| ----------------- | ---------- |
| **ID**            | RB-007     |
| **Category**      | Runbook    |
| **Version**       | 0.2.0      |
| **Status**        | Draft      |
| **Control State** | Closed     |
| **Owner**         | Backend    |
| **Updated**       | 2026-07-14 |

---

# 1. Purpose

Enable on-call and Backend maintainers to **triage and contain** API Route Handler and Server Action incidents (errors, latency, authz spikes, dependency outages) without treating architecture docs as the ops checklist.

Safe client-facing messages follow [API-002](../API-002-error-contract.md). Correlation expectations (when Living) sit in Draft [API-007](../API-007-api-observability-correlation-contract.md) — cite only until promoted.

**Audience:** Backend · operators (mixed).
**Action enabled:** stabilize user impact, gather evidence, choose repair vs rollback, escalate cleanly.

---

# 2. Scope

## 2.1 In Scope

- Elevated 5xx / unexpected throws from adapters or domain
- Latency spikes on `/api/*` or Action-backed mutations
- Authorization / session failure spikes (401 / 403 patterns)
- Dependency outage affecting BFF (Neon, Neon Auth proxy path)
- Evidence capture and owner communication (no secrets in channels)
- Decision to invoke [RB-008](RB-008-api-contract-rollback.md) or OpenAPI-only [RB-006](RB-006-openapi-drift-detection-recovery.md)

## 2.2 Out of Scope

- OpenAPI drift with healthy runtime ([RB-006](RB-006-openapi-drift-detection-recovery.md))
- Detailed contract rollback checklist ([RB-008](RB-008-api-contract-rollback.md))
- Multi-org / Neon restore ([RB-001](../../runbooks/RB-001-multi-org-ops.md))
- FFT product flag / 2B–2D program decisions (`docs/modules/feed-farm-trade/`)

## 2.3 Preconditions / access

- Vercel / hosting dashboard access for the `afenda-lite` project (deploy list, runtime logs)
- Ability to hit health endpoints and compose local env if reproducing
- Session to distinguish operator vs client surfaces when needed

---

# 3. Procedure

## 3.1 Signals and symptoms

| Signal | Likely meaning |
| ------ | -------------- |
| Spike of HTTP 500 with `INTERNAL_ERROR` | Unexpected throw; bug or dependency |
| Spike of 401 / 403 with structured codes | Session / RBAC / org membership |
| Health readiness failing; liveness OK | Dependency (often DB) — not process death |
| Draft keepalive / declaration-draft errors | Client session or draft store path |
| Recent deploy coincides with onset | Prefer rollback path if containment fails |

**api-now smoke targets** (public / session as documented in REST-001):

- `GET /api/health/liveness`
- `GET /api/health/readiness`
- Declaration draft routes only with a real client session — do not invent list GETs under `/api`

## 3.2 Immediate checks (first 5–10 minutes)

1. **Timebox onset:** note first bad request time vs last successful deploy.
2. **Health:**
   - Liveness → process up?
   - Readiness → DB / deps?
3. **Error shape:** confirm failures return bare `APIErrorBody` (not stacks, not SQL, not env values) per API-002.
4. **Surface:** Route Handler vs Server Action vs Neon Auth proxy (`/api/auth/*`).
5. **Scope:** one org / one role / all traffic?
6. **Logs:** capture request id / timestamp / path / status — strip cookies and secrets before sharing.

## 3.3 Severity (working Draft)

| SEV | Criteria | First containment |
| --- | -------- | ----------------- |
| SEV-1 | Auth broken for all users, or write path data-loss risk, or readiness down in production | Page owners; consider deploy rollback (RB-008); fail closed |
| SEV-2 | Elevated 5xx or latency on a primary journey; workaround exists | Feature flag / disable noncritical path if available; hotfix branch |
| SEV-3 | Single tenant / single Action; docs or OpenAPI drift only | Route to RB-006 if spec-only; otherwise normal fix |

## 3.4 Standard operating procedure

| Step | Action |
| ---- | ------ |
| 1 | Declare SEV; open incident note (time, impact, hypothesis) |
| 2 | Stabilize: stop retries that amplify load if approved; keep messages user-safe |
| 3 | Bisect: last deploy · env key **names** · Neon Auth config · recent Action/RH change |
| 4 | Fix forward **or** invoke RB-008 when contract/behavior revert is safer than hotfix |
| 5 | Verify: health + one golden path per affected surface (operator and/or client) |
| 6 | Close: root cause, prevent recurrence, link PR / DOC reopen if contracts change |

**Adapter reminder (do not violate under pressure):** session guards and Zod parse stay in the adapter; domain does not read `Request` / cookies ([API-001](../API-001-api-boundaries.md)).

## 3.5 Escalation path

| Condition | Escalate to |
| --------- | ----------- |
| Neon / tenancy restore needed | [RB-001](../../runbooks/RB-001-multi-org-ops.md) |
| Spec gate red but users fine | [RB-006](RB-006-openapi-drift-detection-recovery.md) |
| Breaking deploy must be undone | [RB-008](RB-008-api-contract-rollback.md) |
| Neon Auth provider outage | Neon Auth runbooks / `.agents/skills/neon` — use proxy path only |
| Product FFT gate / flag | FFT-MOD-008 owners — not this runbook |

## 3.6 Rollback / recovery

- Prefer **prior production revision** when the last deploy is the clear cause and hotfix ETA is longer than rollback.
- After rollback, re-check health and one mutation path; then decide whether OpenAPI YAML must be regenerated (RB-006) to match restored handlers.
- Never paste `DATABASE_URL`, passwords, or session cookies into tickets or chat.

---

# 4. References

| ID       | Title                                      | Relationship              |
| -------- | ------------------------------------------ | ------------------------- |
| DOC-001  | Documentation Control Standard             | Governance                |
| ARCH-029 | Interface and API Architecture             | Parent architecture       |
| API-001  | API Boundaries                             | Adapter pipeline          |
| API-002  | Error Contract                             | Safe wire errors          |
| API-007  | API Observability and Correlation Contract | Correlation (Draft)       |
| REST-001 | REST Standards and Resource Index          | api-now inventory         |
| RB-001   | Multi-org Ops                              | Platform restore sibling  |
| RB-006   | OpenAPI Drift Detection and Recovery       | Spec-only sibling         |
| RB-008   | API Contract Rollback                      | Rollback sibling          |

---

# 5. Change Log

| Version | Date       | Summary                                                                 |
| ------- | ---------- | ----------------------------------------------------------------------- |
| 0.2.0   | 2026-07-14 | Composed actionable Draft procedure; relocated to `docs/api/runbooks/`. |
| 0.1.1   | 2026-07-14 | Added mandatory Control State header field (Closed).                    |
| 0.1.0   | 2026-07-13 | Draft shell (API ops backlog).                                          |

---

# 6. Notes

**Status:** Draft — use for ops now; promote to Living with Backend owner + GUIDE-015 Phase 5 alignment.

**ID note:** Candidate label “RB-002 API Incident…” was remapped to **RB-007** because `RB-002` is FFT gate register (module ops).

**Home:** API-pack runbooks live under `docs/api/runbooks/` (DOC-001 exception).
