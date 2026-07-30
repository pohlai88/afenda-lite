import {
	Badge,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	StatusBadge,
	Toolbar,
	ToolbarGroup,
	ToolbarSeparator,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";

const evidence = contractEvidence("ui.toolbar");

const meta = {
	title: "UI System/Toolbar",
	component: Toolbar,
	tags: ["autodocs", "test"],
	parameters: {
		...contractDocsParameters(evidence, "Toolbar"),
	},
} satisfies Meta<typeof Toolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"Invoice-detail action region with related secondary tools and one visible consequential action. Toolbar owns grouping, order, and adaptive action layout; feature code owns eligibility, authorization, confirmation, pending state, and outcomes.",
			},
		},
	},
	render: () => (
		<div className="min-h-screen bg-canvas text-foreground">
			<div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
				<header className="grid gap-2 border-b pb-6">
					<p className="font-medium text-foreground-secondary text-sm">
						Accounts receivable
					</p>
					<h1 className="font-semibold text-2xl tracking-tight">
						INV-1048 actions
					</h1>
					<p className="max-w-5xl text-foreground-secondary text-sm leading-6">
						Toolbar owns related-control layout. Feature Actions own
						authorization and whether Approve is eligible.
					</p>
				</header>

				<Card className="shadow-none">
					<CardHeader>
						<div className="flex flex-wrap items-start justify-between gap-4">
							<div className="grid gap-1">
								<CardTitle>Invoice action toolbar</CardTitle>
								<CardDescription>
									Northwind Trading · MYR 18,420.00
								</CardDescription>
							</div>
							<div className="flex flex-wrap items-center gap-2">
								<Badge variant="outline">Invoice</Badge>
								<StatusBadge label="Awaiting approval" status="pending" />
							</div>
						</div>
					</CardHeader>
					<CardContent>
						<Toolbar aria-label="Invoice actions">
							<ToolbarGroup>
								<Button size="sm" type="button" variant="ghost">
									Edit
								</Button>
								<Button size="sm" type="button" variant="ghost">
									Duplicate
								</Button>
								<ToolbarSeparator />
								<Button size="sm" type="button" variant="ghost">
									Archive
								</Button>
							</ToolbarGroup>
							<ToolbarGroup>
								<Button size="sm" type="button" variant="outline">
									Export
								</Button>
								<Button size="sm" type="button">
									Approve
								</Button>
							</ToolbarGroup>
						</Toolbar>
					</CardContent>
				</Card>
			</div>
		</div>
	),
};

export const Usage: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Approved roles: secondary tools grouped left, primary consequence right, separator between unrelated secondary clusters.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-4">
			<Toolbar aria-label="Invoice actions">
				<ToolbarGroup>
					<Button size="sm" type="button" variant="ghost">
						Edit
					</Button>
					<Button size="sm" type="button" variant="ghost">
						Duplicate
					</Button>
					<ToolbarSeparator />
					<Button size="sm" type="button" variant="ghost">
						Archive
					</Button>
				</ToolbarGroup>
				<ToolbarGroup>
					<Button size="sm" type="button" variant="outline">
						Export
					</Button>
					<Button size="sm" type="button">
						Approve
					</Button>
				</ToolbarGroup>
			</Toolbar>
		</div>
	),
};

export const ControlledUsage: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Compose ToolbarGroup peers and ToolbarSeparator. Label the toolbar when multiple regions exist on one page.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-3">
			<Toolbar aria-label="Queue tools">
				<ToolbarGroup>
					<Button size="sm" type="button" variant="ghost">
						Refresh
					</Button>
					<Button size="sm" type="button" variant="ghost">
						Columns
					</Button>
				</ToolbarGroup>
				<ToolbarGroup>
					<Button size="sm" type="button">
						New invoice
					</Button>
				</ToolbarGroup>
			</Toolbar>
			<p className="text-foreground-secondary text-sm">
				Authorization and command outcomes stay with feature Actions.
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
					"Named toolbar region, decorative separators, stable DOM order, keyboard-operable children, and visible focus. Responsive wrapping must preserve action priority rather than silently reordering commands.",
			},
		},
	},
	render: () => (
		<Toolbar aria-label="Accessible invoice actions">
			<ToolbarGroup>
				<Button size="sm" type="button" variant="ghost">
					Edit
				</Button>
				<ToolbarSeparator />
				<Button disabled size="sm" type="button" variant="ghost">
					Archive
				</Button>
			</ToolbarGroup>
			<ToolbarGroup>
				<Button size="sm" type="button">
					Approve
				</Button>
			</ToolbarGroup>
		</Toolbar>
	),
};

