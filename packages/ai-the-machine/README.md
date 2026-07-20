# `@afenda/ai-the-machine`

**What it is** — Rank-1 Platform conversational engine for Afenda-Lite (“The Machine”): AI SDK streaming/chat over Vercel AI Gateway, with living assistants for `platform`, `identity`, and `general`.

**What it does** — Builds system prompts from session-minted context, classifies intent, streams UI messages via `streamText` / `toUIMessageStreamResponse`, and exposes Zod schemas for the web Route Handler boundary.

**When you need it** — Authenticated product chat (`POST /api/ai/chat` + `/client` UI). Web injects the Gateway `LanguageModel` and mints org/user context from Neon session.

**Who it's for** — `apps/web` Route Handlers and features. Prompt-only v1 (no DB tool executors). No Next.js / Surfaces / `@afenda/db` deps.

## Consume

```ts
import { createGateway } from "ai";
import {
	createTheMachine,
	chatRequestSchema,
	DEFAULT_MACHINE_MODEL_ID,
} from "@afenda/ai-the-machine";

const gateway = createGateway({ apiKey: env.AI_GATEWAY_API_KEY });
const machine = createTheMachine({
	model: gateway(env.AI_THE_MACHINE_MODEL ?? DEFAULT_MACHINE_MODEL_ID),
});

return machine.stream({ messages, context });
```

DNA absorb/reject: [docs-V2/ai/ai-the-machine-dna.md](../../docs-V2/ai/ai-the-machine-dna.md).

## Maintain

```bash
pnpm --filter @afenda/ai-the-machine lint
pnpm --filter @afenda/ai-the-machine typecheck
pnpm --filter @afenda/ai-the-machine test
```

Requires root engines: **Node `24.x`**, **pnpm `≥10.33.4`**.

## Exports

| Path | Role |
|------|------|
| `@afenda/ai-the-machine` | `createTheMachine` · assistants · intent/context helpers · Zod schemas · constants |

## Ownership

| Concern | Owner |
|---------|-------|
| Engine + assistants + schemas | this package |
| Gateway key / model env | `@afenda/env` + web RH |
| Session mint + rate limit + UI | `apps/web` |

**Layer:** Rank-1 Platform (`ai` SDK; no `@afenda/db` · no Surfaces · no `apps/*` imports). See [docs-V2/monorepo](../../docs-V2/monorepo/README.md).

## Out of scope

Do not add to this package: DB tool executors, product UI shells, a second model gateway outside Vercel AI Gateway, or Next.js Route Handler ownership (stays in `apps/web`).

## Authority

| Topic | Link |
|-------|------|
| AI Scratch · DNA absorb/reject | [docs-V2/ai](../../docs-V2/ai/README.md) · [ai-the-machine-dna.md](../../docs-V2/ai/ai-the-machine-dna.md) |
| Package DAG | [docs-V2/monorepo](../../docs-V2/monorepo/README.md) · [LAYERS.md](../../.cursor/skills/afenda-elite-monorepo-discipline/LAYERS.md) |
| Typed product env | [`@afenda/env`](../env/README.md) |
| Agent checkout posture | [AGENTS.md](../../AGENTS.md) |
