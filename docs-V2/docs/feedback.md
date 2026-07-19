# Fumadocs Framework Mode — Feedback (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/feedback.md` |
| Authority | **Scratch** — upstream [Feedback](https://fumadocs.dev/docs/integrations/feedback) · disk `@afenda/docs` |
| Status | **Active** — page + block UI mounted · GitHub Discussions · App ops **opened** |
| Audience | Engineers changing docs feedback UX or Discussions wiring |
| Updated | 2026-07-19 |

Receive reader feedback on the official docs site. Component catalog row: [ui-components.md](ui-components.md). CLI install: [cli.md](cli.md). Deploy / env host notes: [deploying.md](deploying.md).

---

## Overview (Lite)

| Concern | Lite |
|---------|------|
| Install | Fumadocs CLI `feedback` — already under `components/feedback/*` |
| Page feedback | `<Feedback onSendAction={onPageFeedbackAction} />` |
| Block feedback | `<FeedbackText onSendAction={onBlockFeedbackAction}>` + `remarkBlockId` |
| Backend | GitHub Discussions via GitHub App (`octokit`) — not PostHog / console stub |
| App credentials | Optional at boot · required on submit · **ops opened** (set `GITHUB_APP_*` after App install) |

```text
DocsPage
  DocsBody
    FeedbackText (block select) → onBlockFeedbackAction
  Feedback (page rate)          → onPageFeedbackAction
         │
         ▼
  lib/github-feedback.ts → Discussions category "Docs Feedback"
         │
         ▼
  @afenda/env/docs  (GITHUB_APP_ID · GITHUB_APP_PRIVATE_KEY)
```

---

## Installation (configured)

```bash
pnpm --filter @afenda/docs fd:add:silent -- feedback
```

Owned sources: `apps/docs/components/feedback/{client,schema}.tsx`. Do not re-install over hardened client without a named slice.

---

## Page Feedback (configured)

```tsx
// apps/docs/app/docs/[[...slug]]/page.tsx
import { Feedback, FeedbackText } from "@/components/feedback/client";
import {
  onBlockFeedbackAction,
  onPageFeedbackAction,
} from "@/lib/github-feedback";

<DocsPage toc={page.data.toc}>
  …
  <DocsBody>
    <FeedbackText onSendAction={onBlockFeedbackAction}>
      {content}
    </FeedbackText>
  </DocsBody>
  <Feedback onSendAction={onPageFeedbackAction} />
</DocsPage>
```

| Prop | Lite |
|------|------|
| `onSendAction` | Real server actions — **not** `console.log` stubs |
| Response | `{ githubUrl? }` when Discussions write succeeds; errors surface in UI (`role="alert"`) |

---

## Feedback Block (configured)

```ts
// apps/docs/source.config.ts
import { remarkBlockId } from "fumadocs-core/mdx-plugins/remark-block-id";

const blockIdOptions = {
  addDataAttribute: "feedback",
} as const;

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [[remarkBlockId, blockIdOptions]],
  },
});
```

`remark-block-id` stamps stable block IDs (content + order) for selection popovers and third-party correlation. Plugin inventory: [mdx-plugins.md](mdx-plugins.md).

---

## GitHub Discussions (configured code · ops opened)

Borrowed pattern from upstream `lib/github.ts` → Lite [`lib/github-feedback.ts`](../../apps/docs/lib/github-feedback.ts).

| Constant | Value |
|----------|-------|
| `owner` / `repo` | `pohlai88` / `afenda-lite` |
| `DocsCategory` | `Docs Feedback` |
| Env | `@afenda/env/docs` — `GITHUB_APP_ID` · `GITHUB_APP_PRIVATE_KEY` |
| Env template | `.env.example` (commented keys; set in `.env.local` / docs host after App install) |

| Action | Role |
|--------|------|
| `onPageFeedbackAction` | Parse `pageFeedback` → create/comment Discussion |
| `onBlockFeedbackAction` | Parse `blockFeedback` → Discussion with block quote + hash URL |

### Ops status

| Phase | State |
|-------|-------|
| **Code** | **Shipped** — UI · schema · actions · `remarkBlockId` · env schema |
| **GitHub App ops** | **Opened** — App `afenda-lite-docs-feedback` installed; category **Docs Feedback**; `GITHUB_APP_*` in `.env.local` |

Submit without credentials **throws** (honest failure; no silent success / fake `githubUrl`).

### Ops checklist (opened)

1. Discussions enabled on `pohlai88/afenda-lite`
2. Category **Docs Feedback** present (`docs-feedback`)
3. GitHub App `afenda-lite-docs-feedback` (Discussions write) installed on that repo
4. `GITHUB_APP_ID` / `GITHUB_APP_PRIVATE_KEY` in `.env.local` **and** docs host `afenda-lite-docs` (Production · Preview · Development)
5. Smoke: App JWT page/block → [#8](https://github.com/pohlai88/afenda-lite/discussions/8) · [#9](https://github.com/pohlai88/afenda-lite/discussions/9); UI page submit on `:3001` → thanks **View on GitHub** [comment on #9](https://github.com/pohlai88/afenda-lite/discussions/9#discussioncomment-17689491); missing creds → `role="alert"` honest failure

---

## Outside baseline / banned

| Pattern | Why |
|---------|-----|
| `console.log` / stub `onSendAction` | No soft success — real Discussions path only |
| PostHog / analytics-only handlers | Lite path is GitHub Discussions |
| Product `DATABASE_URL` / Neon Auth on docs for feedback | Docs project boundary — [README.md](README.md) |
| `GITHUB_TOKEN` as App substitute | App installation Octokit only |
| Soft-success when credentials missing | Forbidden — throw + UI alert |

---

## Disk map

```text
apps/docs/
  components/feedback/client.tsx   # Feedback · FeedbackText
  components/feedback/schema.ts    # Zod page/block + ActionResponse
  lib/github-feedback.ts           # Server actions → Discussions
  source.config.ts                 # remarkBlockId
  app/docs/[[...slug]]/page.tsx    # Mount
packages/env/src/docs.ts           # GITHUB_APP_* optional at boot
```

---

## Verify

```text
1. page.tsx mounts Feedback + FeedbackText with github-feedback actions
2. source.config.ts: remarkBlockId + addDataAttribute "feedback"
3. github-feedback.ts: owner/repo/DocsCategory · @afenda/env/docs · no console.log
4. client: FeedbackThanksActions · role="alert" error path
5. Wire test: Feedback lock
6. Smoke : App JWT / UI submit → Discussion URL (evidence: discussions/8 · discussions/9)
```

Companion: [ui-components.md](ui-components.md) · [cli.md](cli.md) · [deploying.md](deploying.md) · [markdown.md](markdown.md).
