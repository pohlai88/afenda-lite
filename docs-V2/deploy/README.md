# Deploy performance criteria (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/deploy/README.md` |
| Authority | **Scratch** — shipping-and-launch + Vercel MCP (read-only) + disk under `apps/web/**` |
| Purpose | Lean deploy latency · cache · region gates · launch checklist |
| Updated | 2026-07-19 |

Re-probe after region or deploy-pipeline changes — not Living SSOT.

---

## Posture (disk)

| Item | Evidence |
|------|----------|
| Config | [`apps/web/vercel.json`](../../apps/web/vercel.json) |
| Framework | `nextjs` |
| Function region | `sin1` |
| Build | `pnpm exec turbo run build --filter=@afenda/web` |
| Production git auto-deploy | Skipped (`ignoreCommand` exits 0 when `VERCEL_ENV=production`) |
| Neon co-locate | Keep `sin1` ↔ Neon `aws-ap-southeast-1` — [../tenancy/neon-optimize.md](../tenancy/neon-optimize.md) |
| Domain / deploy inventory | [../tenancy/vercel-domains.md](../tenancy/vercel-domains.md) |
| Official docs app | Separate host lock — [`../docs/deploying.md`](../docs/deploying.md) · [`apps/docs/vercel.json`](../../apps/docs/vercel.json) · **not** this product Deploy workflow |

---

## Criteria (D1–D4)

| ID | Criterion | Pass when |
|----|-----------|-----------|
| D1 | Data proximity | Functions remain `sin1`; no unasked multi-region |
| D2 | Function latency | `vercel httpstat` ×3 on public RH; cold ≫ warm ⇒ cold-start note, not silent accept |
| D3 | Cache safety | Public cacheable RH may use `s-maxage` / SWR; **session · auth · org-scoped** never CDN-cached |
| D4 | Deploy truth | Judge **READY** production only; ignore CANCELED / “latest row” |

Optional (Speed Insights already on only — do not enable here): p75 LCP ≤ 2.5s · INP ≤ 200ms · CLS ≤ 0.1.

---

## Launch checklist (ops folded)

| Check | Pass when |
|-------|-----------|
| L1 Health | `GET https://afenda-lite.vercel.app/api/health/liveness` → 200 |
| L2 Origin | Production `APP_URL` = `https://afenda-lite.vercel.app` |
| L3 Trusted origins | Neon Auth `trusted_origins` includes that origin ([../tenancy/neon-optimize.md](../tenancy/neon-optimize.md)) |
| L4 Invite join | Invite links use production origin → `/join?invitationId=…` ([../tenancy/urls.md](../tenancy/urls.md)) |
| L5 Domains | Class A ledger current ([../tenancy/vercel-domains.md](../tenancy/vercel-domains.md)) |
| L6 Deploy truth | Judge **READY** production only (D4) |
| L7 Correlate | Failures carry `x-correlation-id` / Action `details.correlationId` ([../observability/README.md](../observability/README.md)) |

---

## Verify ladder (read-only)

[Vercel debug-slow-functions](https://vercel.com/docs/functions/debug-slow-functions). Probe: [`apps/web/app/api/health/liveness/route.ts`](../../apps/web/app/api/health/liveness/route.ts).

```text
1. vercel httpstat /api/health/liveness   # ×3 cold vs warm
2. vercel logs --environment production --source serverless --since 1h
3. vercel inspect <deployment-url>        # region / maxDuration sanity
```

MCP (if `list_projects` non-empty): `get_project` · `list_deployments`. Empty project list → do not invent a snapshot; trust disk + [vercel-domains.md](../tenancy/vercel-domains.md).

---

## Hard stops

- No Fluid / Speed Insights / `vercel.json` mutate without an explicit ask this turn
- No CDN for session trees; no Platforms host→tenant
- No `'use cache'` / PPR as “optimize” advice
- No links into `docs/`; no product/package edits from this pack
- Coding discipline: `@afenda/env` for product config; no tutorial `{ success, data }` envelopes

Companion: [../nextjs/practices.md](../nextjs/practices.md) · [../api/rest.md](../api/rest.md) · [../tenancy/README.md](../tenancy/README.md) · [../observability/README.md](../observability/README.md).
