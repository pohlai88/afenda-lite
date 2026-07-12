# Afenda Elite — production documentation types

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Type** | Register (controller) |
| **Date** | 2026-07-13 |
| **Audience** | Engineers · operators · agents |
| **Enables** | Choose a doc home and whether it may govern production |
| **Registry** | [afenda-elite-doc-registry.md](afenda-elite-doc-registry.md) — indexed homes + hard rules |
| **Glossary** | [afenda-elite-glossary-register.md](afenda-elite-glossary-register.md) |
| **Skills architecture** | [afenda-elite-skills-architecture.md](afenda-elite-skills-architecture.md) |
| **Enforcement** | `.cursor/rules/doc-registry.mdc` · `npm run check:doc-registry` |

```text
LOAD: production doc types + homes · then doc-registry
SKIP: terms → glossary · prose craft → documentation-and-adrs skill
STOP: path/type violation → fix before continuing (see doc-registry)
```

---

## Authority

Five production types (plus Elite controllers that govern homes, not product content):

| Type | Home | One job |
|------|------|---------|
| **ADR** | `docs/adr/`, `docs/backend/adr/`, `docs/frontend/adr/`, `docs/fft/adr/` | One binding decision + alternatives |
| **Register** | `docs/architecture/*-register.md`, skill `reference.md`, module gate-registers | Enumerated locks |
| **Architecture SSOT** | `docs/architecture/`, `docs/backend/`, `docs/frontend/` (exclude `**/adr/`) | Living maps |
| **Runbook / ops** | `docs/runbooks/`, `docs/<module>/` | Operate, RUNTIME, flags |
| **API contract** | `docs/api/` | HTTP + error codes |

| Meta | Home | One job |
|------|------|---------|
| **Elite controllers** | `doc/architecture/afenda-elite-*.md` | Doc types · glossary · skill catalog · **doc registry** |

| Not a type | Rule |
|------------|------|
| Fumadocs (`apps/docs`) | Day-1 **mirror** of Accepted content — Vercel `afenda-elite-docs`; **no** DB/Auth/`CRON_SECRET`; exclude `_reference/` |
| Glossary farms | Generated from `@repo/glossary` (`terms.yaml`) → register MD · app i18n · Fumadocs meta/MDX — **not** hand twins |
| `AGENTS.md` / `.cursor/rules/` | Cite SSOT / `term.*` ids; do not redefine terms |

**Assumption:** Until Elite ADR-002/003 are Accepted, Lite Accepted ADRs still bind shipped code. This file still governs *where new Elite docs go*. Until `@repo/glossary` exists (Phase C), the markdown [glossary register](afenda-elite-glossary-register.md) is the editable seed.

---

## Document lifecycle

Chat / skill reviews are **not** a lifecycle stage. Only committed docs under a production type count.

```text
Draft (optional) → in-repo Proposed or live register/SSOT
                 → Accepted / indexed (production authority)
                 → Superseded | Deprecated | row status change
                 → Fumadocs mirror (Accepted only; apps/docs Day-1)
```

| Type | Lifecycle |
|------|-----------|
| **ADR** | `Proposed` → `Accepted` → `Superseded` or `Deprecated`. Never delete Accepted history; new ADR supersedes old. |
| **Register** | File is Accepted; **rows** change status (e.g. glossary `canonical` / `deprecated` / `forbidden`). No silent row delete. |
| **Architecture SSOT** | Update in place; date material changes. Hard forks → write an **ADR**, don’t only edit the map. |
| **Runbook / ops** | Live ops-owned; revise when procedure changes. Prod flag flips still require **gate-register**. |
| **API contract** | Additive under one contract version. Breaking change → **ADR** + contract update together. |
| **Fumadocs** | Not a type: Day-1 app; publish **Accepted** / generated glossary only — never Proposed, chat, `_reference`, or secrets. |

### Glossary → farms (one go)

```text
terms.yaml (SSOT) ──sync──► register MD (agents/humans)
                 ├──sync──► i18n messages (apps/app, module packs)
                 └──sync──► Fumadocs meta + glossary pages (apps/docs)
```

`term.*` is the join key for metadata, i18n, and docs. Concepts only — not full UI chrome.

**Day-to-day:** pick type → (glossary `id` if new name) → write with Status → Accept/index → Fumadocs publishes Accepted.

---

## Out of scope / not authority

Style guides · glossary content · chat · `_reference/` · Proposed ADRs · wikis · marketing · Storybook.

---

## Add a doc

1. One type → matching Home (`docs/…` or Elite `doc/architecture/afenda-elite-*`).  
2. Header: Status + Date.  
3. New name → [glossary](afenda-elite-glossary-register.md) `id`.  
4. Index in [docs/README.md](../../docs/README.md) when Accepted; Elite controllers also in [doc-registry](afenda-elite-doc-registry.md).  
5. New **type** → amend this file first.  
6. Run `npm run check:doc-registry` — non-zero is a hard fail.

**Pitfalls:** one decision per ADR · lists → registers · prod flags → ops gate-register · no secrets on docs · no hand glossary twin · don’t defer `apps/docs` · **never** put production SSOT under `doc/` or Elite controllers under `docs/`.