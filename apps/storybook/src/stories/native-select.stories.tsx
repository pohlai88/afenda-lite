import {
	Badge,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
	Label,
	NativeSelect,
	NativeSelectOptGroup,
	NativeSelectOption,
	StatusBadge,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";

const evidence = contractEvidence("ui.native-select");

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
		<section className="grid gap-4" aria-labelledby={id}>
			<div className="grid gap-1">
				<h2
					className="text-base font-semibold tracking-tight text-foreground"
					id={id}
				>
					{title}
				</h2>
				<p className="max-w-5xl text-sm leading-5 text-foreground-secondary">
					{description}
				</p>
			</div>
			{children}
		</section>
	);
}

const meta = {
	title: "UI System/Native Select",
	component: NativeSelect,
	tags: ["autodocs", "test"],
	parameters: {
		...contractDocsParameters(evidence, "Native Select"),
	},
} satisfies Meta<typeof NativeSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"Journal posting filters use NativeSelect for a small bounded status vocabulary. Label association stays visible — NativeSelect is not a searchable catalog.",
			},
		},
	},
	render: () => (
		<div className="min-h-screen bg-canvas text-foreground">
			<main className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
				<header className="grid gap-5 border-b pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
					<div className="grid gap-2">
						<p className="text-sm font-medium text-foreground-secondary">
							Accounting · journal register
						</p>
						<div className="grid gap-1">
							<h1 className="text-2xl font-semibold tracking-tight">
								Posting filters
							</h1>
							<p className="max-w-5xl text-sm leading-6 text-foreground-secondary">
								NativeSelect suits compact option sets. Prefer Select when
								operators need typeahead or rich option rows.
							</p>
						</div>
					</div>
					<dl className="grid grid-cols-2 gap-x-8 gap-y-3 rounded-lg border bg-card p-4">
						<div className="grid gap-1">
							<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								Subject
							</dt>
							<dd className="text-sm">Posting filters</dd>
						</div>
						<div className="grid gap-1">
							<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								Area
							</dt>
							<dd className="text-sm">Accounting register</dd>
						</div>
						<div className="grid gap-1">
							<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								Scope
							</dt>
							<dd className="text-sm">Small bounded vocabularies</dd>
						</div>
						<div className="grid gap-1">
							<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								State
							</dt>
							<dd className="text-sm">Operational guidance</dd>
						</div>
					</dl>
				</header>

				<Card className="shadow-none">
					<CardHeader>
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant="outline">Accounting</Badge>
							<StatusBadge size="sm" status="active" label="Operational" />
						</div>
						<CardTitle>Register scope</CardTitle>
						<CardDescription>
							org-fragrant-lake · July 2026 posting run
						</CardDescription>
					</CardHeader>
					<CardContent>
						<form
							className="grid gap-5 sm:grid-cols-2"
							onSubmit={(event) => event.preventDefault()}
						>
							<div className="grid gap-2">
								<Label htmlFor="overview-module">Module</Label>
								<NativeSelect
									id="overview-module"
									aria-label="Module"
									defaultValue="accounting"
								>
									<NativeSelectOption value="accounting">
										Accounting
									</NativeSelectOption>
									<NativeSelectOptGroup label="Operations">
										<NativeSelectOption value="inventory">
											Inventory
										</NativeSelectOption>
										<NativeSelectOption value="payroll">
											Payroll
										</NativeSelectOption>
									</NativeSelectOptGroup>
								</NativeSelect>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="overview-status">Posting status</Label>
								<NativeSelect
									id="overview-status"
									defaultValue="all"
									aria-label="Posting status"
								>
									<NativeSelectOption value="all">
										All statuses
									</NativeSelectOption>
									<NativeSelectOption value="approved">
										Approved
									</NativeSelectOption>
									<NativeSelectOption value="pending">
										Pending
									</NativeSelectOption>
									<NativeSelectOption value="review">Review</NativeSelectOption>
								</NativeSelect>
							</div>
						</form>
					</CardContent>
					<CardFooter className="justify-end gap-2 border-t">
						<Button type="button" variant="outline">
							Clear filters
						</Button>
						<Button type="button">Apply</Button>
					</CardFooter>
				</Card>
			</main>
		</div>
	),
};

