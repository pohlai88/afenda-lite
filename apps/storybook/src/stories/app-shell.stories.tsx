import {
	AppShell,
	type AppShellProps,
	Button,
	DataTable,
	type DataTableColumn,
	MetricGrid,
	PageHeader,
	PageHeaderActions,
	PageHeaderDescription,
	PageHeaderHeading,
	StatusBadge,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
	BoxesIcon,
	Building2Icon,
	CircleDollarSignIcon,
	ClipboardCheckIcon,
	FileTextIcon,
	LandmarkIcon,
	LayoutDashboardIcon,
	PackageCheckIcon,
	ReceiptTextIcon,
	ShoppingCartIcon,
	TruckIcon,
} from "lucide-react";
import { type ReactNode, useCallback, useMemo, useState } from "react";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence } from "./evidence";

const evidence = contractEvidence("ui.app-shell");

function StoryLink({
	"aria-current": ariaCurrent,
	children,
	className,
	href,
	rel,
	target,
}: {
	children: ReactNode;
	className?: string;
	href: string;
	"aria-current"?: "page";
	rel?: string;
	target?: "_blank" | "_self";
}) {
	return (
		<a
			aria-current={ariaCurrent}
			className={className}
			href={href}
			rel={rel}
			target={target}
		>
			{children}
		</a>
	);
}

interface PaymentBatch {
	amount: string;
	batch: string;
	due: string;
	owner: string;
	status: "Approved" | "Exception" | "Pending" | "Processing";
	suppliers: number;
}

function getPaymentBatchRowId(row: PaymentBatch) {
	return row.batch;
}

const paymentBatches: PaymentBatch[] = [
	{
		batch: "PAY-2048",
		owner: "Aisha Rahman",
		suppliers: 18,
		amount: "MYR 284,320.00",
		due: "Today, 16:00",
		status: "Pending",
	},
	{
		batch: "PAY-2047",
		owner: "Daniel Wong",
		suppliers: 9,
		amount: "MYR 96,840.00",
		due: "Today, 18:00",
		status: "Exception",
	},
	{
		batch: "PAY-2046",
		owner: "Mei Lin Tan",
		suppliers: 24,
		amount: "MYR 412,905.00",
		due: "02 Aug 2026",
		status: "Processing",
	},
	{
		batch: "PAY-2045",
		owner: "Amir Hassan",
		suppliers: 12,
		amount: "MYR 153,760.00",
		due: "02 Aug 2026",
		status: "Approved",
	},
	{
		batch: "PAY-2044",
		owner: "Sofia Lim",
		suppliers: 31,
		amount: "MYR 628,110.00",
		due: "05 Aug 2026",
		status: "Pending",
	},
];

const statusDisposition = {
	Approved: "success",
	Exception: "error",
	Pending: "pending",
	Processing: "active",
} as const;

const columns: DataTableColumn<PaymentBatch>[] = [
	{ key: "batch", title: "Batch", sortable: true, width: "8rem" },
	{ key: "owner", title: "Owner", filterable: true },
	{
		key: "suppliers",
		title: "Suppliers",
		width: "7rem",
	},
	{ key: "amount", title: "Amount", width: "11rem" },
	{ key: "due", title: "Due", width: "9rem" },
	{
		key: "status",
		title: "Status",
		width: "8rem",
		render: (value) => {
			const status = value as PaymentBatch["status"];
			return (
				<StatusBadge
					label={status}
					size="sm"
					status={statusDisposition[status]}
				/>
			);
		},
	},
];

const shellProps = {
	header: {
		title: "Finance / Payment operations",
	},
	themeConfig: {
		brand: {
			name: "Afenda",
			homeHref: "/",
			subtitle: "Enterprise operations",
		},
		sidebar: { groupLabelStyle: "uppercase" },
	},
	navConfig: {
		currentPath: "/admin/payables/batches",
		linkComponent: StoryLink,
		sections: [
			{
				id: "workspace",
				label: "Workspace",
				items: [
					{
						kind: "link",
						id: "overview",
						label: "Overview",
						href: "/admin",
						icon: LayoutDashboardIcon,
					},
					{
						kind: "branch",
						id: "finance",
						label: "Finance",
						icon: LandmarkIcon,
						items: [
							{
								kind: "link",
								id: "payables",
								label: "Payment batches",
								href: "/admin/payables/batches",
								badge: "12",
							},
							{
								kind: "link",
								id: "receivables",
								label: "Receivables",
								href: "/admin/receivables",
							},
							{
								kind: "link",
								id: "accounting",
								label: "General ledger",
								href: "/admin/accounting",
							},
						],
					},
					{
						kind: "link",
						id: "sales",
						label: "Sales",
						href: "/admin/sales",
						icon: ShoppingCartIcon,
					},
					{
						kind: "link",
						id: "purchasing",
						label: "Purchasing",
						href: "/admin/purchasing",
						icon: ReceiptTextIcon,
					},
					{
						kind: "link",
						id: "inventory",
						label: "Inventory",
						href: "/admin/inventory",
						icon: BoxesIcon,
					},
				],
			},
			{
				id: "execution",
				label: "Execution",
				items: [
					{
						kind: "link",
						id: "receiving",
						label: "Receiving",
						href: "/admin/receiving",
						icon: PackageCheckIcon,
					},
					{
						kind: "link",
						id: "fulfillment",
						label: "Fulfillment",
						href: "/admin/fulfillment",
						icon: TruckIcon,
					},
					{
						kind: "link",
						id: "approvals",
						label: "Approvals",
						href: "/admin/approvals",
						icon: ClipboardCheckIcon,
						badge: "7",
					},
				],
			},
		],
	},
	showScrollToTop: false,
} satisfies Omit<AppShellProps, "children">;

