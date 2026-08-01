import {
	Button,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	DataTable,
	StatusBadge,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ComponentProps, type ReactNode, useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";

const ELIGIBLE_COUNT_PATTERN = /1 eligible/i;
const MYR_7900_PATTERN = /MYR\s*7,900\.00/;

type InvoiceStatus =
	| "approved"
	| "awaiting-approval"
	| "overdue"
	| "posting-failed";

type Invoice = Readonly<{
	id: string;
	supplier: string;
	amountMinor: number;
	currency: "MYR";
	status: InvoiceStatus;
	ageHours: number;
	owner: string;
}> &
	Record<string, unknown>;

function invoiceRowId(row: Invoice): string {
	return row.id;
}

function renderExceptionRowAction(row: Invoice) {
	const failed = row.status === "posting-failed";
	return (
		<Button
			aria-label={
				failed ? `Retry posting ${row.id}` : `Review collection ${row.id}`
			}
			size="sm"
			type="button"
			variant={failed ? "default" : "outline"}
		>
			{failed ? "Retry posting" : "Review collection"}
		</Button>
	);
}

function renderReviewRowAction(row: Invoice) {
	return (
		<Button
			aria-label={`Review invoice ${row.id}`}
			size="sm"
			type="button"
			variant="ghost"
		>
			Review
		</Button>
	);
}

function renderOpenRowAction(row: Invoice) {
	return (
		<Button
			aria-label={`Open invoice ${row.id}`}
			size="sm"
			type="button"
			variant="ghost"
		>
			Open
		</Button>
	);
}

function renderPrimaryReviewRowAction(row: Invoice) {
	return (
		<Button aria-label={`Review invoice ${row.id}`} type="button">
			Review
		</Button>
	);
}

type SectionProps = Readonly<{
	id: string;
	title: string;
	description: string;
	children: ReactNode;
}>;

function WorkbenchSection({ id, title, description, children }: SectionProps) {
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

const myrFormatter = new Intl.NumberFormat("en-MY", {
	style: "currency",
	currency: "MYR",
	currencyDisplay: "code",
	minimumFractionDigits: 2,
});

const invoiceStatusPresentation = {
	approved: {
		status: "success",
		label: "Approved",
	},
	"awaiting-approval": {
		status: "pending",
		label: "Awaiting approval",
	},
	overdue: {
		status: "warning",
		label: "Overdue",
	},
	"posting-failed": {
		status: "error",
		label: "Posting failed",
	},
} as const satisfies Record<
	InvoiceStatus,
	{
		status: ComponentProps<typeof StatusBadge>["status"];
		label: string;
	}
>;

function formatAgeHours(value: number): string {
	if (value < 24) {
		return `${value}h`;
	}
	const days = Math.floor(value / 24);
	const hours = value % 24;
	return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
}

function isInvoiceStatus(value: unknown): value is InvoiceStatus {
	return typeof value === "string" && value in invoiceStatusPresentation;
}

function asAmountMinor(value: unknown): number {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}
	throw new Error(`Expected amountMinor number, received ${typeof value}`);
}

function asAgeHours(value: unknown): number {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}
	throw new Error(`Expected ageHours number, received ${typeof value}`);
}

const rows: readonly Invoice[] = [
	{
		id: "INV-1043",
		supplier: "Contoso Logistics Sdn. Bhd.",
		amountMinor: 790_000,
		currency: "MYR",
		status: "awaiting-approval",
		ageHours: 18,
		owner: "Daniel Wong",
	},
	{
		id: "INV-1044",
		supplier: "Fabrikam Supplies Sdn. Bhd.",
		amountMinor: 1_260_000,
		currency: "MYR",
		status: "awaiting-approval",
		ageHours: 31,
		owner: "Nur Izzati",
	},
	{
		id: "INV-1042",
		supplier: "Northwind Trading Sdn. Bhd.",
		amountMinor: 1_842_000,
		currency: "MYR",
		status: "approved",
		ageHours: 4,
		owner: "Aisyah Rahman",
	},
	{
		id: "INV-1045",
		supplier: "Tailspin Foods Sdn. Bhd.",
		amountMinor: 348_000,
		currency: "MYR",
		status: "approved",
		ageHours: 2,
		owner: "Aisyah Rahman",
	},
	{
		id: "INV-1038",
		supplier: "Northwind Trading Sdn. Bhd.",
		amountMinor: 2_210_000,
		currency: "MYR",
		status: "overdue",
		ageHours: 96,
		owner: "Daniel Wong",
	},
	{
		id: "INV-1039",
		supplier: "Contoso Logistics Sdn. Bhd.",
		amountMinor: 975_000,
		currency: "MYR",
		status: "posting-failed",
		ageHours: 52,
		owner: "Nur Izzati",
	},
];

