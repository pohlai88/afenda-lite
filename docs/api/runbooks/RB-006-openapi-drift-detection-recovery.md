# RB-006 OpenAPI Drift Detection and Recovery

| Field             | Value      |
| ----------------- | ---------- |
| **ID**            | RB-006     |
| **Category**      | Runbook    |
| **Version**       | 0.2.1      |
| **Status**        | Draft      |
| **Control State** | Closed     |
| **Owner**         | Backend    |
| **Updated**       | 2026-07-14 |

---

# 1. Purpose

Enable backend maintainers and release operators to **detect, classify, and clear** OpenAPI drift between runtime/Zod sources and [`OPEN-001-openapi.yaml`](../OPEN-001-openapi.yaml) before a release is blocked or a consumer sees a stale machine contract.

This procedure does not redefine OpenAPI governance ([OPEN-001](../OPEN-001-openapi.md)) or REST path SSOT ([REST-001](../REST-001-rest-resources.md)).

**Audience:** Backend · CI operators.
**Action enabled:** clear a failing `check:openapi` / Spectral gate, or decide that a deploy must wait for contract repair.

---

# 2. Scope

## 2.1 In Scope

- Generated YAML out of sync with `scripts/generate-openapi.mts` / Zod registries
- Spectral / `pnpm check:openapi` non-zero
- api-now path or envelope drift vs Living contracts (API-001 / API-002)
- Release-blocking stale specification
- Recovery commands (env **names** only; no secret values)

## 2.2 Out of Scope

- Designing new REST resources ([REST-001](../REST-001-rest-resources.md) family; [GUIDE-009](../guides/GUIDE-009-adding-a-rest-resource.md))
- Full production incident SEV process ([RB-007](RB-007-api-incident-response.md))
- Reverting a shipped breaking deploy ([RB-008](RB-008-api-contract-rollback.md))
- Neon Auth proxy (`/api/auth/*`) — excluded from portal OpenAPI ([OPEN-001](../OPEN-001-openapi.md))

## 2.3 Preconditions / access

- Repo checkout with composed env (`pnpm env:compose`) when handlers need DB
- Ability to run Node scripts and commit regenerated YAML
- Read access to Living contracts under `docs/api/`

---

# 3. Procedure

## 3.1 Signals and symptoms

| Signal | Likely meaning |
| ------ | -------------- |
| `pnpm check:openapi` fails: missing YAML | Generator never run or artifact deleted |
| `check:openapi` fails: drifted from generator | Committed YAML ≠ regenerate output |
| Spectral findings | Lint rule violation (schema, naming, error shape) |
| CI red on OpenAPI job; local green | Branch missing regenerate commit, or CI env path differs |
| Runtime `{ data }` / error body ≠ OAS | Source Zod or docs changed without regenerate |

## 3.2 Immediate checks

1. Confirm artifact path: `docs/api/OPEN-001-openapi.yaml`.
2. Run:

```bash
pnpm openapi:generate
pnpm check:openapi
```

3. If generate changes the file, inspect `git diff docs/api/OPEN-001-openapi.yaml`.
4. Confirm api-now scope still matches OPEN-001 (health + declaration-draft only; no Neon Auth dump).
5. If handlers or Zod changed, confirm Living docs (API-001 / API-002 / REST-001) already describe the intended shape — do not “fix” YAML to hide a contract bug.

## 3.3 Standard operating procedure

| Step | Action | Pass criteria |
| ---- | ------ | ------------- |
| 1 | Classify: **stale YAML** vs **bad source** (Zod / generator / contract prose) | One root cause |
| 2 | If stale YAML only: regenerate and commit | `check:openapi` exit 0 |
| 3 | If Zod / schema ownership wrong: fix under `modules/*/schemas` per [API-004](../API-004-schema-map.md); regenerate | Diff reviewable; no hand-edited forever YAML |
| 4 | If Living contract wrong: reopen named DOC IDs per DOC-001; fix prose; then regenerate | Control State closed after verify |
| 5 | If Spectral rule noise: fix code/spec — do **not** weaken `.spectral.yaml` without Backend owner approval | Gate still meaningful |
| 6 | Record: PR link, commands run, whether release unblocked | Evidence for GUIDE-014 / release checklist |

**Do not** hand-edit `OPEN-001-openapi.yaml` as the durable fix — regenerate from source ([GUIDE-011](../guides/GUIDE-011-generating-and-validating-openapi.md)).

## 3.4 Escalation path

| Condition | Escalate to |
| --------- | ----------- |
| Drift coincides with production 5xx / auth failures | [RB-007](RB-007-api-incident-response.md) |
| Need to undo a shipped breaking HTTP shape | [RB-008](RB-008-api-contract-rollback.md) |
| Unclear whether change is breaking | ARCH-029 change gate · Draft [API-009](../API-009-compatibility-deprecation-contract.md) (cite only) |
| Generator / toolchain broken | Backend owner; do not ship without `check:openapi` |

## 3.5 Rollback / recovery

- Prefer **regenerate + commit** over reverting unrelated app commits.
- If a bad regenerate was committed, restore prior YAML **only** as a temporary unblock, then fix source and regenerate again before merge.
- Spec-only recovery never replaces a deployment rollback when runtime already shipped broken behavior — use RB-008.

---

# 4. References

| ID        | Title                                      | Relationship                    |
| --------- | ------------------------------------------ | ------------------------------- |
| DOC-001   | Documentation Control Standard             | Governance                      |
| ARCH-029  | Interface and API Architecture             | Parent architecture             |
| OPEN-001  | OpenAPI                                    | Governance + when to emit       |
| REST-001  | REST Standards and Resource Index          | Path SSOT / api-now             |
| API-001   | API Boundaries                             | `{ data }` success              |
| API-002   | Error Contract                             | Bare `APIErrorBody`             |
| API-004   | Schema Map                                 | Zod ownership                   |
| GUIDE-011 | Generating and Validating OpenAPI          | How-to (Draft)                  |
| GUIDE-014 | API Contract Verification Standard         | Release evidence (Draft)        |
| RB-007    | API Incident Response                      | Sibling when runtime fails      |
| RB-008    | API Contract Rollback                      | Sibling after bad deploy        |

---

# 5. Change Log

| Version | Date       | Summary                                                                 |
| ------- | ---------- | ----------------------------------------------------------------------- |
| 0.2.1 | 2026-07-14 | Bounded reopen: package-manager cutover — document `pnpm` / `pnpm exec` (repo SSOT `packageManager` + `pnpm-lock.yaml`). |
| 0.2.0   | 2026-07-14 | Composed actionable Draft procedure; relocated to `docs/api/runbooks/`. |
| 0.1.1   | 2026-07-14 | Added mandatory Control State header field (Closed).                    |
| 0.1.0   | 2026-07-13 | Draft shell (API ops backlog).                                          |

---

# 6. Notes

**Status:** Draft — operational enough to run; promote to Living only when GUIDE-015 Phase 5 verification bar and Backend owner approve.

**ID note:** Candidate label “RB-001 OpenAPI Drift…” was remapped to **RB-006** because `RB-001` is Multi-org ops under `docs/runbooks/`.

**Home:** API-pack runbooks live under `docs/api/runbooks/` (DOC-001 exception).
