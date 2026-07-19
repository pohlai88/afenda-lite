/**
 * Fumadocs MDX Getting Started: docs-V2/docs/fumadocs-mdx.md · Next.js wire: docs-V2/docs/fumadocs-mdx-next.md · Performance: docs-V2/docs/fumadocs-mdx-performance.md (sync · no async/dynamic)
 * Stock pageSchema / metaSchema: docs-V2/docs/fumadocs-mdx.md · practices.md — no custom Zod extend
 * Global Options: docs-V2/docs/fumadocs-mdx-global.md — defineConfig mdxOptions + lastModified() · default MDX compiler · no alternate compiler options · no workspaces · no experimentalBuildCache · no preset minimal
 * MDX Presets: docs-V2/docs/fumadocs-mdx-preset.md — default documentation preset · global mdxOptions only · no collection preset helper · no rehype list · no built-in plugin option bags
 * lastModified (git): docs-V2/docs/rss.md — RSS dates only · DocsPage last-edit UI Outside (git-last-edit.md)
 * Dynamic Entry Outside: docs-V2/docs/fumadocs-mdx-dynamic.md (no collections/dynamic · no page.data.load)
 * Node.js Runtime Loader Active: docs-V2/docs/fumadocs-mdx-node.md (`register()` · list:source-pages)
 * Content source (not Local Markdown / MDX Remote / Content Collections): docs-V2/docs/content-source.md · local-md.md · mdx-remote.md · content-collections.md
 * CMS adapters (BaseHub / Sanity / Payload) Outside baseline.
 * MDX plugins SSOT: docs-V2/docs/mdx-plugins.md · headings: docs-V2/docs/headings.md · code highlight: docs-V2/docs/rehype-code.md · images: docs-V2/docs/remark-image.md · structure: docs-V2/docs/remark-structure.md (defaults · no re-wire).
 * Callouts: JSX Callout only — no Docusaurus directive plugins.
 * File trees: JSX Files / Folder / File only — no fence-to-Files remark plugin.
 * Steps: JSX Steps / Step only — no heading [step] remark plugin.
 * TS/JS dual tabs: hand Tabs only — no oxc / docgen transform plugin.
 */
import { remarkBlockId } from "fumadocs-core/mdx-plugins/remark-block-id";
import { metaSchema, pageSchema } from "fumadocs-core/source/schema";
import { defineConfig, defineDocs } from "fumadocs-mdx/config";
import lastModified from "fumadocs-mdx/plugins/last-modified";

const blockIdOptions = {
	addDataAttribute: "feedback",
} as const;

export const docs = defineDocs({
	dir: "content/docs",
	docs: {
		schema: pageSchema,
		postprocess: {
			/** Required for Graph View page-link graph — docs-V2/docs/ui-components.md */
			extractLinkReferences: true,
			/** Required for getLLMText / llms-full.txt / *.md — docs-V2/docs/llms.md · docs-V2/docs/remark-llms.md */
			includeProcessedMarkdown: true,
		},
	},
	meta: {
		schema: metaSchema,
	},
});

export default defineConfig({
	plugins: [lastModified()],
	mdxOptions: {
		providerImportSource: "@/components/mdx",
		remarkPlugins: [[remarkBlockId, blockIdOptions]],
	},
});
