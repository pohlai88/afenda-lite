# Vercel project domains (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/tenancy/vercel-domains.md` |
| Authority | **Scratch** — shipping-and-launch + Vercel MCP (read-only) · live HTTP |
| Class | **A** domain hygiene · **B** Platforms contrast only |
| Updated | 2026-07-19 |

No `buy_domain` / DNS / domain attach from this pack.

---

## MCP access (honest)

| Client | Works | Gaps |
|--------|-------|------|
| `plugin-vercel-vercel` | `list_teams` · docs search | Project APIs often empty/403 |
| `project-0-afenda-lite-vercel` | `get_project` · `list_deployments` | Use when plugin project tools fail |
| Live HTTP | `GET …/api/health/liveness` → **200** | Team aliases may **302** (protection) |

Prefer live `APP_URL` probe + Dashboard Domains when MCP `domains[]` omits prod hostname.

---

## Project inventory

| Field | Evidence |
|-------|----------|
| Project | `afenda-lite` · `prj_0Ka5rgzElvbrQMwGEmMmrAw6nBAX` |
| Team | `team_Ymg16AtjGxrKyjaZk5Z52IYc` |
| Region / Node | `sin1` · `nextjs` · `24.x` (`apps/web/vercel.json`) |
| Canonical origin | `https://afenda-lite.vercel.app` (= production `APP_URL`) |
| Prod git auto-deploy | Skipped (`ignoreCommand`) — ship via Deploy workflow |

---

## Class A ledger

| ID | Finding | Status |
|----|---------|--------|
| A1 | MCP `domains[]` may omit prod hostname | Live liveness **200** proves serve; Dashboard authoritative |
| A2 | Team `*.vercel.app` aliases / 302 protection | Never mint invites to deploy URLs — use `APP_URL` |
| A3 | Latest deploy row often **CANCELED** | Judge **READY** + live probe (not “latest row”) |
| A4 | `www.nexuscanon.com` in Neon trusted, not Vercel domain | Open — mail brand vs future custom domain |
| A5 | Neon trailing-slash origin | Closed (N1) — [neon-optimize.md](neon-optimize.md) |

---

## Class B — Platforms contrast

One project · one origin · session-org tenancy. **Ban:** host→tenant on `proxy.ts`, Platforms domain automation, `buy_domain` without ask.

---

## Verify

```text
Live: GET https://afenda-lite.vercel.app/api/health/liveness
MCP:  get_project · list_deployments (project plugin) · list_teams
After Class A domain change: pair Neon trusted origins ([neon-optimize.md](neon-optimize.md) · [urls.md](urls.md))
```
