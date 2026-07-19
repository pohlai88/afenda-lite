import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { BookOpen, Code2 } from "lucide-react";

export function baseOptions(): BaseLayoutProps {
	return {
		nav: {
			title: "Afenda-Lite Docs",
		},
		githubUrl: "https://github.com/pohlai88/afenda-lite",
		links: [
			{
				icon: <BookOpen aria-hidden />,
				text: "Guide",
				url: "/docs/guide",
				active: "nested-url",
			},
			{
				icon: <Code2 aria-hidden />,
				text: "API",
				url: "/docs/api",
				active: "nested-url",
			},
		],
	};
}
