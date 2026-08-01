import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
	WorkspacePage,
	WorkspacePageContent,
	WorkspacePageHeader,
} from "../src/components/ui/workspace-page";

describe("WorkspacePage", () => {
	it("owns canonical geometry and page-heading semantics", () => {
		const html = renderToStaticMarkup(
			<WorkspacePage aria-label="Sales workspace">
				<WorkspacePageHeader
					description="Review and manage customer orders."
					scope="Operator · Sales"
					title="Sales orders"
				/>
				<WorkspacePageContent>
					<div>Order register</div>
				</WorkspacePageContent>
			</WorkspacePage>,
		);

		expect(html).toContain('data-slot="workspace-page"');
		expect(html).toContain('data-density="comfortable"');
		expect(html).toContain('data-width="standard"');
		expect(html).toContain("max-w-5xl");
		expect(html).toContain("gap-6");
		expect(html).toContain('data-slot="workspace-page-header"');
		expect(html).toContain('data-slot="workspace-page-content"');
		expect(html.match(/<h1/g)).toHaveLength(1);
		expect(html).toContain("Sales orders");
	});

	it("supports bounded wide, fluid full, and compact variants", () => {
		const wide = renderToStaticMarkup(
			<WorkspacePage width="wide">
				<WorkspacePageHeader title="Wide workspace" />
			</WorkspacePage>,
		);
		const fullCompact = renderToStaticMarkup(
			<WorkspacePage density="compact" width="full">
				<WorkspacePageHeader title="Full workspace" />
			</WorkspacePage>,
		);

		expect(wide).toContain("max-w-6xl");
		expect(fullCompact).toContain("max-w-none");
		expect(fullCompact).toContain("gap-4");
		expect(fullCompact).toContain('data-density="compact"');
	});
});