export const VariantsAndSizes: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Family inventory: Toolbar · ToolbarGroup · ToolbarSeparator. No size scale — denseness comes from child Button sizes.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6">
			<div className="grid gap-2">
				<p className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
					sm children
				</p>
				<Toolbar aria-label="Compact tools">
					<ToolbarGroup>
						<Button size="sm" type="button" variant="ghost">
							Edit
						</Button>
						<ToolbarSeparator />
						<Button size="sm" type="button" variant="ghost">
							Duplicate
						</Button>
					</ToolbarGroup>
					<ToolbarGroup>
						<Button size="sm" type="button">
							Approve
						</Button>
					</ToolbarGroup>
				</Toolbar>
			</div>
			<div className="grid gap-2">
				<p className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
					default children
				</p>
				<Toolbar aria-label="Standard tools">
					<ToolbarGroup>
						<Button type="button" variant="ghost">
							Edit
						</Button>
						<ToolbarSeparator />
						<Button type="button" variant="outline">
							Export
						</Button>
					</ToolbarGroup>
					<ToolbarGroup>
						<Button type="button">Approve</Button>
					</ToolbarGroup>
				</Toolbar>
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
					"Compose Toolbar inside a Card with Badge taxonomy and StatusBadge lifecycle. Toolbar does not own filters or page identity.",
			},
		},
	},
	render: () => (
		<Card className="w-full max-w-5xl shadow-none">
			<CardHeader>
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div className="grid gap-1">
						<CardTitle>INV-1048</CardTitle>
						<CardDescription>Awaiting finance approval</CardDescription>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="secondary">Finance</Badge>
						<StatusBadge label="Awaiting approval" status="pending" />
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<Toolbar aria-label="Invoice actions">
					<ToolbarGroup>
						<Button size="sm" type="button" variant="ghost">
							Edit
						</Button>
						<Button size="sm" type="button" variant="ghost">
							Duplicate
						</Button>
					</ToolbarGroup>
					<ToolbarGroup>
						<Button size="sm" type="button">
							Approve
						</Button>
					</ToolbarGroup>
				</Toolbar>
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
					"Do keep related subject actions together with Approve visible. Do not use Toolbar as a generic flex row for unrelated page chrome.",
			},
		},
	},
	render: () => (
		<div className="grid max-w-5xl gap-6 sm:grid-cols-2">
			<StorySection title="Do: related subject actions">
				<Toolbar aria-label="Invoice actions">
					<ToolbarGroup>
						<Button size="sm" type="button" variant="ghost">
							Edit
						</Button>
					</ToolbarGroup>
					<ToolbarGroup>
						<Button size="sm" type="button">
							Approve
						</Button>
					</ToolbarGroup>
				</Toolbar>
			</StorySection>
			<StorySection title="Do not: unrelated page wrapper">
				<p className="text-foreground-secondary text-sm">
					Do not mix navigation, filters, and row bulk commands in one Toolbar.
					Use PageHeader, FilterBar, and BulkActionBar for those jobs.
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
					"Toolbar may wrap or move secondary tools into an overflow pattern at narrow widths, but the primary action remains discoverable and DOM order stays logical. Focus and disabled states remain visible in high contrast.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-4xl gap-6 lg:grid-cols-2">
			<StorySection title="Narrow action region">
				<Toolbar aria-label="Adaptive invoice actions" className="flex-wrap">
					<ToolbarGroup className="flex-wrap">
						<Button size="sm" type="button" variant="ghost">
							Edit
						</Button>
						<Button size="sm" type="button" variant="ghost">
							Duplicate
						</Button>
						<ToolbarSeparator />
						<Button size="sm" type="button" variant="ghost">
							Archive
						</Button>
					</ToolbarGroup>
					<ToolbarGroup>
						<Button size="sm" type="button" variant="outline">
							Export
						</Button>
						<Button size="sm" type="button">
							Approve invoice
						</Button>
					</ToolbarGroup>
				</Toolbar>
			</StorySection>
			<StorySection title="Unauthorized actions are omitted">
				<div className="grid gap-3">
					<Toolbar aria-label="Read-only invoice tools">
						<ToolbarGroup>
							<Button size="sm" type="button" variant="outline">
								Export
							</Button>
							<Button size="sm" type="button" variant="ghost">
								Copy link
							</Button>
						</ToolbarGroup>
					</Toolbar>
					<p className="text-foreground-secondary text-sm">
						Do not leave Approve visible merely because Toolbar supports it.
						Feature composition omits commands the operator cannot invoke.
					</p>
				</div>
			</StorySection>
		</div>
	),
};
