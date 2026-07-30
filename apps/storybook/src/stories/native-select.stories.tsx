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
import type { FormEvent, ReactNode } from "react";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";

const evidence = contractEvidence("ui.native-select");

function preventSubmit(event: FormEvent<HTMLFormElement>): void {
	event.preventDefault();
}

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
						<p className="font-medium text-foreground-secondary text-sm">
							Accounting · journal register
						</p>
						<div className="grid gap-1">
							<h1 className="font-semibold text-2xl tracking-tight">
								Posting filters
							</h1>
							<p className="max-w-5xl text-foreground-secondary text-sm leading-6">
								NativeSelect suits compact option sets. Prefer Select when
								operators need typeahead or rich option rows.
							</p>
						</div>
					</div>
					<dl className="grid grid-cols-2 gap-x-8 gap-y-3 rounded-lg border bg-card p-4">
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								Subject
							</dt>
							<dd className="text-sm">Posting filters</dd>
						</div>
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								Area
							</dt>
							<dd className="text-sm">Accounting register</dd>
						</div>
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								Scope
							</dt>
							<dd className="text-sm">Small bounded vocabularies</dd>
						</div>
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
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
							<StatusBadge label="Operational" size="sm" status="active" />
						</div>
						<CardTitle>Register scope</CardTitle>
						<CardDescription>
							org-fragrant-lake · July 2026 posting run
						</CardDescription>
					</CardHeader>
					<CardContent>
						<form
							className="grid gap-5 sm:grid-cols-2"
							onSubmit={preventSubmit}
						>
							<div className="grid gap-2">
								<Label htmlFor="overview-module">Module</Label>
								<NativeSelect
									aria-label="Module"
									defaultValue="accounting"
									id="overview-module"
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
									aria-label="Posting status"
									defaultValue="all"
									id="overview-status"
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
						aria-label="Module"
						defaultValue="accounting"
						id="usage-module"
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
						aria-label="Settlement currency"
						defaultValue="MYR"
						id="usage-currency"
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
						aria-label="Posting status default"
						defaultValue="pending"
						id="state-default"
						size="default"
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
						aria-label="Density"
						defaultValue="comfortable"
						id="state-sm"
						size="sm"
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
						aria-label="Disabled module"
						defaultValue="accounting"
						disabled
						id="state-disabled"
					>
						<NativeSelectOption value="accounting">
							Accounting
						</NativeSelectOption>
					</NativeSelect>
					<p className="text-foreground-secondary text-sm">
						Module scope is fixed for this operator role.
					</p>
				</div>
			</StorySection>

			<StorySection title="Invalid">
				<div className="grid gap-2">
					<Label htmlFor="state-invalid">Posting status</Label>
					<NativeSelect
						aria-invalid
						aria-label="Invalid posting status"
						defaultValue=""
						id="state-invalid"
						required
					>
						<NativeSelectOption disabled value="">
							Select a status
						</NativeSelectOption>
						<NativeSelectOption value="approved">Approved</NativeSelectOption>
						<NativeSelectOption value="pending">Pending</NativeSelectOption>
					</NativeSelect>
					<p className="text-destructive text-sm">
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
			description="Card owns the filter surface. NativeSelect fills compact filter slots. StatusBadge owns register lifecycle — not the selected option."
			id="posting-register-filters"
			title="Posting register filters"
		>
			<Card className="shadow-none">
				<CardHeader>
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="outline">Accounting</Badge>
						<StatusBadge label="Filters applied" size="sm" status="pending" />
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
								aria-label="Module"
								defaultValue="accounting"
								id="comp-module"
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
								aria-label="Posting status"
								defaultValue="pending"
								id="comp-status"
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
						aria-label="Settlement currency"
						defaultValue="MYR"
						id="do-currency"
					>
						<NativeSelectOption value="MYR">MYR</NativeSelectOption>
						<NativeSelectOption value="USD">USD</NativeSelectOption>
					</NativeSelect>
				</div>
			</StorySection>

			<StorySection title="Do not: dump a searchable catalog here">
				<p className="text-foreground-secondary text-sm">
					Thousands of suppliers, chart-of-accounts nodes, or free-text lookup
					belong in Select / Combobox / SearchField — not NativeSelect.
				</p>
			</StorySection>

			<StorySection title="Do: stable values, translated labels">
				<div className="grid gap-2 rounded-lg border p-3">
					<Label htmlFor="do-status">Posting status</Label>
					<NativeSelect
						aria-label="Posting status"
						defaultValue="pending"
						id="do-status"
					>
						<NativeSelectOption value="pending">Pending</NativeSelectOption>
						<NativeSelectOption value="approved">Approved</NativeSelectOption>
					</NativeSelect>
				</div>
			</StorySection>

			<StorySection title="Do not: treat listing as authorization">
				<p className="text-foreground-secondary text-sm">
					Showing Payroll in the module list does not grant payroll access.
					Server authorization still decides whether the selected scope is
					allowed.
				</p>
			</StorySection>
		</div>
	),
};
