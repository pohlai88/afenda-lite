# Fumadocs Core — Remark TS to JS (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/docs/remark-ts2js.md` |
| Authority | **Scratch** — upstream [Remark TS to JS](https://fumadocs.dev/docs/headless/mdx/remark-ts2js) · disk `@afenda/docs` |
| Status | **Outside baseline** — no `fumadocs-docgen` / `oxc-transform` / `remarkTypeScriptToJavaScript` · no Satteri · Active JSX `<Tabs>` / `<Tab>` |
| Audience | Engineers wanting auto TS→JS dual tabs on code fences (`ts2js` meta) |
| Updated | 2026-07-19 |

Upstream transforms TypeScript/TSX fences with `ts2js` meta into TypeScript + JavaScript tab pairs via `fumadocs-docgen` + `oxc-transform` (or Satteri’s `@fumadocs/satteri/remark-ts2js`). Lite does **not** install those packages or wire the plugin.

Prefer:

| Active | Role |
|--------|------|
| Hand `<Tabs>` / `<Tab>` | Already in [`components/mdx.tsx`](../../apps/docs/components/mdx.tsx) |
| Single TS fence | Default Rehype Code — [rehype-code.md](rehype-code.md) |
| No `fumadocs-docgen` | Also Outside for Package Install — [package-install.md](package-install.md) |

Plugin index: [mdx-plugins.md](mdx-plugins.md). Authoring: [markdown.md](markdown.md).

---

## Lite lock (configured)

| Decision | Disk |
|----------|------|
| No `fumadocs-docgen` | `@afenda/docs` `package.json` |
| No `oxc-transform` | Absent · no `serverExternalPackages: ['oxc-transform']` in [`next.config.mjs`](../../apps/docs/next.config.mjs) |
| No `remarkTypeScriptToJavaScript` | Absent from [`source.config.ts`](../../apps/docs/source.config.ts) |
| No Satteri `remarkTs2js` / `compiler: 'satteri'` | Outside — Fumadocs MDX only |
| Explicit remark list | **`remarkBlockId` only** — [mdx-plugins.md](mdx-plugins.md) |
| Tabs components | **Shipped** — for hand dual-language tabs |
| No `ts2js` fence meta as product syntax | Prefer hand Tabs or TS-only fences |

Wire test enforces packages / plugin / Next externalize absence + Active `Tab` / `Tabs`.

---

## Active alternative (Lite)

Hand-author both languages when needed:

```mdx
<Tabs items={["TypeScript", "JavaScript"]}>
  <Tab value="TypeScript">

```tsx
export function greet(name: string) {
  return name;
}
```

  </Tab>
  <Tab value="JavaScript">

```jsx
export function greet(name) {
  return name;
}
```

  </Tab>
</Tabs>
```

Or ship **TypeScript-only** fences (Lite default for docs code).

---

## Upstream ladder (reference only — Outside)

Do **not** paste into Lite.

```bash
# Upstream — NOT Lite
pnpm add fumadocs-docgen oxc-transform
```

```js
// Upstream next.config — NOT Lite
serverExternalPackages: ["oxc-transform"];
```

```ts
// Upstream — NOT Lite
import { remarkTypeScriptToJavaScript } from "fumadocs-docgen/remark-ts2js";

remarkPlugins: [remarkTypeScriptToJavaScript];
```

````md
```tsx ts2js
import { ReactNode } from "react";
// …
```
````

Satteri path (`@fumadocs/satteri/remark-ts2js`) is also Outside — Lite stays on Fumadocs MDX.

---

## When reopen is allowed

Explicit Docs Remark TS→JS reopen must cover:

1. Why auto-transform beats hand Tabs / TS-only fences
2. Accepting `fumadocs-docgen` + `oxc-transform` (conflicts with Package Install Outside unless scoped)
3. Next.js `serverExternalPackages` + build/CI impact
4. Conflict with Active `remarkBlockId`-only list — [mdx-plugins.md](mdx-plugins.md)
5. Wire tests flipped + this chapter + [markdown.md](markdown.md) · [package-install.md](package-install.md)

Until then: no `ts2js` pipeline.

---

## Hard stops / Why

| Stop | Why |
|------|-----|
| Silent `fumadocs-docgen` / `oxc-transform` | Heavy transform deps · Package Install also Outside |
| `remarkTypeScriptToJavaScript` / Satteri `remarkTs2js` | Unreviewed dual-language compile path |
| Mixing `ts2js` meta and hand Tabs | Authoring drift |
| Treating TS→JS as open backlog | Outside — named reopen only |

---

## Verify

```text
1. package.json: no fumadocs-docgen · no oxc-transform · no @fumadocs/satteri
2. next.config.mjs: no oxc-transform externalize
3. source.config.ts: no remarkTypeScriptToJavaScript · no remarkTs2js · remarkBlockId only
4. mdx.tsx: Tab · Tabs present
5. Wire test: docs-openapi-wire Remark TS→JS + MDX Plugins + Package Install
6. pnpm --filter @afenda/docs test -- docs-openapi-wire
```

Companion: [mdx-plugins.md](mdx-plugins.md) · [package-install.md](package-install.md) · [markdown.md](markdown.md) · [rehype-code.md](rehype-code.md) · [ui-components.md](ui-components.md) · [README.md](README.md).
