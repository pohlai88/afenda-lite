import {
	Badge,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
	StatusBadge,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ChevronsUpDownIcon } from "lucide-react";
import type { ReactNode } from "react";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";
import { interactionFor } from "./interactions";

const evidence = contractEvidence("ui.collapsible");

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

const meta = {
	title: "UI System/Collapsible",
	component: Collapsible,
	tags: ["autodocs", "test"],
	parameters: {
		...contractDocsParameters(evidence, "Collapsible"),
		docs: {
			description: {
				component:
					"Collapsible reveals or conceals one optional subordinate region without changing domain state. The trigger remains adjacent and descriptive; required facts, errors, status, and primary actions stay visible. Consumers own controlled state, persistence, authorization, and workflow meaning.",
			},
		},
	},
} satisfies Meta<typeof Collapsible>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"Invoice review keeps posting actions and status visible. Collapsible discloses one optional audit-trail region on the same Card — not a second page or modal.",
			},
		},
	},
	render: () => (
		<div className="min-h-screen bg-canvas text-foreground">
			<main className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
				<header className="grid gap-5 border-b pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
					<div className="grid gap-2">
						<p className="font-medium text-foreground-secondary text-sm">
							Accounts receivable · invoice review
						</p>
						<div className="grid gap-1">
							<h1 className="font-semibold text-2xl tracking-tight">
								Invoice INV-1048
							</h1>
							<p className="max-w-5xl text-foreground-secondary text-sm leading-6">
								Collapsible reveals one subordinate audit region. Required
								posting actions and lifecycle stay on the Card surface, not
								inside the collapsed panel.
							</p>
						</div>
					</div>
					<dl className="grid grid-cols-2 gap-x-8 gap-y-3 rounded-lg border bg-card p-4">
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								Subject
							</dt>
							<dd className="text-sm">Invoice review</dd>
						</div>
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								Area
							</dt>
							<dd className="text-sm">Accounts receivable</dd>
						</div>
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								Scope
							</dt>
							<dd className="text-sm">One optional audit region</dd>
						</div>
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								State
							</dt>
							<dd className="text-sm">Approval pending</dd>
						</div>
					</dl>
				</header>

				<Card className="shadow-none">
					<CardHeader className="gap-2">
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant="outline">Invoice</Badge>
							<span className="font-mono text-foreground-tertiary text-xs">
								INV-1048
							</span>
							<StatusBadge
								label="Awaiting approval"
								size="sm"
								status="pending"
							/>
						</div>
						<CardTitle>Northwind Trading Sdn. Bhd.</CardTitle>
						<CardDescription>
							MYR 18,420.00 · July receivables · finance-control review
						</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-4">
						<dl className="grid gap-3 text-sm sm:grid-cols-2">
							<div className="grid gap-1">
								<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
									Owner
								</dt>
								<dd className="text-foreground">Aisha Rahman</dd>
							</div>
							<div className="grid gap-1">
								<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
									Due date
								</dt>
								<dd className="text-foreground">15 Aug 2026</dd>
							</div>
						</dl>

						<Collapsible defaultOpen>
							<CollapsibleTrigger asChild>
								<Button
									className="w-full justify-between"
									type="button"
									variant="outline"
								>
									Toggle details
									<ChevronsUpDownIcon aria-hidden="true" className="size-4" />
								</Button>
							</CollapsibleTrigger>
							<CollapsibleContent className="mt-3 rounded-md border p-4 text-foreground-secondary text-sm">
								Additional audit evidence appears here. Bank letter dated 12 Jul
								2026 matches the remittance account on the supplier record.
								Approval remains governed by StatusBadge and the feature
								workflow — not by open disclosure state.
							</CollapsibleContent>
						</Collapsible>
					</CardContent>
					<CardFooter className="justify-end gap-2 border-t">
						<Button type="button" variant="outline">
							Request correction
						</Button>
						<Button type="button">Approve invoice</Button>
					</CardFooter>
				</Card>
			</main>
		</div>
	),
	play: interactionFor("collapsible"),
};

export const Usage: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"One Collapsible owns one subordinate optional region. Keep the trigger adjacent and descriptive of the content it reveals.",
			},
		},
	},
	render: () => (
		<WorkbenchSection
			description="One Collapsible owns one subordinate optional region. Keep the trigger adjacent and descriptive of the content it reveals."
			id="optional-remittance-notice"
			title="Optional remittance notice depth"
		>
			<Collapsible>
				<CollapsibleTrigger asChild>
					<Button type="button" variant="outline">
						Show remittance notice rules
					</Button>
				</CollapsibleTrigger>
				<CollapsibleContent className="mt-3 rounded-md border p-4 text-foreground-secondary text-sm">
					Finance contacts receive remittance advice after each posted payment
					run for this supplier. Primary remittance fields stay on the form
					surface.
				</CollapsibleContent>
			</Collapsible>
		</WorkbenchSection>
	),
};

