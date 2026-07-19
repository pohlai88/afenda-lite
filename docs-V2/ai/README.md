# AI The Machine (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/ai/` |
| Authority | **Scratch** — monorepo-discipline · `@afenda/ai-the-machine` |
| Purpose | Rank-1 prompt-only assistants via Vercel AI SDK + AI Gateway |
| Updated | 2026-07-20 |

## Pack index

| Doc | Role |
|-----|------|
| [ai-the-machine-dna.md](./ai-the-machine-dna.md) | Absorb/reject DNA · env · RH · OpenAPI exclusion · verify |

## Living surfaces

| Layer | Path |
|-------|------|
| Package | `packages/ai-the-machine` (`@afenda/ai-the-machine`) |
| RH | `POST /api/ai/chat` (UIMessage stream — excluded from OPEN-001) |
| UI | `apps/web/features/ai-the-machine` on `/client` |
| Env | `AI_GATEWAY_API_KEY` · `AI_THE_MACHINE_MODEL` (`@afenda/env`) |

## Must not

- Direct `@anthropic-ai/sdk` in Platform
- Client-supplied `userId` / `organizationId` on chat body
- ERP module assistants / DB tool executors in v1
- Dual OpenAPI registration of the stream RH

## Verify

```bash
pnpm --filter @afenda/ai-the-machine test
pnpm --filter @afenda/web test -- api-ai-chat
pnpm check:openapi
```

Related: [../api/rest.md](../api/rest.md) · [../monorepo/README.md](../monorepo/README.md) · [LAYERS.md](../../.cursor/skills/afenda-elite-monorepo-discipline/LAYERS.md)
