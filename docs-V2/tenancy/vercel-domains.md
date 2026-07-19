# Vercel project domains (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/tenancy/vercel-domains.md` |
| Authority | **Scratch** — shipping-and-launch + Vercel MCP (read-only) · live HTTP |
| Class | **A** domain hygiene · **B** Platforms contrast only |
| Updated | 2026-07-20 |

No `buy_domain` from this pack. Domain attach: CLI `vercel domains add` from linked `apps/web`.

---

## MCP access (honest)

| Client | Works | Gaps |
|--------|-------|------|
| `plugin-vercel-vercel` | `list_teams` · docs search | Project APIs often empty/403 · no `addProjectDomain` |
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
| Canonical origin | `https://www.nexuscanon.com` (= production `APP_URL`) |
| Project domains | `www.nexuscanon.com` (serve) · `nexuscanon.com` (301 → www) · team `*.vercel.app` aliases |
| Apex DNS | `nexuscanon.com` on Vercel registrar + NS |
| Prod git auto-deploy | Skipped (`ignoreCommand`) — ship via Deploy workflow |

---

## Class A ledger

| ID | Finding | Status |
|----|---------|--------|
| A1 | MCP `domains[]` may omit prod hostname | Live liveness **200** proves serve; Dashboard / CLI authoritative |
| A2 | Team `*.vercel.app` aliases / 302 protection | Never mint invites to deploy URLs — use `APP_URL` |
| A3 | Latest deploy row often **CANCELED** | Judge **READY** + live probe (not “latest row”) |
| A4 | `www.nexuscanon.com` Vercel attach + `APP_URL` cutover | **Closed** 2026-07-20 |
| A5 | Neon trailing-slash origin | Closed (N1) — [neon-optimize.md](neon-optimize.md) |

---

## Class B — Platforms contrast

One project · one origin · session-org tenancy. **Ban:** host→tenant on `proxy.ts`, Platforms domain automation, `buy_domain` without ask.

---

## Verify

```text
Live: GET https://www.nexuscanon.com/api/health/liveness
Live: GET https://nexuscanon.com → 301 Location www
MCP:  get_project · list_deployments (project plugin) · list_teams
After Class A domain change: pair Neon trusted origins ([neon-optimize.md](neon-optimize.md) · [urls.md](urls.md))
```
