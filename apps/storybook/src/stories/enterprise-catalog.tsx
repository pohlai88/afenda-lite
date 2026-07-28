import {
	AsyncState,
	AttachmentList,
	Badge,
	BulkActionBar,
	Button,
	ChangeDiff,
	ChangeDiffRow,
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
	ColumnVisibilityMenu,
	DateTimePicker,
	EntityHeader,
	FileUpload,
	FilterBar,
	FilterBarActions,
	FilterBarGroup,
	Input,
	MasterDetail,
	MasterDetailPrimary,
	MasterDetailSecondary,
	MoneyInput,
	NumberInput,
	PageHeader,
	PageHeaderActions,
	PageHeaderDescription,
	PageHeaderHeading,
	PercentInput,
	QuantityInput,
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
	SavedViewSelect,
	SearchField,
	Stepper,
	StepperStep,
	Timeline,
	TimelineEntry,
	Toolbar,
	ToolbarGroup,
	ToolbarSeparator,
	TreeView,
	type UiAttachment,
} from "@afenda/ui-system";
import { CheckIcon, FileClockIcon, PlusIcon, Trash2Icon } from "lucide-react";
import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

export type EnterpriseComponentKey =
	| "async-state"
	| "bulk-action-bar"
	| "change-diff"
	| "chart"
	| "column-visibility-menu"
	| "date-time-picker"
	| "file-upload"
	| "filter-bar"
	| "master-detail"
	| "numeric-input"
	| "page-header"
	| "resizable"
	| "saved-view-select"
	| "search-field"
	| "stepper"
	| "timeline"
	| "toolbar"
	| "tree-view";

const box = "rounded-lg border bg-card p-4 text-card-foreground";

function StoryGrid({ children }: { children: React.ReactNode }) {
	return <div className="grid gap-6 xl:grid-cols-2">{children}</div>;
}

function Example({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<section className="space-y-3">
			<h2 className="text-sm font-semibold text-muted-foreground">{label}</h2>
			{children}
		</section>
	);
}

function AsyncStateShowcase() {
	return (
		<StoryGrid>
			<Example label="Loading">
				<div className={box}>
					<AsyncState state="loading" label="Loading invoices" />
				</div>
			</Example>
			<Example label="Empty">
				<AsyncState
					state="empty"
					title="No invoices"
					description="Create the first invoice for this customer."
					action={<Button size="sm">Create invoice</Button>}
				/>
			</Example>
			<Example label="Filtered empty">
				<AsyncState
					state="filtered-empty"
					title="No matching invoices"
					description="Clear filters to see all records."
					action={
						<Button size="sm" variant="outline">
							Clear filters
						</Button>
					}
				/>
			</Example>
			<Example label="Error">
				<AsyncState
					state="error"
					title="Invoices unavailable"
					description="The ledger service did not respond."
					action={
						<Button size="sm" variant="destructive">
							Retry
						</Button>
					}
				/>
			</Example>
			<Example label="Ready">
				<AsyncState state="ready">
					<div className={box}>Invoice INV-1048 is ready for review.</div>
				</AsyncState>
			</Example>
		</StoryGrid>
	);
}

function BulkActionBarShowcase() {
	return (
		<div className="space-y-6">
			<Example label="Populated selection">
				<BulkActionBar
					selectedCount={3}
					aria-label="3 selected bulk actions"
					actions={
						<>
							<Button size="sm" variant="outline">
								Export
							</Button>
							<Button size="sm" variant="destructive">
								<Trash2Icon />
								Delete
							</Button>
						</>
					}
				/>
			</Example>
			<Example label="Long responsive actions">
				<BulkActionBar
					selectedCount={128}
					aria-label="128 selected bulk actions"
					selectionLabel={(count) =>
						`${count} supplier records selected across the current filtered result`
					}
					actions={
						<>
							<Button size="sm" variant="outline">
								Assign owner
							</Button>
							<Button size="sm">Approve selected records</Button>
						</>
					}
				/>
			</Example>
			<p className="text-sm text-muted-foreground">
				The bar is intentionally absent when the selected count is zero.
			</p>
		</div>
	);
}

function ChangeDiffShowcase() {
	return (
		<ChangeDiff>
			<ChangeDiffRow
				label="Supplier name"
				before="Northwind Trading"
				after="Northwind Trading Sdn. Bhd."
			/>
			<ChangeDiffRow
				label="Payment terms"
				before="Net 30"
				after="Net 30"
				changed={false}
			/>
			<ChangeDiffRow
				label="Internal note with long content"
				before="Use the legacy remittance address until the banking verification has completed."
				after="Banking verification complete. Use the registered Kuala Lumpur remittance address for all future settlements."
			/>
		</ChangeDiff>
	);
}

