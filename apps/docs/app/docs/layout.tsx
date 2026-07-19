import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { ReactNode } from "react";
import { baseOptions } from "@/lib/layout.shared";
import { source } from "@/lib/source";

/** Docs shell — SSOT: docs-V2/docs/ui-layouts.md · tree: page-tree-utils.md · customize: customize-ui.md */
export default function DocsRootLayout({
	children,
}: {
	readonly children: ReactNode;
}) {
	return (
		<DocsLayout
			tree={source.pageTree}
			{...baseOptions()}
			sidebar={{
				enabled: true,
				collapsible: true,
				prefetch: false,
			}}
			tabs={false}
		>
			{children}
		</DocsLayout>
	);
}
