import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { BookOpen, CodeXml } from "lucide-react";
import { GithubInfo } from "@/components/github-info";

/**
 * Shared header + links for DocsLayout — SSOT: docs-V2/docs/ui-layouts.md (Navbar · Layout Links)
 * i18n Outside baseline: no locale arg — docs-V2/docs/i18n.md
 */
export function baseOptions(): BaseLayoutProps {
	return {
		nav: {
			title: "Afenda-Lite Docs",
			url: "/docs",
			transparentMode: "none",
		},
		githubUrl: "https://github.com/pohlai88/afenda-lite",
		links: [
			{
				icon: <BookOpen aria-hidden />,
				text: "Guide",
				url: "/docs/guide",
				active: "nested-url",
				secondary: false,
			},
			{
				icon: <CodeXml aria-hidden />,
				text: "API",
				url: "/docs/api",
				active: "nested-url",
				secondary: false,
			},
			{
				type: "custom",
				secondary: true,
				children: <GithubInfo owner="pohlai88" repo="afenda-lite" />,
			},
		],
	};
}