function EnterpriseWorkbench() {
	const [ownerFilter, setOwnerFilter] = useState("");
	const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
	const [message, setMessage] = useState(
		"Live treasury position · 01 Aug 2026, 14:30 MYT",
	);
	const visibleBatches = useMemo(
		() =>
			paymentBatches.filter((batch) =>
				batch.owner.toLowerCase().includes(ownerFilter.toLowerCase()),
			),
		[ownerFilter],
	);
	const handleFilterChange = useCallback(
		(key: keyof PaymentBatch, value: string) => {
			if (key === "owner") {
				setOwnerFilter(value);
			}
		},
		[],
	);

	return (
		<AppShell
			{...shellProps}
			commandMenu={{
				groups: [
					{
						id: "finance",
						label: "Finance",
						commands: [
							{
								id: "new-batch",
								label: "Create payment batch",
								shortcut: "N",
							},
							{
								id: "open-exceptions",
								label: "Open payment exceptions",
							},
						],
					},
				],
				onCommand: (id) => setMessage(`Command selected: ${id}`),
			}}
			notifications={{
				notifications: [
					{
						id: "approval",
						category: "inbox",
						actor: { name: "Treasury control", initials: "TC" },
						title: "requested review of payment batch PAY-2048.",
						occurredAt: "12 minutes ago",
						read: false,
						detail: { kind: "decision" },
					},
				],
				onDecision: (id, decision) => setMessage(`${id}: ${decision}`),
			}}
			profile={{
				name: "Aisha Rahman",
				initials: "AR",
				actions: [
					{ id: "profile", label: "Profile" },
					{ id: "sign-out", label: "Sign out" },
				],
				onAction: (id) => setMessage(`Profile action: ${id}`),
			}}
		>
			<div className="grid gap-6">
				<PageHeader>
					<div className="grid gap-1">
						<PageHeaderHeading>Payment operations</PageHeaderHeading>
						<PageHeaderDescription>{message}</PageHeaderDescription>
					</div>
					<PageHeaderActions>
						<Button type="button" variant="outline">
							<FileTextIcon />
							Export report
						</Button>
						<Button type="button">
							<CircleDollarSignIcon />
							Create batch
						</Button>
					</PageHeaderActions>
				</PageHeader>

				<MetricGrid
					columns={4}
					metrics={[
						{
							title: "Cash available",
							value: "MYR 8.42M",
							change: "+MYR 420K",
							trend: "up",
							description: "since prior close",
						},
						{
							title: "Due today",
							value: "MYR 381K",
							description: "27 supplier invoices",
						},
						{
							title: "Pending approval",
							value: "MYR 913K",
							description: "12 payment batches",
						},
						{
							title: "Exceptions",
							value: "7",
							change: "2 fewer",
							trend: "down",
							description: "since yesterday",
						},
					]}
				/>

				<section aria-labelledby="payment-queue-title" className="grid gap-3">
					<div className="flex flex-wrap items-end justify-between gap-3">
						<div className="grid gap-1">
							<h2
								className="font-semibold text-lg tracking-tight"
								id="payment-queue-title"
							>
								Payment queue
							</h2>
							<p className="text-foreground-secondary text-sm">
								Priority batches awaiting treasury execution.
							</p>
						</div>
						<Button size="sm" type="button" variant="outline">
							Review exceptions
						</Button>
					</div>
					<DataTable
						columns={columns}
						data={visibleBatches}
						density="compact"
						filters={{ owner: ownerFilter }}
						getRowId={getPaymentBatchRowId}
						onFilterChange={handleFilterChange}
						onSelectionChange={setSelectedRows}
						selectable
						selectedRowIds={selectedRows}
					/>
				</section>
			</div>
		</AppShell>
	);
}

const meta = {
	title: "UI System/App Shell",
	component: AppShell,
	tags: ["autodocs", "test"],
	parameters: {
		layout: "fullscreen",
		...contractDocsParameters(evidence, "App Shell"),
	},
} satisfies Meta<typeof AppShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EnterpriseOperations: Story = {
	args: { children: null },
	render: () => <EnterpriseWorkbench />,
};