const approvalRows = rows.filter(
	(row) => row.status === "approved" || row.status === "awaiting-approval",
);

const exceptionRows = rows.filter(
	(row) => row.status === "overdue" || row.status === "posting-failed",
);

const openLiabilityMinor = approvalRows.reduce(
	(total, row) => total + row.amountMinor,
	0,
);

const columns = [
	{
		key: "id" as const,
		title: "Invoice",
		sortable: true,
		render: (value: unknown) => (
			<span className="font-medium font-mono text-xs">{String(value)}</span>
		),
	},
	{
		key: "supplier" as const,
		title: "Supplier",
		filterable: true,
	},
	{
		key: "owner" as const,
		title: "Owner",
		filterable: true,
	},
	{
		key: "amountMinor" as const,
		title: "Amount",
		sortable: true,
		render: (value: unknown) => (
			<span className="block text-right font-mono tabular-nums">
				{myrFormatter.format(asAmountMinor(value) / 100)}
			</span>
		),
	},
	{
		key: "ageHours" as const,
		title: "Age",
		sortable: true,
		render: (value: unknown) => formatAgeHours(asAgeHours(value)),
	},
	{
		key: "status" as const,
		title: "State",
		render: (value: unknown) => {
			if (!isInvoiceStatus(value)) {
				throw new Error(`Unsupported invoice status: ${String(value)}`);
			}
			const presentation = invoiceStatusPresentation[value];
			return (
				<StatusBadge
					label={presentation.label}
					size="sm"
					status={presentation.status}
				/>
			);
		},
	},
];

function InteractiveApprovalTable({
	density = "compact",
}: {
	density?: "comfortable" | "compact";
}) {
	const eligibleRows = approvalRows.filter(
		(row) => row.status === "awaiting-approval",
	);
	const eligibleIds = new Set(eligibleRows.map((row) => row.id));
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const selectedEligibleCount = [...selected].filter((id) =>
		eligibleIds.has(id),
	).length;

	return (
		<DataTable
			bulkActions={
				<>
					<Button size="sm" variant="outline">
						Export selected
					</Button>
					<Button
						aria-describedby="approval-eligibility"
						disabled={selectedEligibleCount === 0}
						size="sm"
					>
						Approve selected
					</Button>
					<span
						className="text-foreground-tertiary text-xs"
						id="approval-eligibility"
					>
						{selectedEligibleCount} eligible
					</span>
				</>
			}
			columns={columns}
			data={[...approvalRows]}
			density={density}
			getRowId={invoiceRowId}
			onSelectionChange={setSelected}
			selectable
			selectedRowIds={selected}
		/>
	);
}

