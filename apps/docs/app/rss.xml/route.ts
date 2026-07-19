import { getRSS } from "@/lib/rss";

/** RSS 2.0 syndication — docs-V2/docs/rss.md */
export const revalidate = false;

export function GET(): Response {
	return new Response(getRSS(), {
		headers: {
			"Content-Type": "application/rss+xml; charset=utf-8",
		},
	});
}
