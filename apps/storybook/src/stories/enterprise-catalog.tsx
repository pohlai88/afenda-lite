import {
	Badge,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	EntityHeader,
	Label,
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
	StatusBadge,
	Stepper,
	StepperStep,
	Timeline,
	TimelineEntry,
	Toolbar,
	ToolbarGroup,
	ToolbarSeparator,
	TreeView,
} from "@afenda/ui-system";
import { CheckIcon, FileClockIcon, PlusIcon } from "lucide-react";
import { type ChangeEvent, type ReactNode, useCallback, useState } from "react";
import {
	contractEvidence,
	evidenceDescription,
	StorySection,
} from "./evidence";

/**
 * Storybook showcase keys still backed by this helper.
 * Each key maps to the owning ui-system metadata contract id.
 */
export const ENTERPRISE_SHOWCASE_CONTRACTS = {
	"master-detail": "ui.master-detail",
	"numeric-input": "ui.numeric-input",
	"page-header": "ui.page-header",
	resizable: "ui.resizable",
	"saved-view-select": "ui.saved-view-select",
	"search-field": "ui.search-field",
	stepper: "ui.stepper",
	timeline: "ui.timeline",
	toolbar: "ui.toolbar",
	"tree-view": "ui.tree-view",
} as const;

export type EnterpriseComponentKey = keyof typeof ENTERPRISE_SHOWCASE_CONTRACTS;

function ShowcaseFrame({
	component,
	children,
}: {
	component: EnterpriseComponentKey;
	children: ReactNode;
}) {
	const evidence = contractEvidence(ENTERPRISE_SHOWCASE_CONTRACTS[component]);

	return (
		<div className="grid w-full gap-4">
			<div className="grid gap-1 rounded-lg border bg-muted/30 px-4 py-3">
				<p className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
					Contract · {evidence.contractId}
				</p>
				<p className="text-foreground-secondary text-sm leading-5">
					{evidenceDescription(evidence)}
				</p>
			</div>
			{children}
		</div>
	);
}

function StoryGrid({ children }: { children: ReactNode }) {
	return <div className="grid gap-6 xl:grid-cols-2">{children}</div>;
}

function MasterDetailShowcase() {
	return (
		<Card className="shadow-none">
			<CardHeader>
				<div className="flex flex-wrap items-center gap-2">
					<Badge variant="outline">Receivables</Badge>
					<StatusBadge label="Operational" size="sm" status="active" />
				</div>
				<CardTitle>Invoice master-detail</CardTitle>
				<CardDescription>
					Primary list selects INV-1048 · secondary shows record facts
				</CardDescription>
			</CardHeader>
			<CardContent>
				<MasterDetail className="min-h-72 rounded-lg border">
					<MasterDetailPrimary>
						<div className="grid h-full gap-2 bg-muted/40 p-3">
							<p className="font-medium text-foreground text-sm">
								Open invoices
							</p>
							{[1048, 1049, 1050].map((id) => (
								<Button
									className="w-full justify-start"
									key={id}
									type="button"
									variant={id === 1048 ? "secondary" : "ghost"}
								>
									INV-{id}
								</Button>
							))}
						</div>
					</MasterDetailPrimary>
					<MasterDetailSecondary>
						<div className="grid h-full gap-3 p-5">
							<div className="flex flex-wrap items-center gap-2">
								<span className="font-mono text-foreground-tertiary text-sm">
									INV-1048
								</span>
								<StatusBadge
									label="Awaiting approval"
									size="sm"
									status="pending"
								/>
							</div>
							<h2 className="font-semibold text-xl tracking-tight">
								Northwind Trading Sdn. Bhd.
							</h2>
							<p className="text-foreground-secondary text-sm">
								MYR 18,420.00 · Due 15 Aug 2026 · Owner Aisha Rahman
							</p>
						</div>
					</MasterDetailSecondary>
				</MasterDetail>
			</CardContent>
		</Card>
	);
}

function NumericInputShowcase() {
	return (
		<StoryGrid>
			<StorySection title="Quantity and money">
				<div className="grid gap-4 rounded-lg border p-4">
					<div className="grid gap-2">
						<Label htmlFor="qty">Ordered quantity</Label>
						<QuantityInput
							aria-label="Quantity"
							defaultValue="120"
							id="qty"
							unit="units"
						/>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="amount">Invoice amount</Label>
						<MoneyInput
							aria-label="Amount"
							currency="MYR"
							defaultValue="18420.50"
							id="amount"
						/>
					</div>
				</div>
			</StorySection>
			<StorySection title="Rate, count, and invalid">
				<div className="grid gap-4 rounded-lg border p-4">
					<div className="grid gap-2">
						<Label htmlFor="tax">Tax rate</Label>
						<PercentInput aria-label="Tax rate" defaultValue="8" id="tax" />
					</div>
					<div className="grid gap-2">
						<Label htmlFor="lines">Line count</Label>
						<NumberInput aria-label="Number" defaultValue="42" id="lines" />
					</div>
					<div className="grid gap-2">
						<Label htmlFor="invalid-amount">Invalid amount</Label>
						<MoneyInput
							aria-invalid
							aria-label="Invalid amount"
							currency="MYR"
							defaultValue="-10"
							id="invalid-amount"
						/>
					</div>
				</div>
			</StorySection>
		</StoryGrid>
	);
}

