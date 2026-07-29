import {
	Badge,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	StatusBadge,
	type TreeNode,
	TreeView,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";
import { interactionFor } from "./interactions";

const evidence = contractEvidence("ui.tree-view");

const moduleNodes: readonly TreeNode[] = [
	{
		id: "finance",
		label: "Finance",
		children: [
			{ id: "receivables", label: "Receivables" },
			{ id: "payables", label: "Payables" },
		],
	},
	{
		id: "operations",
		label: "Operations",
		children: [
			{ id: "inventory", label: "Inventory" },
			{ id: "receiving", label: "Receiving", disabled: true },
		],
	},
];

const chartNodes: readonly TreeNode[] = [
	{
		id: "assets",
		label: "Assets",
		children: [
			{ id: "cash", label: "1000 · Cash" },
			{ id: "ar", label: "1100 · Accounts receivable" },
		],
	},
	{
		id: "liabilities",
		label: "Liabilities",
		children: [{ id: "ap", label: "2000 · Accounts payable" }],
	},
];

function ModuleNavigationTree({
	initialSelectedId = "receivables",
}: {
	initialSelectedId?: string;
}) {
	const [selectedId, setSelectedId] = React.useState(initialSelectedId);

	return (
		<TreeView
			nodes={moduleNodes}
			selectedId={selectedId}
			onSelect={(node) => setSelectedId(node.id)}
			aria-label="Module navigation"
		/>
	);
}

const meta = {
	title: "UI System/Tree View",
	component: TreeView,
	tags: ["autodocs", "test"],
	args: {
		nodes: moduleNodes,
	},
	parameters: {
		...contractDocsParameters(evidence, "Tree View"),
	},
} satisfies Meta<typeof TreeView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"One module navigation workbench: TreeView expands Finance to reach Receivables and Payables. Expansion is not proof of authorization or loaded descendants.",
			},
		},
	},
	render: () => (
		<div className="min-h-screen bg-canvas text-foreground">
			<div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
				<header className="grid gap-2 border-b pb-6">
					<p className="text-sm font-medium text-foreground-secondary">
						Workspace navigation
					</p>
					<h1 className="text-2xl font-semibold tracking-tight">Module tree</h1>
					<p className="max-w-5xl text-sm leading-6 text-foreground-secondary">
						TreeView owns hierarchy chrome and selection presentation. Feature
						code owns routing, lazy load, and whether a node is authorized.
					</p>
				</header>

				<Card className="shadow-none">
					<CardHeader>
						<div className="flex flex-wrap items-start justify-between gap-4">
							<div className="grid gap-1">
								<CardTitle>ERP modules</CardTitle>
								<CardDescription>
									Expand Finance to reach Receivables and Payables destinations
								</CardDescription>
							</div>
							<div className="flex flex-wrap items-center gap-2">
								<Badge variant="outline">Navigation</Badge>
								<StatusBadge status="active" label="Live modules" />
							</div>
						</div>
					</CardHeader>
					<CardContent>
						<ModuleNavigationTree />
					</CardContent>
				</Card>
			</div>
		</div>
	),
	play: interactionFor("tree-view"),
};

export const Usage: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Approved roles: module navigation tree and chart-of-accounts hierarchy. Flat lists stay on Tabs or DataTable when depth is not material.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6 sm:grid-cols-2">
			<StorySection title="Module navigation">
				<ModuleNavigationTree />
			</StorySection>
			<StorySection title="Chart of accounts">
				<TreeView
					nodes={chartNodes}
					selectedId="ar"
					aria-label="Chart of accounts"
				/>
			</StorySection>
		</div>
	),
};

export const ControlledUsage: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Pass stable node ids, selectedId, and onSelect from feature state. Optional expandedIds/onExpandedChange for controlled expansion.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-sm gap-3">
			<ModuleNavigationTree initialSelectedId="payables" />
			<p className="text-sm text-foreground-secondary">
				Selection meaning and route changes stay with the feature — not
				TreeView.
			</p>
		</div>
	),
};

export const StatesAndAccessibility: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Selected, expanded, collapsed, leaf, and disabled nodes preserve tree semantics. Arrow keys move through visible nodes, expansion never implies authorization, and focus remains distinct from selection.",
			},
		},
	},
	render: () => (
		<div className="w-full max-w-sm">
			<TreeView
				nodes={moduleNodes}
				selectedId="receivables"
				expandedIds={new Set(["finance", "operations"])}
				aria-label="Module states"
			/>
		</div>
	),
};

export const VariantsAndSizes: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Family inventory: nested TreeNode hierarchies. No size scale — denseness comes from nesting and surrounding Card width.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6 sm:grid-cols-2">
			<div className="grid gap-2">
				<p className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
					Collapsed roots
				</p>
				<TreeView nodes={moduleNodes} aria-label="Collapsed modules" />
			</div>
			<div className="grid gap-2">
				<p className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
					Expanded roots
				</p>
				<TreeView
					nodes={moduleNodes}
					expandedIds={new Set(["finance", "operations"])}
					selectedId="payables"
					aria-label="Expanded modules"
				/>
			</div>
		</div>
	),
};

export const Composition: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Compose TreeView inside a Card with Badge and StatusBadge. Lifecycle stays on StatusBadge beside the selected record — not in tree chrome.",
			},
		},
	},
	render: () => (
		<Card className="w-full max-w-md shadow-none">
			<CardHeader>
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div className="grid gap-1">
						<CardTitle>Module navigation tree</CardTitle>
						<CardDescription>Workspace destinations</CardDescription>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="secondary">Platform</Badge>
						<StatusBadge status="active" label="Live" />
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<ModuleNavigationTree />
			</CardContent>
		</Card>
	),
};

export const DoAndDoNot: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Do use stable node ids and explicit disabled leaves. Do not derive authorization from collapsed nodes or use row position as identity.",
			},
		},
	},
	render: () => (
		<div className="grid max-w-5xl gap-6 sm:grid-cols-2">
			<StorySection title="Do: stable ids and disabled leaves">
				<TreeView
					nodes={moduleNodes}
					expandedIds={new Set(["operations"])}
					selectedId="inventory"
					aria-label="Stable module tree"
				/>
			</StorySection>
			<StorySection title="Do not: position as identity or auth from collapse">
				<p className="text-sm text-foreground-secondary">
					Do not treat “second child under Finance” as identity, and do not
					assume collapsed nodes are unauthorized — feature Actions revalidate
					before navigation.
				</p>
			</StorySection>
		</div>
	),
};

export const AdaptiveAndHighContrast: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Tree depth remains understandable in narrow containers and high-contrast presentation. Indentation, disclosure state, focus, selection, and disabled meaning must not depend on subtle colour alone.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-4xl gap-6 lg:grid-cols-2">
			<StorySection title="Narrow module navigator">
				<div className="max-w-64 overflow-x-auto rounded-lg border p-3">
					<TreeView
						nodes={moduleNodes}
						expandedIds={new Set(["finance", "operations"])}
						selectedId="receivables"
						aria-label="Narrow module navigation"
					/>
				</div>
			</StorySection>
			<StorySection title="Hierarchy is not permission">
				<div className="grid gap-3">
					<TreeView
						nodes={chartNodes}
						expandedIds={new Set(["assets", "liabilities"])}
						selectedId="ar"
						aria-label="Chart of accounts hierarchy"
					/>
					<p className="text-sm text-foreground-secondary">
						Visible ancestry explains structure only. Feature Actions must still
						authorize every destination and record read.
					</p>
				</div>
			</StorySection>
		</div>
	),
};
