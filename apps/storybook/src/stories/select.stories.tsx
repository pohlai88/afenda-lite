import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	FormField,
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { expect, within } from "storybook/test";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";
import { interactionFor } from "./interactions";

const evidence = contractEvidence("ui.select");

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
				<h2 className="font-semibold text-base tracking-tight" id={id}>
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
	title: "UI System/Select",
	component: Select,
	tags: ["autodocs", "test"],
	parameters: {
		...contractDocsParameters(evidence, "Select"),
	},
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"Permission-catalog filtering with a bounded, single-choice list. Select owns listbox interaction and value presentation; feature composition owns option eligibility, authorization, persistence, and query effects.",
			},
		},
	},
	render: () => (
		<div className="min-h-screen bg-canvas text-foreground">
			<div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
				<header className="grid gap-5 border-b pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
					<div className="grid gap-2">
						<p className="font-medium text-foreground-secondary text-sm">
							Platform administration
						</p>
						<div className="grid gap-1">
							<h1 className="font-semibold text-2xl tracking-tight">
								Permission catalog
							</h1>
							<p className="max-w-5xl text-foreground-secondary text-sm leading-6">
								Select scopes the catalog to one module. Feature code owns which
								modules the operator may inspect.
							</p>
						</div>
					</div>
					<dl className="grid grid-cols-2 gap-x-8 gap-y-3 rounded-lg border bg-card p-4">
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								Subject
							</dt>
							<dd className="text-sm">Permission catalog</dd>
						</div>
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								Scope
							</dt>
							<dd className="text-sm">Single choice</dd>
						</div>
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								Ownership
							</dt>
							<dd className="text-sm">Feature composition</dd>
						</div>
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								Lifecycle
							</dt>
							<dd className="text-sm">Bounded listbox</dd>
						</div>
					</dl>
				</header>

				<Card className="shadow-none">
					<CardHeader>
						<CardTitle>Module filter</CardTitle>
						<CardDescription>
							Limits the permission catalog view to one owning module.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<FormField description="Stable module identifiers." label="Module">
							<Select defaultValue="accounting">
								<SelectTrigger aria-label="Module">
									<SelectValue placeholder="Select a module" />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										<SelectLabel>Modules</SelectLabel>
										<SelectItem value="accounting">Accounting</SelectItem>
										<SelectItem value="inventory">Inventory</SelectItem>
										<SelectSeparator />
										<SelectItem value="payroll">Payroll</SelectItem>
									</SelectGroup>
								</SelectContent>
							</Select>
						</FormField>
					</CardContent>
				</Card>
			</div>
		</div>
	),
	play: interactionFor("select"),
};

export const SemanticUsage: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Use Select for closed lists without search. Group related domains. Keep values stable and separate from labels.",
			},
		},
	},
	render: () => (
		<WorkbenchSection
			description="Select is for bounded choice sets without freeform search."
			id="select-semantic-usage-title"
			title="Closed lists and groups"
		>
			<div className="grid w-full max-w-xl gap-6">
				<StorySection title="Posting period">
					<FormField label="Posting period">
						<Select defaultValue="2026-07">
							<SelectTrigger aria-label="Posting period">
								<SelectValue placeholder="Select period" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="2026-06">June 2026</SelectItem>
								<SelectItem value="2026-07">July 2026</SelectItem>
								<SelectItem value="2026-08">August 2026</SelectItem>
							</SelectContent>
						</Select>
					</FormField>
				</StorySection>
				<StorySection title="Grouped legal entities">
					<FormField label="Legal entity">
						<Select defaultValue="my-holdings">
							<SelectTrigger aria-label="Legal entity">
								<SelectValue placeholder="Select entity" />
							</SelectTrigger>
							<SelectContent>
								<SelectGroup>
									<SelectLabel>Malaysia</SelectLabel>
									<SelectItem value="my-holdings">Afenda Holdings</SelectItem>
									<SelectItem value="my-trading">Afenda Trading</SelectItem>
								</SelectGroup>
								<SelectSeparator />
								<SelectGroup>
									<SelectLabel>Singapore</SelectLabel>
									<SelectItem value="sg-ops">Afenda Operations SG</SelectItem>
								</SelectGroup>
							</SelectContent>
						</Select>
					</FormField>
				</StorySection>
			</div>
		</WorkbenchSection>
	),
};

