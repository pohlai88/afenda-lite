# Afenda Elite — skills architecture

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Type** | Register (skill catalog) |
| **Date** | 2026-07-12 (portal-* → afenda-elite-* rename) |
| **Audience** | Engineers · agents |
| **Enables** | Decide keep / create / forbid a skill; pass stability · scale · complexity bars |
| **Agent router** | [`.cursor/skills/using-afenda-elite-skills/SKILL.md`](../../.cursor/skills/using-afenda-elite-skills/SKILL.md) |
| **Controller** | [afenda-elite-documentation-types.md](afenda-elite-documentation-types.md) |
| **Glossary** | [afenda-elite-glossary-register.md](afenda-elite-glossary-register.md) |

```text
LOAD: catalog + matrices (this file is SSOT)
SKIP: forking every vendor phase skill into afenda-elite-* · scaffolding apps/*
SYNC: skill reference.md is a pointer only — edit this file, not a twin body
END-STATE: agents enter via using-afenda-elite-skills only; vendor phase skills = method library
```

---

## End-state (single Elite entry)

**Yes — finally one Afenda Elite skill entry.** That does **not** mean renaming every vendor skill to `afenda-elite-*` (skill zoo; fails complexity matrix).

| Layer | Role | Fate |
|-------|------|------|
| `using-afenda-elite-skills` | **Only product entry** | live — farm routing, catalog, non-goals |
| `agent-skills/skills/*` phase skills | **Method library** | keep under Elite; not parallel product routers |
| `afenda-elite-*` domain skills | Product/monorepo farms | live or planned — few |
| Lite/Guardian/Xerp-product skills | Stale / wrong farm | deprecate → remove |

```text
/using-afenda-elite-skills
        │
        ├─ farm fixed (glossary, docs, monorepo, FFT, Neon, …)
        │
        └─ method (optional) → using-agent-skills phase skill
                 e.g. incremental-implementation, tdd, security-and-hardening
```

**Rejected upgrade:** clone `spec-driven-development` → `afenda-elite-spec-driven-development`, etc.

---

## Vendor phase skills — disposition

Source tree: `.cursor/skills/agent-skills/skills/`. All remain **method-library** unless noted.

| Skill | Disposition | Notes |
|-------|-------------|-------|
| `using-agent-skills` | **subordinate router** | Elite block first; drop teaching Xerp as this-repo entry |
| `interview-me` | method-library | keep |
| `idea-refine` | method-library | keep |
| `spec-driven-development` | method-library | keep |
| `planning-and-task-breakdown` | method-library | keep |
| `incremental-implementation` | method-library | keep |
| `source-driven-development` | method-library | keep |
| `doubt-driven-development` | method-library | keep |
| `context-engineering` | method-library + cited in Elite LOAD | keep |
| `frontend-ui-engineering` | method-library | Elite farm first; no Xerp editorial divert in this repo |
| `api-and-interface-design` | method-library | keep |
| `test-driven-development` | method-library | keep |
| `browser-testing-with-devtools` | method-library | keep |
| `debugging-and-error-recovery` | method-library | keep |
| `code-review-and-quality` | method-library | keep |
| `code-simplification` | method-library | keep |
| `security-and-hardening` | method-library | keep |
| `performance-optimization` | method-library | keep |
| `git-workflow-and-versioning` | method-library | keep |
| `ci-cd-and-automation` | method-library | keep |
| `deprecation-and-migration` | method-library + **Elite residue** | keep; extend register for Elite (Lite→Elite ceiling) |
| `documentation-and-adrs` | method-library | cite documentation-types / glossary |
| `observability-and-instrumentation` | method-library | keep |
| `shipping-and-launch` | method-library | keep |
| `bounded-agent-lanes` | **stability** (Elite-owned process) | keep; lanes bind all Elite work |

---

## Repo product skills — disposition

Top-level `.cursor/skills/*` (non–agent-skills).

| Skill | Disposition | Action |
|-------|-------------|--------|
| `using-afenda-elite-skills` | **live** entry | keep |
| `afenda-elite-repo-housekeeping` | **live** | keep |
| `afenda-elite-monorepo-refactor` | **live** | keep |
| `neon-tenancy-efficiency` | **retarget** | keep; Elite tenancy SSOT paths |
| `afenda-elite-backend-modules` | **live** (renamed from `portal-backend-modules`) | Hexagonal modules |
| `afenda-elite-api-contract` | **live** (renamed from `portal-api-contract`) | cite `docs/api` |
| `afenda-elite-frontend-scaffold` | **live** (renamed from `portal-frontend-scaffold`) | FE scaffold; may absorb into monorepo later |
| `feed-farm-trade` | **keep module** | keep |
| `admincn-customization` | **keep platform UI** | keep; AdminCN still product shell |
| `guardian-css-audit` | **removed** | Wave 1 |
| `portal-frontend-scaffold` / `portal-backend-modules` / `portal-api-contract` | **retired names** | Use `afenda-elite-*` equivalents |