function PageHeaderShowcase() {
	return (
		<div className="grid gap-8">
			<PageHeader aria-label="Collection page header" role="group">
				<div className="grid gap-2">
					<PageHeaderHeading>Accounts receivable</PageHeaderHeading>
					<PageHeaderDescription>
						Monitor invoices, allocations, and overdue balances across every
						legal entity in org-fragrant-lake.
					</PageHeaderDescription>
				</div>
				<PageHeaderActions>
					<Button type="button" variant="outline">
						Export
					</Button>
					<Button type="button">
						<PlusIcon aria-hidden="true" />
						New invoice
					</Button>
				</PageHeaderActions>
			</PageHeader>
			<EntityHeader
				actions={
					<Button type="button" variant="outline">
						More actions
					</Button>
				}
				aria-label="Invoice entity header"
				description="Northwind Trading Sdn. Bhd."
				role="group"
				status={
					<StatusBadge label="Awaiting approval" size="sm" status="pending" />
				}
				title="INV-1048"
			/>
		</div>
	);
}

function ResizableShowcase() {
	return (
		<StoryGrid>
			<StorySection title="Invoice list · detail">
				<ResizablePanelGroup
					className="h-64 rounded-lg border"
					orientation="horizontal"
				>
					<ResizablePanel defaultSize="35%">
						<div className="flex h-full flex-col justify-center gap-2 bg-muted/40 p-4">
							<p className="font-medium text-sm">Open invoices</p>
							<p className="text-foreground-secondary text-sm">Master pane</p>
						</div>
					</ResizablePanel>
					<ResizableHandle withHandle />
					<ResizablePanel defaultSize="65%">
						<div className="flex h-full flex-col justify-center gap-2 p-4">
							<p className="font-medium text-sm">INV-1048</p>
							<p className="text-foreground-secondary text-sm">
								Detail pane · Northwind Trading
							</p>
						</div>
					</ResizablePanel>
				</ResizablePanelGroup>
			</StorySection>
			<StorySection title="Document preview · evidence">
				<ResizablePanelGroup
					className="h-64 rounded-lg border"
					orientation="vertical"
				>
					<ResizablePanel defaultSize="55%">
						<div className="flex h-full flex-col justify-center gap-2 p-4">
							<p className="font-medium text-sm">Document preview</p>
							<p className="text-foreground-secondary text-sm">
								invoice-1048.pdf
							</p>
						</div>
					</ResizablePanel>
					<ResizableHandle withHandle />
					<ResizablePanel defaultSize="45%">
						<div className="flex h-full flex-col justify-center gap-2 bg-muted/40 p-4">
							<p className="font-medium text-sm">Evidence notes</p>
							<p className="text-foreground-secondary text-sm">
								Bank letter matched remittance account
							</p>
						</div>
					</ResizablePanel>
				</ResizablePanelGroup>
			</StorySection>
		</StoryGrid>
	);
}

function SavedViewShowcase() {
	const [value, setValue] = useState("overdue");
	const views = [
		{ id: "overdue", label: "Overdue invoices" },
		{ id: "mine", label: "Owned by me" },
		{ id: "archived", label: "Archived", disabled: true },
	];

	return (
		<StoryGrid>
			<StorySection title="Active saved view">
				<div className="rounded-lg border p-4">
					<SavedViewSelect
						onValueChange={setValue}
						value={value}
						views={views}
					/>
				</div>
			</StorySection>
			<StorySection title="Placeholder and disabled">
				<div className="grid gap-4 rounded-lg border p-4">
					<SavedViewSelect
						onValueChange={setValue}
						placeholder="Choose a saved view"
						views={views}
					/>
					<SavedViewSelect
						disabled
						onValueChange={setValue}
						value="overdue"
						views={views}
					/>
				</div>
			</StorySection>
		</StoryGrid>
	);
}

function SearchFieldShowcase() {
	const [value, setValue] = useState("Northwind");
	const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
		setValue(event.target.value);
	}, []);
	const handleClear = useCallback(() => setValue(""), []);

	return (
		<Card className="shadow-none">
			<CardHeader>
				<CardTitle>Supplier directory search</CardTitle>
				<CardDescription>
					Controlled query for the preferred-supplier collection
				</CardDescription>
			</CardHeader>
			<CardContent className="grid gap-4">
				<div className="grid gap-2">
					<Label htmlFor="supplier-search">Suppliers</Label>
					<SearchField
						aria-label="Search suppliers"
						id="supplier-search"
						onChange={handleChange}
						onClear={handleClear}
						placeholder="Search suppliers"
						value={value}
					/>
				</div>
				<SearchField aria-label="Empty search" placeholder="Empty search" />
				<SearchField
					aria-label="Read-only search"
					readOnly
					value="Locked query"
				/>
			</CardContent>
		</Card>
	);
}

