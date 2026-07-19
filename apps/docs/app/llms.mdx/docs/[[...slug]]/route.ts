import { notFound } from "next/navigation";
import { getLLMText } from "@/lib/get-llm-text";
import { source } from "@/lib/source";

/** Per-page Markdown for `/docs/:path*.md` rewrite — docs-V2/docs/llms.md */
export const revalidate = false;

interface LlmMarkdownRouteProperties {
	readonly params: Promise<{ slug?: string[] }>;
}

export async function GET(
	_request: Request,
	props: LlmMarkdownRouteProperties,
): Promise<Response> {
	const { slug } = await props.params;
	const page = source.getPage(slug);
	if (!page) {
		notFound();
	}

	return new Response(await getLLMText(page), {
		headers: {
			"Content-Type": "text/markdown; charset=utf-8",
		},
	});
}

export function generateStaticParams() {
	return source.generateParams();
}
