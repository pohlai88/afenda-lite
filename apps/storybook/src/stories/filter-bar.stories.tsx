import {
	Badge,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	FilterBar,
	FilterBarActions,
	FilterBarGroup,
	Input,
	Label,
	SearchField,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	StatusBadge,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import * as React from "react";
import { expect, userEvent, within } from "storybook/test";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";

const evidence = contractEvidence("ui.filter-bar");

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

function InvoiceFilterBar({
	initialSupplier = "",
	initialStatus = "open",
	ariaLabel = "Invoice filters",
	idPrefix = "invoice",
}: {
	initialSupplier?: string;
	initialStatus?: string;
	ariaLabel?: string;
	idPrefix?: string;
}) {
	const [supplier, setSupplier] = React.useState(initialSupplier);
	const [status, setStatus] = React.useState(initialStatus);
	const [applied, setApplied] = React.useState(
		initialSupplier || initialStatus !== "open"
			? `Supplier ${initialSupplier || "any"} · ${initialStatus}`
			: "No filters applied",
	);
	const supplierId = `${idPrefix}-supplier-filter`;
	const statusId = `${idPrefix}-status-filter`;

	return (
		<div className="grid gap-3">
			<FilterBar aria-label={ariaLabel}>
				<FilterBarGroup>
					<div className="grid min-w-44 gap-1">
						<Label htmlFor={supplierId}>Supplier</Label>
						<SearchField
							id={supplierId}
							value={supplier}
							onChange={(event) => setSupplier(event.target.value)}
							onClear={() => setSupplier("")}
							placeholder="Search suppliers"
							aria-label="Search suppliers"
						/>
					</div>
					<div className="grid min-w-36 gap-1">
						<Label htmlFor={statusId}>Status</Label>
						<Select value={status} onValueChange={setStatus}>
							<SelectTrigger id={statusId} aria-label="Status">
								<SelectValue placeholder="Status" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="open">Open</SelectItem>
								<SelectItem value="pending">Pending approval</SelectItem>
								<SelectItem value="overdue">Overdue</SelectItem>
								<SelectItem value="posted">Posted</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</FilterBarGroup>
				<FilterBarActions>
					<Button
						type="button"
						variant="ghost"
						onClick={() => {
							setSupplier("");
							setStatus("open");
							setApplied("No filters applied");
						}}
					>
						Reset
					</Button>
					<Button
						type="button"
						onClick={() =>
							setApplied(`Supplier ${supplier || "any"} · ${status}`)
						}
					>
						Apply filters
					</Button>
				</FilterBarActions>
			</FilterBar>
			<p className="text-sm text-foreground-secondary" aria-live="polite">
				{applied}
			</p>
		</div>
	);
}

const meta = {
	title: "UI System/Filter Bar",
	component: FilterBar,
	tags: ["autodocs", "test"],
	parameters: {
		...contractDocsParameters(evidence, "Filter Bar"),
		docs: {
			description: {
				component:
					"FilterBar owns filter layout and Apply/Reset placement for deferred criteria. Feature code owns query translation, URL/saved-view state, authorization, fetching, and whether results reflect the confirmed criteria.",
			},
		},
	},
} satisfies Meta<typeof FilterBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"One accounts-payable invoice workbench: FilterBar separates draft criteria from applied query state. Apply commits the operator’s intent; Reset restores the feature-defined baseline. Query translation, URL state, authorization, and fetching remain feature responsibilities.",
			},
		},
	},
	render: () => (
		<div className="min-h-screen bg-canvas text-foreground">
			<div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
				<header className="grid gap-5 border-b pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
					<div className="grid gap-2">
						<p className="text-sm font-medium text-foreground-secondary">
							Accounts payable
						</p>
						<div className="grid gap-1">
							<h1 className="text-2xl font-semibold tracking-tight">
								Invoice list filters
							</h1>
							<p className="max-w-5xl text-sm leading-6 text-foreground-secondary">
								FilterBar owns filter layout and Apply/Reset placement. Feature
								code owns query translation, authorization, and whether results
								reflect the confirmed criteria.
							</p>
						</div>
					</div>
					<dl className="grid grid-cols-2 gap-x-8 gap-y-3 rounded-lg border bg-card p-4">
						<div className="grid gap-1">
							<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								Subject
							</dt>
							<dd className="text-sm">Invoice filters</dd>
						</div>
						<div className="grid gap-1">
							<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								Scope
							</dt>
							<dd className="text-sm">Draft criteria</dd>
						</div>
						<div className="grid gap-1">
							<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								Ownership
							</dt>
							<dd className="text-sm">Apply and reset</dd>
						</div>
						<div className="grid gap-1">
							<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								Lifecycle
							</dt>
							<dd className="text-sm">Draft to applied</dd>
						</div>
					</dl>
				</header>

				<Card className="shadow-none">
					<CardHeader>
						<div className="flex flex-wrap items-start justify-between gap-4">
							<div className="grid gap-1">
								<CardTitle>Supplier invoices</CardTitle>
								<CardDescription>
									July 2026 payables · org-fragrant-lake
								</CardDescription>
							</div>
							<div className="flex flex-wrap items-center gap-2">
								<Badge variant="outline">Payables</Badge>
								<StatusBadge status="warning" label="Overdue queue" />
							</div>
						</div>
					</CardHeader>
					<CardContent className="grid gap-6">
						<InvoiceFilterBar
							ariaLabel="Overview invoice filters"
							idPrefix="overview"
							initialSupplier="Northwind"
							initialStatus="overdue"
						/>
						<ul className="grid gap-2 rounded-md border p-4 text-sm">
							<li className="flex flex-wrap items-center justify-between gap-2">
								<span>INV-1038 · Northwind Trading · MYR 22,100</span>
								<StatusBadge status="warning" label="Overdue" />
							</li>
							<li className="flex flex-wrap items-center justify-between gap-2">
								<span>INV-1041 · Northwind Trading · MYR 4,800</span>
								<StatusBadge status="warning" label="Overdue" />
							</li>
						</ul>
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
					"Approved roles: deferred Apply/Reset for invoice queues, and admin module lifecycle filters sharing the same FilterBar family.",
			},
		},
	},
	render: () => (
		<WorkbenchSection
			id="filter-bar-semantic-usage-title"
			title="Draft versus applied criteria"
			description="FilterBar keeps draft criteria separate from the confirmed query state."
		>
			<div className="grid w-full max-w-5xl gap-8">
				<StorySection title="ERP · supplier invoices">
					<InvoiceFilterBar
						ariaLabel="Semantic invoice filters"
						idPrefix="semantic-invoice"
					/>
				</StorySection>
				<StorySection title="Admin · module lifecycle">
					<FilterBar aria-label="Admin module filters">
						<FilterBarGroup>
							<div className="grid min-w-40 gap-1">
								<Label htmlFor="semantic-module-filter">Module</Label>
								<Select defaultValue="accounting">
									<SelectTrigger
										id="semantic-module-filter"
										aria-label="Module"
									>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="accounting">Accounting</SelectItem>
										<SelectItem value="payables">Payables</SelectItem>
										<SelectItem value="payroll">Payroll</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="grid min-w-40 gap-1">
								<Label htmlFor="semantic-lifecycle-filter">Lifecycle</Label>
								<Select defaultValue="active">
									<SelectTrigger
										id="semantic-lifecycle-filter"
										aria-label="Lifecycle"
									>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="active">Active</SelectItem>
										<SelectItem value="preview">Preview</SelectItem>
										<SelectItem value="scaffolded">Scaffolded</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</FilterBarGroup>
						<FilterBarActions>
							<Button type="button" variant="ghost">
								Reset
							</Button>
							<Button type="button">Apply filters</Button>
						</FilterBarActions>
					</FilterBar>
				</StorySection>
			</div>
		</WorkbenchSection>
	),
};