function StepperShowcase() {
	return (
		<Card className="shadow-none">
			<CardHeader>
				<div className="flex flex-wrap items-center gap-2">
					<Badge variant="outline">Invoice workflow</Badge>
					<StatusBadge label="In approval" size="sm" status="pending" />
				</div>
				<CardTitle>INV-1048 posting path</CardTitle>
				<CardDescription>
					Stepper shows workflow stage — not StatusBadge lifecycle authority
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Stepper>
					<StepperStep
						description="Created 26 Jul"
						status="complete"
						title="Draft"
					/>
					<StepperStep
						description="All checks passed"
						status="complete"
						title="Validated"
					/>
					<StepperStep
						description="Finance review"
						status="current"
						title="Approval"
					/>
					<StepperStep
						description="Period is locked"
						status="error"
						title="Posting"
					/>
					<StepperStep status="upcoming" title="Settlement" />
				</Stepper>
			</CardContent>
		</Card>
	);
}

function TimelineShowcase() {
	return (
		<Card className="shadow-none">
			<CardHeader>
				<CardTitle>INV-1048 audit timeline</CardTitle>
				<CardDescription>
					Chronological operator events for finance-control review
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Timeline>
					<TimelineEntry
						description="Aisha Rahman approved INV-1048 for posting."
						icon={<CheckIcon className="size-3" />}
						timestamp="09:42"
						title="Invoice approved"
					/>
					<TimelineEntry
						description="invoice-1048.pdf was added to the record."
						icon={<FileClockIcon className="size-3" />}
						timestamp="09:18"
						title="Evidence attached"
					/>
					<TimelineEntry
						description="Created from purchase order PO-8841 with a deliberately longer audit description that remains readable on narrow screens."
						timestamp="Yesterday"
						title="Draft created"
					/>
				</Timeline>
			</CardContent>
		</Card>
	);
}

function ToolbarShowcase() {
	return (
		<Card className="shadow-none">
			<CardHeader>
				<div className="flex flex-wrap items-center gap-2">
					<Badge variant="outline">Invoice</Badge>
					<StatusBadge label="Awaiting approval" size="sm" status="pending" />
				</div>
				<CardTitle>INV-1048 action toolbar</CardTitle>
				<CardDescription>
					Secondary tools stay in the toolbar · Approve remains primary
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Toolbar aria-label="Invoice actions">
					<ToolbarGroup>
						<Button size="sm" type="button" variant="ghost">
							Edit
						</Button>
						<Button size="sm" type="button" variant="ghost">
							Duplicate
						</Button>
						<ToolbarSeparator />
						<Button size="sm" type="button" variant="ghost">
							Archive
						</Button>
					</ToolbarGroup>
					<ToolbarGroup>
						<Button size="sm" type="button" variant="outline">
							Export
						</Button>
						<Button size="sm" type="button">
							Approve
						</Button>
					</ToolbarGroup>
				</Toolbar>
			</CardContent>
		</Card>
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
	const [selectedId, setSelectedId] = useState("receivables");
	const handleSelect = useCallback(
		(node: { id: string }) => setSelectedId(node.id),
		[],
	);

	return (
		<Card className="shadow-none">
			<CardHeader>
				<CardTitle>Module navigation tree</CardTitle>
				<CardDescription>
					Expand Finance to reach Receivables and Payables destinations
				</CardDescription>
			</CardHeader>
			<CardContent>
				<TreeView
					nodes={nodes}
					onSelect={handleSelect}
					selectedId={selectedId}
				/>
			</CardContent>
		</Card>
	);
}

const ENTERPRISE_SHOWCASES = {
	"master-detail": MasterDetailShowcase,
	"numeric-input": NumericInputShowcase,
	"page-header": PageHeaderShowcase,
	resizable: ResizableShowcase,
	"saved-view-select": SavedViewShowcase,
	"search-field": SearchFieldShowcase,
	stepper: StepperShowcase,
	timeline: TimelineShowcase,
	toolbar: ToolbarShowcase,
	"tree-view": TreeViewShowcase,
} satisfies Record<EnterpriseComponentKey, () => ReactNode>;

export function EnterpriseComponentShowcase({
	component,
}: {
	component: EnterpriseComponentKey;
}) {
	const Showcase = ENTERPRISE_SHOWCASES[component];

	return (
		<ShowcaseFrame component={component}>
			<Showcase />
		</ShowcaseFrame>
	);
}
