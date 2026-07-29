import {
	Badge,
	Button,
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
	StatusBadge,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { expect, userEvent, within } from "storybook/test";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";

const evidence = contractEvidence("ui.card");

const cardGovernance = {
	approvedSubjects: ["summary", "record", "decision", "exception"],
	nonResponsibilities: [
		"authorization",
		"lifecycle semantics",
		"navigation semantics",
		"workflow execution",
	],
} as const;

const meta = {
	title: "UI System/Card",
	component: Card,
	tags: ["autodocs", "test"],
	parameters: {
		...contractDocsParameters(evidence, "Card"),
		docs: {
			description: {
				component: `Card is Afenda’s governed subject container. Approved subjects: ${cardGovernance.approvedSubjects.join(", ")}. It does not own ${cardGovernance.nonResponsibilities.join(", ")}.`,
			},
		},
	},
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

type SectionProps = Readonly<{
	id: string;
	title: string;
	description: string;
	children: ReactNode;
}>;

function WorkbenchSection({ id, title, description, children }: SectionProps) {
	return (
		<section className="grid gap-4" aria-labelledby={id}>
			<div className="grid gap-1">
				<h2
					className="text-base font-semibold tracking-tight text-foreground"
					id={id}
				>
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

type SummaryCardProps = Readonly<{
	title: string;
	value: string;
	description: string;
	actionLabel: string;
}>;

function ReceivablesSummaryCard({
	title,
	value,
	description,
	actionLabel,
}: SummaryCardProps) {
	return (
		<Card className="shadow-none">
			<CardHeader className="gap-1 pb-3">
				<CardTitle className="text-sm font-medium text-foreground-secondary">
					{title}
				</CardTitle>
			</CardHeader>
			<CardContent className="grid gap-2">
				<p className="text-2xl font-semibold tracking-tight text-foreground">
					{value}
				</p>
				<p className="text-sm leading-5 text-foreground-secondary">
					{description}
				</p>
			</CardContent>
			<CardFooter className="pt-2">
				<Button type="button" size="sm" variant="outline">
					{actionLabel}
				</Button>
			</CardFooter>
		</Card>
	);
}

type DefinitionItemProps = Readonly<{
	label: string;
	value: ReactNode;
}>;

function DefinitionItem({ label, value }: DefinitionItemProps) {
	return (
		<div className="grid gap-1">
			<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
				{label}
			</dt>
			<dd className="text-sm text-foreground">{value}</dd>
		</div>
	);
}

/**
 * Governed evidence: hierarchical receivables workbench.
 * CardTitle is a styled div — section h2 owns landmarks; aria-labelledby names
 * each Card subject without nesting headings inside CardTitle.
 */
function ReceivablesCardWorkbench() {
	return (
		<div className="min-h-screen bg-canvas text-foreground">
			<div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
				<header className="grid gap-5 border-b pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
					<div className="grid gap-2">
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant="outline">Accounts receivable</Badge>
							<StatusBadge size="sm" status="active" label="Operational" />
						</div>
						<div className="grid gap-1">
							<h1 className="text-2xl font-semibold tracking-tight">
								Invoice workbench
							</h1>
							<p className="max-w-5xl text-sm leading-6 text-foreground-secondary">
								Review material balances, priority invoice records, and posting
								exceptions. Each Card bounds one independently meaningful
								subject — Card owns framing, not lifecycle or destinations.
							</p>
						</div>
					</div>
					<dl className="grid grid-cols-2 gap-x-8 gap-y-3 rounded-lg border bg-card p-4">
						<DefinitionItem label="Organization" value="Afenda Holdings" />
						<DefinitionItem label="Reporting date" value="28 Jul 2026" />
						<DefinitionItem label="Currency" value="MYR" />
						<DefinitionItem
							label="Ledger period"
							value={
								<StatusBadge
									size="sm"
									status="pending"
									label="Close in progress"
								/>
							}
						/>
					</dl>
				</header>

				<main className="grid gap-9">
					<WorkbenchSection
						id="receivables-summary"
						title="Operational summary"
						description="Aggregate Cards communicate one material fact each. They do not require lifecycle badges merely to appear important."
					>
						<div className="grid gap-4 md:grid-cols-3">
							<ReceivablesSummaryCard
								title="Open receivables"
								value="MYR 482,300.00"
								description="128 approved invoices remain open for collection."
								actionLabel="Open receivables"
							/>
							<ReceivablesSummaryCard
								title="Overdue balance"
								value="MYR 91,840.00"
								description="Fourteen invoices exceed their collection target."
								actionLabel="Review overdue"
							/>
							<ReceivablesSummaryCard
								title="Unapplied receipts"
								value="MYR 24,600.00"
								description="Six receipts require customer or invoice matching."
								actionLabel="Open matching queue"
							/>
						</div>
					</WorkbenchSection>

					<div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]">
						<WorkbenchSection
							id="priority-invoice"
							title="Priority record"
							description="A detailed Card presents one named invoice, its material attributes, authoritative state, and explicit child actions."
						>
							<Card
								role="region"
								aria-labelledby="priority-invoice-title"
								className="shadow-none"
							>
								<CardHeader className="gap-2">
									<div className="flex flex-wrap items-center gap-2">
										<Badge variant="outline">Invoice</Badge>
										<span className="font-mono text-xs text-foreground-tertiary">
											INV-1042
										</span>
									</div>
									<CardTitle
										className="text-lg font-semibold"
										id="priority-invoice-title"
									>
										Northwind Trading Sdn. Bhd.
									</CardTitle>
									<CardDescription>
										Supporting tax documentation is incomplete.
									</CardDescription>
									<CardAction>
										<StatusBadge
											size="sm"
											status="warning"
											label="Evidence incomplete"
										/>
									</CardAction>
								</CardHeader>
								<CardContent className="grid gap-6">
									<p className="text-3xl font-semibold tracking-tight">
										MYR 18,420.00
									</p>
									<dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
										<DefinitionItem label="Invoice date" value="24 Jul 2026" />
										<DefinitionItem label="Due date" value="23 Aug 2026" />
										<DefinitionItem label="Payment terms" value="Net 30" />
										<DefinitionItem label="Posting state" value="Blocked" />
									</dl>
									<div className="rounded-md bg-surface-sunken p-4">
										<p className="text-sm font-medium text-foreground">
											Required operator action
										</p>
										<p className="mt-1 text-sm leading-5 text-foreground-secondary">
											Attach the supplier tax document before retrying the
											posting workflow.
										</p>
									</div>
								</CardContent>
								<CardFooter className="justify-between gap-3 border-t">
									<Button type="button" size="sm" variant="ghost">
										Open invoice
									</Button>
									<div className="flex flex-wrap gap-2">
										<Button type="button" size="sm" variant="outline">
											Request document
										</Button>
										<Button type="button" size="sm">
											Attach evidence
										</Button>
									</div>
								</CardFooter>
							</Card>
						</WorkbenchSection>

						<WorkbenchSection
							id="posting-exception"
							title="Posting exception"
							description="Exception Cards emphasize consequence and recovery without turning the whole Card into an alert or clickable target."
						>
							<Card
								role="region"
								aria-labelledby="posting-exception-title"
								className="shadow-none"
							>
								<CardHeader>
									<CardTitle
										className="text-base font-semibold"
										id="posting-exception-title"
									>
										Invoice INV-1039
									</CardTitle>
									<CardDescription>
										Target ledger account is inactive.
									</CardDescription>
									<CardAction>
										<StatusBadge
											size="sm"
											status="error"
											label="Posting failed"
										/>
									</CardAction>
								</CardHeader>
								<CardContent className="grid gap-5">
									<div className="grid gap-1">
										<p className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
											Invoice amount
										</p>
										<p className="text-xl font-semibold tracking-tight">
											MYR 6,840.00
										</p>
									</div>
									<div className="grid gap-2">
										<p className="text-sm font-medium">Failure consequence</p>
										<p className="mt-1 text-sm leading-5 text-foreground-secondary">
											The invoice remains outside the receivables ledger until
											the account mapping is restored.
										</p>
									</div>
								</CardContent>
								<CardFooter className="grid gap-2 border-t">
									<Button type="button" size="sm">
										Resolve account mapping
									</Button>
									<Button type="button" size="sm" variant="ghost">
										View failed journal
									</Button>
								</CardFooter>
							</Card>
						</WorkbenchSection>
					</div>

					<WorkbenchSection
						id="completed-record"
						title="Completed record"
						description="Completed state remains visible but visually quieter because no operator intervention is required."
					>
						<Card
							role="region"
							aria-labelledby="completed-invoice-title"
							className="shadow-none"
						>
							<CardContent className="grid gap-5 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
								<div className="grid gap-2">
									<div className="flex flex-wrap items-center gap-2">
										<CardTitle
											className="text-base font-semibold"
											id="completed-invoice-title"
										>
											Invoice INV-1038
										</CardTitle>
										<StatusBadge size="sm" status="success" label="Posted" />
									</div>
									<CardDescription>
										Northwind Trading Sdn. Bhd. · Posted to the July receivables
										ledger at 09:31.
									</CardDescription>
								</div>
								<div className="flex flex-wrap items-center gap-4">
									<p className="font-mono text-sm font-medium">MYR 12,150.00</p>
									<Button type="button" size="sm" variant="outline">
										View ledger entry
									</Button>
								</div>
							</CardContent>
						</Card>
					</WorkbenchSection>
				</main>
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
					"One receivables invoice workbench: aggregate summaries, a priority record, a posting exception, then quiet completion. Each Card bounds one subject — hierarchy, not a flat status gallery.",
			},
		},
	},
	render: () => <ReceivablesCardWorkbench />,
};

export const SemanticUsage: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Approved subjects are summary, record, decision, and exception. Card owns visual grouping and hierarchy only; feature code owns authorization, lifecycle meaning, navigation, workflow execution, and result handling.",
			},
		},
	},
	render: () => (
		<div className="grid max-w-4xl gap-6">
			<StorySection title="Record Card">
				<Card className="shadow-none">
					<CardHeader>
						<CardTitle>Supplier account</CardTitle>
						<CardDescription>Northwind Trading Sdn. Bhd.</CardDescription>
						<CardAction>
							<Badge variant="outline">Supplier</Badge>
						</CardAction>
					</CardHeader>
					<CardContent>
						<dl className="grid gap-4 sm:grid-cols-3">
							<DefinitionItem label="Payment terms" value="Net 30" />
							<DefinitionItem label="Currency" value="MYR" />
							<DefinitionItem
								label="Lifecycle"
								value={<StatusBadge size="sm" status="active" label="Active" />}
							/>
						</dl>
					</CardContent>
				</Card>
			</StorySection>

			<StorySection title="Decision Card">
				<Card className="shadow-none">
					<CardHeader>
						<CardTitle>Credit-limit exception</CardTitle>
						<CardDescription>CUS-001104 · Commercial review</CardDescription>
						<CardAction>
							<StatusBadge
								size="sm"
								status="pending"
								label="Awaiting approval"
							/>
						</CardAction>
					</CardHeader>
					<CardContent className="grid gap-4">
						<p className="text-sm text-foreground-secondary">
							Requested increase from MYR 50,000.00 to MYR 75,000.00.
						</p>
						<div className="rounded-md bg-surface-sunken p-4">
							<p className="text-sm font-medium">Approval consequence</p>
							<p className="mt-1 text-sm text-foreground-secondary">
								The customer may place additional orders up to the approved
								limit.
							</p>
						</div>
					</CardContent>
					<CardFooter className="justify-end gap-2 border-t">
						<Button type="button" size="sm" variant="outline">
							Reject
						</Button>
						<Button type="button" size="sm">
							Approve
						</Button>
					</CardFooter>
				</Card>
			</StorySection>
		</div>
	),
};

