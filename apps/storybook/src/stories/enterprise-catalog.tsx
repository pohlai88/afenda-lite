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
import * as React from "react";
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
	children: React.ReactNode;
}) {
	const evidence = contractEvidence(ENTERPRISE_SHOWCASE_CONTRACTS[component]);

	return (
		<div className="grid w-full gap-4">
			<div className="grid gap-1 rounded-lg border bg-muted/30 px-4 py-3">
				<p className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
					Contract · {evidence.contractId}
				</p>
				<p className="text-sm leading-5 text-foreground-secondary">
					{evidenceDescription(evidence)}
				</p>
			</div>
			{children}
		</div>
	);
}

function StoryGrid({ children }: { children: React.ReactNode }) {
	return <div className="grid gap-6 xl:grid-cols-2">{children}</div>;
}

function MasterDetailShowcase() {
	return (
		<Card className="shadow-none">
			<CardHeader>
				<div className="flex flex-wrap items-center gap-2">
					<Badge variant="outline">Receivables</Badge>
					<StatusBadge size="sm" status="active" label="Operational" />
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
							<p className="text-sm font-medium text-foreground">
								Open invoices
							</p>
							{[1048, 1049, 1050].map((id) => (
								<Button
									key={id}
									type="button"
									className="w-full justify-start"
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
								<span className="font-mono text-sm text-foreground-tertiary">
									INV-1048
								</span>
								<StatusBadge
									size="sm"
									status="pending"
									label="Awaiting approval"
								/>
							</div>
							<h2 className="text-xl font-semibold tracking-tight">
								Northwind Trading Sdn. Bhd.
							</h2>
							<p className="text-sm text-foreground-secondary">
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
							id="qty"
							unit="units"
							defaultValue="120"
							aria-label="Quantity"
						/>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="amount">Invoice amount</Label>
						<MoneyInput
							id="amount"
							currency="MYR"
							defaultValue="18420.50"
							aria-label="Amount"
						/>
					</div>
				</div>
			</StorySection>
			<StorySection title="Rate, count, and invalid">
				<div className="grid gap-4 rounded-lg border p-4">
					<div className="grid gap-2">
						<Label htmlFor="tax">Tax rate</Label>
						<PercentInput id="tax" defaultValue="8" aria-label="Tax rate" />
					</div>
					<div className="grid gap-2">
						<Label htmlFor="lines">Line count</Label>
						<NumberInput id="lines" defaultValue="42" aria-label="Number" />
					</div>
					<div className="grid gap-2">
						<Label htmlFor="invalid-amount">Invalid amount</Label>
						<MoneyInput
							id="invalid-amount"
							currency="MYR"
							defaultValue="-10"
							aria-label="Invalid amount"
							aria-invalid
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
			<PageHeader role="group" aria-label="Collection page header">
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
				role="group"
				aria-label="Invoice entity header"
				title="INV-1048"
				status={
					<StatusBadge size="sm" status="pending" label="Awaiting approval" />
				}
				description="Northwind Trading Sdn. Bhd."
				metadata={
					<>
						<span>MYR 18,420.00</span>
						<span>Due 15 Aug 2026</span>
						<span>Owner Aisha Rahman</span>
					</>
				}
				actions={
					<Button type="button" variant="outline">
						More actions
					</Button>
				}
			/>
		</div>
	);
}

function ResizableShowcase() {
	return (
		<StoryGrid>
			<StorySection title="Invoice list · detail">
				<ResizablePanelGroup
					orientation="horizontal"
					className="h-64 rounded-lg border"
				>
					<ResizablePanel defaultSize="35%">
						<div className="flex h-full flex-col justify-center gap-2 bg-muted/40 p-4">
							<p className="text-sm font-medium">Open invoices</p>
							<p className="text-sm text-foreground-secondary">Master pane</p>
						</div>
					</ResizablePanel>
					<ResizableHandle withHandle />
					<ResizablePanel defaultSize="65%">
						<div className="flex h-full flex-col justify-center gap-2 p-4">
							<p className="text-sm font-medium">INV-1048</p>
							<p className="text-sm text-foreground-secondary">
								Detail pane · Northwind Trading
							</p>
						</div>
					</ResizablePanel>
				</ResizablePanelGroup>
			</StorySection>
			<StorySection title="Document preview · evidence">
				<ResizablePanelGroup
					orientation="vertical"
					className="h-64 rounded-lg border"
				>
					<ResizablePanel defaultSize="55%">
						<div className="flex h-full flex-col justify-center gap-2 p-4">
							<p className="text-sm font-medium">Document preview</p>
							<p className="text-sm text-foreground-secondary">
								invoice-1048.pdf
							</p>
						</div>
					</ResizablePanel>
					<ResizableHandle withHandle />
					<ResizablePanel defaultSize="45%">
						<div className="flex h-full flex-col justify-center gap-2 bg-muted/40 p-4">
							<p className="text-sm font-medium">Evidence notes</p>
							<p className="text-sm text-foreground-secondary">
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
	const [value, setValue] = React.useState("overdue");
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
						value={value}
						views={views}
						onValueChange={setValue}
					/>
				</div>
			</StorySection>
			<StorySection title="Placeholder and disabled">
				<div className="grid gap-4 rounded-lg border p-4">
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
			</StorySection>
		</StoryGrid>
	);
}

function SearchFieldShowcase() {
	const [value, setValue] = React.useState("Northwind");

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
						id="supplier-search"
						value={value}
						onChange={(event) => setValue(event.target.value)}
						onClear={() => setValue("")}
						aria-label="Search suppliers"
						placeholder="Search suppliers"
					/>
				</div>
				<SearchField placeholder="Empty search" aria-label="Empty search" />
				<SearchField
					value="Locked query"
					readOnly
					aria-label="Read-only search"
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
					<StatusBadge size="sm" status="pending" label="In approval" />
				</div>
				<CardTitle>INV-1048 posting path</CardTitle>
				<CardDescription>
					Stepper shows workflow stage — not StatusBadge lifecycle authority
				</CardDescription>
			</CardHeader>
			<CardContent>
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
						title="Invoice approved"
						timestamp="09:42"
						description="Aisha Rahman approved INV-1048 for posting."
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
					<StatusBadge size="sm" status="pending" label="Awaiting approval" />
				</div>
				<CardTitle>INV-1048 action toolbar</CardTitle>
				<CardDescription>
					Secondary tools stay in the toolbar · Approve remains primary
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Toolbar aria-label="Invoice actions">
					<ToolbarGroup>
						<Button type="button" size="sm" variant="ghost">
							Edit
						</Button>
						<Button type="button" size="sm" variant="ghost">
							Duplicate
						</Button>
						<ToolbarSeparator />
						<Button type="button" size="sm" variant="ghost">
							Archive
						</Button>
					</ToolbarGroup>
					<ToolbarGroup>
						<Button type="button" size="sm" variant="outline">
							Export
						</Button>
						<Button type="button" size="sm">
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
	const [selectedId, setSelectedId] = React.useState("receivables");

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
					selectedId={selectedId}
					onSelect={(node) => setSelectedId(node.id)}
				/>
			</CardContent>
		</Card>
	);
}

export function EnterpriseComponentShowcase({
	component,
}: {
	component: EnterpriseComponentKey;
}) {
	let body: React.ReactNode;
	switch (component) {
		case "master-detail":
			body = <MasterDetailShowcase />;
			break;
		case "numeric-input":
			body = <NumericInputShowcase />;
			break;
		case "page-header":
			body = <PageHeaderShowcase />;
			break;
		case "resizable":
			body = <ResizableShowcase />;
			break;
		case "saved-view-select":
			body = <SavedViewShowcase />;
			break;
		case "search-field":
			body = <SearchFieldShowcase />;
			break;
		case "stepper":
			body = <StepperShowcase />;
			break;
		case "timeline":
			body = <TimelineShowcase />;
			break;
		case "toolbar":
			body = <ToolbarShowcase />;
			break;
		case "tree-view":
			body = <TreeViewShowcase />;
			break;
		default: {
			const _exhaustive: never = component;
			return _exhaustive;
		}
	}

	return <ShowcaseFrame component={component}>{body}</ShowcaseFrame>;
}
