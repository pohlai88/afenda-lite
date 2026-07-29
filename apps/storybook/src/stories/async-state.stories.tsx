import {
	AsyncState,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";

const evidence = contractEvidence("ui.async-state");

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
				<h2 className="text-base font-semibold tracking-tight" id={id}>
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
	title: "UI System/Async State",
	component: AsyncState,
	tags: ["autodocs", "test"],
	args: {
		state: "ready",
	},
	parameters: {
		...contractDocsParameters(evidence, "Async State"),
	},
} satisfies Meta<typeof AsyncState>;

export default meta;

type Story = StoryObj<typeof meta>;

function InvoiceReadyContent() {
	return (
		<div className="grid gap-3">
			<div className="flex items-start justify-between gap-4 rounded-lg border border-border px-4 py-3">
				<div className="grid min-w-0 gap-1">
					<p className="text-sm font-medium text-foreground">INV-1048</p>
					<p className="text-sm leading-5 text-foreground-secondary">
						Northwind Trading · Due 15 Aug 2026
					</p>
				</div>

				<p className="shrink-0 text-sm font-medium tabular-nums text-foreground">
					MYR 18,420.00
				</p>
			</div>

			<div className="flex items-start justify-between gap-4 rounded-lg border border-border px-4 py-3">
				<div className="grid min-w-0 gap-1">
					<p className="text-sm font-medium text-foreground">INV-1049</p>
					<p className="text-sm leading-5 text-foreground-secondary">
						Contoso Feeds · Due 22 Aug 2026
					</p>
				</div>

				<p className="shrink-0 text-sm font-medium tabular-nums text-foreground">
					MYR 6,150.00
				</p>
			</div>
		</div>
	);
}

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"AsyncState presents exactly one truthful outcome for an owned content region: loading, empty, filtered-empty, error, or ready. Feature code owns data fetching, filters, retry, and state selection.",
			},
		},
	},
	render: () => (
		<div className="min-h-screen bg-canvas text-foreground">
			<div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
				<header className="grid gap-5 border-b pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
					<div className="grid gap-2">
						<p className="text-sm font-medium text-foreground-secondary">
							Accounts receivable
						</p>
						<div className="grid gap-1">
							<h1 className="text-2xl font-semibold tracking-tight">
								Supplier invoices
							</h1>
							<p className="max-w-5xl text-sm leading-6 text-foreground-secondary">
								The invoice region renders one state at a time. AsyncState owns
								region feedback; the receivables feature owns requests, filters,
								commands, and the resulting business data.
							</p>
						</div>
					</div>
					<dl className="grid grid-cols-2 gap-x-8 gap-y-3 rounded-lg border bg-card p-4">
						<div className="grid gap-1">
							<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								Subject
							</dt>
							<dd className="text-sm">Invoice region</dd>
						</div>
						<div className="grid gap-1">
							<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								Scope
							</dt>
							<dd className="text-sm">One truth state</dd>
						</div>
						<div className="grid gap-1">
							<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								Ownership
							</dt>
							<dd className="text-sm">Region feedback</dd>
						</div>
						<div className="grid gap-1">
							<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								Lifecycle
							</dt>
							<dd className="text-sm">Loading to ready</dd>
						</div>
					</dl>
				</header>

				<Card className="shadow-none">
					<CardHeader>
						<CardTitle>Open invoices</CardTitle>
						<CardDescription>
							July receivables · Remittance currency MYR
						</CardDescription>
					</CardHeader>

					<CardContent>
						<AsyncState state="ready">
							<InvoiceReadyContent />
						</AsyncState>
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
					"Each state communicates a distinct operational truth. Empty means no domain records exist; filtered-empty means records may exist but the current filters return no matches.",
			},
		},
	},
	render: () => (
		<WorkbenchSection
			id="async-state-semantic-usage-title"
			title="One state at a time"
			description="AsyncState must express a single truthful outcome for the owned region."
		>
			<div className="grid w-full max-w-5xl gap-6">
				<StorySection title="Loading · request in progress">
					<div className="rounded-lg border border-border">
						<AsyncState state="loading" label="Loading invoices" />
					</div>
				</StorySection>

				<StorySection title="Empty · no records exist">
					<AsyncState
						state="empty"
						title="No invoices yet"
						description="Create the first invoice for this customer."
						action={
							<Button type="button" size="sm">
								Create invoice
							</Button>
						}
					/>
				</StorySection>

				<StorySection title="Filtered empty · no current matches">
					<AsyncState
						state="filtered-empty"
						title="No matching invoices"
						description="No invoices match the current supplier, status, or date filters."
						action={
							<Button type="button" size="sm" variant="outline">
								Clear filters
							</Button>
						}
					/>
				</StorySection>

				<StorySection title="Error · request failed">
					<AsyncState
						state="error"
						title="Invoices unavailable"
						description="The ledger service did not respond. Retry the request when connectivity is restored."
						action={
							<Button type="button" size="sm">
								Retry loading
							</Button>
						}
					/>
				</StorySection>

				<StorySection title="Ready · render owned content">
					<AsyncState state="ready">
						<InvoiceReadyContent />
					</AsyncState>
				</StorySection>
			</div>
		</WorkbenchSection>
	),
};

