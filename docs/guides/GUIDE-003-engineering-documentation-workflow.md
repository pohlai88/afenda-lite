# GUIDE-003 Engineering Documentation Workflow

| Field | Value |
|-------|-------|
| ID | GUIDE-003 |
| Category | Guide |
| Version | 1.1.0 |
| Status | Living |
| Owner | Platform |
| Updated | 2026-07-13 |

## Purpose

This guide explains how to add and maintain Afenda-Lite engineering documents while keeping the documentation system as a lightweight catalogue.

The catalogue authority is [../_control/DOC-001-documentation-control.md](../_control/DOC-001-documentation-control.md). The critical-document register is [../_control/REGISTER.md](../_control/REGISTER.md).

## Document Modes

Choose one primary mode before writing.

| Mode | Put it here | Use when |
|------|-------------|----------|
| Technical spec | `docs/guides/` or the owning architecture/module spine doc | A planned change needs goals, constraints, design, rollout, rollback, and open questions |
| Architecture | `docs/architecture/`, `docs/architecture/backend/`, `docs/architecture/frontend/`, or `docs/modules/<slug>/` spine | A system boundary, component model, or trade-off needs to be explained |
| ADR | `docs/architecture/` (absorb into Living ARCH; do not recreate `docs/adr/`) | One material decision needs status, context, alternatives, consequences, and follow-up |
| Runbook | `docs/runbooks/` or module MOD-008 | Operators need to diagnose, recover, validate, or escalate |
| Migration guide | Owning area under `docs/` | A system moves from one state to another and needs ordered steps, validation, and rollback |
| Internal guide | `docs/guides/` or the owning area | Maintainers need implementation-facing explanation |

## Mandatory Catalogue Header

Every authoritative document should use the seven-field header from [DOC-001](../_control/DOC-001-documentation-control.md):

```markdown
# <ID> <Title>

| Field | Value |
|-------|-------|
| ID | <ID> |
| Category | <Category> |
| Version | <major.minor.patch> |
| Status | Draft | Review | Accepted | Living | Superseded | Retired |
| Owner | <Team or function> |
| Updated | YYYY-MM-DD |
```

Older docs may be updated opportunistically when touched for real content changes. Do not churn stable docs just to reformat headers.

## Filename Naming

Authoritative files must use `{ID}-{kebab-slug}.md` per [DOC-001](../_control/DOC-001-documentation-control.md).

Examples:

```text
docs/api/API-001-api-boundaries.md
docs/architecture/turborepo/ARCH-023-multi-tenancy.md
docs/architecture/ARCH-011-platform-tenancy-rbac.md
docs/guides/GUIDE-002-coding-engineering-guide.md
docs/modules/feed-farm-trade/FFT-MOD-008-ops-runtime.md
docs/runbooks/RB-001-multi-org-ops.md
```

Exceptions: `docs/_control/REGISTER.md`, `docs/README.md`, `docs/scratch/**`, and optional folder `README.md` stubs.

When creating a document: allocate the next free ID for the prefix, write the header, name the file `{ID}-{slug}.md`, and add a register row only if it is critical.

## Registry Rule

Only critical documents go in [../_control/REGISTER.md](../_control/REGISTER.md). The register has exactly seven columns:

```text
ID
Category
Title
Version
Status
Owner
Updated
```

Do not add path, slug, supersedes, related docs, tags, keywords, or priority to the register.

## Route-outs

Keep these out of internal engineering docs unless the user explicitly asks for them:

| Request | Better home |
|---------|-------------|
| Published API docs or OpenAPI-style reference | `docs/api/` |
| End-user onboarding, FAQ, tutorial, or help-center text | Separate user documentation, not this engineering scaffold |
| Release notes or changelog maintenance | Changelog/release-note workflow |
| Slides or roadmap deck | Presentation workflow |
| Marketing or GTM copy | Product/marketing workflow |

## Templates

### Technical spec

```markdown
# <Feature / Change> Technical Specification

| Field | Value |
|-------|-------|
| ID | <Prefix-NNN> |
| Category | Guide |
| Version | 0.1.0 |
| Status | Draft |
| Owner | <Owner> |
| Updated | YYYY-MM-DD |

## Overview
## Problem
## Goals
## Non-goals
## Constraints
## Proposed design
## Interfaces / dependencies
## Risks and mitigations
## Rollout and rollback
## Open questions
```

### Architecture document

```markdown
# <System> Architecture

| Field | Value |
|-------|-------|
| ID | ARCH-<NNN> |
| Category | Architecture |
| Version | <major.minor.patch> |
| Status | Living |
| Owner | <Owner> |
| Updated | YYYY-MM-DD |

## Context
## Responsibilities and boundaries
## Components
## Data / request flow
## Key decisions
## Failure modes
## Operational considerations
## Known limits / future changes
```

### Runbook

```markdown
# <Service / Procedure> Runbook

| Field | Value |
|-------|-------|
| ID | RB-<NNN> |
| Category | Runbook |
| Version | <major.minor.patch> |
| Status | Living |
| Owner | <Owner> |
| Updated | YYYY-MM-DD |

## Purpose
## Preconditions / access
## Signals and symptoms
## Immediate checks
## Standard operating procedure
## Escalation path
## Rollback / recovery
## References
```

## Quality checklist

Before finishing a doc update:

- The audience is explicit.
- The document states the decision or action it enables.
- Assumptions, unknowns, and drift are labeled.
- Commands and paths are concrete where needed.
- The doc links to existing authorities instead of duplicating them.
- The mode is not mixed with API portal docs, end-user help, release notes, slides, or marketing copy.
- Rollback and escalation are easy to find in runbooks and migrations.

## Maintenance rules

- Update docs in the same PR or handoff as the behavior change when the contract or operating path changes.
- Prefer small, linked docs over giant catch-all pages.
- Do not silently rewrite accepted ADR history; add an amendment or superseding ADR.
- Keep volatile facts in one authority and link to it.
- If current disk state disagrees with docs, record it in [drift-register.md](GUIDE-004-engineering-drift-register.md) and fix the authority before using it as coding guidance.

## Change Log

| Version | Date | Summary |
|---------|------|---------|
| 1.1.0 | 2026-07-13 | Documented mandatory `{ID}-{kebab-slug}.md` filenames |
| 1.0.0 | 2026-07-13 | Standardized workflow on minimal seven-field catalogue |
