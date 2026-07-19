/**
 * Node-inventory stand-in for `@/lib/build-graph` (avoids `@/lib/source` cycle).
 * SSOT: docs-V2/docs/fumadocs-mdx-node.md
 */

export function buildGraph() {
	return { nodes: [], links: [] };
}