export const Composition: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Card owns the record surface and primary actions. Collapsible owns one optional disclosure region inside that Card — Accordion remains the peer-section list.",
			},
		},
	},
	render: () => (
		<WorkbenchSection
			description="Card owns the record surface and primary actions. Collapsible owns one optional disclosure region inside that Card — Accordion remains the peer-section list."
			id="composition-workbench"
			title="Composition"
		>
			<div className="grid w-full max-w-5xl gap-6 lg:grid-cols-2">
				<Card className="shadow-none">
					<CardHeader>
						<CardTitle>Supplier activation note</CardTitle>
						<CardDescription>SUP-1042 · Northwind Trading</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-4">
						<p className="text-foreground-secondary text-sm">
							Tax and ownership evidence passed validation. Optional policy
							depth stays behind one Collapsible trigger.
						</p>
						<Collapsible>
							<CollapsibleTrigger asChild>
								<Button type="button" variant="outline">
									Why bank evidence is required
								</Button>
							</CollapsibleTrigger>
							<CollapsibleContent className="mt-3 rounded-md border p-4 text-foreground-secondary text-sm">
								Bank letters prevent remittance to unverified accounts after
								supplier activation. Activation itself stays on StatusBadge and
								feature-owned workflow state.
							</CollapsibleContent>
						</Collapsible>
					</CardContent>
					<CardFooter className="justify-end gap-2 border-t">
						<Button type="button" variant="outline">
							Open supplier
						</Button>
						<Button type="button">Activate supplier</Button>
					</CardFooter>
				</Card>

				<Card className="shadow-none">
					<CardHeader>
						<CardTitle>Payment exception detail</CardTitle>
						<CardDescription>PAY-2210 · unmatched receipt</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-4">
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant="secondary">Unapplied</Badge>
							<StatusBadge label="Needs matching" size="sm" status="pending" />
						</div>
						<Collapsible defaultOpen>
							<CollapsibleTrigger asChild>
								<Button
									className="h-auto w-full justify-between px-0 py-1 font-medium"
									type="button"
									variant="ghost"
								>
									Matching guidance
									<ChevronsUpDownIcon aria-hidden="true" className="size-4" />
								</Button>
							</CollapsibleTrigger>
							<CollapsibleContent className="mt-2 text-foreground-secondary text-sm">
								Match the MYR 24,600.00 receipt to an open invoice or customer
								credit before clearing the exception queue.
							</CollapsibleContent>
						</Collapsible>
					</CardContent>
					<CardFooter className="justify-end gap-2 border-t">
						<Button type="button" variant="outline">
							Defer matching
						</Button>
						<Button type="button">Open matching queue</Button>
					</CardFooter>
				</Card>
			</div>
		</WorkbenchSection>
	),
};

export const AdaptiveLayout: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"The disclosure trigger and its meaning remain intact in constrained Card regions. Trigger text may wrap; required actions remain outside the optional region and preserve their normal reading order.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-4xl gap-8">
			<StorySection title="Narrow record panel">
				<div className="w-full max-w-xs rounded-xl border border-border border-dashed p-4">
					<div className="grid gap-4">
						<div className="grid gap-1">
							<p className="font-medium text-foreground text-sm">
								Supplier bank validation
							</p>
							<p className="text-foreground-secondary text-sm leading-5">
								Legal name and remittance account remain visible.
							</p>
						</div>
						<Collapsible>
							<CollapsibleTrigger asChild>
								<Button
									className="h-auto w-full justify-between whitespace-normal text-left"
									type="button"
									variant="outline"
								>
									Show supporting bank-ownership evidence
									<ChevronsUpDownIcon
										aria-hidden="true"
										className="size-4 shrink-0"
									/>
								</Button>
							</CollapsibleTrigger>
							<CollapsibleContent className="mt-3 rounded-md border p-4 text-foreground-secondary text-sm leading-5">
								The bank letter must match the registered supplier name and
								approved remittance account.
							</CollapsibleContent>
						</Collapsible>
						<Button type="button">Continue validation</Button>
					</div>
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
					"Triggers remain buttons with expanded semantics. Operators can open a closed region and collapse a default-open region while focus stays operable.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-xl gap-6">
			<StorySection title="Open by default">
				<Collapsible defaultOpen>
					<CollapsibleTrigger asChild>
						<Button type="button" variant="outline">
							Ledger write effects
						</Button>
					</CollapsibleTrigger>
					<CollapsibleContent className="mt-3 rounded-md border p-4 text-foreground-secondary text-sm">
						Posting writes MYR 18,420.00 to the July receivables ledger and
						remains correctable through the governed reversal workflow.
					</CollapsibleContent>
				</Collapsible>
			</StorySection>

			<StorySection title="Closed until requested">
				<Collapsible>
					<CollapsibleTrigger asChild>
						<Button type="button" variant="outline">
							Escalation mailbox
						</Button>
					</CollapsibleTrigger>
					<CollapsibleContent className="mt-3 rounded-md border p-4 text-foreground-secondary text-sm">
						Unresolved approval alerts go to finance-control@example.com until
						the invoice is posted or rejected.
					</CollapsibleContent>
				</Collapsible>
			</StorySection>
		</div>
	),
};

