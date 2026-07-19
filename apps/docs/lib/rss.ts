import { docsEnv } from "@afenda/env/docs";
import { Feed } from "feed";
import { docsAppName, source } from "@/lib/source";

/**
 * Docs RSS 2.0 — docs-V2/docs/rss.md
 * Item set: human guide pages only (exclude generated OpenAPI under /docs/api/*).
 * Dates: fumadocs-mdx `lastModified` (git) — not GitHub Commits API (git-last-edit.md Outside).
 */

function isGuideFeedPage(page: (typeof source)["$inferPage"]): boolean {
	return page.slugs[0] !== "api";
}

function itemDate(page: (typeof source)["$inferPage"]): Date {
	const raw: unknown = page.data.lastModified;
	if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
		return raw;
	}
	if (typeof raw === "string" || typeof raw === "number") {
		const parsed = new Date(raw);
		if (!Number.isNaN(parsed.getTime())) {
			return parsed;
		}
	}
	throw new Error(
		`RSS item missing lastModified for ${page.url}. Enable fumadocs-mdx lastModified and ensure full git history (set VERCEL_DEEP_CLONE=true on the docs Vercel project).`,
	);
}

export function getRSS(): string {
	const baseUrl = docsEnv.DOCS_URL.replace(/\/$/, "");
	const feed = new Feed({
		title: docsAppName,
		id: `${baseUrl}/docs`,
		link: `${baseUrl}/docs`,
		language: "en",
		copyright: `© ${new Date().getFullYear()} Afenda-Lite`,
		feedLinks: {
			rss: `${baseUrl}/rss.xml`,
		},
	});

	for (const page of source.getPages()) {
		if (!isGuideFeedPage(page)) {
			continue;
		}
		feed.addItem({
			id: page.url,
			title: page.data.title,
			description: page.data.description,
			link: `${baseUrl}${page.url}`,
			date: itemDate(page),
		});
	}

	return feed.rss2();
}