export const Usage: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Stable option values (accounting, inventory) stay independent of display labels. Opt groups organize related domains without inventing authorization.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-md gap-6">
			<StorySection title="Module with Operations optgroup">
				<div className="grid gap-2">
					<Label htmlFor="usage-module">Module</Label>
					<NativeSelect
						id="usage-module"
						aria-label="Module"
						defaultValue="accounting"
					>
						<NativeSelectOption value="accounting">
							Accounting
						</NativeSelectOption>
						<NativeSelectOptGroup label="Operations">
							<NativeSelectOption value="inventory">
								Inventory
							</NativeSelectOption>
							<NativeSelectOption value="payroll">Payroll</NativeSelectOption>
						</NativeSelectOptGroup>
					</NativeSelect>
				</div>
			</StorySection>

			<StorySection title="Settlement currency — small set">
				<div className="grid gap-2">
					<Label htmlFor="usage-currency">Settlement currency</Label>
					<NativeSelect
						id="usage-currency"
						defaultValue="MYR"
						aria-label="Settlement currency"
					>
						<NativeSelectOption value="MYR">MYR</NativeSelectOption>
						<NativeSelectOption value="USD">USD</NativeSelectOption>
						<NativeSelectOption value="SGD">SGD</NativeSelectOption>
					</NativeSelect>
				</div>
			</StorySection>
		</div>
	),
};

export const StatesAndAccessibility: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Approved sizes default and sm. Disabled preserves the selected label. Invalid state stays on the native control with a text explanation.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-md gap-6">
			<StorySection title="size=default">
				<div className="grid gap-2">
					<Label htmlFor="state-default">Posting status</Label>
					<NativeSelect
						id="state-default"
						size="default"
						defaultValue="pending"
						aria-label="Posting status default"
					>
						<NativeSelectOption value="approved">Approved</NativeSelectOption>
						<NativeSelectOption value="pending">Pending</NativeSelectOption>
					</NativeSelect>
				</div>
			</StorySection>

			<StorySection title="size=sm — dense toolbar">
				<div className="grid gap-2">
					<Label htmlFor="state-sm">Density</Label>
					<NativeSelect
						id="state-sm"
						size="sm"
						defaultValue="comfortable"
						aria-label="Density"
					>
						<NativeSelectOption value="comfortable">
							Comfortable
						</NativeSelectOption>
						<NativeSelectOption value="compact">Compact</NativeSelectOption>
					</NativeSelect>
				</div>
			</StorySection>

			<StorySection title="Disabled">
				<div className="grid gap-2">
					<Label htmlFor="state-disabled">Module</Label>
					<NativeSelect
						id="state-disabled"
						disabled
						defaultValue="accounting"
						aria-label="Disabled module"
					>
						<NativeSelectOption value="accounting">
							Accounting
						</NativeSelectOption>
					</NativeSelect>
					<p className="text-sm text-foreground-secondary">
						Module scope is fixed for this operator role.
					</p>
				</div>
			</StorySection>

			<StorySection title="Invalid">
				<div className="grid gap-2">
					<Label htmlFor="state-invalid">Posting status</Label>
					<NativeSelect
						id="state-invalid"
						defaultValue=""
						aria-invalid
						aria-label="Invalid posting status"
						required
					>
						<NativeSelectOption value="" disabled>
							Select a status
						</NativeSelectOption>
						<NativeSelectOption value="approved">Approved</NativeSelectOption>
						<NativeSelectOption value="pending">Pending</NativeSelectOption>
					</NativeSelect>
					<p className="text-sm text-destructive">
						Posting status is required before Apply.
					</p>
				</div>
			</StorySection>
		</div>
	),
};

