import {
	Badge,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	ColumnVisibilityMenu,
	type ColumnVisibilityOption,
	StatusBadge,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";
import { interactionFor } from "./interactions";

const evidence = contractEvidence("ui.column-visibility-menu");

const INVOICE_COLUMNS: readonly ColumnVisibilityOption[] = [
	{ id: "invoice", label: "Invoice", visible: true, disabled: true },
	{ id: "customer", label: "Customer", visible: true },
	{ id: "amount", label: "Amount", visible: true, disabled: true },
	{ id: "due", label: "Due date", visible: false },
	{ id: "owner", label: "Owner", visible: true },
];

const meta = {
	title: "UI System/Column Visibility Menu",
	component: ColumnVisibilityMenu,
	tags: ["autodocs", "test"],
	args: {
		columns: INVOICE_COLUMNS,
		onVisibilityChange: () => undefined,
		label: "Columns",
	},
	parameters: {
		...contractDocsParameters(evidence, "Column Visibility Menu"),
		docs: {
			description: {
				component:
					"ColumnVisibilityMenu is a controlled presentation-density control for one adjacent data view. It toggles optional columns through stable IDs while feature policy keeps required identity and decision columns non-hideable. It does not authorize fields, fetch data, persist preferences, or define lifecycle.",
			},
		},
	},
} satisfies Meta<typeof ColumnVisibilityMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

type InvoiceRow = Readonly<{
	invoice: string;
	customer: string;
	amount: string;
	due: string;
	owner: string;
	status: "pending" | "active";
	statusLabel: string;
}>;

const INVOICE_ROWS: readonly InvoiceRow[] = [
	{
		invoice: "INV-1048",
		customer: "Northwind Trading",
		amount: "MYR 18,420.00",
		due: "15 Aug 2026",
		owner: "Aisha Rahman",
		status: "pending",
		statusLabel: "Awaiting approval",
	},
	{
		invoice: "INV-1042",
		customer: "Contoso Logistics",
		amount: "MYR 9,850.00",
		due: "02 Aug 2026",
		owner: "Mei Lin",
		status: "active",
		statusLabel: "Open",
	},
	{
		invoice: "INV-1038",
		customer: "Fabrikam Packaging",
		amount: "MYR 4,200.00",
		due: "28 Jul 2026",
		owner: "Jon Reyes",
		status: "pending",
		statusLabel: "Needs matching",
	},
];

function applyVisibility(
	columns: readonly ColumnVisibilityOption[],
	id: string,
	visible: boolean,
): ColumnVisibilityOption[] {
	return columns.map((column) =>
		column.id === id ? { ...column, visible } : column,
	);
}

function isVisible(
	columns: readonly ColumnVisibilityOption[],
	id: string,
): boolean {
	return columns.some((column) => column.id === id && column.visible);
}

function InvoiceColumnMenu({
	initialColumns = INVOICE_COLUMNS,
	label = "Columns",
}: {
	initialColumns?: readonly ColumnVisibilityOption[];
	label?: string;
}) {
	const [columns, setColumns] = React.useState(() => [...initialColumns]);

	return (
		<ColumnVisibilityMenu
			label={label}
			columns={columns}
			onVisibilityChange={(id, visible) =>
				setColumns((current) => applyVisibility(current, id, visible))
			}
		/>
	);
}

function ReceivablesColumnWorkbench() {
	const [columns, setColumns] = React.useState(() => [...INVOICE_COLUMNS]);

	return (
		<div className="min-h-screen bg-canvas text-foreground">
			<div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
				<header className="grid gap-2 border-b pb-6">
					<p className="text-sm font-medium text-foreground-secondary">
						Accounts receivable · open invoices
					</p>
					<h1 className="text-2xl font-semibold tracking-tight">
						Invoice workbench
					</h1>
					<p className="max-w-5xl text-sm leading-6 text-foreground-secondary">
						ColumnVisibilityMenu densifies optional columns on this list.
						Invoice and Amount stay non-hideable. Hiding Due date does not
						revoke access to due-date data.
					</p>
				</header>

				<Card className="shadow-none">
					<CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
						<div className="grid gap-1">
							<CardTitle>Open receivables</CardTitle>
							<CardDescription>
								org-fragrant-lake · July collection queue
							</CardDescription>
						</div>
						<ColumnVisibilityMenu
							columns={columns}
							onVisibilityChange={(id, visible) =>
								setColumns((current) => applyVisibility(current, id, visible))
							}
						/>
					</CardHeader>
					<CardContent>
						<Table>
							<TableHeader>
								<TableRow>
									{isVisible(columns, "invoice") ? (
										<TableHead>Invoice</TableHead>
									) : null}
									{isVisible(columns, "customer") ? (
										<TableHead>Customer</TableHead>
									) : null}
									{isVisible(columns, "amount") ? (
										<TableHead className="text-right">Amount</TableHead>
									) : null}
									{isVisible(columns, "due") ? (
										<TableHead>Due date</TableHead>
									) : null}
									{isVisible(columns, "owner") ? (
										<TableHead>Owner</TableHead>
									) : null}
									<TableHead>Status</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{INVOICE_ROWS.map((row) => (
									<TableRow key={row.invoice}>
										{isVisible(columns, "invoice") ? (
											<TableCell className="font-mono text-sm">
												{row.invoice}
											</TableCell>
										) : null}
										{isVisible(columns, "customer") ? (
											<TableCell>{row.customer}</TableCell>
										) : null}
										{isVisible(columns, "amount") ? (
											<TableCell className="text-right tabular-nums">
												{row.amount}
											</TableCell>
										) : null}
										{isVisible(columns, "due") ? (
											<TableCell>{row.due}</TableCell>
										) : null}
										{isVisible(columns, "owner") ? (
											<TableCell>{row.owner}</TableCell>
										) : null}
										<TableCell>
											<StatusBadge
												size="sm"
												status={row.status}
												label={row.statusLabel}
											/>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
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
					"Receivables workbench densifies optional columns with ColumnVisibilityMenu. Invoice and Amount remain required; Due date starts hidden until the operator enables it.",
			},
		},
	},
	render: () => <ReceivablesColumnWorkbench />,
	play: interactionFor("column-visibility-menu"),
};

export const Usage: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Stable column ids drive visibility. Disabled options mark required identity or amount columns that feature policy must keep visible.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-xl gap-6">
			<StorySection title="Default Columns trigger">
				<div className="flex justify-end rounded-lg border p-4">
					<InvoiceColumnMenu />
				</div>
			</StorySection>

			<StorySection title="Workbench-specific trigger label">
				<div className="flex justify-end rounded-lg border p-4">
					<InvoiceColumnMenu label="Visible fields" />
				</div>
			</StorySection>
		</div>
	),
};

