import { generate as DefaultImage } from "fumadocs-ui/og";
import { notFound } from "next/navigation";
import { ImageResponse } from "next/og";
import { docsAppName, getPageImage, source } from "@/lib/source";

/** Dynamic OG images for docs pages — docs-V2/docs/og-next.md */
export const revalidate = false;

interface OgDocsRouteProperties {
	readonly params: Promise<{ slug?: string[] }>;
}

export async function GET(
	_request: Request,
	props: OgDocsRouteProperties,
): Promise<ImageResponse> {
	const { slug = [] } = await props.params;
	const page = source.getPage(slug.slice(0, -1));
	if (!page) {
		notFound();
	}

	return new ImageResponse(
		<DefaultImage
			description={page.data.description}
			/** Align with Themes=`neutral` — not stock pink/purple defaults */
			primaryColor="rgba(113,113,122,0.35)"
			primaryTextColor="rgb(63,63,70)"
			site={docsAppName}
			title={page.data.title}
		/>,
		{
			width: 1200,
			height: 630,
		},
	);
}

export function generateStaticParams() {
	return source.getPages().map((page) => ({
		slug: getPageImage(page).segments,
	}));
}
