# Compare (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/nextjs/compare.md` |
| Authority | **Scratch** |
| Updated | 2026-07-19 |

---

## In this pack

| Item | Where |
|------|-------|
| Ingress · layers · Mode A default | [architecture.md](architecture.md) |
| Folders · bans · typing floor | [folders.md](folders.md) · [data.md](data.md) |
| MCP route inventory | [routes.md](routes.md) |
| RH allowlist only | [../api/rest.md](../api/rest.md) |
| Accelint + hard-stops | [practices.md](practices.md) |

---

## Removed vs earlier V2 draft

| Removed | Why |
|---------|-----|
| Links into `docs/**` (ARCH / API / ADR / DOC) | Living tree absent by design (cutover) — V2 stands alone |
| Living REST contract-only catalogues | Not on MCP; inventing endpoints is over-engineering |
| Deferral text “Living SSOT until cutover” | Authority is MCP + nextjs skill + disk |

---

## Deliberately omitted (stay out of V2)

| Omitted | Reason |
|---------|--------|
| Full path essays for non-MCP routes | Not shipped |
| AdminCN HITL / ui-registry playbooks | Separate farm |
| OpenAPI YAML / Spectral | Separate farm |
| Mode B enablement steps | Not authorized |
| Accelint ❌/✅ example dumps | Skill reference progressive disclosure |
| React runtime catalogue | Separate farm |
| DOC-002 / Control State | Controlled docs model retired for this tree |

---

## MCP vs older skill family names

| Older skill wording | MCP / disk |
|---------------------|------------|
| `/dashboard/*`, `/account/*` | Not in `get_routes` |
| `/admin` | Present |
| `/fft` | Removed (nuclear wipe) |
| `/client/*` | Present |
| `/auth/*`, `/join`, `/` | Present |
| `/api/health\|auth\|session` | Present (no declaration-draft) |
| `/playground/*` | Absent (correct) |

## Verify

Author meta only — operational verify lives in [README.md](README.md) (`get_routes`).
