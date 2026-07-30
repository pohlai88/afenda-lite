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
					<p className="font-medium text-foreground text-sm">INV-1048</p>
					<p className="text-foreground-secondary text-sm leading-5">
						Northwind Trading · Due 15 Aug 2026
					</p>
				</div>

				<p className="shrink-0 font-medium text-foreground text-sm tabular-nums">
					MYR 18,420.00
				</p>
			</div>

			<div className="flex items-start justify-between gap-4 rounded-lg border border-border px-4 py-3">
				<div className="grid min-w-0 gap-1">
					<p className="font-medium text-foreground text-sm">INV-1049</p>
					<p className="text-foreground-secondary text-sm leading-5">
						Contoso Feeds · Due 22 Aug 2026
					</p>
				</div>

				<p className="shrink-0 font-medium text-foreground text-sm tabular-nums">
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
						<p className="font-medium text-foreground-secondary text-sm">
							Accounts receivable
						</p>
						<div className="grid gap-1">
							<h1 className="font-semibold text-2xl tracking-tight">
								Supplier invoices
							</h1>
							<p className="max-w-5xl text-foreground-secondary text-sm leading-6">
								The invoice region renders one state at a time. AsyncState owns
								region feedback; the receivables feature owns requests, filters,
								commands, and the resulting business data.
							</p>
						</div>
					</div>
					<dl className="grid grid-cols-2 gap-x-8 gap-y-3 rounded-lg border bg-card p-4">
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								Subject
							</dt>
							<dd className="text-sm">Invoice region</dd>
						</div>
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								Scope
							</dt>
							<dd className="text-sm">One truth state</dd>
						</div>
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								Ownership
							</dt>
							<dd className="text-sm">Region feedback</dd>
						</div>
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
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
			description="AsyncState must express a single truthful outcome for the owned region."
			id="async-state-semantic-usage-title"
			title="One state at a time"
		>
			<div className="grid w-full max-w-5xl gap-6">
				<StorySection title="Loading · request in progress">
					<div className="rounded-lg border border-border">
						<AsyncState label="Loading invoices" state="loading" />
					</div>
				</StorySection>

				<StorySection title="Empty · no records exist">
					<AsyncState
						action={
							<Button size="sm" type="button">
								Create invoice
							</Button>
						}
						description="Create the first invoice for this customer."
						state="empty"
						title="No invoices yet"
					/>
				</StorySection>

				<StorySection title="Filtered empty · no current matches">
					<AsyncState
						action={
							<Button size="sm" type="button" variant="outline">
								Clear filters
							</Button>
						}
						description="No invoices match the current supplier, status, or date filters."
						state="filtered-empty"
						title="No matching invoices"
					/>
				</StorySection>

				<StorySection title="Error · request failed">
					<AsyncState
						action={
							<Button size="sm" type="button">
								Retry loading
							</Button>
						}
						description="The ledger service did not respond. Retry the request when connectivity is restored."
						state="error"
						title="Invoices unavailable"
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
					<AsyncState label="Loading open invoices" state="loading" />
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
						description="This supplier has no open receivables."
						state="empty"
						title="No open invoices"
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
						action={
							<Button size="sm" type="button" variant="outline">
								Clear filters
							</Button>
						}
						description="No open invoices match the current overdue and amount filters."
						state="filtered-empty"
						title="No matching invoices"
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
						action={
							<Button size="sm" type="button">
								Retry loading
							</Button>
						}
						description="The ledger service could not load this region."
						state="error"
						title="Invoices unavailable"
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
						label="Loading customer invoice history"
						state="loading"
					/>
				</div>
			</StorySection>

			<StorySection title="Titled empty state">
				<AsyncState
					description="This customer has no posted or draft invoices."
					state="empty"
					title="No invoice history"
				/>
			</StorySection>

			<StorySection title="Recoverable error state">
				<AsyncState
					action={
						<Button size="sm" type="button">
							Retry loading
						</Button>
					}
					description="The invoice request failed before the records could be displayed."
					state="error"
				/>
			</StorySection>

			<StorySection title="Long content remains readable">
				<AsyncState
					action={
						<Button size="sm" type="button" variant="outline">
							Clear all filters
						</Button>
					}
					description="Clear one or more filters to broaden the result set. Existing invoices are not deleted or changed by this result."
					state="filtered-empty"
					title="No matching invoices"
				/>
			</StorySection>

			<StorySection title="Ready content remains feature-owned">
				<AsyncState state="ready">
					<div className="rounded-lg border border-border px-4 py-3 text-foreground text-sm">
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
					<AsyncState label="Loading overdue receivables" state="loading" />
				</CardContent>
			</Card>

			<Card className="shadow-none">
				<CardHeader>
					<CardDescription>Collection exceptions</CardDescription>
					<CardTitle>No exceptions</CardTitle>
				</CardHeader>

				<CardContent>
					<AsyncState
						description="No overdue invoices currently require escalation."
						state="empty"
						title="No collection exceptions"
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
						action={
							<Button size="sm" type="button">
								Retry loading
							</Button>
						}
						description="The forecast service did not return a result."
						state="error"
						title="Forecast unavailable"
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
						action={
							<Button size="sm" type="button">
								Retry loading
							</Button>
						}
						description="The ledger service could not load this invoice region."
						state="error"
						title="Invoices unavailable"
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
					action={
						<Button size="sm" type="button">
							Create invoice
						</Button>
					}
					description="Create the first invoice for this customer."
					state="empty"
					title="No invoices yet"
				/>
			</StorySection>

			<StorySection title="Do not: use empty for filter results">
				<div className="grid gap-2">
					<AsyncState
						description="Create the first invoice for this customer."
						state="empty"
						title="No invoices"
					/>

					<p className="text-foreground-secondary text-sm leading-6">
						When active filters exclude existing records, use filtered-empty and
						provide a filter recovery action.
					</p>
				</div>
			</StorySection>

			<StorySection title="Do: explain active filter results">
				<AsyncState
					action={
						<Button size="sm" type="button" variant="outline">
							Clear filters
						</Button>
					}
					description="No records match the selected supplier, status, and due-date filters."
					state="filtered-empty"
					title="No matching records"
				/>
			</StorySection>

			<StorySection title="Do not: imply records were deleted">
				<div className="grid gap-2">
					<AsyncState
						description="There are no invoices in the system."
						state="filtered-empty"
						title="No invoices exist"
					/>

					<p className="text-foreground-secondary text-sm leading-6">
						Filtered-empty must explain that the current query returned no
						matches, not that the underlying records do not exist.
					</p>
				</div>
			</StorySection>

			<StorySection title="Do: provide a real retry command">
				<AsyncState
					action={
						<Button size="sm" type="button">
							Retry loading
						</Button>
					}
					description="The ledger request failed before records could be displayed."
					state="error"
					title="Invoices unavailable"
				/>
			</StorySection>

			<StorySection title="Do not: use destructive retry styling">
				<div className="grid gap-2">
					<AsyncState
						action={
							<Button size="sm" type="button" variant="destructive">
								Retry
							</Button>
						}
						description="The ledger request failed."
						state="error"
						title="Invoices unavailable"
					/>

					<p className="text-foreground-secondary text-sm leading-6">
						Retry is normally a recovery action, not a destructive command.
					</p>
				</div>
			</StorySection>

			<StorySection title="Do: keep one state owner per region">
				<p className="text-foreground-secondary text-sm leading-6">
					The invoice-list feature selects exactly one AsyncState outcome for
					the region from its request, filter, error, and data conditions.
				</p>
			</StorySection>

			<StorySection title="Do not: stack contradictory states">
				<p className="text-foreground-secondary text-sm leading-6">
					Do not render loading above stale empty or error content for the same
					region. Model background refresh separately in the owning feature.
				</p>
			</StorySection>

			<StorySection title="Do: retain the surrounding context">
				<p className="text-foreground-secondary text-sm leading-6">
					Keep the Card title, table heading, dashboard label, or section
					identity visible while the content region changes state.
				</p>
			</StorySection>

			<StorySection title="Do not: replace the whole page">
				<p className="text-foreground-secondary text-sm leading-6">
					AsyncState belongs to an owned region. Do not replace unrelated page
					navigation, filters, headings, or actions for one failed request.
				</p>
			</StorySection>
		</div>
	),
};