function DataTableOperationalOverview() {
	return (
		<div className="min-h-screen bg-canvas text-foreground">
			<div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
				<header className="grid gap-2 border-b pb-6">
					<div className="flex flex-wrap items-center gap-2">
						<span className="font-medium text-foreground-secondary text-sm">
							Accounts payable
						</span>
						<span aria-hidden="true" className="text-foreground-tertiary">
							/
						</span>
						<span className="text-foreground-tertiary text-sm">
							Approval operations
						</span>
					</div>
					<h1 className="font-semibold text-2xl tracking-tight">
						Supplier invoice queue
					</h1>
					<p className="max-w-5xl text-foreground-secondary text-sm leading-6">
						Review material supplier liabilities, approve eligible invoices and
						resolve posting exceptions. Selection does not imply bulk
						eligibility — feature code supplies eligible rows and available
						actions.
					</p>
				</header>

				<main className="grid gap-9">
					<WorkbenchSection
						description="Aggregate pressure is communicated through values and copy rather than decorative status."
						id="data-table-summary"
						title="Operational summary"
					>
						<dl className="grid gap-6 border-y py-5 sm:grid-cols-3">
							<div className="grid gap-1">
								<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
									Open liability
								</dt>
								<dd className="grid gap-1">
									<span className="font-semibold text-2xl tabular-nums tracking-tight">
										{myrFormatter.format(openLiabilityMinor / 100)}
									</span>
									<span className="text-foreground-tertiary text-xs">
										Four open supplier invoices
									</span>
								</dd>
							</div>
							<div className="grid gap-1">
								<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
									Awaiting approval
								</dt>
								<dd className="grid gap-1">
									<span className="font-semibold text-2xl tabular-nums tracking-tight">
										2
									</span>
									<span className="text-foreground-tertiary text-xs">
										One exceeds the target review window
									</span>
								</dd>
							</div>
							<div className="grid gap-1">
								<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
									Exceptions today
								</dt>
								<dd className="grid gap-1">
									<span className="font-semibold text-2xl tabular-nums tracking-tight">
										{exceptionRows.length}
									</span>
									<span className="text-foreground-tertiary text-xs">
										Overdue or failed-posting liabilities
									</span>
								</dd>
							</div>
						</dl>
					</WorkbenchSection>

					<WorkbenchSection
						description="Compact selectable table with explicit row identity, ownership, materiality, age and governed state. Reject stays in a separate governed workflow."
						id="data-table-priority"
						title="Approval queue"
					>
						<InteractiveApprovalTable />
					</WorkbenchSection>

					<WorkbenchSection
						description="Recovery actions remain explicit controls. The row itself is not an undisclosed destination."
						id="data-table-exceptions"
						title="Requires attention"
					>
						<DataTable
							columns={columns}
							data={[...exceptionRows]}
							density="compact"
							getRowId={invoiceRowId}
							rowActions={renderExceptionRowAction}
						/>
					</WorkbenchSection>
				</main>
			</div>
		</div>
	);
}

const evidence = contractEvidence("ui.data-table");
const meta = {
	title: "UI System/Data Table",
	component: DataTable,
	tags: ["autodocs", "test"],
	args: {
		columns,
		data: [...rows],
		density: "compact",
	},
	argTypes: {
		density: {
			control: "select",
			options: evidence.variants,
		},
	},
	parameters: {
		controls: { include: ["density"], sort: "none" },
		...contractDocsParameters(evidence, "Data Table"),
		docs: {
			description: {
				component:
					"DataTable is Afenda's controlled tabular workbench primitive for comparable records. It owns table structure, density, sorting/filter UI, selection mechanics, and composed row or bulk action surfaces; feature code owns data retrieval, field authorization, stable identity, eligibility, pagination policy, mutation execution, persistence, and result reporting.",
			},
		},
	},
} satisfies Meta<typeof DataTable<Invoice>>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		docs: {
			description: {
				story:
					"One accounts-payable workbench: aggregate exposure, selectable approval queue with eligibility-gated bulk Approve, and exception recovery. DataTable presents controlled tabular mechanics; feature code owns fetch, authz, and eligibility policy.",
			},
		},
	},
	render: () => <DataTableOperationalOverview />,
};

export const SemanticUsage: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Approved DataTable roles: approval queue with bulkActions, exception recovery with named row actions, and StatusBadge lifecycle in the State column — not Badge taxonomy.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6">
			<StorySection title="Approval queue with eligibility-gated bulk actions">
				<InteractiveApprovalTable density="comfortable" />
			</StorySection>
			<StorySection title="Exception recovery with named row actions">
				<DataTable
					columns={columns}
					data={[...exceptionRows]}
					density="compact"
					getRowId={invoiceRowId}
					rowActions={renderExceptionRowAction}
				/>
			</StorySection>
		</div>
	),
};

