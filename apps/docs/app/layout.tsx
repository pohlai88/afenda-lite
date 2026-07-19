import { docsEnv } from "@afenda/env/docs";
import { RootProvider } from "fumadocs-ui/provider/next";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Banner } from "@/components/banner";
import "./global.css";

/**
 * Search UI + Themes + Banner — docs-V2/docs/ui.md · ui-components.md
 * i18n Outside baseline: fixed lang=en · no RootProvider i18n prop — docs-V2/docs/i18n.md
 * metadataBase — docs-V2/docs/og-next.md · deploying.md (`DOCS_URL`)
 * RSS alternate — docs-V2/docs/rss.md
 */
export const metadata: Metadata = {
	metadataBase: new URL(docsEnv.DOCS_URL),
	alternates: {
		types: {
			"application/rss+xml": [
				{
					title: "Afenda-Lite Docs",
					url: "/rss.xml",
				},
			],
		},
	},
};

export default function RootLayout({
	children,
}: {
	readonly children: ReactNode;
}) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body className="flex min-h-screen flex-col">
				<Banner id="afenda-lite-docs">
					Afenda-Lite Docs — official documentation site. OpenAPI machine
					SSOT stays under docs-V2/api (not Living DOC-001).
				</Banner>
				<RootProvider>{children}</RootProvider>
			</body>
		</html>
	);
}