const chartData = [
	{ month: "Jan", invoiced: 186, paid: 120 },
	{ month: "Feb", invoiced: 305, paid: 248 },
	{ month: "Mar", invoiced: 237, paid: 201 },
	{ month: "Apr", invoiced: 273, paid: 265 },
];

function ChartShowcase() {
	return (
		<div className={box}>
			<div className="mb-4">
				<h2 className="font-semibold">Receivables by month</h2>
				<p className="text-sm text-muted-foreground">
					Invoiced and paid amounts, MYR thousands
				</p>
			</div>
			<ChartContainer
				className="h-72 w-full"
				config={{
					invoiced: { label: "Invoiced", color: "var(--chart-1)" },
					paid: { label: "Paid", color: "var(--chart-2)" },
				}}
			>
				<BarChart accessibilityLayer data={chartData}>
					<CartesianGrid vertical={false} />
					<XAxis dataKey="month" tickLine={false} axisLine={false} />
					<ChartTooltip content={<ChartTooltipContent />} />
					<ChartLegend content={<ChartLegendContent />} />
					<Bar dataKey="invoiced" fill="var(--color-invoiced)" radius={4} />
					<Bar dataKey="paid" fill="var(--color-paid)" radius={4} />
				</BarChart>
			</ChartContainer>
		</div>
	);
}

function ColumnVisibilityShowcase() {
	const [columns, setColumns] = React.useState([
		{ id: "invoice", label: "Invoice", visible: true },
		{ id: "customer", label: "Customer", visible: true },
		{ id: "amount", label: "Amount", visible: true, disabled: true },
		{ id: "due", label: "Due date", visible: false },
	]);
	return (
		<div className="flex justify-end rounded-lg border p-4">
			<ColumnVisibilityMenu
				columns={columns}
				onVisibilityChange={(id, visible) =>
					setColumns((current) =>
						current.map((column) =>
							column.id === id ? { ...column, visible } : column,
						),
					)
				}
			/>
		</div>
	);
}

function DateTimePickerShowcase() {
	return (
		<StoryGrid>
			<DateTimePicker
				label="Posting date"
				description="Dates use the organization time zone."
				defaultValue="2026-07-28T09:30"
			/>
			<DateTimePicker
				label="Approval deadline"
				defaultValue="2026-07-20T17:00"
				error="Deadline must be in the future."
				aria-invalid
			/>
			<DateTimePicker
				label="Locked period"
				defaultValue="2026-06-30T23:59"
				disabled
			/>
		</StoryGrid>
	);
}

function FileUploadShowcase() {
	const [attachments, setAttachments] = React.useState<UiAttachment[]>([
		{ id: "invoice", name: "invoice-1048.pdf", size: 248320, href: "#invoice" },
	]);
	return (
		<StoryGrid>
			<FileUpload
				label="Supporting documents"
				description="PDF, PNG, or XLSX up to 10 MB"
				accept=".pdf,.png,.xlsx"
				multiple
				onFilesSelected={(files) =>
					setAttachments((current) => [
						...current,
						...files.map((file, index) => ({
							id: `${file.name}-${index}`,
							name: file.name,
							size: file.size,
						})),
					])
				}
			/>
			<AttachmentList
				attachments={attachments}
				onRemove={(id) =>
					setAttachments((current) =>
						current.filter((attachment) => attachment.id !== id),
					)
				}
			/>
		</StoryGrid>
	);
}

function FilterBarShowcase() {
	return (
		<FilterBar>
			<FilterBarGroup>
				<label
					htmlFor="supplier-filter"
					className="grid min-w-44 gap-1 text-sm font-medium"
				>
					Supplier
					<Input id="supplier-filter" placeholder="Search suppliers" />
				</label>
				<label
					htmlFor="status-filter"
					className="grid min-w-36 gap-1 text-sm font-medium"
				>
					Status
					<Input id="status-filter" value="Open" readOnly />
				</label>
			</FilterBarGroup>
			<FilterBarActions>
				<Button variant="ghost">Reset</Button>
				<Button>Apply filters</Button>
			</FilterBarActions>
		</FilterBar>
	);
}