export const ControlledUsage: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Default readable table with explicit Review actions per invoice. Amounts stay numeric until presentation; rows stay structural.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-3">
			<DataTable
				columns={columns}
				data={[...approvalRows]}
				getRowId={invoiceRowId}
				rowActions={renderReviewRowAction}
			/>
			<p className="text-foreground-secondary text-sm">
				Stable getRowId keys survive sort, filter, and refresh. Selection is
				optional — omit selectable when the queue is read-only review.
			</p>
		</div>
	),
};

export const AuthorizationAndEligibility: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Rows and columns are already authorized before they reach DataTable. Selection identifies operator intent, while feature code computes eligible records, omits unauthorized commands, and revalidates every mutation at execution time.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-8">
			<StorySection title="Mixed selection with explicit eligibility">
				<InteractiveApprovalTable />
			</StorySection>
			<StorySection title="Field authorization precedes rendering">
				<p className="max-w-5xl text-foreground-secondary text-sm leading-6">
					Do not pass masked or forbidden values into hidden columns and assume
					visibility protects them. Query projections, export paths, filters,
					and row actions must enforce the same field-level authorization
					policy.
				</p>
			</StorySection>
		</div>
	),
};

export const AdaptiveLayout: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"DataTable preserves semantic table structure in constrained workbench regions. Horizontal overflow is preferable to collapsing material columns into unlabeled cards or truncating identifiers and monetary values.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-8">
			<StorySection title="Constrained review panel">
				<div className="w-full max-w-xl overflow-x-auto rounded-xl border border-border border-dashed p-3">
					<div className="min-w-[52rem]">
						<DataTable
							columns={columns}
							data={[...approvalRows]}
							density="compact"
							getRowId={invoiceRowId}
							rowActions={renderReviewRowAction}
						/>
					</div>
				</div>
			</StorySection>
		</div>
	),
};

export const VariantsAndSizes: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Density inventory: comfortable for mixed review content; compact for high-volume scanning when targets stay usable. DataTable has no other visual variant scale.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6">
			<StorySection title="Comfortable review density">
				<DataTable
					columns={columns}
					data={[...approvalRows]}
					density="comfortable"
					getRowId={invoiceRowId}
				/>
			</StorySection>
			<StorySection title="Compact operational density">
				<DataTable
					columns={columns}
					data={[...approvalRows]}
					density="compact"
					getRowId={invoiceRowId}
				/>
			</StorySection>
		</div>
	),
};

export const StatesAndAccessibility: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Keyboard selection, selected-count feedback, and eligibility-gated bulk Approve remain operable. Selection is interaction state — not proof of authorization.",
			},
		},
	},
	render: () => <InteractiveApprovalTable />,
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(
			canvas.getByRole("columnheader", { name: "Invoice" }),
		).toBeVisible();
		await expect(
			canvas.getByRole("columnheader", { name: "Amount" }),
		).toBeVisible();
		await expect(canvas.getByText(MYR_7900_PATTERN)).toBeVisible();

		const firstRowCheckbox = canvas.getByRole("checkbox", {
			name: "Select row 1",
		});
		firstRowCheckbox.focus();
		await expect(firstRowCheckbox).toHaveFocus();
		await userEvent.keyboard("[Space]");
		await expect(firstRowCheckbox).toBeChecked();

		await expect(
			canvas.getByRole("button", { name: "Approve selected" }),
		).toBeVisible();
		await expect(canvas.getByText(ELIGIBLE_COUNT_PATTERN)).toBeVisible();

		await expect(
			canvas.getByRole("button", { name: "Export selected" }),
		).toBeVisible();
	},
};

