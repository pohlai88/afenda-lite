import { defineManifestContract } from "./manifest.contract";

export const workspacePageContract = defineManifestContract({
	id: "ui.workspace-page.contract",
	component: "ui.workspace-page",
	purpose:
		"Provides canonical responsive page geometry, density, page identity composition, and content rhythm for governed ERP workspaces.",
	ownership: {
		componentOwns: [
			"Maximum content width, responsive page padding, vertical rhythm, density, and composition with the canonical page-header family.",
		],
		consumerOwns: [
			"Page scope, title, description, authorized actions, width and density selection, route data, and all domain-specific content.",
		],
	},
	semanticBoundaries: [
		"Workspace geometry does not imply route ownership, authorization, navigation, loading state, or business workflow.",
		"Width and density selection do not establish information priority or operational importance.",
	],
	consumerEnforcement: {
		forbiddenLocalComponentNames: [
			"WorkspacePage",
			"WorkspacePageContent",
			"WorkspacePageHeader",
		],
	},
	rules: [
		"Use WorkspacePage as the outer content region for governed ERP workspace routes.",
		"Use WorkspacePageHeader exactly once to compose the page subject through the canonical PageHeader family.",
		"Use WorkspacePageContent to keep feature content in the selected page-density rhythm without adding another layout box.",
		"Use standard width for focused transaction workspaces, wide width for broader operational workspaces, and full width only when the surrounding shell explicitly permits fluid content.",
		"Select one density for the whole page and keep feature-specific section layout inside the content region.",
	],
	accessibility: [
		"Provide one meaningful page title; WorkspacePageHeader renders it as the primary h1.",
		"Keep title, description, and action order understandable at narrow widths and high zoom.",
		"Use scope text only when it adds route or workspace context that the title does not already communicate.",
		"Do not rely on width, placement, or spacing alone to communicate document hierarchy.",
	],
	prohibitedUsage: [
		"Do not recreate maximum-width, page-padding, or page-density wrappers in product features.",
		"Do not nest WorkspacePage inside another WorkspacePage.",
		"Do not use WorkspacePage for modal, card, embedded panel, authentication-island, or marketing content.",
		"Do not place filters, record tools, or domain workflow policy in WorkspacePageHeader.",
		"Do not override canonical geometry with feature-local class names or parallel page-shell components.",
	],
});