export const RegionStates: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Equivalent regions demonstrate the complete state model without changing their surrounding Card hierarchy.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6 lg:grid-cols-2">
			<Card className="shadow-none">
				<CardHeader>
					<CardTitle>Loading invoices</CardTitle>
					<CardDescription>
						Northwind Trading · Open receivables
					</CardDescription>
				</CardHeader>

				<CardContent className="rounded-b-xl">
					<AsyncState state="loading" label="Loading open invoices" />
				</CardContent>
			</Card>

			<Card className="shadow-none">
				<CardHeader>
					<CardTitle>No invoices</CardTitle>
					<CardDescription>
						Northwind Trading · Open receivables
					</CardDescription>
				</CardHeader>

				<CardContent>
					<AsyncState
						state="empty"
						title="No open invoices"
						description="This supplier has no open receivables."
					/>
				</CardContent>
			</Card>

			<Card className="shadow-none">
				<CardHeader>
					<CardTitle>No filter matches</CardTitle>
					<CardDescription>
						Northwind Trading · Overdue invoices only
					</CardDescription>
				</CardHeader>

				<CardContent>
					<AsyncState
						state="filtered-empty"
						title="No matching invoices"
						description="No open invoices match the current overdue and amount filters."
						action={
							<Button type="button" size="sm" variant="outline">
								Clear filters
							</Button>
						}
					/>
				</CardContent>
			</Card>

			<Card className="shadow-none">
				<CardHeader>
					<CardTitle>Invoice load failed</CardTitle>
					<CardDescription>
						Northwind Trading · Open receivables
					</CardDescription>
				</CardHeader>

				<CardContent>
					<AsyncState
						state="error"
						title="Invoices unavailable"
						description="The ledger service could not load this region."
						action={
							<Button type="button" size="sm">
								Retry loading
							</Button>
						}
					/>
				</CardContent>
			</Card>

			<Card className="shadow-none lg:col-span-2">
				<CardHeader>
					<CardTitle>Ready invoices</CardTitle>
					<CardDescription>
						Northwind Trading · Open receivables
					</CardDescription>
				</CardHeader>

				<CardContent>
					<AsyncState state="ready">
						<InvoiceReadyContent />
					</AsyncState>
				</CardContent>
			</Card>
		</div>
	),
};

export const StatesAndAccessibility: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Loading exposes a meaningful label. Empty and error states retain visible titles, explanations, and keyboard-operable recovery actions. Ready renders content without an additional wrapper layout.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6">
			<StorySection title="Labelled loading state">
				<div className="rounded-lg border border-border">
					<AsyncState
						state="loading"
						label="Loading customer invoice history"
					/>
				</div>
			</StorySection>

			<StorySection title="Titled empty state">
				<AsyncState
					state="empty"
					title="No invoice history"
					description="This customer has no posted or draft invoices."
				/>
			</StorySection>

			<StorySection title="Recoverable error state">
				<AsyncState
					state="error"
					title="Invoice history unavailable"
					description="The invoice request failed before the records could be displayed."
					action={
						<Button type="button" size="sm">
							Retry loading
						</Button>
					}
				/>
			</StorySection>

			<StorySection title="Long content remains readable">
				<AsyncState
					state="filtered-empty"
					title="No invoices match the selected supplier, document status, accounting period, currency, and overdue balance filters"
					description="Clear one or more filters to broaden the result set. Existing invoices are not deleted or changed by this result."
					action={
						<Button type="button" size="sm" variant="outline">
							Clear all filters
						</Button>
					}
				/>
			</StorySection>

			<StorySection title="Ready content remains feature-owned">
				<AsyncState state="ready">
					<div className="rounded-lg border border-border px-4 py-3 text-sm text-foreground">
						Invoice INV-1048 is ready for review.
					</div>
				</AsyncState>
			</StorySection>
		</div>
	),
};

export const DashboardUsage: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Dashboard widgets may use AsyncState for their own data region. The widget title and business context remain visible while the metric body loads, fails, or returns no data.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6 lg:grid-cols-3">
			<Card className="shadow-none">
				<CardHeader>
					<CardDescription>Overdue receivables</CardDescription>
					<CardTitle>Loading metric</CardTitle>
				</CardHeader>

				<CardContent>
					<AsyncState state="loading" label="Loading overdue receivables" />
				</CardContent>
			</Card>

			<Card className="shadow-none">
				<CardHeader>
					<CardDescription>Collection exceptions</CardDescription>
					<CardTitle>No exceptions</CardTitle>
				</CardHeader>

				<CardContent>
					<AsyncState
						state="empty"
						title="No collection exceptions"
						description="No overdue invoices currently require escalation."
					/>
				</CardContent>
			</Card>

			<Card className="shadow-none">
				<CardHeader>
					<CardDescription>Cash collection forecast</CardDescription>
					<CardTitle>Forecast unavailable</CardTitle>
				</CardHeader>

				<CardContent>
					<AsyncState
						state="error"
						title="Forecast unavailable"
						description="The forecast service did not return a result."
						action={
							<Button type="button" size="sm">
								Retry loading
							</Button>
						}
					/>
				</CardContent>
			</Card>
		</div>
	),
};