export const AdaptiveLayout: Story = {
	parameters: {
		layout: "padded",
		viewport: {
			defaultViewport: "mobile1",
		},
		docs: {
			description: {
				story:
					"Card composition must reflow without changing subject meaning, action names, reading order, or lifecycle semantics. Narrow layouts stack metadata and actions; they do not hide material facts behind hover or truncate the only identifying label.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-sm gap-6">
			<StorySection title="Narrow decision context">
				<Card
					role="region"
					aria-labelledby="adaptive-credit-title"
					className="shadow-none"
				>
					<CardHeader>
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant="outline">Credit control</Badge>
							<StatusBadge
								size="sm"
								status="pending"
								label="Awaiting approval"
							/>
						</div>
						<CardTitle id="adaptive-credit-title">
							Credit-limit exception for Northwind Trading Sdn. Bhd.
						</CardTitle>
						<CardDescription>
							CUS-001104 · Requested by Accounts receivable
						</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-4">
						<dl className="grid gap-4 sm:grid-cols-2">
							<DefinitionItem label="Current limit" value="MYR 50,000.00" />
							<DefinitionItem label="Requested limit" value="MYR 75,000.00" />
						</dl>
						<p className="text-sm leading-5 text-foreground-secondary">
							Approval increases the customer ordering capacity by MYR
							25,000.00.
						</p>
					</CardContent>
					<CardFooter className="grid gap-2 border-t sm:flex sm:justify-end">
						<Button type="button" size="sm" variant="outline">
							Reject request
						</Button>
						<Button type="button" size="sm">
							Approve increase
						</Button>
					</CardFooter>
				</Card>
			</StorySection>
			<p className="text-sm leading-5 text-foreground-secondary">
				High-contrast and forced-color presentation must remain token-driven. Do
				not hard-code pale borders, status fills, or focus colors into Card
				composition.
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
					"Card regions need a meaningful accessible name when their boundary requires independent navigation. Reading order follows title, description, content, and actions. CardTitle is a styled div — label via id and aria-labelledby; section landmarks own h2.",
			},
		},
	},
	render: () => (
		<div className="grid max-w-4xl gap-6">
			<Card
				role="region"
				aria-labelledby="card-a11y-invoice-title"
				className="shadow-none"
			>
				<CardHeader>
					<CardTitle id="card-a11y-invoice-title">Invoice INV-1042</CardTitle>
					<CardDescription>
						Awaiting supporting evidence before posting.
					</CardDescription>
					<CardAction>
						<StatusBadge
							size="sm"
							status="warning"
							label="Evidence incomplete"
						/>
					</CardAction>
				</CardHeader>
				<CardContent>
					<dl className="grid gap-4 sm:grid-cols-2">
						<DefinitionItem
							label="Customer"
							value="Northwind Trading Sdn. Bhd."
						/>
						<DefinitionItem
							label="Amount"
							value={<span className="font-mono">MYR 18,420.00</span>}
						/>
					</dl>
				</CardContent>
				<CardFooter className="justify-end gap-2 border-t">
					<Button type="button" size="sm" variant="outline">
						Request document
					</Button>
					<Button type="button" size="sm">
						Attach evidence
					</Button>
				</CardFooter>
			</Card>

			<Card
				role="region"
				aria-labelledby="card-a11y-complete-title"
				className="shadow-none"
			>
				<CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
					<div className="grid gap-1">
						<CardTitle id="card-a11y-complete-title">
							Invoice INV-1038
						</CardTitle>
						<CardDescription>
							Posted successfully. No further action required.
						</CardDescription>
					</div>
					<StatusBadge size="sm" status="success" label="Posted" />
				</CardContent>
			</Card>
		</div>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const requestDocument = canvas.getByRole("button", {
			name: "Request document",
		});
		const attachEvidence = canvas.getByRole("button", {
			name: "Attach evidence",
		});

		await userEvent.tab();
		await expect(requestDocument).toHaveFocus();
		await userEvent.tab();
		await expect(attachEvidence).toHaveFocus();

		await expect(
			canvas.getByRole("region", { name: "Invoice INV-1042" }),
		).toBeInTheDocument();
	},
};

