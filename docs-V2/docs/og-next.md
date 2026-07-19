# Fumadocs Framework Mode — next/og (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/og-next.md` |
| Authority | **Scratch** — upstream [next/og](https://fumadocs.dev/docs/integrations/og/next) · disk `@afenda/docs` |
| Status | **Active** — Metadata Image via `next/og` + `fumadocs-ui/og` |
| Audience | Engineers changing docs Open Graph / social cards |
| Updated | 2026-07-19 |

Usage with the Next.js Metadata API. Fundamentals: [Next.js Metadata](https://nextjs.org/docs/app/building-your-application/optimizing/metadata). Themes context: [ui.md](ui.md).

---

## Lite lock (configured)

| Piece | Disk |
|-------|------|
| `metadataBase` | [`app/layout.tsx`](../../apps/docs/app/layout.tsx) ← `docsEnv.DOCS_URL` (`@afenda/env/docs`) |
| `getPageImage` · `docsAppName` | [`lib/source.ts`](../../apps/docs/lib/source.ts) |
| `openGraph.images` | [`app/docs/[[...slug]]/page.tsx`](../../apps/docs/app/docs/[[...slug]]/page.tsx) `generateMetadata` |
| Image route | [`app/og/docs/[...slug]/route.tsx`](../../apps/docs/app/og/docs/[...slug]/route.tsx) |
| Generator | `fumadocs-ui/og` → `generate` (`DefaultImage`) + `ImageResponse` |
| Site string | `"Afenda-Lite Docs"` (same as Navbar title) |
| Accent colors | Neutral zinc (not stock pink/purple defaults) |
| `og/mono` CLI preset | **Outside baseline** |
| `lang` in `generateStaticParams` | **Omitted** — English-only — [i18n.md](i18n.md) |

```text
generateMetadata → openGraph.images = /og/docs/<slugs>/image.png
                         │
                         ▼
              GET app/og/docs/[...slug]
                         │
                         ▼
         ImageResponse(<DefaultImage title·description·site />)
```

---

## Metadata Image (configured)

### `getPageImage`

```ts
// lib/source.ts
export const docsAppName = "Afenda-Lite Docs";

export function getPageImage(page: (typeof source)["$inferPage"]) {
  const segments = [...page.slugs, "image.png"];
  return {
    segments,
    url: `/og/docs/${segments.join("/")}`,
  };
}
```

Append `image.png` so the card URL is `/og/docs/my-page/image.png` (docs root → `/og/docs/image.png`).

### `metadataBase` (root layout)

Relative `openGraph.images` (`/og/docs/…`) need an absolute origin. Root layout exports:

```tsx
// app/layout.tsx
import { docsEnv } from "@afenda/env/docs";
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL(docsEnv.DOCS_URL),
};
```

| Env | Role |
|-----|------|
| `DOCS_URL` | Public docs origin (default `http://localhost:3001`) — set https origin on the docs Vercel project |
| Never | Product `APP_URL` as docs `metadataBase` — [deploying.md](deploying.md) |

### `generateMetadata`

```tsx
return {
  title: page.data.title,
  description: page.data.description,
  openGraph: {
    images: getPageImage(page).url,
  },
};
```

### Route handler

```tsx
// app/og/docs/[...slug]/route.tsx
export const revalidate = false;

export async function GET(_req, props) {
  const { slug = [] } = await props.params;
  const page = source.getPage(slug.slice(0, -1)); // drop image.png
  if (!page) notFound();

  return new ImageResponse(
    <DefaultImage
      title={page.data.title}
      description={page.data.description}
      site={docsAppName}
      primaryColor="rgba(113,113,122,0.35)"
      primaryTextColor="rgb(63,63,70)"
    />,
    { width: 1200, height: 630 },
  );
}

export function generateStaticParams() {
  return source.getPages().map((page) => ({
    slug: getPageImage(page).segments,
  }));
}
```

Satori options (fonts, emoji, …): see [vercel/satori](https://github.com/vercel/satori). Change only under a named Docs OG slice.

---

## Outside baseline

| Pattern | Why |
|---------|-----|
| CLI `og/mono` (or other OG presets) | Stock `fumadocs-ui/og` `generate` is Active |
| `lang: page.locale` in static params | No i18n loader — [i18n.md](i18n.md) |
| Custom hand-rolled OG layout (replace `DefaultImage`) | Named Docs OG design slice |
| Product `@afenda/ui-system` in OG JSX | Docs shell ≠ product design system |
| Absolute CDN OG URLs only | Relative `/og/docs/…` resolved by Next Metadata |

---

## Verify

```text
1. app/layout.tsx exports metadata.metadataBase from docsEnv.DOCS_URL
2. lib/source.ts exports getPageImage + docsAppName
3. page.tsx generateMetadata sets openGraph.images
4. app/og/docs/[...slug]/route.tsx: ImageResponse + DefaultImage · no lang param
5. No components/og/mono · no CLI og/mono install required
6. Wire test: og-next lock
7. Spot-check :3001/og/docs/guide/image.png · view page source for og:image (absolute via metadataBase)
```

Companion: [next.md](next.md) · [ui.md](ui.md) · [i18n.md](i18n.md) · [deploying.md](deploying.md).
