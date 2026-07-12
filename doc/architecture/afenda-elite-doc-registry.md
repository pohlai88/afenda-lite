# Afenda Elite — documentation registry

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Type** | Register (controller) |
| **Date** | 2026-07-13 |
| **Audience** | Engineers · operators · agents |
| **Enables** | Know every production doc home; detect path / type violations |
| **Controller** | [afenda-elite-documentation-types.md](afenda-elite-documentation-types.md) |
| **Glossary** | [afenda-elite-glossary-register.md](afenda-elite-glossary-register.md) |
| **Skills** | [afenda-elite-skills-architecture.md](afenda-elite-skills-architecture.md) |
| **Hard rule** | `.cursor/rules/doc-registry.mdc` (alwaysApply) |
| **Machine check** | `npm run check:doc-registry` |

```text
LOAD: this registry + documentation-types before writing any doc
STOP: if path, type, or index rules are violated — fix before continuing
SKIP: chat as authority · Fumadocs as SSOT · hand glossary twins
```

---

## Hard split (non-negotiable)

**Owner lock (verbatim — do not paraphrase):**

> UPDATE THIS IS THE DOG SHIT FOLDER. IF AGENT NEED SHOITTING, COME ERE AND SHIT... DONT EVER FUCK MY 'DOC" BEFORE I GET MAD AND FUCK THEIR SON IF BITCH

| Tree | May contain | Must NOT contain | Agent rule |
|------|-------------|------------------|------------|
| **`docs/`** | Production SSOT: ADR · Register · Architecture SSOT · Runbook/ops · API contract | Elite controllers (`afenda-elite-*`); `_reference/` | THE DOG SHIT FOLDER — if agent need shitting, come here and shit |
| **`doc/`** | Elite controllers only: `doc/README.md` + `doc/architecture/afenda-elite-*.md` | ADRs, API, runbooks, FFT ops, phase tasks, living maps, scratch | DONT EVER FUCK MY DOC — explicit user order only |

**Violation = agent failure.** Do not paraphrase the owner lock. Do not invent `documentation/`, `wiki/`, or a third root. When unsure → shit in `docs/`, never fuck `doc/`.

---

## Elite controllers (`doc/`)

| Path | Job |
|------|-----|
| [doc/README.md](../README.md) | Entry: what lives in `doc/` vs `docs/` |
| [afenda-elite-documentation-types.md](afenda-elite-documentation-types.md) | Five production types + lifecycle |
| [afenda-elite-glossary-register.md](afenda-elite-glossary-register.md) | Canonical `term.*` + forbidden aliases |
| [afenda-elite-skills-architecture.md](afenda-elite-skills-architecture.md) | Skill catalog + create/forbid matrices |
| **This file** | Indexed homes + enforcement |

New Elite controller → name `afenda-elite-*.md` under `doc/architecture/`, amend documentation-types if it introduces a new *kind*, index here in the same PR.

---

## Production homes (`docs/`)

Authority for *which type goes where*: [documentation-types](afenda-elite-documentation-types.md).

| Home | Type | Index |
|------|------|-------|
| `docs/adr/` | ADR | Product-level decisions |
| `docs/backend/adr/` | ADR | Backend / hexagon / tenancy |
| `docs/frontend/adr/` | ADR | UI / FFT product shell |
| `docs/fft/adr/` | ADR | FFT engine (ops-gated) |
| `docs/architecture/*-register.md` | Register | Enumerated locks (e.g. closed-scope) |
| `docs/architecture/` (excl. adr) | Architecture SSOT | Living maps, tenancy ecosystem |
| `docs/backend/` (excl. `adr/`) | Architecture SSOT | Modules, ports, conventions |
| `docs/frontend/` (excl. `adr/`) | Architecture SSOT | Routes, phases, UI maps |
| `docs/api/` | API contract | HTTP + errors |
| `docs/runbooks/` | Runbook / ops | Multi-org, cheatsheets |
| `docs/fft/` (RUNTIME, ops, spec) | Runbook / ops | Engine RUNTIME + gates |

Human index: [docs/README.md](../../docs/README.md). **Accepted** docs must appear there (or in a linked subtree README). Elite controllers stay listed only under `doc/`.

---

## Agent hard rules

1. **Pick one type** from documentation-types before creating a file. New type → amend documentation-types **first** (separate or same PR, never silent).
2. **Write only under the matching Home.** Wrong tree → delete/move; do not leave orphans.
3. **Header required:** `Status` + `Date` (+ `Type` for registers/SSOT).
4. **New product name** → glossary `term.*` id first; cite `id`, do not redefine.
5. **Accept → index:** update this registry row group and/or [docs/README.md](../../docs/README.md) in the same change.
6. **Never delete Accepted ADR history** — supersede with a new ADR.
7. **Never treat** chat, Proposed ADRs, Fumadocs, `_reference/`, or Storybook as production authority.
8. **Secrets** never in docs. **Prod flag flips** → FFT gate-register (or module gate), not a random markdown edit.
9. **Cite SSOT paths** as `docs/...` or `doc/architecture/afenda-elite-...` — never the retired plural mix for Elite controllers.
10. **On violation:** stop the task, report the violation path + rule number, fix or refuse — do not ship.

---

## Forbidden (instant fail)

| Act | Why |
|-----|-----|
| Production ADR / API / runbook under `doc/` | Breaks Elite-controller isolation |
| `afenda-elite-*` controller under `docs/` | Controllers are not module SSOT |
| Sixth “production type” without amending documentation-types | Undermines the type register |
| Hand twin of glossary (MD+JSON / per-module glossary SSOT) | Ban in documentation-types |
| Restoring retired paths as authority (`docs/architecture/slices/portal-atmosphere/`, etc.) | Closed / deprecated |
| Claiming Fumadocs (`apps/docs`) is SSOT | Day-1 mirror only |
| Indexing Proposed / chat notes as Accepted | Lifecycle violation |

---

## Verification

```bash
npm run check:doc-registry
```

Must exit `0`. Failures print the rule id and path. Agents must not ignore a non-zero exit.

Manual spot-check:

- [ ] `doc/architecture/` contains only `afenda-elite-*.md` (+ this registry is one of them)
- [ ] No `doc/{adr,api,backend,frontend,fft,runbooks}/`
- [ ] New Accepted doc linked from `docs/README.md` or a subtree README
- [ ] Terms cited by `term.*` id