export const EmptyAndFilteredStates: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Truly empty collections and filtered-empty results stay distinguishable. Loading and error use DataTable APIs; recovery actions must be real feature commands.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-8">
			<StorySection title="Truly empty collection">
				<DataTable
					columns={columns}
					data={[]}
					emptyDescription="New supplier invoices will appear here after validation."
					emptyTitle="No supplier invoices"
				/>
			</StorySection>
			<StorySection title="Filtered empty">
				<DataTable
					columns={columns}
					data={[]}
					emptyAction={
						<Button size="sm" type="button" variant="outline">
							Clear filters
						</Button>
					}
					emptyDescription="Clear supplier, owner or state filters to return to the queue."
					emptyTitle="No invoices match these filters"
				/>
			</StorySection>
			<StorySection title="Loading">
				<DataTable columns={columns} data={[]} loading />
			</StorySection>
			<StorySection title="Load error">
				<DataTable
					columns={columns}
					data={[]}
					error={{
						title: "Could not load invoices",
						description:
							"The approval queue is temporarily unavailable. Retry after the service recovers.",
						action: (
							<Button size="sm" type="button" variant="outline">
								Retry
							</Button>
						),
					}}
				/>
			</StorySection>
			<StorySection title="Quiet complete">
				<DataTable
					columns={columns}
					data={[...approvalRows.filter((row) => row.status === "approved")]}
					density="comfortable"
					getRowId={invoiceRowId}
					rowActions={renderOpenRowAction}
				/>
			</StorySection>
		</div>
	),
};

export const Composition: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Compose DataTable inside a Card workbench. Page title and New invoice stay feature-owned; StatusBadge stays in the State column for lifecycle.",
			},
		},
	},
	render: () => (
		<Card className="w-full max-w-5xl shadow-none">
			<CardHeader>
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div className="grid gap-1">
						<CardTitle>Supplier invoices</CardTitle>
						<CardDescription>
							org-fragrant-lake · July approval queue
						</CardDescription>
					</div>
					<Button type="button">New invoice</Button>
				</div>
			</CardHeader>
			<CardContent>
				<DataTable
					columns={columns}
					data={[...approvalRows]}
					density="comfortable"
					getRowId={invoiceRowId}
					rowActions={renderReviewRowAction}
				/>
			</CardContent>
		</Card>
	),
};

export const DoAndDoNot: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Do keep amounts numeric until presentation, name row actions uniquely, and gate bulk commands on eligibility. Do not treat selection as authz or make entire rows ambiguous click targets.",
			},
		},
	},
	render: () => (
		<div className="grid max-w-5xl gap-6 sm:grid-cols-2">
			<StorySection title="Do: expose explicit row actions with unique names">
				<DataTable
					columns={columns}
					data={approvalRows.slice(0, 1)}
					getRowId={invoiceRowId}
					rowActions={renderPrimaryReviewRowAction}
				/>
			</StorySection>
			<StorySection title="Do: align numeric values for comparison">
				<p className="text-foreground-secondary text-sm">
					Amounts use tabular numerals and right alignment so operators can
					compare material values vertically. Source data remains amountMinor
					until the presentation column formats MYR.
				</p>
			</StorySection>
			<StorySection title="Do: gate bulk Approve on eligible selection">
				<p className="text-foreground-secondary text-sm">
					Show selected count and eligible count. Revalidate permissions before
					the Action runs — the checkbox is not authorization.
				</p>
			</StorySection>
			<StorySection title="Do not: store formatted currency as table data">
				<p className="text-foreground-secondary text-sm">
					Keep numeric amounts in domain-safe units. Format MYR only in the
					presentation column so sorting, totals, and export retain meaning.
				</p>
			</StorySection>
			<StorySection title="Do not: expose generic repeated names only">
				<p className="text-foreground-secondary text-sm">
					Visually repeated controls need unique accessible names such as Review
					invoice INV-1042. A bare Review label is not enough for assistive
					technology.
				</p>
			</StorySection>
			<StorySection title="Do not: make the entire row an ambiguous action">
				<p className="text-foreground-secondary text-sm">
					Rows remain structural; navigation and commands use named controls.
					Entire-row clicks hide independent destinations and break keyboard
					clarity.
				</p>
			</StorySection>
		</div>
	),
};
