"use client";

/**
 * OpenAPI page UI + preload context.
 * SSOT: docs-V2/docs/openapi-api-page.md · generateFiles/YAML: docs-V2/docs/openapi.md
 * createOpenAPIPage() keeps library default code-usage generators.
 * Custom codeUsages / mediaAdapters / openapi i18n packs = Outside baseline.
 * Event/message API page factory Outside baseline — docs-V2/docs/asyncapi.md
 */
import type { OpenAPIPageProps_Preloaded } from "fumadocs-openapi/server";
import { createOpenAPIPage } from "fumadocs-openapi/ui";
import {
	createContext,
	type ReactNode,
	useContext,
} from "react";

export type DocsOpenAPIPreloaded = OpenAPIPageProps_Preloaded["preloaded"];

/** MDX-generated props — document + operations; preload comes from context. */
export type DocsOpenAPIPageProps = Omit<
	OpenAPIPageProps_Preloaded,
	"preloaded"
>;

const openApiPreloadContext = createContext<DocsOpenAPIPreloaded | undefined>(
	undefined,
);

const OpenAPIPage = createOpenAPIPage();

export function OpenAPIPreloadProvider({
	children,
	preloaded,
}: {
	readonly children: ReactNode;
	readonly preloaded: DocsOpenAPIPreloaded;
}) {
	return (
		<openApiPreloadContext.Provider value={preloaded}>
			{children}
		</openApiPreloadContext.Provider>
	);
}

function useOpenApiPreload(): DocsOpenAPIPreloaded {
	const preloaded = useContext(openApiPreloadContext);
	if (preloaded === undefined) {
		throw new Error(
			"[Afenda Docs] OpenAPI preload missing — wrap MDX with OpenAPIPreloadProvider on _openapi pages.",
		);
	}
	return preloaded;
}

/** MDX slot — reads preload from context so SSG does not pass function props. */
export function APIPage(props: DocsOpenAPIPageProps) {
	const preloaded = useOpenApiPreload();
	return <OpenAPIPage {...props} preloaded={preloaded} />;
}
