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
	StatusBadge,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { FilterXIcon, InboxIcon, ShieldAlertIcon } from "lucide-react";
import type { ReactNode } from "react";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";

const evidence = contractEvidence("ui.empty");

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
				<h2 className="font-semibold text-base tracking-tight" id={id}>
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
	title: "UI System/Empty",
	component: Empty,
	tags: ["autodocs", "test"],
	parameters: {
		...contractDocsParameters(evidence, "Empty"),
		docs: {
			description: {
				component:
					"Empty explains a known absence on a collection or panel surface. It owns title, description, optional decorative icon, size scale, and authorized recovery actions; feature code owns why content is absent, whether Create or Clear filters is permitted, loading, and error recovery.",
			},
		},
	},
} satisfies Meta<typeof Empty>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"Receivables workbench with no open invoices. Empty explains true absence and offers Create invoice only because that action is authorized on this surface.",
			},
		},
	},
	render: () => (
		<div className="min-h-screen bg-canvas text-foreground">
			<div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
				<header className="grid gap-5 border-b pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
					<div className="grid gap-2">
						<p className="font-medium text-foreground-secondary text-sm">
							Accounts receivable · open invoices
						</p>
						<div className="grid gap-1">
							<h1 className="font-semibold text-2xl tracking-tight">
								Invoice workbench
							</h1>
							<p className="max-w-5xl text-foreground-secondary text-sm leading-6">
								Empty states explain why a collection has nothing to show.
								Actions must map to real authorized work — never decorative
								placeholders.
							</p>
						</div>
					</div>
					<dl className="grid grid-cols-2 gap-x-8 gap-y-3 rounded-lg border bg-card p-4">
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								Subject
							</dt>
							<dd className="text-sm">Empty collection</dd>
						</div>
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								Scope
							</dt>
							<dd className="text-sm">Known absence</dd>
						</div>
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								Ownership
							</dt>
							<dd className="text-sm">Recovery and title</dd>
						</div>
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								Lifecycle
							</dt>
							<dd className="text-sm">True empty vs filtered</dd>
						</div>
					</dl>
				</header>

				<Card className="shadow-none">
					<CardHeader>
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant="outline">Receivables</Badge>
							<StatusBadge label="Operational" size="sm" status="active" />
						</div>
						<CardTitle>Open invoices</CardTitle>
						<CardDescription>
							org-fragrant-lake · July collection queue
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Empty
							action={<Button type="button">Create invoice</Button>}
							description="There are no open invoices in this organization yet. Create an invoice when receivables work begins, or import approved drafts from your posting batch."
							icon={<InboxIcon aria-hidden="true" className="size-10" />}
							size="lg"
							title="No open invoices"
						/>
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
					"Empty represents a known absence. The message must identify whether the surface is first-run, filtered, permission-limited, or a completed queue. Loading and failures use their own feedback primitives.",
			},
		},
	},
	render: () => (
		<WorkbenchSection
			description="Empty distinguishes a true absence from filtered or permission-limited results."
			id="empty-semantic-usage-title"
			title="Known absence states"
		>
			<div className="grid w-full max-w-5xl gap-6 md:grid-cols-2">
				<StorySection title="First-run absence">
					<div className="rounded-lg border">
						<Empty
							action={<Button type="button">Create payment run</Button>}
							description="This organization has not created a payment run. Start one when approved invoices are ready for settlement."
							icon={<InboxIcon aria-hidden="true" className="size-8" />}
							size="md"
							title="No payment runs yet"
						/>
					</div>
				</StorySection>
				<StorySection title="Completed queue">
					<div className="rounded-lg border">
						<Empty
							description="All invoice approvals assigned to you are complete. New work will appear here when submitted."
							icon={<InboxIcon aria-hidden="true" className="size-8" />}
							size="md"
							title="No approvals waiting"
						/>
					</div>
				</StorySection>
				<StorySection title="Filtered result">
					<div className="rounded-lg border">
						<Empty
							action={
								<Button type="button" variant="outline">
									Clear filters
								</Button>
							}
							description="Supplier Northwind and status Posted returned no rows for July 2026."
							icon={<FilterXIcon aria-hidden="true" className="size-8" />}
							size="md"
							title="No invoices match"
						/>
					</div>
				</StorySection>
				<StorySection title="Permission-limited surface">
					<div className="rounded-lg border">
						<Empty
							description="Your current role cannot read invoices for this organization. Request access through the approved process."
							icon={<ShieldAlertIcon aria-hidden="true" className="size-8" />}
							size="md"
							title="Invoices unavailable"
						/>
					</div>
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
					"Wording and actions must distinguish true empty from filtered-empty. Offer recovery only when the operator can clear filters or create authorized records.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-xl gap-6">
			<StorySection title="True empty collection">
				<div className="rounded-lg border">
					<Empty
						action={<Button type="button">Create supplier</Button>}
						description="This organization has no supplier master records. Create a supplier when procurement onboarding starts."
						icon={<InboxIcon aria-hidden="true" className="size-8" />}
						size="md"
						title="No suppliers yet"
					/>
				</div>
			</StorySection>

			<StorySection title="Filtered empty — adjust criteria">
				<div className="rounded-lg border">
					<Empty
						action={
							<Button type="button" variant="outline">
								Clear filters
							</Button>
						}
						description="Northwind Trading · Overdue returned zero rows. Clear filters or widen the status range to see open receivables again."
						icon={<FilterXIcon aria-hidden="true" className="size-8" />}
						size="md"
						title="No invoices match these filters"
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
					"Approved sizes sm, md, and lg scale spacing. Permission-limited empty states explain access without fake Create actions. Icons stay decorative.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-xl gap-6">
			<StorySection title="size=sm — compact panel">
				<div className="rounded-lg border">
					<Empty
						description="This invoice has no audit trail entries yet."
						icon={<InboxIcon aria-hidden="true" className="size-6" />}
						size="sm"
						title="No audit events"
					/>
				</div>
			</StorySection>

			<StorySection title="size=md — section default">
				<div className="rounded-lg border">
					<Empty
						action={
							<Button size="sm" type="button" variant="outline">
								Open remittance settings
							</Button>
						}
						description="Finance contacts have not received remittance advice for this supplier."
						icon={<InboxIcon aria-hidden="true" className="size-8" />}
						size="md"
					/>
				</div>
			</StorySection>

			<StorySection title="size=lg — page-level first run">
				<div className="rounded-lg border">
					<Empty
						action={<Button type="button">Create payment run</Button>}
						description="Create the first draft payment run when payables is ready to batch remittances."
						icon={<InboxIcon aria-hidden="true" className="size-10" />}
						size="lg"
						title="No payment runs"
					/>
				</div>
			</StorySection>

			<StorySection title="Permission-limited — no fake action">
				<div className="rounded-lg border">
					<Empty
						description="Your role cannot read receivables invoices in this organization. Ask finance-control for access — Empty does not invent a Create shortcut."
						icon={<ShieldAlertIcon aria-hidden="true" className="size-8" />}
						size="md"
						title="Invoice list unavailable"
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
					"Card owns the collection surface. Empty fills the content region when the list has nothing to show. StatusBadge owns lifecycle — not Empty.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6 lg:grid-cols-2">
			<Card className="shadow-none">
				<CardHeader>
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="outline">Receivables</Badge>
						<StatusBadge label="Operational" size="sm" status="active" />
					</div>
					<CardTitle>Open invoices</CardTitle>
					<CardDescription>True empty with authorized create</CardDescription>
				</CardHeader>
				<CardContent>
					<Empty
						action={<Button type="button">Create invoice</Button>}
						description="Create an invoice when receivables work begins."
						icon={<InboxIcon aria-hidden="true" className="size-8" />}
						size="md"
						title="No open invoices"
					/>
				</CardContent>
			</Card>

			<Card className="shadow-none">
				<CardHeader>
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="secondary">Payables</Badge>
						<StatusBadge label="Filters applied" size="sm" status="pending" />
					</div>
					<CardTitle>Payment exception queue</CardTitle>
					<CardDescription>Filtered empty with clear filters</CardDescription>
				</CardHeader>
				<CardContent>
					<Empty
						action={
							<Button type="button" variant="outline">
								Clear filters
							</Button>
						}
						description="Unapplied · Contoso Logistics returned zero rows."
						icon={<FilterXIcon aria-hidden="true" className="size-8" />}
						size="md"
						title="No exceptions match"
					/>
				</CardContent>
				<CardFooter className="justify-end border-t">
					<Button type="button" variant="outline">
						Open matching queue
					</Button>
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
					"Empty explains absence truthfully. It is not loading, error chrome, fake recovery, or lifecycle authority.",
			},
		},
	},
	render: () => (
		<div className="grid max-w-5xl gap-6 sm:grid-cols-2">
			<StorySection title="Do: explain why content is absent">
				<div className="rounded-lg border">
					<Empty
						action={
							<Button size="sm" type="button" variant="outline">
								Clear filters
							</Button>
						}
						description="Strategic · Malaysia returned zero preferred suppliers."
						icon={<InboxIcon aria-hidden="true" className="size-6" />}
						size="sm"
					/>
				</div>
			</StorySection>

			<StorySection title="Do not: use Empty as a loading stand-in">
				<p className="text-foreground-secondary text-sm">
					While invoices load, use Skeleton or Spinner. Empty means the
					collection result is known and empty — not “still fetching”.
				</p>
			</StorySection>

			<StorySection title="Do: omit actions when unauthorized">
				<div className="rounded-lg border">
					<Empty
						description="Your role cannot create or list payment runs in this organization."
						icon={<ShieldAlertIcon aria-hidden="true" className="size-6" />}
						size="sm"
						title="Payment runs restricted"
					/>
				</div>
			</StorySection>

			<StorySection title="Do not: ship permanently disabled Create buttons">
				<p className="text-foreground-secondary text-sm">
					A disabled Create invoice control is not recovery guidance. Either
					offer a real authorized action or omit the action slot entirely.
				</p>
			</StorySection>
		</div>
	),
};