---

## Cleanup waves

### Wave 1 (now) — stale remove

| Item | Action |
|------|--------|
| `guardian-css-audit/` | Delete skill; deprecation register row |
| Catalog / README skill lists | Point agents at Elite router first |
| `using-agent-skills` Xerp block | Label **other repo only** — not this-repo entry |

### Wave 2 (done) — rename portal-* → afenda-elite-*

| Item | Action |
|------|--------|
| `portal-frontend-scaffold` | Renamed → `afenda-elite-frontend-scaffold` |
| `portal-backend-modules` | Renamed → `afenda-elite-backend-modules` |
| `portal-api-contract` | Renamed → `afenda-elite-api-contract` |
| Docs / FFT / rules cross-links | Updated to new skill ids |
| `deprecation-and-migration/reference.md` | Old skill names Hard-deleted; Elite ceiling rows |

### Wave 3 (Phase C scaffold) — path remap / merge

| Item | Action |
|------|--------|
| `afenda-elite-monorepo` | Land; absorb DAG + optional FE scaffold merge |
| `afenda-elite-glossary` / `afenda-elite-docs-fumadocs` | Land |
| `afenda-elite-*` platform skills | Remap internals to `apps/*` + `@repo/*` |
| Knip scripts | Wire into housekeeping |

### Wave 4 (after Wave 3 stable) — redundant prune

| Item | Action |
|------|--------|
| Duplicate pointers | One home per concern (fulfillment matrix) |
| Unused method skills | Only if never invoked and complexity says drop — default **keep** method library |

---

## Architecture

```text
L0  .cursor/rules + AGENTS.md
L1  using-afenda-elite-skills  →  using-agent-skills (method library only)
L2  glossary term.* · documentation-types · bounded-agent-lanes · deprecation
L3  platform / module / housekeeping+refactor / planned afenda-elite-*
```

Elite router → farm. Vendor skills → engineering method. Domain skills → module/platform procedure.

**Housekeeping ↔ refactor (Xerp pattern):** discover/classify in `afenda-elite-repo-housekeeping` → removals only via `afenda-elite-monorepo-refactor` Slice D.

---

## Catalog

| Tier | Skill | Status | Job |
|------|-------|--------|-----|
| Router | `using-afenda-elite-skills` | **live** | Sole product entry · farm routing · create-skill gate |
| Method library | `using-agent-skills` + phase skills | **keep** (subordinate) | Generic engineering methods |
| Stability | `bounded-agent-lanes` | **keep** | One lane per mission |
| Stability | `deprecation-and-migration` | **keep** | Compulsory bans; Elite residue rows (Wave 2) |
| Stability | `documentation-and-adrs` | **keep** | ADR craft; cite Elite doc types |
| Stability | `context-engineering` | **keep** | Selective LOAD/SKIP packs |
| Housekeeping | `afenda-elite-repo-housekeeping` | **live** | Knip/drift · classify · Slice D handoff |
| Refactor | `afenda-elite-monorepo-refactor` | **live** | Governed slices A–E |
| Platform | `neon-tenancy-efficiency` | **retarget** | Tenancy / Neon |
| Platform | `afenda-elite-backend-modules` | **live** | Hexagonal modules (was `portal-backend-modules`) |
| Platform | `afenda-elite-api-contract` | **live** | API contract (was `portal-api-contract`) |
| Platform | `afenda-elite-frontend-scaffold` | **live** | FE scaffold (was `portal-frontend-scaffold`) |
| Platform | `admincn-customization` | **keep** | AdminCN shell |
| Module | `feed-farm-trade` | **keep** | FFT ops/UI |
| Elite Day-1 | `afenda-elite-glossary` | **planned** | YAML → farms |
| Elite Day-1 | `afenda-elite-monorepo` | **planned** | DAG · new-package |
| Elite Day-1 | `afenda-elite-docs-fumadocs` | **planned** | Mirror-only docs |
| Removed | `guardian-css-audit` | **removed** (Wave 1) | Atmosphere dormant; target CSS gone |
| Removed | `portal-frontend-scaffold` · `portal-backend-modules` · `portal-api-contract` | **removed** (Wave 2 rename) | Use `afenda-elite-*` ids |
| — | Per-module glossary SSOTs · wiki · Storybook/Guardian product · fork-all-vendor-to-elite · raw Xerp overlay · teaching old `portal-*` skill ids | **forbidden** | Sprawl |