export const CompositionExamples: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Card owns the record surface and primary actions. Collapsible owns one optional disclosure region inside that Card — Accordion remains the peer-section list.",
			},
		},
	},
	render: () => (
		<WorkbenchSection
			description="Card owns the record surface and primary actions. Collapsible owns one optional disclosure region inside that Card — Accordion remains the peer-section list."
			id="composition-workbench"
			title="Composition"
		>
			<div className="grid w-full max-w-5xl gap-6 lg:grid-cols-2">
				<Card className="shadow-none">
					<CardHeader>
						<CardTitle>Supplier activation note</CardTitle>
						<CardDescription>SUP-1042 · Northwind Trading</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-4">
						<p className="text-foreground-secondary text-sm">
							Tax and ownership evidence passed validation. Optional policy
							depth stays behind one Collapsible trigger.
						</p>
						<Collapsible>
							<CollapsibleTrigger asChild>
								<Button type="button" variant="outline">
									Why bank evidence is required
								</Button>
							</CollapsibleTrigger>
							<CollapsibleContent className="mt-3 rounded-md border p-4 text-foreground-secondary text-sm">
								Bank letters prevent remittance to unverified accounts after
								supplier activation. Activation itself stays on StatusBadge and
								feature-owned workflow state.
							</CollapsibleContent>
						</Collapsible>
					</CardContent>
					<CardFooter className="justify-end gap-2 border-t">
						<Button type="button" variant="outline">
							Open supplier
						</Button>
						<Button type="button">Activate supplier</Button>
					</CardFooter>
				</Card>

				<Card className="shadow-none">
					<CardHeader>
						<CardTitle>Payment exception detail</CardTitle>
						<CardDescription>PAY-2210 · unmatched receipt</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-4">
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant="secondary">Unapplied</Badge>
							<StatusBadge label="Needs matching" size="sm" status="pending" />
						</div>
						<Collapsible defaultOpen>
							<CollapsibleTrigger asChild>
								<Button
									className="h-auto w-full justify-between px-0 py-1 font-medium"
									type="button"
									variant="ghost"
								>
									Matching guidance
									<ChevronsUpDownIcon aria-hidden="true" className="size-4" />
								</Button>
							</CollapsibleTrigger>
							<CollapsibleContent className="mt-2 text-foreground-secondary text-sm">
								Match the MYR 24,600.00 receipt to an open invoice or customer
								credit before clearing the exception queue.
							</CollapsibleContent>
						</Collapsible>
					</CardContent>
					<CardFooter className="justify-end gap-2 border-t">
						<Button type="button" variant="outline">
							Defer matching
						</Button>
						<Button type="button">Open matching queue</Button>
					</CardFooter>
				</Card>
			</div>
		</WorkbenchSection>
	),
};

export const DoAndDoNot: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Collapsible clarifies one optional subordinate region. Required fields and primary actions stay visible; disclosure is not domain state.",
			},
		},
	},
	render: () => (
		<div className="grid max-w-5xl gap-6 sm:grid-cols-2">
			<StorySection title="Do: hide one optional detail region">
				<Collapsible>
					<CollapsibleTrigger asChild>
						<Button type="button" variant="outline">
							Show audit trail details
						</Button>
					</CollapsibleTrigger>
					<CollapsibleContent className="mt-3 rounded-md border p-4 text-foreground-secondary text-sm">
						Operator Aisha Rahman requested finance-control review at 09:14 on
						28 Jul 2026.
					</CollapsibleContent>
				</Collapsible>
			</StorySection>

			<StorySection title="Do not: bury required fields or primary actions">
				<p className="text-foreground-secondary text-sm">
					Required tax registration, legal name, and Approve/Submit controls
					must remain visible on the record surface — not only inside a
					collapsed region.
				</p>
			</StorySection>

			<StorySection title="Do: keep the trigger adjacent and descriptive">
				<div className="grid gap-2 rounded-md border p-4">
					<p className="font-medium text-foreground text-sm">
						Remittance account ownership
					</p>
					<Collapsible>
						<CollapsibleTrigger asChild>
							<Button size="sm" type="button" variant="outline">
								Show ownership evidence rules
							</Button>
						</CollapsibleTrigger>
						<CollapsibleContent className="mt-3 text-foreground-secondary text-sm">
							The bank letter must show the same legal name as the supplier
							master record.
						</CollapsibleContent>
					</Collapsible>
				</div>
			</StorySection>

			<StorySection title="Do not: encode workflow status in open state">
				<p className="text-foreground-secondary text-sm">
					Open versus closed Collapsible state must not mean “approved”,
					“posted”, or “authorized”. Use StatusBadge and feature-owned workflow
					state. Prefer Accordion when several peer optional sections share one
					list.
				</p>
			</StorySection>
		</div>
	),
};
