# Fumadocs Core — Negotiation (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/negotiation.md` |
| Authority | **Scratch** — upstream [Negotiation](https://fumadocs.dev/docs/headless/utils/negotiation) · disk `@afenda/docs` |
| Status | **Outside baseline** for Accept-header rewrite · **Active** explicit `.md` / txt LLM URLs |
| Audience | Engineers adding middleware/`proxy.ts` content negotiation for AI agents |
| Updated | 2026-07-19 |

Upstream Negotiation is a thin wrapper around [`negotiator`](https://www.npmjs.com/package/negotiator) for framework middlewares. Primary recipe: **Accept Markdown** — serve Markdown when `Accept` prefers it, via `isMarkdownPreferred` + `rewritePath` in Next `proxy.ts`.

Lite serves Markdown through **explicit** surfaces only — [llms.md](llms.md):

| Active | Outside |
|--------|---------|
| `next.config.mjs` rewrite `/docs/:path*.md` → `/llms.mdx/docs/:path*` | `proxy.ts` / middleware Accept negotiation |
| `/llms.txt` · `/llms-full.txt` | `isMarkdownPreferred` · `rewritePath` from `fumadocs-core/negotiation` |

i18n also keeps docs free of `proxy.ts` — [i18n.md](i18n.md).

---

## Lite lock (configured)

| Decision | Disk |
|----------|------|
| No docs `proxy.ts` | [`apps/docs/proxy.ts`](../../apps/docs/proxy.ts) **absent** (product web may have its own proxy — not this app) |
| No Negotiation imports | No `fumadocs-core/negotiation` under `apps/docs` |
| Explicit `.md` rewrite | [`next.config.mjs`](../../apps/docs/next.config.mjs) — Active |
| Markdown handler | [`app/llms.mdx/docs/[[...slug]]/route.ts`](../../apps/docs/app/llms.mdx/docs/[[...slug]]/route.ts) |
| Agent guidance | Prefer `/docs/….md` · `/llms.txt` · `/llms-full.txt` — not `Accept: text/markdown` on HTML URLs |

Wire test enforces Negotiation Outside + Active `.md` rewrite.

---

## Why explicit URLs (not Accept rewrite)

| Concern | Lite |
|---------|------|
| Predictable agent URLs | `.md` suffix is copy-pasteable · CI-checkable |
| No edge proxy on docs | Avoids second Next proxy story beside English-only / no i18n middleware |
| Same handler | Accept rewrite would hit the same `llms.mdx` route — gain is convenience only |
| Caching / CDN | Explicit paths are easier to reason about than Vary: Accept |

---

## Upstream ladder (reference only)

Do **not** paste into Lite without a named Docs Negotiation reopen.

```ts
// Upstream — NOT Lite (apps/docs/proxy.ts)
import { NextRequest, NextResponse } from "next/server";
import { isMarkdownPreferred, rewritePath } from "fumadocs-core/negotiation";

const { rewrite: rewriteLLM } = rewritePath("/docs/*path", "/llms.mdx/*path");

export default function proxy(request: NextRequest) {
  if (isMarkdownPreferred(request)) {
    const result = rewriteLLM(request.nextUrl.pathname);
    if (result) {
      return NextResponse.rewrite(new URL(result, request.nextUrl));
    }
  }
  return NextResponse.next();
}
```

Requires the Active `llms.mdx` handler to already exist — [llms.md](llms.md).

---

## When reopen is allowed

Explicit Docs Negotiation reopen must cover:

1. Why Accept beats explicit `.md` for Lite agents
2. Coexistence with English-only / no i18n `proxy.ts` — [i18n.md](i18n.md) (single docs proxy story)
3. `rewritePath` pattern matches monorepo baseUrl `/docs` + `llms.mdx` layout
4. `Vary: Accept` / cache behavior on Vercel — [deploying.md](deploying.md)
5. Wire tests flipped + [llms.md](llms.md) · this chapter

Until then: explicit `.md` / txt only.

---

## Hard stops / Why

| Stop | Why |
|------|-----|
| Silent `apps/docs/proxy.ts` with Negotiation | Outside baseline · conflicts with i18n “no proxy” lock |
| `isMarkdownPreferred` without reopen | Dual Markdown entry (Accept + `.md`) without ops story |
| Dropping `.md` rewrite in favor of Accept-only | Breaks documented agent URLs in [llms.md](llms.md) |
| Treating Negotiation as open backlog | Named reopen only |

---

## Verify

```text
1. apps/docs/proxy.ts absent
2. No fumadocs-core/negotiation · isMarkdownPreferred · rewritePath under apps/docs
3. next.config.mjs: /docs/:path*.md → /llms.mdx/docs/:path*
4. llms.mdx route + getLLMText present
5. Wire test: docs-openapi-wire Negotiation Outside + AI/LLMs Active
6. pnpm --filter @afenda/docs test -- docs-openapi-wire
```

Companion: [llms.md](llms.md) · [i18n.md](i18n.md) · [next.md](next.md) · [deploying.md](deploying.md) · [README.md](README.md).