export const AuthorizationAndPersistence: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Visibility operates only on data the owning feature is already permitted to provide. Saved preferences belong to the view or saved-view layer and must be reconciled against the current approved column policy.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6">
			<StorySection title="Authorized optional fields">
				<div className="grid gap-3 rounded-lg border p-4">
					<div className="flex justify-end">
						<InvoiceColumnMenu />
					</div>
					<p className="text-sm leading-6 text-foreground-secondary">
						Customer, Due date, and Owner are already authorized fields. The
						menu changes presentation only.
					</p>
				</div>
			</StorySection>

			<StorySection title="Required columns remain visible">
				<div className="grid gap-3 rounded-lg border p-4">
					<div className="flex justify-end">
						<InvoiceColumnMenu />
					</div>
					<p className="text-sm leading-6 text-foreground-secondary">
						Invoice and Amount are disabled because the receivables view
						requires record identity and material value for every usable row.
					</p>
				</div>
			</StorySection>

			<StorySection title="Saved state is feature-owned">
				<p className="text-sm leading-6 text-foreground-secondary">
					A saved view may persist optional visibility choices. On restore, the
					feature must discard unknown IDs and reassert newly required columns
					before passing controlled options to ColumnVisibilityMenu.
				</p>
			</StorySection>
		</div>
	),
};