export const Composition: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Card owns surface identity and hierarchy. AsyncState owns the current region outcome. Button owns feature-provided creation, filtering, or retry commands.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6 lg:grid-cols-2">
			<Card className="shadow-none">
				<CardHeader>
					<CardTitle>Open invoices</CardTitle>
					<CardDescription>
						Northwind Trading · Open receivables
					</CardDescription>
				</CardHeader>

				<CardContent>
					<AsyncState state="ready">
						<InvoiceReadyContent />
					</AsyncState>
				</CardContent>
			</Card>

			<Card className="shadow-none">
				<CardHeader>
					<CardTitle>Open invoices</CardTitle>
					<CardDescription>
						Northwind Trading · Open receivables
					</CardDescription>
				</CardHeader>

				<CardContent>
					<AsyncState
						state="error"
						title="Invoices unavailable"
						description="The ledger service could not load this invoice region."
						action={
							<Button type="button" size="sm">
								Retry loading
							</Button>
						}
					/>
				</CardContent>
			</Card>
		</div>
	),
};

export const DoAndDoNot: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Choose the state from truthful feature data. Distinguish domain emptiness from filter results, provide real recovery, and keep one state owner per region.",
			},
		},
	},
	render: () => (
		<div className="grid max-w-5xl gap-6 sm:grid-cols-2">
			<StorySection title="Do: use empty when no records exist">
				<AsyncState
					state="empty"
					title="No invoices yet"
					description="Create the first invoice for this customer."
					action={
						<Button type="button" size="sm">
							Create invoice
						</Button>
					}
				/>
			</StorySection>

			<StorySection title="Do not: use empty for filter results">
				<div className="grid gap-2">
					<AsyncState
						state="empty"
						title="No invoices"
						description="Create the first invoice for this customer."
					/>

					<p className="text-sm leading-6 text-foreground-secondary">
						When active filters exclude existing records, use filtered-empty and
						provide a filter recovery action.
					</p>
				</div>
			</StorySection>

			<StorySection title="Do: explain active filter results">
				<AsyncState
					state="filtered-empty"
					title="No matching invoices"
					description="No records match the selected supplier, status, and due-date filters."
					action={
						<Button type="button" size="sm" variant="outline">
							Clear filters
						</Button>
					}
				/>
			</StorySection>

			<StorySection title="Do not: imply records were deleted">
				<div className="grid gap-2">
					<AsyncState
						state="filtered-empty"
						title="No invoices exist"
						description="There are no invoices in the system."
					/>

					<p className="text-sm leading-6 text-foreground-secondary">
						Filtered-empty must explain that the current query returned no
						matches, not that the underlying records do not exist.
					</p>
				</div>
			</StorySection>

			<StorySection title="Do: provide a real retry command">
				<AsyncState
					state="error"
					title="Invoices unavailable"
					description="The ledger request failed before records could be displayed."
					action={
						<Button type="button" size="sm">
							Retry loading
						</Button>
					}
				/>
			</StorySection>

			<StorySection title="Do not: use destructive retry styling">
				<div className="grid gap-2">
					<AsyncState
						state="error"
						title="Invoices unavailable"
						description="The ledger request failed."
						action={
							<Button type="button" size="sm" variant="destructive">
								Retry
							</Button>
						}
					/>

					<p className="text-sm leading-6 text-foreground-secondary">
						Retry is normally a recovery action, not a destructive command.
					</p>
				</div>
			</StorySection>

			<StorySection title="Do: keep one state owner per region">
				<p className="text-sm leading-6 text-foreground-secondary">
					The invoice-list feature selects exactly one AsyncState outcome for
					the region from its request, filter, error, and data conditions.
				</p>
			</StorySection>

			<StorySection title="Do not: stack contradictory states">
				<p className="text-sm leading-6 text-foreground-secondary">
					Do not render loading above stale empty or error content for the same
					region. Model background refresh separately in the owning feature.
				</p>
			</StorySection>

			<StorySection title="Do: retain the surrounding context">
				<p className="text-sm leading-6 text-foreground-secondary">
					Keep the Card title, table heading, dashboard label, or section
					identity visible while the content region changes state.
				</p>
			</StorySection>

			<StorySection title="Do not: replace the whole page">
				<p className="text-sm leading-6 text-foreground-secondary">
					AsyncState belongs to an owned region. Do not replace unrelated page
					navigation, filters, headings, or actions for one failed request.
				</p>
			</StorySection>
		</div>
	),
};
