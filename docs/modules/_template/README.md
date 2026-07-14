# Module pack template

Reusable, non-authoritative source templates for the fixed Afenda 10-MOD module spine governed by [MOD-002](../MOD-002-modules-index.md).

This directory is **not a product module home**. Each copy-ready Markdown template is stored as the `template` literal block of a validator-supported YAML artifact. Do not extract or rename a template to `.md` inside `_template`.

## Preferred scaffold workflow

Use the executable contract-driven scaffold for real provisional work:

```powershell
npm run plan:module-pack -- -- --prefix INV --slug inventory --title "Inventory" --owner Platform --profiles "Enterprise Core,ERP"
npm run scaffold:module-pack -- -- --prefix INV --slug inventory --title "Inventory" --owner Platform --profiles "Enterprise Core,ERP" --apply
```

The generated pack stays under `docs/scratch/module-packs/<slug>/`. Promotion requires explicit ID approval, replacement of all placeholders, MOD-002 catalogue and DOC-002 registration updates, a bounded reopen, movement to `docs/modules/<slug>/`, validation, and closure.

## Template tokens

| Token | Replace with |
| ----- | ------------ |
| `{{MODULE_PREFIX}}` | Approved 2–8 character uppercase module prefix |
| `{{MODULE_TITLE}}` | Product module title |
| `{{MODULE_SLUG}}` | Lowercase kebab-case module slug |
| `{{MODULE_OWNER}}` | Accountable team or function |
| `{{DATE}}` | ISO date (`YYYY-MM-DD`) |
| `TBD — replace before promotion` | Concrete module fact, criterion, decision, or evidence reference |

## Enterprise quality contract

A generated pack is enterprise-quality documentation only when it is specific enough for another engineer or operator to execute, verify, and challenge. The template therefore requires:

| Quality gate | Required outcome |
| ------------ | ---------------- |
| Authority | Each fact, decision, command, and constraint points to its owning document, code path, contract, or runbook. |
| Boundaries | Every role stays within MOD-002 ownership and links sibling/platform authorities instead of duplicating them. |
| Operability | Failure, deny, degradation, recovery, rollback, and escalation behavior is explicit where the role owns it. |
| Verifiability | Criteria are atomic and measurable; evidence is reproducible, revision-bound, dated, and sanitized. |
| Traceability | Every MOD-001 through MOD-008 AC has exactly one MOD-009 evidence row and is aggregated—not copied—in MOD-010. |
| Lifecycle integrity | Header, Change Log, DOC-002 row, Control State, and references agree after promotion. |
| Claim safety | Missing, stale, prose-only, or inferred evidence remains NOT EVIDENCED; the pack remains Not claimable until all MOD-002 rules pass. |

### Criterion writing test

Every criterion must identify the subject, trigger or condition, observable outcome, and verification threshold. Avoid criteria such as “supports enterprise use,” “is secure,” “works correctly,” or “has a runbook.” Split criteria that test more than one independently failing outcome.

### Profile activation

- Enterprise Core is mandatory and requires all eight CORE dimensions.
- ERP is optional, but once declared in MOD-010 it requires every ERP dimension assigned by MOD-002.
- Do not activate a profile by adding its name alone. Add its owned criteria and one-to-one evidence rows in the same controlled change.
- Out of Scope is not a shortcut: it requires owning authority plus reproducible fail-closed evidence under MOD-002.

## Fixed files

| Role | Template | Sole job |
| ---- | -------- | -------- |
| MOD-001 | [Module Architecture](MOD-001-module-architecture.template.yaml) | Architecture, boundaries, failure modes, locks |
| MOD-002 | [Domain and Ownership](MOD-002-domain-and-ownership.template.yaml) | Actors, journey, capabilities, domain ownership |
| MOD-003 | [Tech Stack](MOD-003-tech-stack.template.yaml) | Runtime, dependencies, environments, flags, budgets |
| MOD-004 | [Data Model](MOD-004-data-model.template.yaml) | Integrity, transactions, retention, migrations, indexes |
| MOD-005 | [Auth, Tenancy and RBAC](MOD-005-auth-tenancy-rbac.template.yaml) | Authentication, tenancy, permissions, sensitive actions |
| MOD-006 | [Surfaces and Routes](MOD-006-surfaces-and-routes.template.yaml) | Routes, states, accessibility, localization |
| MOD-007 | [API and Adapters](MOD-007-api-and-adapters.template.yaml) | Ports, adapters, schemas, errors, integration contracts |
| MOD-008 | [Ops Runtime](MOD-008-ops-runtime.template.yaml) | Promotion, observability, recovery, rollback |
| MOD-009 | [Verification](MOD-009-verification.template.yaml) | Exact structured evidence ledger |
| MOD-010 | [Module Docs Index + Roadmap](MOD-010-module-docs-index.template.yaml) | Pack navigation, profiles, readiness claim, roadmap |

## Instantiation rules

1. Prefer the executable scaffold commands above; these YAML files are a reviewable reference shape. If manually instantiating one, copy only its `template` block, remove the two-space YAML indentation, and replace every token.
2. Activate `Enterprise Core` at minimum. Add ERP rows only when ERP is an approved quality profile for the module.
3. Keep exactly ten module-qualified files in one module directory; no depth folders and no MOD-011.
4. Replace every double-brace token and all `TBD`/`TODO` language before promotion. A template must never produce a Claimable readiness state.
5. Preserve the DOC-003 header and six sections. Real controlled documents use `Control State: Open/Reopened` only during authorized work and return to `Closed` after verification.
6. Run `npm run test:module-pack`, `npm run check:module-quality`, `npm run check:docs-naming`, and the full documentation-integrity audit before closure.

## Authority

- [MOD-002 Modules Index](../MOD-002-modules-index.md) — Module category and readiness authority
- [DOC-001 Documentation Control Standard](../../_control/DOC-001-documentation-control-standard.md) — lifecycle, IDs, homes, and control state
- [DOC-003 Controlled Document Template](../../_control/DOC-003-controlled-document-template.md) — header and six-section baseline
- `.cursor/skills/afenda-elite-doc-control/module-pack-contract.json` — executable mirror subordinate to MOD-002



