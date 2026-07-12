# ADR — Afenda-Lite product identity

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-07-12 |
| **Deciders** | Product / portal rebuild program |
| **Namespace** | `doc/adr/` (product identity — not Frontend ADR-001 FFT) |
| **Deprecation** | [compulsory register](../../.cursor/skills/agent-skills/skills/deprecation-and-migration/reference.md) |

```text
LOAD: product name, platform framing, what stays technical
SKIP: FFT module locks → doc/frontend/adr/001* · hexagon → doc/backend/adr/001
```

---

## Context

This codebase was named and framed as the **Client Declaration Portal** — a standalone customer/operator “portal” centered on declarations.

The product is no longer a portal product. It is the **beta** surface of the official **Afenda ERP**: a multi-module SaaS (Declarations + Feed Farm Trade today, shared Platform + Identity). Keeping the old name trains agents and humans to treat it as a thin declaration portal and to invent separate infra “courses” per module.

## Decision

| Lock | Choice |
|------|--------|
| **Product name** | **Afenda-Lite** |
| **Positioning** | Beta / lite edition of official **Afenda ERP** |
| **Not** | Client Declaration Portal; “the portal” as product identity |
| **Platform model** | One SaaS · modules on shared Platform + Identity (Declarations \| FFT · …) |
| **Module names** | Unchanged (`declarations`, `fft`, …) — modules ≠ product name |
| **Technical debt (allowed for now)** | Some `portal-*` code path identifiers, `/client` routes — **legacy technical**, not product branding |
| **npm package** | `afenda-lite` |
| **GitHub** | `pohlai88/afenda-lite` (was `iam-check`) |
| **Vercel** | project `afenda-lite` · prod https://afenda-lite.vercel.app · legacy alias `iam-check.vercel.app` |
| **APP_URL** | `https://afenda-lite.vercel.app` |

**Compulsory deprecation notice**

```markdown
## Deprecation: Client Declaration Portal

**Status:** Compulsory — retired 2026-07-12
**Replacement:** Afenda-Lite (beta of Afenda ERP)
**Removal:** Do not reintroduce as live product name in README, AGENTS, ADRs, or UI chrome
**Reason:** Product is multi-module Afenda ERP beta, not a declaration-only portal
**Forbidden:** Teaching “this app is the Client Declaration Portal”; framing modules as separate portals
```

## Alternatives rejected

| Option | Why |
|--------|-----|
| Keep “Client Declaration Portal” | Wrong product shape; agent confusion |
| Rename only docs, keep package `client-declaration-portal` forever | Soft deprecation — out of policy |
| Rename GitHub/Vercel/disk in same slice | High blast — now done as migrate 2026-07-12 |
| Call it “Afenda ERP” without Lite | Overclaims vs official ERP; Lite = beta |

## Consequences

**Positive:** One product name aligned with Afenda ERP; modules stay clear; matches SaaS multi-module framing.

**Costs:** Legacy folder/remote names until a rename migrate; grepping old strings in archive docs; agents must say Afenda-Lite in live SSOT.

## Follow-up

| Item | When |
|------|------|
| Remove legacy `iam-check.vercel.app` alias | After bookmarks/clients cut over |
| Neon Console project display name `iam-check` → `afenda-lite` | Optional console rename |
| Local disk folder `client-declaration-portal` → `afenda-lite` | Close Cursor → `C:\JackProject\afenda-bolt\rename-afenda-lite.ps1` → reopen `afenda-lite` |
| Archive docs that still say “portal” as product | Footnote or rewrite on touch |

## Related

- [doc/README.md](../README.md) — design SSOT index
- [doc/frontend/adr/001-feed-farm-trade.md](../frontend/adr/001-feed-farm-trade.md) — FFT module locks
- [doc/backend/03-bounded-contexts.md](../backend/03-bounded-contexts.md) — modules on one platform
- [deprecation-and-migration](../../.cursor/skills/agent-skills/skills/deprecation-and-migration/SKILL.md)
