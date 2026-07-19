# Fumadocs Framework Mode — RSS Feed (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/rss.md` |
| Authority | **Scratch** — upstream [RSS Feed](https://fumadocs.dev/docs/guides/rss) · disk `@afenda/docs` |
| Status | **Active** — `feed` · `/rss.xml` · metadata alternates · MDX `lastModified` (git) |
| Audience | Engineers changing docs syndication feed |
| Updated | 2026-07-19 |

Official docs syndication for guide pages. OpenAPI operation pages stay out of the feed. Item dates come from fumadocs-mdx `lastModified` (git history) — not GitHub Commits UI chrome ([git-last-edit.md](git-last-edit.md) remains Outside).

Framework Mode shell: [next.md](next.md). Content: [content.md](content.md). Global MDX: [fumadocs-mdx-global.md](fumadocs-mdx-global.md). Deploy / deep clone: [deploying.md](deploying.md).

---

## Lite lock (configured)

| Surface | Lite |
|---------|------|
| `feed` package | **Shipped** — `@afenda/docs` dependency |
| `lastModified()` | **Shipped** — [`source.config.ts`](../../apps/docs/source.config.ts) · git VCS |
| `lib/rss.ts` | **Shipped** — [`lib/rss.ts`](../../apps/docs/lib/rss.ts) |
| `GET /rss.xml` | **Shipped** — [`app/rss.xml/route.ts`](../../apps/docs/app/rss.xml/route.ts) |
| `metadata.alternates` | **Shipped** — [`app/layout.tsx`](../../apps/docs/app/layout.tsx) |
| Canonical host | `docsEnv.DOCS_URL` — never product `APP_URL` / Neon |
| Item set | **Guide pages only** — exclude `slugs[0] === "api"` (generated OpenAPI ops) |
| DocsPage last-edit UI | **Outside** — [git-last-edit.md](git-last-edit.md) |

```text
source.config.ts  lastModified()  →  page.data.lastModified (git)
       │
       ▼
lib/rss.ts  getRSS()  →  Feed (guide pages)  →  GET /rss.xml
       │
       ▼
app/layout.tsx  metadata.alternates  application/rss+xml
```

---

## Feed builder

```ts
// apps/docs/lib/rss.ts (shape)
import { docsEnv } from "@afenda/env/docs";
import { Feed } from "feed";
import { docsAppName, source } from "@/lib/source";

export function getRSS() {
  const baseUrl = docsEnv.DOCS_URL.replace(/\/$/, "");
  const feed = new Feed({
    title: docsAppName,
    id: `${baseUrl}/docs`,
    link: `${baseUrl}/docs`,
    language: "en",
    copyright: `© ${new Date().getFullYear()} Afenda-Lite`,
    feedLinks: { rss: `${baseUrl}/rss.xml` },
  });

  for (const page of source.getPages()) {
    if (page.slugs[0] === "api") continue; // generated OpenAPI — out of feed
    feed.addItem({
      id: page.url,
      title: page.data.title,
      description: page.data.description,
      link: `${baseUrl}${page.url}`,
      date: /* page.data.lastModified — required */,
    });
  }

  return feed.rss2();
}
```

Missing `lastModified` on a guide page **throws** (fail closed) — do not invent epoch dates.

---

## Route + discovery

```ts
// app/rss.xml/route.ts
export const revalidate = false;

export function GET() {
  return new Response(getRSS(), {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
```

```ts
// app/layout.tsx
export const metadata: Metadata = {
  metadataBase: new URL(docsEnv.DOCS_URL),
  alternates: {
    types: {
      "application/rss+xml": [{ title: "Afenda-Lite Docs", url: "/rss.xml" }],
    },
  },
};
```

---

## lastModified (git)

```ts
// source.config.ts
import lastModified from "fumadocs-mdx/plugins/last-modified";

export default defineConfig({
  plugins: [lastModified()],
  mdxOptions: { /* … */ },
});
```

| Host | Duty |
|------|------|
| Local | Full git clone · `git` on PATH |
| Docs Vercel | Set `VERCEL_DEEP_CLONE=true` so git history is available — [deploying.md](deploying.md) |

This is **not** `getGithubLastEdit` / `DocsPage` last-update chrome.

---

## Hard stops

| Stop | Why |
|------|-----|
| Indexing every generated OpenAPI op | Noisy feed — keep guide-only filter |
| Product `APP_URL` / Neon env for feed host | Docs ≠ product — use `docsEnv.DOCS_URL` |
| Shipping items without `lastModified` | Invalid dates — fail closed |
| Wiring `getGithubLastEdit` for RSS dates without last-edit reopen | Separate Outside chapter — [git-last-edit.md](git-last-edit.md) |
| Shallow clone on Vercel without `VERCEL_DEEP_CLONE` | Empty / wrong item dates |

---

## Verify

```text
1. apps/docs/lib/rss.ts · apps/docs/app/rss.xml/route.ts present
2. package.json has "feed"
3. source.config.ts: plugins: [lastModified()]
4. app/layout.tsx: application/rss+xml → /rss.xml
5. Wire test: RSS Feed Active path
6. pnpm --filter @afenda/docs test -- docs-openapi-wire
7. Local: pnpm --filter @afenda/docs dev → GET http://localhost:3001/rss.xml
```

Companion: [next.md](next.md) · [git-last-edit.md](git-last-edit.md) · [fumadocs-mdx-global.md](fumadocs-mdx-global.md) · [deploying.md](deploying.md) · [content.md](content.md) · [README.md](README.md) · [automation.md](automation.md).
