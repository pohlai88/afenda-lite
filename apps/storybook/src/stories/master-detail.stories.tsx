import {
	Badge,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
	Empty,
	MasterDetail,
	MasterDetailPrimary,
	MasterDetailSecondary,
	StatusBadge,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { InboxIcon, ShieldAlertIcon } from "lucide-react";
import { useState } from "react";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";

const evidence = contractEvidence("ui.master-detail");

const meta = {
	title: "UI System/Master Detail",
	component: MasterDetail,
	tags: ["autodocs", "test"],
	parameters: {
		...contractDocsParameters(evidence, "Master Detail"),
	},
} satisfies Meta<typeof MasterDetail>;

export default meta;
type Story = StoryObj<typeof meta>;

type InvoiceRow = {
	id: string;
	customer: string;
	amount: string;
	due: string;
	owner: string;
	status: "pending" | "active";
	statusLabel: string;
};

const OPEN_INVOICES: InvoiceRow[] = [
	{
		id: "INV-1048",
		customer: "Northwind Trading Sdn. Bhd.",
		amount: "MYR 18,420.00",
		due: "15 Aug 2026",
		owner: "Aisha Rahman",
		status: "pending",
		statusLabel: "Awaiting approval",
	},
	{
		id: "INV-1049",
		customer: "Contoso Logistics",
		amount: "MYR 6,280.00",
		due: "22 Aug 2026",
		owner: "Mei Ling",
		status: "active",
		statusLabel: "Open",
	},
	{
		id: "INV-1050",
		customer: "Fabrikam Retail",
		amount: "MYR 2,150.00",
		due: "01 Sep 2026",
		owner: "Aisha Rahman",
		status: "pending",
		statusLabel: "Awaiting approval",
	},
];

function InvoiceWorkbench({
	initialId = "INV-1048",
}: {
	initialId?: string | null;
}) {
	const [selectedId, setSelectedId] = useState<string | null>(initialId);
	const selected =
		OPEN_INVOICES.find((invoice) => invoice.id === selectedId) ?? null;

	return (
		<MasterDetail className="min-h-80" aria-label="Invoice master and detail">
			<MasterDetailPrimary aria-label="Open invoices">
				<div className="grid h-full gap-2 bg-muted/40 p-3">
					<p className="text-sm font-medium text-foreground">Open invoices</p>
					{OPEN_INVOICES.map((invoice) => (
						<Button
							key={invoice.id}
							type="button"
							className="w-full justify-start"
							variant={invoice.id === selectedId ? "secondary" : "ghost"}
							aria-current={invoice.id === selectedId ? "true" : undefined}
							onClick={() => setSelectedId(invoice.id)}
						>
							{invoice.id}
						</Button>
					))}
				</div>
			</MasterDetailPrimary>
			<MasterDetailSecondary aria-label="Invoice detail">
				{selected ? (
					<div className="grid h-full content-start gap-4 p-5">
						<div className="flex flex-wrap items-center gap-2">
							<span className="font-mono text-sm text-foreground-tertiary">
								{selected.id}
							</span>
							<StatusBadge
								size="sm"
								status={selected.status}
								label={selected.statusLabel}
							/>
						</div>
						<h2 className="text-xl font-semibold tracking-tight">
							{selected.customer}
						</h2>
						<p className="text-sm text-foreground-secondary">
							{selected.amount} · Due {selected.due} · Owner {selected.owner}
						</p>
						<div className="flex flex-wrap gap-2 pt-2">
							<Button type="button" variant="outline">
								Open audit trail
							</Button>
							<Button type="button">Approve</Button>
						</div>
					</div>
				) : (
					<div className="grid h-full place-items-center p-5">
						<Empty
							size="sm"
							icon={<InboxIcon className="size-6" />}
							title="No invoice selected"
							description="Choose an invoice from the list to inspect amounts, due date, and approval actions."
						/>
					</div>
				)}
			</MasterDetailSecondary>
		</MasterDetail>
	);
}

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"Receivables workbench: master list selects INV-1048 while the detail pane shows subject facts and Approve. MasterDetail owns layout — StatusBadge owns lifecycle.",
			},
		},
	},
	render: () => (
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
						MasterDetail keeps the collection and the selected invoice on one
						surface. Selection identity and authorization stay in feature code.
					</p>
				</header>

				<Card className="shadow-none">
					<CardHeader>
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant="outline">Receivables</Badge>
							<StatusBadge size="sm" status="active" label="Operational" />
						</div>
						<CardTitle>Open invoices</CardTitle>
						<CardDescription>
							org-fragrant-lake · July collection queue · INV-1048 selected
						</CardDescription>
					</CardHeader>
					<CardContent>
						<InvoiceWorkbench />
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
					"Primary holds the selectable collection; secondary holds the subject. Use stable ids (INV-*) — never row position — as selection authority.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6">
			<StorySection title="List → subject inspection">
				<div className="rounded-lg border">
					<InvoiceWorkbench initialId="INV-1049" />
				</div>
			</StorySection>

			<StorySection title="Supplier master beside remittance facts">
				<MasterDetail
					className="min-h-72"
					aria-label="Supplier master and detail"
				>
					<MasterDetailPrimary aria-label="Suppliers">
						<div className="grid h-full gap-2 bg-muted/40 p-3">
							<p className="text-sm font-medium text-foreground">Suppliers</p>
							{["SUP-0142", "SUP-0201", "SUP-0310"].map((id, index) => (
								<Button
									key={id}
									type="button"
									className="w-full justify-start"
									variant={index === 0 ? "secondary" : "ghost"}
								>
									{id}
								</Button>
							))}
						</div>
					</MasterDetailPrimary>
					<MasterDetailSecondary aria-label="Supplier detail">
						<div className="grid h-full content-start gap-3 p-5">
							<div className="flex flex-wrap items-center gap-2">
								<span className="font-mono text-sm text-foreground-tertiary">
									SUP-0142
								</span>
								<StatusBadge size="sm" status="active" label="Preferred" />
							</div>
							<h2 className="text-xl font-semibold tracking-tight">
								Northwind Trading Sdn. Bhd.
							</h2>
							<p className="text-sm text-foreground-secondary">
								MYR settlement · Maybank · remittance advice enabled
							</p>
						</div>
					</MasterDetailSecondary>
				</MasterDetail>
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
					"No selection and permission-limited detail must be explicit. Region labels keep master and detail distinguishable for assistive tech.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6">
			<StorySection title="No selection — empty detail">
				<div className="rounded-lg border">
					<InvoiceWorkbench initialId={null} />
				</div>
			</StorySection>

			<StorySection title="Permission-limited detail">
				<MasterDetail
					className="min-h-72"
					aria-label="Restricted invoice master and detail"
				>
					<MasterDetailPrimary aria-label="Open invoices">
						<div className="grid h-full gap-2 bg-muted/40 p-3">
							<p className="text-sm font-medium text-foreground">
								Open invoices
							</p>
							<Button
								type="button"
								className="w-full justify-start"
								variant="secondary"
							>
								INV-1048
							</Button>
						</div>
					</MasterDetailPrimary>
					<MasterDetailSecondary aria-label="Invoice detail unavailable">
						<div className="grid h-full place-items-center p-5">
							<Empty
								size="sm"
								icon={<ShieldAlertIcon className="size-6" />}
								title="Invoice detail restricted"
								description="Your role cannot read invoice INV-1048 in this organization. Ask finance-control for access — do not keep stale detail visible."
							/>
						</div>
					</MasterDetailSecondary>
				</MasterDetail>
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
					"Card owns the workspace chrome. MasterDetail fills the content region. StatusBadge on the selected subject owns lifecycle — not list row styling alone.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6">
			<Card className="shadow-none">
				<CardHeader>
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="outline">Receivables</Badge>
						<StatusBadge size="sm" status="active" label="Operational" />
					</div>
					<CardTitle>Invoice master-detail</CardTitle>
					<CardDescription>
						Primary list · secondary subject · Approve stays in detail
					</CardDescription>
				</CardHeader>
				<CardContent>
					<InvoiceWorkbench />
				</CardContent>
				<CardFooter className="justify-end gap-2 border-t">
					<Button type="button" variant="outline">
						Export list
					</Button>
					<Button type="button">Create invoice</Button>
				</CardFooter>
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
					"MasterDetail is list→subject inspection. It is not two unrelated peer panels, and selection styling is not StatusBadge authority.",
			},
		},
	},
	render: () => (
		<div className="grid max-w-5xl gap-6 sm:grid-cols-2">
			<StorySection title="Do: stable id selection + StatusBadge">
				<div className="rounded-lg border p-3">
					<div className="flex flex-wrap items-center gap-2">
						<span className="font-mono text-sm">INV-1048</span>
						<StatusBadge size="sm" status="pending" label="Awaiting approval" />
					</div>
					<p className="mt-2 text-sm text-foreground-secondary">
						Selection keyed by invoice id. Lifecycle comes from StatusBadge, not
						from which list row looks active.
					</p>
				</div>
			</StorySection>

			<StorySection title="Do not: treat row highlight as lifecycle">
				<p className="text-sm text-foreground-secondary">
					A secondary list-row style means “selected in this session,” not
					Approved or Posted. Use StatusBadge for authoritative state.
				</p>
			</StorySection>

			<StorySection title="Do: primary actions in the detail pane">
				<div className="flex flex-wrap gap-2 rounded-lg border p-3">
					<Button type="button" variant="outline" size="sm">
						Open audit trail
					</Button>
					<Button type="button" size="sm">
						Approve
					</Button>
				</div>
			</StorySection>

			<StorySection title="Do not: use MasterDetail for unrelated peers">
				<p className="text-sm text-foreground-secondary">
					Two side-by-side dashboards with no list→subject relationship should
					use Resizable (or separate Cards), not MasterDetail. MasterDetail
					implies a selectable collection and its current subject.
				</p>
			</StorySection>
		</div>
	),
};
