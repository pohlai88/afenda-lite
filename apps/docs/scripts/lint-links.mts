/**
 * Validate internal MDX links under content/docs (official English docs).
 * SSOT: docs-V2/docs/validate-links.md
 * Lite uses content walk + tsx (not Bun MDX loader / source import — .source TLA).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import {
	printErrors,
	readFileFromPath,
	scanURLs,
	validateFiles,
} from "next-validate-link";

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const contentDocsDir = join(appRoot, "content/docs");

interface DocsPageRef {
	readonly absolutePath: string;
	readonly content: string;
	readonly slug: string[];
}

function walkMdx(dir: string): string[] {
	const out: string[] = [];
	for (const name of readdirSync(dir)) {
		const full = join(dir, name);
		if (statSync(full).isDirectory()) {
			out.push(...walkMdx(full));
			continue;
		}
		if (name.endsWith(".mdx")) {
			out.push(full);
		}
	}
	return out;
}

function pathToSlug(absolutePath: string): string[] {
	const rel = relative(contentDocsDir, absolutePath).replaceAll("\\", "/");
	const withoutExt = rel.replace(/\.mdx$/, "");
	const parts = withoutExt.split("/");
	if (parts.at(-1) === "index") {
		parts.pop();
	}
	return parts.filter((part) => part.length > 0);
}

function docsUrl(slug: string[]): string {
	return slug.length === 0 ? "/docs" : `/docs/${slug.join("/")}`;
}

function extractHeadingHashes(content: string): string[] {
	const hashes: string[] = [];
	for (const match of content.matchAll(/^#{1,6}\s+(.+)$/gm)) {
		const text = match[1]
			.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
			.replace(/`([^`]+)`/g, "$1")
			.trim();
		const slug = text
			.toLowerCase()
			.replace(/[^\w\s-]/g, "")
			.replace(/\s+/g, "-");
		if (slug.length > 0) {
			hashes.push(slug);
		}
	}
	return hashes;
}

function collectDocsContentPages(): DocsPageRef[] {
	return walkMdx(contentDocsDir).map((absolutePath) => {
		const content = readFileSync(absolutePath, "utf8");
		return {
			absolutePath,
			content,
			slug: pathToSlug(absolutePath),
		};
	});
}

const pages = collectDocsContentPages();
if (pages.length === 0) {
	console.error("[lint:links] no MDX under content/docs");
	process.exit(1);
}

const scanned = await scanURLs({
	preset: "next",
	cwd: appRoot,
	populate: {
		"docs/[[...slug]]": pages.map((page) => ({
			value: {
				slug: [...page.slug],
			},
			hashes: extractHeadingHashes(page.content),
		})),
	},
});

for (const page of pages) {
	scanned.urls.set(docsUrl(page.slug), {});
}

const files = await Promise.all(
	pages.map((page) => {
		const relativePath = relative(appRoot, page.absolutePath).replaceAll(
			"\\",
			"/",
		);
		return readFileFromPath(relativePath, () => docsUrl(page.slug));
	}),
);

printErrors(
	await validateFiles(files, {
		scanned,
		markdown: {
			components: {
				Card: { attributes: ["href"] },
			},
		},
		checkRelativePaths: "as-url",
	}),
	true,
);

console.log(`[lint:links] OK (${pages.length} pages)`);