export const Composition: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Keep Cards in a collection structurally consistent, but vary composition when the subject type differs. Do not force summary, record, and exception content through one universal layout.",
			},
		},
	},
	render: () => (
		<div className="grid max-w-5xl gap-8">
			<StorySection title="Consistent summary collection">
				<div className="grid gap-4 sm:grid-cols-2">
					<ReceivablesSummaryCard
						title="Open invoices"
						value="128"
						description="Approved invoices awaiting collection."
						actionLabel="Open queue"
					/>
					<ReceivablesSummaryCard
						title="Overdue invoices"
						value="14"
						description="Invoices outside their collection window."
						actionLabel="Open exceptions"
					/>
				</div>
			</StorySection>

			<StorySection title="Detailed record composition">
				<Card className="shadow-none">
					<CardHeader>
						<CardTitle>Invoice INV-1042</CardTitle>
						<CardDescription>Northwind Trading Sdn. Bhd.</CardDescription>
						<CardAction>
							<StatusBadge
								size="sm"
								status="pending"
								label="Awaiting approval"
							/>
						</CardAction>
					</CardHeader>
					<CardContent>
						<dl className="grid gap-4 sm:grid-cols-3">
							<DefinitionItem label="Amount" value="MYR 18,420.00" />
							<DefinitionItem label="Due date" value="23 Aug 2026" />
							<DefinitionItem label="Owner" value="Accounts receivable" />
						</dl>
					</CardContent>
					<CardFooter className="justify-end border-t">
						<Button type="button" size="sm" variant="outline">
							Open invoice
						</Button>
					</CardFooter>
				</Card>
			</StorySection>
		</div>
	),
};

