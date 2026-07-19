import { docs } from "collections/server";
import { loader } from "fumadocs-core/source";
import { lucideIconsPlugin } from "fumadocs-core/source/lucide-icons";
import { openapi } from "@/lib/openapi.server";

/**
 * Public docs loader — Loader API: docs-V2/docs/loader-api.md · source input: docs-V2/docs/loader-source.md · plugins: docs-V2/docs/loader-plugins.md
 * Collection entry: collections/server only — docs-V2/docs/fumadocs-mdx-entry.md · docs-V2/docs/fumadocs-mdx-server.md (no browser/dynamic)
 * Node Runtime Loader inventory (offline): docs-V2/docs/fumadocs-mdx-node.md — does not replace this RSC source
 * Dynamic Entry Outside: docs-V2/docs/fumadocs-mdx-dynamic.md · Browser Entry Outside: docs-V2/docs/fumadocs-mdx-browser.md
 * Access Control Outside baseline: docs-V2/docs/access-control.md
 * Content source = Fumadocs MDX (CMS / Content Collections / Local Markdown / MDX Remote Outside): docs-V2/docs/content-source.md · content-collections.md · local-md.md · mdx-remote.md
 * i18n Outside baseline (no loader i18n): docs-V2/docs/i18n.md
 * AsyncAPI Outside baseline (OpenAPI plugin only): docs-V2/docs/asyncapi.md
 * OG images: docs-V2/docs/og-next.md
 * Page Markdown URLs / Page Actions chrome: docs-V2/docs/llms.md
 * Lucide content icons: docs-V2/docs/loader-plugins.md · docs-V2/docs/page-conventions.md
 */
export const source = loader({
	baseUrl: "/docs",
	source: docs.toFumadocsSource(),
	plugins: [lucideIconsPlugin(), openapi.loaderPlugin()],
});

/** Site label on OG cards — matches `baseOptions().nav.title` */
export const docsAppName = "Afenda-Lite Docs";

const DOCS_GITHUB = {
	owner: "pohlai88",
	repo: "afenda-lite",
	branch: "main",
	contentRoot: "apps/docs/content/docs",
} as const;

/** Open Graph image path for a docs page — `/og/docs/.../image.png` */
export function getPageImage(page: (typeof source)["$inferPage"]): {
	readonly segments: string[];
	readonly url: string;
} {
	const segments = [...page.slugs, "image.png"];
	return {
		segments,
		url: `/og/docs/${segments.join("/")}`,
	};
}

/** Public Markdown URL for Page Actions — rewrite → llms.mdx — docs-V2/docs/llms.md */
export function getPageMarkdownUrl(page: (typeof source)["$inferPage"]): {
	readonly segments: string[];
	readonly url: string;
} {
	if (page.slugs.length === 0) {
		return { segments: [], url: "/docs.md" };
	}
	return {
		segments: page.slugs,
		url: `/docs/${page.slugs.join("/")}.md`,
	};
}

/** GitHub blob URL for ViewOptionsPopover — monorepo content root */
export function getPageGithubUrl(page: (typeof source)["$inferPage"]): string {
	return `https://github.com/${DOCS_GITHUB.owner}/${DOCS_GITHUB.repo}/blob/${DOCS_GITHUB.branch}/${DOCS_GITHUB.contentRoot}/${page.path}`;
}
