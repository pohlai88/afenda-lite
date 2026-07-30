import {
	Badge,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	StatusBadge,
	ToggleGroup,
	ToggleGroupItem,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence } from "./evidence";

const evidence = contractEvidence("ui.toggle-group");

type WorkbenchSectionProps = Readonly<{
	id: string;
	title: string;
	description: string;
	children: ReactNode;
}>;

function WorkbenchSection({
	id,
	title,
	description,
	children,
}: WorkbenchSectionProps) {
	return (
		<section aria-labelledby={id} className="grid gap-4">
			<div className="grid gap-1">
				<h2
					className="font-semibold text-base text-foreground tracking-tight"
					id={id}
				>
					{title}
				</h2>
				<p className="max-w-5xl text-foreground-secondary text-sm leading-5">
					{description}
				</p>
			</div>
			{children}
		</section>
	);
}

const meta = {
	title: "UI System/Toggle Group",
	component: ToggleGroup,
	tags: ["autodocs", "test"],
	parameters: {
		...contractDocsParameters(evidence, "Toggle Group"),
		controls: {
			include: ["variant", "size", "type", "disabled"],
		},
	},
	argTypes: {
		variant: {
			control: "select",
			options: evidence.variants,
		},
		size: {
			control: "select",
			options: evidence.sizes,
		},
		type: {
			control: "radio",
			options: ["single", "multiple"],
		},
		disabled: { control: "boolean" },
	},
	args: {
		variant: "outline",
		size: "sm",
		type: "single",
		defaultValue: "comfortable",
	},
} satisfies Meta<typeof ToggleGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"One invoice queue workbench: ToggleGroup selects list density as a transient peer choice. Pressed items are not persisted settings.",
			},
		},
	},
	render: () => (
		<div className="min-h-screen bg-canvas text-foreground">
			<div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
				<header className="grid gap-5 border-b pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
					<div className="grid gap-2">
						<p className="font-medium text-foreground-secondary text-sm">
							Accounts receivable
						</p>
						<div className="grid gap-1">
							<h1 className="font-semibold text-2xl tracking-tight">
								Invoice list density
							</h1>
							<p className="max-w-5xl text-foreground-secondary text-sm leading-6">
								ToggleGroup owns single/multiple peer selection. Feature code
								owns whether density is stored for the operator.
							</p>
						</div>
					</div>
					<dl className="grid grid-cols-2 gap-x-8 gap-y-3 rounded-lg border bg-card p-4">
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								Subject
							</dt>
							<dd className="text-sm">Invoice queue</dd>
						</div>
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								Scope
							</dt>
							<dd className="text-sm">Peer selection</dd>
						</div>
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								Ownership
							</dt>
							<dd className="text-sm">Feature state</dd>
						</div>
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								Lifecycle
							</dt>
							<dd className="text-sm">Selected peers</dd>
						</div>
					</dl>
				</header>

				<Card className="shadow-none">
					<CardHeader>
						<div className="flex flex-wrap items-start justify-between gap-4">
							<div className="grid gap-1">
								<CardTitle>July invoice queue</CardTitle>
								<CardDescription>
									org-fragrant-lake · view options
								</CardDescription>
							</div>
							<div className="flex flex-wrap items-center gap-2">
								<Badge variant="outline">Receivables</Badge>
								<StatusBadge label="Draft view" status="pending" />
							</div>
						</div>
					</CardHeader>
					<CardContent className="grid gap-6">
						<div className="grid gap-2">
							<p className="font-medium text-sm">Density</p>
							<ToggleGroup
								aria-label="List density"
								defaultValue="comfortable"
								size="sm"
								type="single"
								variant="outline"
							>
								<ToggleGroupItem value="compact">Compact</ToggleGroupItem>
								<ToggleGroupItem value="comfortable">
									Comfortable
								</ToggleGroupItem>
								<ToggleGroupItem value="spacious">Spacious</ToggleGroupItem>
							</ToggleGroup>
						</div>
						<div className="grid gap-2">
							<p className="font-medium text-sm">Column emphasis</p>
							<ToggleGroup
								aria-label="Column emphasis"
								defaultValue={["amount"]}
								type="multiple"
							>
								<ToggleGroupItem value="amount">Amount</ToggleGroupItem>
								<ToggleGroupItem value="due">Due date</ToggleGroupItem>
								<ToggleGroupItem value="supplier">Supplier</ToggleGroupItem>
							</ToggleGroup>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	),
};

export const SemanticUsage: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Approved roles: single mutually exclusive density, multiple column emphasis, outline bounded group.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6 sm:grid-cols-2">
			<WorkbenchSection
				description="Use the single selection model when the operator must choose one view density at a time."
				id="single-density"
				title="single · density"
			>
				<ToggleGroup
					aria-label="List density"
					defaultValue="comfortable"
					size="sm"
					type="single"
					variant="outline"
				>
					<ToggleGroupItem value="compact">Compact</ToggleGroupItem>
					<ToggleGroupItem value="comfortable">Comfortable</ToggleGroupItem>
					<ToggleGroupItem value="spacious">Spacious</ToggleGroupItem>
				</ToggleGroup>
			</WorkbenchSection>
			<WorkbenchSection
				description="Use multiple selection when several column emphases can coexist without becoming commands."
				id="multiple-emphasis"
				title="multiple · emphasis"
			>
				<ToggleGroup
					aria-label="Column emphasis"
					defaultValue={["amount", "due"]}
					type="multiple"
				>
					<ToggleGroupItem value="amount">Amount</ToggleGroupItem>
					<ToggleGroupItem value="due">Due date</ToggleGroupItem>
					<ToggleGroupItem value="supplier">Supplier</ToggleGroupItem>
				</ToggleGroup>
			</WorkbenchSection>
		</div>
	),
};

