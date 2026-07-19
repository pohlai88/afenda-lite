import {
	DocsBody,
	DocsDescription,
	DocsPage,
	DocsTitle,
} from "fumadocs-ui/layouts/docs/page";
import { createRelativeLink } from "fumadocs-ui/mdx";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { InternalOpenAPIMeta } from "fumadocs-openapi/server";
import { OpenAPIPreloadProvider } from "@/components/api-page";
import { getMDXComponents } from "@/components/mdx";
import { openapi } from "@/lib/openapi.server";
import { source } from "@/lib/source";

function pageHasOpenApiFrontmatter(
	data: unknown,
): data is { _openapi: InternalOpenAPIMeta } {
	if (typeof data !== "object" || data === null) {
		return false;
	}
	return "_openapi" in data && data._openapi !== undefined;
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
	const openApiPage = pageHasOpenApiFrontmatter(page.data)
		? await openapi.preloadOpenAPIPage(page)
		: undefined;

	const body = (
		<MDX
			components={getMDXComponents({
				a: createRelativeLink(source, page),
			})}
		/>
	);

	return (
		<DocsPage toc={page.data.toc}>
			<DocsTitle>{page.data.title}</DocsTitle>
			<DocsDescription>{page.data.description}</DocsDescription>
			<DocsBody>
				{openApiPage ? (
					<OpenAPIPreloadProvider preloaded={openApiPage.preloaded}>
						{body}
					</OpenAPIPreloadProvider>
				) : (
					body
				)}
			</DocsBody>
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
	};
}
