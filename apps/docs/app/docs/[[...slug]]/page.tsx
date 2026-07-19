import {
	DocsBody,
	DocsDescription,
	DocsPage,
	DocsTitle,
	MarkdownCopyButton,
	ViewOptionsPopover,
} from "fumadocs-ui/layouts/docs/page";
import { InlineTOC } from "fumadocs-ui/components/inline-toc";
import { createRelativeLink } from "fumadocs-ui/mdx";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { InternalOpenAPIMeta } from "fumadocs-openapi/server";
import type { ComponentProps } from "react";
import { OpenAPIPreloadProvider } from "@/components/api-page";
import { Feedback, FeedbackText } from "@/components/feedback/client";
import { getMDXComponents } from "@/components/mdx";
import {
	onBlockFeedbackAction,
	onPageFeedbackAction,
} from "@/lib/github-feedback";
import { openapi } from "@/lib/openapi.server";
import {
	getPageGithubUrl,
	getPageImage,
	getPageMarkdownUrl,
	source,
} from "@/lib/source";

function pageHasOpenApiPreload(
	data: unknown,
): data is { _openapi: InternalOpenAPIMeta & { preload: string[] } } {
	if (typeof data !== "object" || data === null) {
		return false;
	}
	if (!("_openapi" in data) || data._openapi === undefined) {
		return false;
	}
	const meta = data._openapi;
	if (typeof meta !== "object" || meta === null) {
		return false;
	}
	if (!("preload" in meta) || !Array.isArray(meta.preload)) {
		return false;
	}
	return (
		meta.preload.length > 0 &&
		meta.preload.every((id): id is string => typeof id === "string")
	);
}

function assertOpenApiPreloadedDocs(
	preloaded: { docs: Record<string, unknown> },
	preloadIds: readonly string[],
): void {
	const docs = preloaded.docs;
	if (typeof docs !== "object" || docs === null) {
		throw new Error(
			"[Afenda Docs] OpenAPI preload returned no docs map — check createOpenAPI input and _openapi.preload.",
		);
	}
	const keys = Object.keys(docs);
	if (keys.length === 0) {
		throw new Error(
			"[Afenda Docs] OpenAPI preload docs is empty — _openapi.preload must list documents from createOpenAPI input.",
		);
	}
	for (const id of preloadIds) {
		if (!(id in docs) || docs[id] === undefined) {
			throw new Error(
				`[Afenda Docs] OpenAPI document "${id}" was not preloaded — ensure it is in createOpenAPI({ input }) and _openapi.preload.`,
			);
		}
	}
}

interface DocsPageProperties {
	readonly params: Promise<{ slug?: string[] }>;
}

export default async function DocsPageRoute(props: DocsPageProperties) {
	const params = await props.params;
	const page = source.getPage(params.slug);
	if (!page) {
		notFound();
	}

	const MDX = page.data.body;
	const markdownUrl = getPageMarkdownUrl(page).url;
	const githubUrl = getPageGithubUrl(page);

	let openApiPreloaded:
		| Awaited<ReturnType<typeof openapi.preloadOpenAPIPage>>["preloaded"]
		| undefined;
	if (pageHasOpenApiPreload(page.data)) {
		const openApiPage = await openapi.preloadOpenAPIPage(page);
		assertOpenApiPreloadedDocs(
			openApiPage.preloaded,
			page.data._openapi.preload,
		);
		openApiPreloaded = openApiPage.preloaded;
	}

	// Relative Link + InlineTOC items from Loader TOC — docs-V2/docs/ui-components.md · docs-V2/docs/get-toc.md
	const body = (
		<MDX
			components={getMDXComponents({
				a: createRelativeLink(source, page),
				InlineTOC: ({
					items: _items,
					...props
				}: ComponentProps<typeof InlineTOC>) => (
					<InlineTOC {...props} items={page.data.toc} />
				),
			})}
		/>
	);

	const content = openApiPreloaded ? (
		<OpenAPIPreloadProvider preloaded={openApiPreloaded}>
			{body}
		</OpenAPIPreloadProvider>
	) : (
		body
	);

	// Page Actions chrome (copy / view Markdown) — docs-V2/docs/llms.md · Ask AI Outside
	// Last-edit Outside baseline — docs-V2/docs/git-last-edit.md
	return (
		<DocsPage toc={page.data.toc} full={page.data.full}>
			<DocsTitle>{page.data.title}</DocsTitle>
			<DocsDescription className="mb-0">{page.data.description}</DocsDescription>
			<div className="flex flex-row items-center gap-2 border-b pb-6">
				<MarkdownCopyButton markdownUrl={markdownUrl} />
				<ViewOptionsPopover
					markdownUrl={markdownUrl}
					githubUrl={githubUrl}
				/>
			</div>
			<DocsBody>
				<FeedbackText onSendAction={onBlockFeedbackAction}>
					{content}
				</FeedbackText>
			</DocsBody>
			<Feedback onSendAction={onPageFeedbackAction} />
		</DocsPage>
	);
}

export function generateStaticParams() {
	return source.generateParams();
}

export async function generateMetadata(
	props: DocsPageProperties,
): Promise<Metadata> {
	const params = await props.params;
	const page = source.getPage(params.slug);
	if (!page) {
		notFound();
	}

	return {
		title: page.data.title,
		description: page.data.description,
		openGraph: {
			images: getPageImage(page).url,
		},
	};
}