export const AdaptiveLayout: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Keep the trigger adjacent to the governed table in narrow workbench regions. The menu may overlay the view, but column labels and checkbox semantics remain complete rather than becoming icon-only ambiguity.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-4xl gap-8">
			<StorySection title="Narrow table toolbar">
				<div className="w-full max-w-sm rounded-xl border border-dashed border-border p-4">
					<div className="flex flex-wrap items-start justify-between gap-3">
						<div className="min-w-0">
							<p className="text-sm font-medium text-foreground">
								Open receivables
							</p>
							<p className="text-sm text-foreground-secondary">
								128 invoice records
							</p>
						</div>
						<InvoiceColumnMenu label="Visible fields" />
					</div>
				</div>
			</StorySection>

			<StorySection title="Long operational column labels">
				<div className="flex justify-end rounded-lg border p-4">
					<InvoiceColumnMenu
						label="Visible fields"
						initialColumns={[
							{
								id: "invoice",
								label: "Invoice",
								visible: true,
								disabled: true,
							},
							{
								id: "customer-legal-name",
								label: "Customer legal name",
								visible: true,
							},
							{
								id: "amount",
								label: "Transaction amount",
								visible: true,
								disabled: true,
							},
							{
								id: "collection-owner",
								label: "Collection workflow owner",
								visible: false,
							},
						]}
					/>
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
					"Menu checkbox items expose checked and disabled state. Keyboard operators open Columns, toggle Due date, and restore focus on Escape.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-xl gap-6">
			<StorySection title="Mixed visible, hidden, and required columns">
				<div className="flex justify-end rounded-lg border p-4">
					<InvoiceColumnMenu
						initialColumns={[
							{
								id: "invoice",
								label: "Invoice",
								visible: true,
								disabled: true,
							},
							{ id: "customer", label: "Customer", visible: true },
							{ id: "amount", label: "Amount", visible: true, disabled: true },
							{ id: "due", label: "Due date", visible: false },
							{ id: "owner", label: "Owner", visible: false },
						]}
					/>
				</div>
			</StorySection>

			<StorySection title="All optional columns already visible">
				<div className="flex justify-end rounded-lg border p-4">
					<InvoiceColumnMenu
						initialColumns={[
							{
								id: "invoice",
								label: "Invoice",
								visible: true,
								disabled: true,
							},
							{ id: "customer", label: "Customer", visible: true },
							{ id: "amount", label: "Amount", visible: true, disabled: true },
							{ id: "due", label: "Due date", visible: true },
							{ id: "owner", label: "Owner", visible: true },
						]}
					/>
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
					"Card owns the list surface. ColumnVisibilityMenu sits in the header toolbar. StatusBadge owns lifecycle — visibility never encodes approval state.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6 lg:grid-cols-2">
			<Card className="shadow-none">
				<CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
					<div className="grid gap-1">
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant="outline">Receivables</Badge>
							<StatusBadge
								size="sm"
								status="pending"
								label="Close in progress"
							/>
						</div>
						<CardTitle>Priority invoices</CardTitle>
						<CardDescription>INV queue · finance-control</CardDescription>
					</div>
					<InvoiceColumnMenu />
				</CardHeader>
				<CardContent className="text-sm text-foreground-secondary">
					Operators densify Customer and Owner for review. Invoice identity and
					Amount remain required columns under feature policy.
				</CardContent>
			</Card>

			<Card className="shadow-none">
				<CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
					<div className="grid gap-1">
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant="secondary">Payables</Badge>
							<StatusBadge size="sm" status="active" label="Operational" />
						</div>
						<CardTitle>Supplier payment runs</CardTitle>
						<CardDescription>July remittance batch</CardDescription>
					</div>
					<InvoiceColumnMenu
						label="Visible fields"
						initialColumns={[
							{
								id: "run",
								label: "Payment run",
								visible: true,
								disabled: true,
							},
							{ id: "supplier", label: "Supplier", visible: true },
							{ id: "total", label: "Total", visible: true, disabled: true },
							{ id: "due", label: "Due date", visible: false },
							{ id: "bank", label: "Bank account", visible: true },
						]}
					/>
				</CardHeader>
				<CardContent className="text-sm text-foreground-secondary">
					Payment run and Total stay non-hideable. Due date remains optional
					density, not authorization.
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
					"ColumnVisibilityMenu densifies optional display. It is not authorization, lifecycle, or preference storage.",
			},
		},
	},
	render: () => (
		<div className="grid max-w-5xl gap-6 sm:grid-cols-2">
			<StorySection title="Do: keep identity columns non-hideable">
				<div className="flex justify-end rounded-lg border p-4">
					<InvoiceColumnMenu
						initialColumns={[
							{
								id: "invoice",
								label: "Invoice",
								visible: true,
								disabled: true,
							},
							{ id: "customer", label: "Customer", visible: true },
							{ id: "amount", label: "Amount", visible: true, disabled: true },
							{ id: "due", label: "Due date", visible: false },
						]}
					/>
				</div>
			</StorySection>

			<StorySection title="Do not: use hiding as authorization">
				<p className="text-sm text-foreground-secondary">
					Hiding Amount must never substitute for permission checks. Operators
					who lack field access must not receive values through another column
					or export path.
				</p>
			</StorySection>

			<StorySection title="Do: place the menu beside the controlled table">
				<div className="grid gap-3 rounded-lg border p-4">
					<div className="flex items-center justify-between gap-3">
						<p className="text-sm font-medium text-foreground">
							Open receivables
						</p>
						<InvoiceColumnMenu />
					</div>
					<p className="text-sm text-foreground-secondary">
						The trigger stays adjacent to the list it densifies so operators
						know which surface changes.
					</p>
				</div>
			</StorySection>

			<StorySection title="Do not: persist preferences inside the menu">
				<p className="text-sm text-foreground-secondary">
					Visibility persistence belongs to the owning view or SavedViewSelect
					policy. The reusable menu only emits controlled callbacks.
				</p>
			</StorySection>
		</div>
	),
};
