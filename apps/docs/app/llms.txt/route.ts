import { llms } from "fumadocs-core/source";
import { source } from "@/lib/source";

/** Page-tree index for LLMs — docs-V2/docs/llms.md */
export const revalidate = false;

export function GET(): Response {
	return new Response(llms(source).index(), {
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
		},
	});
}