function MasterDetailShowcase() {
	return (
		<MasterDetail>
			<MasterDetailPrimary>
				<div className="h-full space-y-2 bg-muted/40 p-3">
					<h2 className="font-semibold">Invoices</h2>
					{[1048, 1049, 1050].map((id) => (
						<Button
							key={id}
							className="w-full justify-start"
							variant={id === 1048 ? "secondary" : "ghost"}
						>
							INV-{id}
						</Button>
					))}
				</div>
			</MasterDetailPrimary>
			<MasterDetailSecondary>
				<div className="h-full p-5">
					<Badge>Approved</Badge>
					<h2 className="mt-3 text-xl font-semibold">INV-1048</h2>
					<p className="mt-1 text-sm text-muted-foreground">
						Northwind Trading · MYR 18,420.00
					</p>
				</div>
			</MasterDetailSecondary>
		</MasterDetail>
	);
}

function NumericInputShowcase() {
	return (
		<StoryGrid>
			<Example label="Number">
				<NumberInput defaultValue="42" aria-label="Number" />
			</Example>
			<Example label="Money">
				<MoneyInput
					currency="MYR"
					defaultValue="18420.50"
					aria-label="Amount"
				/>
			</Example>
			<Example label="Quantity">
				<QuantityInput unit="units" defaultValue="120" aria-label="Quantity" />
			</Example>
			<Example label="Percent">
				<PercentInput defaultValue="8" aria-label="Tax rate" />
			</Example>
			<Example label="Invalid">
				<MoneyInput
					currency="MYR"
					defaultValue="-10"
					aria-label="Invalid amount"
					aria-invalid
				/>
			</Example>
			<Example label="Disabled">
				<QuantityInput
					unit="units"
					defaultValue="25"
					aria-label="Locked quantity"
					disabled
				/>
			</Example>
		</StoryGrid>
	);
}

function PageHeaderShowcase() {
	return (
		<div className="space-y-10">
			<PageHeader role="group" aria-label="Collection page header">
				<div>
					<PageHeaderHeading>Accounts receivable</PageHeaderHeading>
					<PageHeaderDescription>
						Monitor invoices, allocations, and overdue balances across every
						legal entity.
					</PageHeaderDescription>
				</div>
				<PageHeaderActions>
					<Button variant="outline">Export</Button>
					<Button>
						<PlusIcon />
						New invoice
					</Button>
				</PageHeaderActions>
			</PageHeader>
			<EntityHeader
				role="group"
				aria-label="Invoice entity header"
				title="INV-1048"
				status={<Badge>Approved</Badge>}
				description="Northwind Trading Sdn. Bhd."
				metadata={
					<>
						<span>MYR 18,420.00</span>
						<span>Due 15 Aug 2026</span>
						<span>Owner Aisha Rahman</span>
					</>
				}
				actions={<Button variant="outline">More actions</Button>}
			/>
		</div>
	);
}

function ResizableShowcase() {
	return (
		<StoryGrid>
			<Example label="Horizontal">
				<ResizablePanelGroup
					orientation="horizontal"
					className="h-64 rounded-lg border"
				>
					<ResizablePanel defaultSize="35%">
						<div className="flex h-full items-center justify-center bg-muted/40">
							<Button variant="ghost">Master</Button>
						</div>
					</ResizablePanel>
					<ResizableHandle withHandle />
					<ResizablePanel defaultSize="65%">
						<div className="flex h-full items-center justify-center">
							<Button variant="ghost">Detail</Button>
						</div>
					</ResizablePanel>
				</ResizablePanelGroup>
			</Example>
			<Example label="Vertical">
				<ResizablePanelGroup
					orientation="vertical"
					className="h-64 rounded-lg border"
				>
					<ResizablePanel defaultSize="55%">
						<div className="flex h-full items-center justify-center">
							<Button variant="ghost">Preview</Button>
						</div>
					</ResizablePanel>
					<ResizableHandle withHandle />
					<ResizablePanel defaultSize="45%">
						<div className="flex h-full items-center justify-center bg-muted/40">
							<Button variant="ghost">Evidence</Button>
						</div>
					</ResizablePanel>
				</ResizablePanelGroup>
			</Example>
		</StoryGrid>
	);
}

function SavedViewShowcase() {
	const [value, setValue] = React.useState("overdue");
	const views = [
		{ id: "overdue", label: "Overdue invoices" },
		{ id: "mine", label: "Owned by me" },
		{ id: "archived", label: "Archived", disabled: true },
	];
	return (
		<div className="flex flex-wrap gap-4">
			<SavedViewSelect value={value} views={views} onValueChange={setValue} />
			<SavedViewSelect
				views={views}
				onValueChange={setValue}
				placeholder="Choose a saved view"
			/>
			<SavedViewSelect
				value="overdue"
				views={views}
				onValueChange={setValue}
				disabled
			/>
		</div>
	);
}