export const Usage: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Pair Select with FormField. Placeholder is not the accessible name — name the trigger.",
			},
		},
	},
	render: () => (
		<WorkbenchSection
			description="Pair Select with FormField and keep the accessible name on the trigger."
			id="select-usage-title"
			title="Form field integration"
		>
			<Card className="w-80 shadow-none">
				<CardContent className="pt-6">
					<FormField label="Settlement method">
						<Select>
							<SelectTrigger aria-label="Settlement method">
								<SelectValue placeholder="Choose method" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="eft">Electronic transfer</SelectItem>
								<SelectItem value="cheque">Cheque</SelectItem>
								<SelectItem value="offset">Intercompany offset</SelectItem>
							</SelectContent>
						</Select>
					</FormField>
				</CardContent>
			</Card>
		</WorkbenchSection>
	),
};

export const StatesAndAccessibility: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Keyboard opens the listbox, arrow keys move active options, Enter confirms, and Escape dismisses without changing the value. Disabled options remain perceivable only when their unavailability is useful context.",
			},
		},
	},
	render: () => (
		<WorkbenchSection
			description="The listbox stays navigable with arrows, Enter, and Escape while unavailable items remain perceivable."
			id="select-accessibility-title"
			title="Keyboard and disabled options"
		>
			<Card className="w-80 shadow-none">
				<CardContent className="pt-6">
					<FormField label="Ledger">
						<Select defaultValue="gl-main">
							<SelectTrigger aria-label="Ledger">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="gl-main">Main ledger</SelectItem>
								<SelectItem value="gl-tax">Tax ledger</SelectItem>
								<SelectItem disabled value="gl-closed">
									Closed ledger — unavailable
								</SelectItem>
							</SelectContent>
						</Select>
					</FormField>
				</CardContent>
			</Card>
		</WorkbenchSection>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const trigger = canvas.getByRole("combobox", { name: "Ledger" });
		trigger.focus();
		await expect(trigger).toHaveFocus();
	},
};

export const Composition: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Compose Select inside filter Cards and toolbars. Compact sm size stays labelled.",
			},
		},
	},
	render: () => (
		<Card className="w-full max-w-md shadow-none">
			<CardHeader>
				<CardTitle>Invoice register filters</CardTitle>
				<CardDescription>
					Bounded filters without search — use Combobox when typing is required.
				</CardDescription>
			</CardHeader>
			<CardContent className="grid gap-4 sm:grid-cols-2">
				<FormField label="Status">
					<Select defaultValue="open">
						<SelectTrigger aria-label="Status" size="sm">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="open">Open</SelectItem>
							<SelectItem value="approved">Approved</SelectItem>
							<SelectItem value="posted">Posted</SelectItem>
						</SelectContent>
					</Select>
				</FormField>
				<FormField label="Currency">
					<Select defaultValue="myr">
						<SelectTrigger aria-label="Currency" size="sm">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="myr">MYR</SelectItem>
							<SelectItem value="sgd">SGD</SelectItem>
							<SelectItem value="usd">USD</SelectItem>
						</SelectContent>
					</Select>
				</FormField>
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
					"Do use stable values and labelled triggers. Do not use Select for freeform search or treat labels as identifiers.",
			},
		},
	},
	render: () => (
		<div className="grid gap-6 sm:grid-cols-2">
			<StorySection title="Do: stable value, clear label">
				<FormField label="Owning module">
					<Select defaultValue="payables">
						<SelectTrigger aria-label="Owning module">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="payables">Accounts payable</SelectItem>
							<SelectItem value="receivables">Accounts receivable</SelectItem>
						</SelectContent>
					</Select>
				</FormField>
			</StorySection>
			<StorySection title="Do not: searchable freeform entry">
				<p className="text-foreground-secondary text-sm">
					Supplier name lookup and typeahead belong on Combobox or SearchField —
					not Select.
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
					"Triggers remain labelled and full-width when the form narrows. Focus, selected, highlighted, and disabled states must remain distinguishable without depending on colour alone.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6 sm:grid-cols-2">
			<StorySection title="Narrow form field">
				<FormField
					description="One authorized period from the current ledger calendar."
					label="Posting period"
				>
					<Select defaultValue="2026-07">
						<SelectTrigger
							aria-label="Adaptive posting period"
							className="w-full"
						>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="2026-06">June 2026</SelectItem>
							<SelectItem value="2026-07">July 2026</SelectItem>
							<SelectItem value="2026-08">August 2026</SelectItem>
						</SelectContent>
					</Select>
				</FormField>
			</StorySection>
			<StorySection title="Unavailable option with reason">
				<FormField
					description="Closed accounts remain visible only when the reason helps the operator."
					label="Settlement account"
				>
					<Select defaultValue="operating">
						<SelectTrigger aria-label="Settlement account" className="w-full">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="operating">Operating account</SelectItem>
							<SelectItem value="reserve">Reserve account</SelectItem>
							<SelectItem disabled value="legacy">
								Legacy account — closed
							</SelectItem>
						</SelectContent>
					</Select>
				</FormField>
			</StorySection>
		</div>
	),
};