export const Usage: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Choose type from the selection model. Label the group when purpose is not obvious from surrounding chrome.",
			},
		},
	},
	render: (args) => (
		<div className="grid w-full max-w-5xl gap-4">
			<div className="grid gap-2 rounded-lg border bg-card p-4">
				<p className="font-medium text-sm">List density</p>
				<ToggleGroup {...args} aria-label="List density">
					<ToggleGroupItem value="compact">Compact</ToggleGroupItem>
					<ToggleGroupItem value="comfortable">Comfortable</ToggleGroupItem>
					<ToggleGroupItem value="spacious">Spacious</ToggleGroupItem>
				</ToggleGroup>
			</div>
			<p className="text-foreground-secondary text-sm">
				Selection meaning and persistence stay with the feature.
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
					"Enabled peer choices, disabled group, and labelled items preserve pressed state and keyboard focus.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6 sm:grid-cols-2">
			<WorkbenchSection
				description="Enabled peer choices remain navigable and preserve pressed state semantics."
				id="ready"
				title="Ready"
			>
				<ToggleGroup
					aria-label="Amount alignment"
					defaultValue="left"
					type="single"
					variant="outline"
				>
					<ToggleGroupItem value="left">Left</ToggleGroupItem>
					<ToggleGroupItem value="center">Center</ToggleGroupItem>
					<ToggleGroupItem value="right">Right</ToggleGroupItem>
				</ToggleGroup>
			</WorkbenchSection>
			<WorkbenchSection
				description="A disabled group remains visibly unavailable instead of masquerading as a different selection mode."
				id="disabled"
				title="Disabled"
			>
				<ToggleGroup
					aria-label="Locked alignment"
					defaultValue="left"
					disabled
					type="single"
					variant="outline"
				>
					<ToggleGroupItem value="left">Left</ToggleGroupItem>
					<ToggleGroupItem value="center">Center</ToggleGroupItem>
					<ToggleGroupItem value="right">Right</ToggleGroupItem>
				</ToggleGroup>
			</WorkbenchSection>
		</div>
	),
};

export const VariantsAndSizes: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Approved inventory: default · outline crossed with sm · default · lg denseness on ToggleGroupItem peers.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6">
			{(["default", "outline"] as const).map((variant) => (
				<WorkbenchSection
					description="Density peers should remain readable as the outline and size scale changes."
					id={`variant-${variant}`}
					key={variant}
					title={variant}
				>
					<div className="grid gap-4 sm:grid-cols-3">
						{(["sm", "default", "lg"] as const).map((size) => (
							<div
								className="grid gap-2 rounded-lg border bg-card p-4"
								key={`${variant}-${size}`}
							>
								<p className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
									{size}
								</p>
								<ToggleGroup
									aria-label={`${variant} ${size}`}
									defaultValue="a"
									size={size}
									type="single"
									variant={variant}
								>
									<ToggleGroupItem value="a">{size}</ToggleGroupItem>
									<ToggleGroupItem value="b">Alt</ToggleGroupItem>
								</ToggleGroup>
							</div>
						))}
					</div>
				</WorkbenchSection>
			))}
		</div>
	),
};

export const Composition: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Compose ToggleGroup inside a Card with Badge and StatusBadge. Group chrome does not encode approval.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-4">
			<Card className="shadow-none">
				<CardHeader>
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div className="grid gap-1">
							<CardTitle>Queue view</CardTitle>
							<CardDescription>July remittance list</CardDescription>
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant="secondary">Finance</Badge>
							<StatusBadge label="Unsaved view" status="pending" />
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<ToggleGroup
						aria-label="List density"
						defaultValue="comfortable"
						size="sm"
						type="single"
						variant="outline"
					>
						<ToggleGroupItem value="compact">Compact</ToggleGroupItem>
						<ToggleGroupItem value="comfortable">Comfortable</ToggleGroupItem>
						<ToggleGroupItem value="spacious">Spacious</ToggleGroupItem>
					</ToggleGroup>
				</CardContent>
			</Card>
			<p className="text-foreground-secondary text-sm">
				Group chrome stays bounded inside Card; persistence stays outside the
				component.
			</p>
		</div>
	),
};

export const DoAndDoNot: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Do keep peer view choices in one labelled group. Do not mix Approve/Export commands into ToggleGroup.",
			},
		},
	},
	render: () => (
		<div className="grid max-w-5xl gap-6 sm:grid-cols-2">
			<WorkbenchSection
				description="Keep the group for peer selection only when each option is a valid view choice."
				id="peer-view-choices"
				title="Do: peer view choices"
			>
				<ToggleGroup
					aria-label="List density"
					defaultValue="comfortable"
					size="sm"
					type="single"
					variant="outline"
				>
					<ToggleGroupItem value="compact">Compact</ToggleGroupItem>
					<ToggleGroupItem value="comfortable">Comfortable</ToggleGroupItem>
				</ToggleGroup>
			</WorkbenchSection>
			<WorkbenchSection
				description="Commands like Approve, Export, and Void belong on Toolbar Buttons, not as pressed peers."
				id="no-consequential-commands"
				title="Do not: consequential commands in the group"
			>
				<div className="grid gap-2 rounded-lg border bg-card p-4">
					<p className="text-foreground-secondary text-sm">
						Approve, Export, and Void belong on Toolbar Buttons — not as pressed
						ToggleGroupItem peers.
					</p>
				</div>
			</WorkbenchSection>
		</div>
	),
};
