/**
 * Cycle break for Node inventory: MDX provider graph (`DocsGraphView` →
 * `build-graph`) must not import the real `@/lib/source` while
 * `collections/server` is still initializing.
 * The inventory script builds its own `loader()` after collections resolve.
 * SSOT: docs-V2/docs/fumadocs-mdx-node.md
 */

export const docsAppName = "Afenda-Lite Docs";

export const source = {
	getPages() {
		return [];
	},
	getPage() {
		return undefined;
	},
	pageTree: { name: "docs", children: [] },
};

export function getPageImage() {
	return { segments: [], url: "/og/docs/image.png" };
}