**Row change rule:** update `status`; never silent-delete. Compulsory rename/ban → also deprecation register.

**Xerp borrow note:** housekeeping + refactor are Elite-adapted copies. Do **not** invoke `afenda-Xerp` skill paths from this repo.

---

## Fulfillment matrix

Every Elite concern has one primary home. Create a skill only when the cell is **Skill**.

| Concern | Primary home | Skill? |
|---------|--------------|--------|
| Product name / term | Glossary register / `@repo/glossary` | No — cite `term.*` |
| Doc type / lifecycle | documentation-types | No — point from router |
| Binding stack decision | ADR-002 / ADR-003 | No |
| Enumerated locks / shortfall | Architecture register | No |
| Agent load order / farm routing | `using-afenda-elite-skills` | **Yes** |
| Engineering method (TDD, review, …) | `agent-skills/skills/*` | Yes — method library, not Elite-named forks |
| Lane / commit mixing | `bounded-agent-lanes` | **Yes** |
| Dead-code / Knip / catalog drift | `afenda-elite-repo-housekeeping` | **Yes** |
| Cross-package move / Slice D delete | `afenda-elite-monorepo-refactor` | **Yes** |
| Module ops (FFT flags) | Module skill + gate-register | **Yes** |
| Fragile sync (`glossary:sync`) | `afenda-elite-glossary` | **Yes** (planned) |
| Monorepo DAG / new package rules | `afenda-elite-monorepo` | **Yes** (planned) |
| Fumadocs mirror ops | `afenda-elite-docs-fumadocs` | **Yes** (planned) |
| Full UI chrome copy | App i18n namespaces | No |

---

## Stability matrix

| Class | Freeze rule | Change trigger |
|-------|-------------|----------------|
| Router | Rare | New Day-1 app, new production doc type, glossary pipeline flip |
| Method library | Upstream-stable | Do not fork for Elite product names |
| Housekeeping / refactor | Contract-stable | New gate scripts after Phase C |
| Domain | Bound to module ADR / gate-register | Explicit scope reopen only |
| Generated farms | Never hand-edit | Edit YAML / SSOT then sync |

**Stability bar:** Skills must not redefine glossary terms or invent a sixth production doc type.

---

## Scalability matrix

| Signal | Action |
|--------|--------|
| SKILL.md > ~200 lines of Elite-specific prose | Split detail into this architecture register |
| Same LOAD list in 3+ skills | Move pack into Elite router |
| New module with ops gates | One module skill + RUNTIME pointer — not a new router |
| Two skills for the same concern | Merge or demote one to this register |
| Housekeeping trying to delete | Always hand off Slice D |
| Urge to rename every vendor skill `afenda-elite-*` | **Stop** — method library stays |

**Scale bar:** One product entry + few Elite domain skills + shared method library.

---

## Complexity matrix (create vs not)

Create a new Elite skill only if **all** are true:

1. Repeatable agent workflow (not a one-off ADR)  
2. Skipping it is costly (wrong farm, secrets on docs, hand glossary twin)  
3. Cannot be a short pointer in the Elite router or `AGENTS.md`  
4. Has a clear verification step  
5. Does not duplicate vendor lifecycle / method library  

Otherwise: ADR, register row, router bullet, or keep as method-library skill.

---

## Planned Day-1 skills (do not stub-flood)

After ADR-003 Accept and Phase C scaffold:

1. `afenda-elite-glossary` — sync command, farm outputs, no hand twin  
2. `afenda-elite-monorepo` — package DAG, workspace protocol, turbo-ignore (pairs with live refactor skill)  
3. `afenda-elite-docs-fumadocs` — Accepted-only mirror, env deny-list, `_reference` exclude  

**Already live:** `afenda-elite-repo-housekeeping` · `afenda-elite-monorepo-refactor`.

---

## Verification

- [ ] Catalog status matches reality (live / keep / planned / removed / forbidden)  
- [ ] Agents enter via Elite router, not vendor or Xerp first  
- [ ] No `afenda-elite-*` forks of method-library skills  
- [ ] New skill proposal passes complexity matrix  
- [ ] No duplicate glossary definitions inside skills  
- [ ] Fulfillment matrix still has one primary home per concern  
- [ ] Housekeeping never deletes without Slice D handoff  
- [ ] Cleanup waves tracked; Wave 1 guardian skill gone  