export const Usage: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Compose FilterBarGroup fields with FilterBarActions. Drafting controls does not mutate the list — Apply confirms criteria in feature state.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-3">
			<InvoiceFilterBar ariaLabel="Usage invoice filters" idPrefix="usage" />
			<p className="text-sm text-foreground-secondary">
				URL sync, saved views, and result fetching stay with the feature — not
				inside FilterBar.
			</p>
		</div>
	),
};

export const StatesAndAccessibility: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Empty versus applied filter states with live confirmation text. Unhealthy empty results explain recovery. Apply and Reset remain named, keyboard-operable commands.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6">
			<StorySection title="Empty filters">
				<InvoiceFilterBar
					ariaLabel="Empty invoice filters"
					idPrefix="empty-invoice"
				/>
			</StorySection>
			<StorySection title="Applied filters">
				<InvoiceFilterBar
					ariaLabel="Applied invoice filters"
					idPrefix="applied-invoice"
					initialSupplier="Northwind"
					initialStatus="overdue"
				/>
			</StorySection>
			<StorySection title="Unhealthy filtered result">
				<div className="grid gap-3">
					<InvoiceFilterBar
						ariaLabel="Blocked invoice filters"
						idPrefix="blocked-invoice"
						initialSupplier="Contoso"
						initialStatus="posted"
					/>
					<p className="rounded-md border border-destructive-border bg-destructive-subtle p-4 text-sm text-destructive-subtle-foreground">
						No posted Contoso invoices in the current period. Reset filters or
						widen the supplier search.
					</p>
				</div>
			</StorySection>
		</div>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const apply = canvas.getAllByRole("button", { name: "Apply filters" })[0];
		const reset = canvas.getAllByRole("button", { name: "Reset" })[0];
		if (!apply || !reset) {
			throw new Error("Expected Apply filters and Reset controls.");
		}
		await userEvent.click(apply);
		await expect(canvas.getByText(/Supplier any · open/i)).toBeVisible();
		await userEvent.click(reset);
		await expect(
			canvas.getAllByText("No filters applied").length,
		).toBeGreaterThan(0);
	},
};