export const Composition: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Card owns the filter surface. NativeSelect fills compact filter slots. StatusBadge owns register lifecycle — not the selected option.",
			},
		},
	},
	render: () => (
		<WorkbenchSection
			id="posting-register-filters"
			title="Posting register filters"
			description="Card owns the filter surface. NativeSelect fills compact filter slots. StatusBadge owns register lifecycle — not the selected option."
		>
			<Card className="shadow-none">
				<CardHeader>
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="outline">Accounting</Badge>
						<StatusBadge size="sm" status="pending" label="Filters applied" />
					</div>
					<CardTitle>Posting register filters</CardTitle>
					<CardDescription>
						Sunken filter row with module and status NativeSelects
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid gap-3 rounded-lg border bg-surface-sunken p-3 sm:grid-cols-2">
						<div className="grid gap-2">
							<Label htmlFor="comp-module">Module</Label>
							<NativeSelect
								id="comp-module"
								aria-label="Module"
								defaultValue="accounting"
							>
								<NativeSelectOption value="accounting">
									Accounting
								</NativeSelectOption>
								<NativeSelectOptGroup label="Operations">
									<NativeSelectOption value="inventory">
										Inventory
									</NativeSelectOption>
									<NativeSelectOption value="payroll">
										Payroll
									</NativeSelectOption>
								</NativeSelectOptGroup>
							</NativeSelect>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="comp-status">Posting status</Label>
							<NativeSelect
								id="comp-status"
								defaultValue="pending"
								aria-label="Posting status"
							>
								<NativeSelectOption value="all">
									All statuses
								</NativeSelectOption>
								<NativeSelectOption value="approved">
									Approved
								</NativeSelectOption>
								<NativeSelectOption value="pending">Pending</NativeSelectOption>
							</NativeSelect>
						</div>
					</div>
				</CardContent>
				<CardFooter className="justify-end gap-2 border-t">
					<Button type="button" variant="outline">
						Clear filters
					</Button>
					<Button type="button">Apply</Button>
				</CardFooter>
			</Card>
		</WorkbenchSection>
	),
};

export const DoAndDoNot: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"NativeSelect is for small bounded vocabularies. It is not a searchable supplier catalog, and listed options are not authorization.",
			},
		},
	},
	render: () => (
		<div className="grid max-w-5xl gap-6 sm:grid-cols-2">
			<StorySection title="Do: small bounded option set">
				<div className="grid gap-2 rounded-lg border p-3">
					<Label htmlFor="do-currency">Settlement currency</Label>
					<NativeSelect
						id="do-currency"
						defaultValue="MYR"
						aria-label="Settlement currency"
					>
						<NativeSelectOption value="MYR">MYR</NativeSelectOption>
						<NativeSelectOption value="USD">USD</NativeSelectOption>
					</NativeSelect>
				</div>
			</StorySection>

			<StorySection title="Do not: dump a searchable catalog here">
				<p className="text-sm text-foreground-secondary">
					Thousands of suppliers, chart-of-accounts nodes, or free-text lookup
					belong in Select / Combobox / SearchField — not NativeSelect.
				</p>
			</StorySection>

			<StorySection title="Do: stable values, translated labels">
				<div className="grid gap-2 rounded-lg border p-3">
					<Label htmlFor="do-status">Posting status</Label>
					<NativeSelect
						id="do-status"
						defaultValue="pending"
						aria-label="Posting status"
					>
						<NativeSelectOption value="pending">Pending</NativeSelectOption>
						<NativeSelectOption value="approved">Approved</NativeSelectOption>
					</NativeSelect>
				</div>
			</StorySection>

			<StorySection title="Do not: treat listing as authorization">
				<p className="text-sm text-foreground-secondary">
					Showing Payroll in the module list does not grant payroll access.
					Server authorization still decides whether the selected scope is
					allowed.
				</p>
			</StorySection>
		</div>
	),
};
