# Hot Sales — documentation index

**Application phase (2026-07-09):** Phase 2A **implementation closed** · **operational rollout only** · **no 2B–2D**

Read this index before any Hot Sales work. Agents: see also [AGENTS.md](../../AGENTS.md) § Hot Sales Phase 2A.

---

## Authority (read in this order)

| Priority | Doc | Role |
|----------|-----|------|
| **1** | [PHASE-2A-OPS-GATE-REGISTER.md](./PHASE-2A-OPS-GATE-REGISTER.md) | **Ops gate SSOT** — status, sequencing, drift rules |
| 2 | [PHASE-2A-OPS-ROLLOUT.md](./PHASE-2A-OPS-ROLLOUT.md) | Rollout checklist |
| 3 | [PHASE-2A-RELEASE-READINESS.md](./PHASE-2A-RELEASE-READINESS.md) | Promotion order + smoke matrix |
| 4 | [PRD-V2-Phase2.md](./PRD-V2-Phase2.md) | Phase 2 build contract (**Accepted**, implementation closed) |
| 5 | [ADR-001-phase-2-rbac.md](./ADR-001-phase-2-rbac.md) | RBAC decision (**Accepted**) |
| 6 | [PHASE-2A-SLICES.md](./PHASE-2A-SLICES.md) | 2A slice plan (**closed**) |

---

## Frozen boundaries (this phase)

| Item | Value |
|------|-------|
| Phase 1 tag | `hot-sales-phase-1` → `1bc1294` |
| Phase 2A tag | `hot-sales-phase-2a` → `8e650ff` (**immutable**) |
| Post-tag hotfix | `4d203a7` merged to `main` (`ee14f10`) |
| RBAC flag | `HOT_SALES_RBAC_ENABLED=false` until **Gate 6** |
| Production URL | `https://iam-check.vercel.app` |
| Production DB branch | `br-tiny-hill-ao82jp6f` only |

**Gate 4B:** closed as **data/setup** (not code). Production has **0** `hot_sales_sales_member` rows — `/client` bounce is expected for non-allowlisted sessions.  
**Next:** operator adds allowlist + open event, then re-run matrix rows 6–10. **Blocked until matrix passes:** Gate 5–7, 2B–2D, RBAC enable.

---

## Phase 1 (closed)

| Doc | Role |
|-----|------|
| [PRD-V2.md](./PRD-V2.md) | Phase 1 build contract |
| [hot-sales.md](./hot-sales.md) | GP2 piglet variant copy (template data only) |
| [PRD.md](./PRD.md) | Vision archive |
| [s19-hot-sales-trade.md](../architecture/slices/s19-hot-sales-trade.md) | Architecture slice S19 |

---

## Planning archive (not active work)

| Doc | Role |
|-----|------|
| [PHASE-2-FEEDBACK.md](./PHASE-2-FEEDBACK.md) | Authoritative Phase 2 **planning** direction |
| [PHASE-2-SCOPING.md](./PHASE-2-SCOPING.md) | Historical candidate list — **superseded** for sequencing |

Do **not** use PHASE-2-SCOPING or PHASE-2-FEEDBACK §2B–2D sections to authorize new implementation in this phase.

---

## Program tracking

Cross-program status: [docs/TRACKING.md](../TRACKING.md) § Hot Sales Phase 2A.