export const VariantsAndSizes: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Family inventory: FilterBar (region), FilterBarGroup (fields), FilterBarActions (Apply/Reset). No size scale — denseness comes from field width and responsive row stacking.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6">
			<div className="grid gap-2">
				<p className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
					FilterBar · group · actions
				</p>
				<FilterBar aria-label="Variant family filters">
					<FilterBarGroup>
						<div className="grid min-w-40 gap-1">
							<Label htmlFor="variant-status">Status</Label>
							<Input
								id="variant-status"
								defaultValue="Open"
								readOnly
								aria-label="Status"
							/>
						</div>
					</FilterBarGroup>
					<FilterBarActions>
						<Button type="button" variant="ghost">
							Reset
						</Button>
						<Button type="button">Apply filters</Button>
					</FilterBarActions>
				</FilterBar>
			</div>
			<div className="grid gap-2">
				<p className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
					Multi-field group
				</p>
				<FilterBar aria-label="Variant multi-field filters">
					<FilterBarGroup>
						<div className="grid min-w-44 gap-1">
							<Label htmlFor="variant-supplier">Supplier</Label>
							<SearchField
								id="variant-supplier"
								defaultValue="Northwind"
								readOnly
								placeholder="Search suppliers"
								aria-label="Search suppliers"
							/>
						</div>
						<div className="grid min-w-36 gap-1">
							<Label htmlFor="variant-lifecycle">Lifecycle</Label>
							<Input
								id="variant-lifecycle"
								defaultValue="Active"
								readOnly
								aria-label="Lifecycle"
							/>
						</div>
					</FilterBarGroup>
					<FilterBarActions>
						<Button type="button" variant="ghost">
							Reset
						</Button>
						<Button type="button">Apply filters</Button>
					</FilterBarActions>
				</FilterBar>
			</div>
		</div>
	),
};

export const AdaptiveLayout: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"FilterBar preserves label meaning, field order, and action order as space narrows. Fields may stack; Reset stays secondary and Apply remains the final commit action.",
			},
		},
	},
	render: () => (
		<div className="grid w-full gap-8">
			<StorySection title="Wide workbench">
				<div className="w-full max-w-4xl">
					<InvoiceFilterBar
						ariaLabel="Wide invoice filters"
						idPrefix="adaptive-wide"
						initialSupplier="Northwind"
						initialStatus="overdue"
					/>
				</div>
			</StorySection>
			<StorySection title="Narrow workbench">
				<div className="w-full max-w-sm rounded-lg border p-4">
					<InvoiceFilterBar
						ariaLabel="Narrow invoice filters"
						idPrefix="adaptive-narrow"
					/>
				</div>
			</StorySection>
			<p className="max-w-5xl text-sm text-foreground-secondary">
				Responsive stacking must not reorder the logical sequence: criteria
				first, then Reset, then Apply. Do not collapse required filters into
				unlabeled icons.
			</p>
		</div>
	),
};

export const Composition: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Compose FilterBar inside a Card with Badge taxonomy and StatusBadge lifecycle on result rows. Filter chrome does not encode approval state.",
			},
		},
	},
	render: () => (
		<Card className="w-full max-w-5xl shadow-none">
			<CardHeader>
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div className="grid gap-1">
						<CardTitle>INV queue filters</CardTitle>
						<CardDescription>Northwind Trading · remittance</CardDescription>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="secondary">Finance</Badge>
						<StatusBadge status="pending" label="Awaiting apply" />
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<InvoiceFilterBar
					ariaLabel="Composition invoice filters"
					idPrefix="composition"
				/>
			</CardContent>
		</Card>
	),
};

export const DoAndDoNot: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Do keep Apply and Reset as named actions beside labelled fields. Do not bury filter commands in an unlabeled icon row or fetch inside FilterBar.",
			},
		},
	},
	render: () => (
		<div className="grid max-w-5xl gap-6 sm:grid-cols-2">
			<StorySection title="Do: keep Apply and Reset explicit">
				<FilterBar aria-label="Explicit filter actions">
					<FilterBarGroup>
						<div className="grid min-w-40 gap-1">
							<Label htmlFor="do-status">Status</Label>
							<Input id="do-status" value="Open" readOnly aria-label="Status" />
						</div>
					</FilterBarGroup>
					<FilterBarActions>
						<Button type="button" variant="ghost">
							Reset
						</Button>
						<Button type="button">Apply filters</Button>
					</FilterBarActions>
				</FilterBar>
			</StorySection>
			<StorySection title="Do not: hide filter commands in an unlabeled icon row">
				<p className="text-sm text-foreground-secondary">
					Operators must see Apply and Reset as named actions beside the filter
					fields. Do not fetch, authorize, or encode lifecycle in FilterBar
					chrome.
				</p>
			</StorySection>
		</div>
	),
};
