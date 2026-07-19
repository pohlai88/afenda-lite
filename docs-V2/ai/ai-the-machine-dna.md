# AI The Machine DNA (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/ai/ai-the-machine-dna.md` |
| Authority | **Scratch** — monorepo-discipline · ai-sdk · vercel-agent |
| Source DNA | `_reference/packages/ai-copilot` (`@vierp/ai-copilot`) — read-only historical |
| Living package | [`@afenda/ai-the-machine`](../../packages/ai-the-machine/README.md) |
| Updated | 2026-07-20 |

---

## Verdict

**Create `@afenda/ai-the-machine`** as a Rank-1 Platform engine (AI SDK + Vercel AI Gateway). Do not port Vierp ERP assistants, direct Anthropic SDK, or DB tool executors in v1.

| Concern | Owner |
|---------|-------|
| Engine · assistants · Zod chat schemas · intent/context | `@afenda/ai-the-machine` |
| Gateway key / model | `@afenda/env` (`AI_GATEWAY_API_KEY` · `AI_THE_MACHINE_MODEL`) |
| Session mint · rate limit · RH stream | `apps/web` `POST /api/ai/chat` |
| UI consumer | `apps/web/features/ai-the-machine` on `/client` |

---

## Absorb / reject

| Absorb | Reject |
|--------|--------|
| Factory + engine; assistant registry; context builder; intent classify; stream + chat | Direct `@anthropic-ai/sdk`; ERP modules (hrm/crm/mrp/accounting/costing); `@vierp/*`; silent DB catches; broken `./tools` export; default `vi` locale |

Living assistants: `platform` · `identity` · `general`.

---

## Vercel Agent disambiguation

| Product | In scope? |
|---------|-----------|
| **Vercel Agent Code Review** (project Settings → AI) | Yes — enable for `afenda-lite`; ~$0.30/review + tokens |
| AI Gateway coding-agents CLI (`vercel ai-gateway coding-agents setup`) | No — local IDE tooling |
| eve Agent Runs observability | No |
| Agent Installation (Analytics / Speed Insights) | No this slice |

Enable Code Review (dashboard — **no MCP/API toggle**): team slug `jacks-projects-7b3cfe94`, project `afenda-lite` (`prj_0Ka5rgzElvbrQMwGEmMmrAw6nBAX`). Open [Agent](https://vercel.com/jacks-projects-7b3cfe94/~/agent) in the dashboard sidebar (or project Settings → AI), enable **Code Review** for the linked GitHub repo `pohlai88/afenda-lite`, choose draft-PR policy. This is platform Code Review — not `vercel ai-gateway coding-agents setup`. Docs: [Vercel Agent](https://vercel.com/docs/agent) · [Code Review setup](https://vercel.com/docs/agent/code-review).

**HITL verify path (2026-07-20 cutover):** After enable, open a PR (or wait for the next PR). Confirm a Code Review run appears under Agent → Code Review for that PR. Do **not** use MCP `list_agent_runs` (eve observability — out of scope). Agent Installation (Analytics / Speed Insights) is a different free product — skip this slice.

Env (names only; values never in git): `AI_GATEWAY_API_KEY`, `AI_THE_MACHINE_MODEL` (default `anthropic/claude-sonnet-4.5`). Synced to Vercel **Production / Preview / Development** via CLI from local `.env.local` (2026-07-20). On Vercel, Gateway OIDC may apply when the key is omitted.

---

## OpenAPI

`POST /api/ai/chat` is a UIMessage stream (like Neon Auth BFF) — **excluded** from [`OPEN-001-openapi.yaml`](../api/OPEN-001-openapi.yaml). Contract: Zod `chatRequestSchema` + [rest.md](../api/rest.md).

---

## Verify

```text
pnpm --filter @afenda/ai-the-machine test
pnpm --filter @afenda/web test -- api-ai-chat
pnpm check:openapi
```