export const DoAndDoNot: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Card must bound one meaningful subject. It must not become arbitrary spacing, a hidden navigation target, an authorization surface, or a replacement for StatusBadge lifecycle semantics. Only compositions demonstrated here are approved defaults.",
			},
		},
	},
	render: () => (
		<div className="grid max-w-5xl gap-6 sm:grid-cols-2">
			<StorySection title="Do: bound one meaningful record">
				<Card className="shadow-none">
					<CardHeader>
						<CardTitle>Invoice INV-1042</CardTitle>
						<CardDescription>Northwind Trading Sdn. Bhd.</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="font-mono text-sm">MYR 18,420.00</p>
					</CardContent>
				</Card>
			</StorySection>

			<StorySection title="Do not: use Card only for spacing">
				<div className="rounded-md border border-dashed p-4 text-sm text-foreground-tertiary">
					Use page layout and spacing primitives for unrelated content instead.
				</div>
			</StorySection>

			<StorySection title="Do: use explicit interactive children">
				<Card className="shadow-none">
					<CardHeader>
						<CardTitle>Supplier SUP-004821</CardTitle>
					</CardHeader>
					<CardFooter>
						<Button type="button" size="sm" variant="outline">
							Open supplier
						</Button>
					</CardFooter>
				</Card>
			</StorySection>

			<StorySection title="Do not: make the Card root clickable">
				<Card className="cursor-default shadow-none">
					<CardHeader>
						<CardTitle>Supplier SUP-004821</CardTitle>
						<CardDescription>
							The surface itself is not a hidden destination.
						</CardDescription>
					</CardHeader>
				</Card>
			</StorySection>

			<StorySection title="Do: use StatusBadge for lifecycle">
				<Card className="shadow-none">
					<CardHeader>
						<CardTitle>Invoice INV-1038</CardTitle>
						<CardAction>
							<StatusBadge size="sm" status="success" label="Posted" />
						</CardAction>
					</CardHeader>
				</Card>
			</StorySection>

			<StorySection title="Do not: use Badge as lifecycle authority">
				<Card className="shadow-none">
					<CardHeader>
						<CardTitle>Invoice INV-1038</CardTitle>
						<CardAction>
							<Badge variant="secondary">Posted</Badge>
						</CardAction>
					</CardHeader>
				</Card>
			</StorySection>
		</div>
	),
};
