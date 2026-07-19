import { getLLMText } from "@/lib/get-llm-text";
import { source } from "@/lib/source";

/** Full docs corpus for LLMs — docs-V2/docs/llms.md */
export const revalidate = false;

export async function GET(): Promise<Response> {
	const scanned = await Promise.all(source.getPages().map(getLLMText));

	return new Response(scanned.join("\n\n"), {
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
		},
	});
}