function SearchFieldShowcase() {
	const [value, setValue] = React.useState("Northwind");
	return (
		<StoryGrid>
			<SearchField
				value={value}
				onChange={(event) => setValue(event.target.value)}
				onClear={() => setValue("")}
				aria-label="Search suppliers"
			/>
			<SearchField placeholder="Empty search" aria-label="Empty search" />
			<SearchField
				value="Locked query"
				readOnly
				aria-label="Read-only search"
			/>
		</StoryGrid>
	);
}

function StepperShowcase() {
	return (
		<Stepper>
			<StepperStep
				status="complete"
				title="Draft"
				description="Created 26 Jul"
			/>
			<StepperStep
				status="complete"
				title="Validated"
				description="All checks passed"
			/>
			<StepperStep
				status="current"
				title="Approval"
				description="Finance review"
			/>
			<StepperStep
				status="error"
				title="Posting"
				description="Period is locked"
			/>
			<StepperStep status="upcoming" title="Settlement" />
		</Stepper>
	);
}

function TimelineShowcase() {
	return (
		<Timeline>
			<TimelineEntry
				title="Invoice approved"
				timestamp="09:42"
				description="Aisha Rahman approved INV-1048."
				icon={<CheckIcon className="size-3" />}
			/>
			<TimelineEntry
				title="Evidence attached"
				timestamp="09:18"
				description="invoice-1048.pdf was added to the record."
				icon={<FileClockIcon className="size-3" />}
			/>
			<TimelineEntry
				title="Draft created"
				timestamp="Yesterday"
				description="Created from purchase order PO-8841 with a deliberately longer audit description that remains readable on narrow screens."
			/>
		</Timeline>
	);
}

function ToolbarShowcase() {
	return (
		<Toolbar aria-label="Invoice actions">
			<ToolbarGroup>
				<Button size="sm" variant="ghost">
					Edit
				</Button>
				<Button size="sm" variant="ghost">
					Duplicate
				</Button>
				<ToolbarSeparator />
				<Button size="sm" variant="ghost">
					Archive
				</Button>
			</ToolbarGroup>
			<ToolbarGroup>
				<Button size="sm" variant="outline">
					Export
				</Button>
				<Button size="sm">Approve</Button>
			</ToolbarGroup>
		</Toolbar>
	);
}

function TreeViewShowcase() {
	const nodes = [
		{
			id: "finance",
			label: "Finance",
			children: [
				{ id: "receivables", label: "Receivables" },
				{ id: "payables", label: "Payables" },
			],
		},
		{
			id: "operations",
			label: "Operations",
			children: [
				{ id: "inventory", label: "Inventory" },
				{ id: "receiving", label: "Receiving", disabled: true },
			],
		},
	];
	const [selectedId, setSelectedId] = React.useState("receivables");
	return (
		<TreeView
			nodes={nodes}
			selectedId={selectedId}
			onSelect={(node) => setSelectedId(node.id)}
		/>
	);
}

export function EnterpriseComponentShowcase({
	component,
}: {
	component: EnterpriseComponentKey;
}) {
	switch (component) {
		case "async-state":
			return <AsyncStateShowcase />;
		case "bulk-action-bar":
			return <BulkActionBarShowcase />;
		case "change-diff":
			return <ChangeDiffShowcase />;
		case "chart":
			return <ChartShowcase />;
		case "column-visibility-menu":
			return <ColumnVisibilityShowcase />;
		case "date-time-picker":
			return <DateTimePickerShowcase />;
		case "file-upload":
			return <FileUploadShowcase />;
		case "filter-bar":
			return <FilterBarShowcase />;
		case "master-detail":
			return <MasterDetailShowcase />;
		case "numeric-input":
			return <NumericInputShowcase />;
		case "page-header":
			return <PageHeaderShowcase />;
		case "resizable":
			return <ResizableShowcase />;
		case "saved-view-select":
			return <SavedViewShowcase />;
		case "search-field":
			return <SearchFieldShowcase />;
		case "stepper":
			return <StepperShowcase />;
		case "timeline":
			return <TimelineShowcase />;
		case "toolbar":
			return <ToolbarShowcase />;
		case "tree-view":
			return <TreeViewShowcase />;
	}
}
