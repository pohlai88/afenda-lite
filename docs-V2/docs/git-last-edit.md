# Fumadocs Core — Last Modified Time (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/git-last-edit.md` |
| Authority | **Scratch** — upstream [Last Modified Time](https://fumadocs.dev/docs/headless/utils/git-last-edit) · disk `@afenda/docs` |
| Status | **Outside baseline** — no GitHub Commits API last-edit · no `DocsPage` last-update prop · no `GIT_TOKEN` |
| Audience | Engineers adding “last edited” chrome from GitHub Commits API |
| Updated | 2026-07-19 |

Upstream `getGithubLastEdit({ owner, repo, path, token?, baseUrl? })` from `fumadocs-core/content/github` returns the last commit time for a file via the GitHub REST API.

Lite does **not** call it. Official docs pages show title / description / body / Feedback — no last-edited timestamp chrome.

**Related Active (not this chapter):** fumadocs-mdx `lastModified()` git plugin supplies `page.data.lastModified` for **RSS item dates only** — [rss.md](rss.md). That is build-time git history, not Commits API UI.

GitHub on docs today: nav `githubUrl` + Discussions Feedback App — [feedback.md](feedback.md) · [ui-layouts.md](ui-layouts.md). That App is **not** a PAT for Commits API last-edit.

---

## Lite lock (configured)

| Decision | Disk |
|----------|------|
| No last-edit fetch | No `fumadocs-core/content/github` imports under `apps/docs` |
| No last-update UI | [`app/docs/[[...slug]]/page.tsx`](../../apps/docs/app/docs/[[...slug]]/page.tsx) — no `lastUpdate` / last-edit props on `DocsPage` |
| No `GIT_TOKEN` / `GIT_TOKEN` Bearer | Not in [`packages/env/src/docs.ts`](../../packages/env/src/docs.ts) · not required for docs build |
| MDX `lastModified` for RSS | **Active elsewhere** — [rss.md](rss.md) · not DocsPage chrome |
| Repo pointer only | `githubUrl` + GithubInfo — not per-page commit times |

Wire test enforces Commits API / DocsPage absences (RSS twin stays Active).

---

## Why Outside (Lite)

| Upstream claim | Lite reason |
|----------------|-------------|
| Show last edit on page | Guide + OpenAPI reference; edit history lives in git / GitHub UI |
| Needs token in dev (rate limit) | Extra secret class beside Feedback App; docs project rules avoid sprawl — [README.md](README.md) |
| Per-page API call | Build/dev N+1 Commits API; flaky without token |
| Custom `baseUrl` (GHE) | Lite uses github.com `pohlai88/afenda-lite` only |
| Skip in development | Still leaves prod API dependency + secret ops |

---

## Upstream ladder (reference only)

Do **not** paste these into Lite without a named Docs last-edit reopen.

```ts
// Upstream — NOT Lite
import { getGithubLastEdit } from "fumadocs-core/content/github";

const time = await getGithubLastEdit({
  owner: "pohlai88",
  repo: "afenda-lite",
  path: `apps/docs/content/docs/${page.file.path}`, // path must match git tree
  token: `Bearer ${process.env.GIT_TOKEN}`, // higher rate limit
  // baseUrl: "https://api.github.com" // default; GHE override optional
});
```

Upstream also suggests skipping the call in development when unused:

```ts
// Upstream — NOT Lite
process.env.NODE_ENV === "development" ? null : getGithubLastEdit(/* … */);
```

Auth: [GitHub REST authenticating](https://docs.github.com/en/rest/overview/authenticating-to-the-rest-api).

---

## When reopen is allowed

Explicit Docs last-edit reopen must cover:

1. UI surface (`DocsPage` last-update · footer · metadata only)
2. Exact git path mapping (`apps/docs/content/docs/…` vs monorepo root)
3. Token: name · store (`@afenda/env/docs`) · never product Neon · never commit secrets
4. Rate-limit / cache / skip-dev story for local + CI + Vercel
5. Relationship to RSS `lastModified` (already Active via git plugin — prefer reuse vs dual date sources) — [rss.md](rss.md)
6. Wire tests flipped + this chapter + [ui-layouts.md](ui-layouts.md)

Until then: no Commits API last-edit on `@afenda/docs`.

---

## Hard stops / Why

| Stop | Why |
|------|-----|
| Silent `getGithubLastEdit` on docs page | Unbounded API calls · token pressure |
| Raw `process.env.GIT_TOKEN` | Violates `@afenda/env` floor — [coding-discipline](../../.cursor/rules/coding-discipline.mdc) |
| Reusing Feedback App private key as Commits PAT | Wrong credential class · over-scoped |
| Treating last-edit as open backlog | Outside baseline — named reopen only |
| Disabling MDX `lastModified` to “match” this Outside lock | Breaks RSS — keep [rss.md](rss.md) Active |

---

## Verify

```text
1. No fumadocs-core/content/github · getGithubLastEdit under apps/docs lib/app/components
2. docs page: no lastUpdate / last-edit props
3. packages/env/src/docs.ts: no GIT_TOKEN
4. source.config.ts: lastModified() present for RSS (rss.md) — not a Commits API call
5. Wire test: docs-openapi-wire Last Modified Outside baseline (no GitHub Commits last-edit UI)
6. pnpm --filter @afenda/docs test -- docs-openapi-wire
```

Companion: [rss.md](rss.md) · [feedback.md](feedback.md) · [ui-layouts.md](ui-layouts.md) · [get-toc.md](get-toc.md) · [README.md](README.md).
