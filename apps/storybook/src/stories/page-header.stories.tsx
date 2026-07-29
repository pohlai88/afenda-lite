import {
	Button,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	EntityHeader,
	PageHeader,
	PageHeaderActions,
	PageHeaderDescription,
	PageHeaderHeading,
	SectionHeader,
	StatusBadge,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";

const evidence = contractEvidence("ui.page-header");

const meta = {
	title: "UI System/Page Header",
	component: PageHeader,
	tags: ["autodocs", "test"],
	parameters: {
		...contractDocsParameters(evidence, "Page Header"),
	},
} satisfies Meta<typeof PageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		docs: {
			description: {
				story:
					"One payables workspace: PageHeader owns the page subject once. Filters and dense tools stay out of the header — actions stay scoped to this page.",
			},
		},
	},
	render: () => (
		<div className="min-h-screen bg-canvas text-foreground">
			<div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
				<PageHeader aria-labelledby="payables-page-title">
					<div className="grid gap-1">
						<p className="text-sm font-medium text-foreground-secondary">
							Accounts payable
						</p>
						<PageHeaderHeading id="payables-page-title">
							Supplier invoices
						</PageHeaderHeading>
						<PageHeaderDescription>
							Review approval readiness and posting eligibility across legal
							entities for July 2026.
						</PageHeaderDescription>
					</div>
					<PageHeaderActions>
						<Button type="button" variant="outline">
							Export
						</Button>
						<Button type="button">New invoice</Button>
					</PageHeaderActions>
				</PageHeader>

				<Card className="shadow-none">
					<CardHeader>
						<CardTitle>Open for approval</CardTitle>
						<CardDescription>
							14 invoices await finance review · org-fragrant-lake
						</CardDescription>
					</CardHeader>
					<CardContent className="text-sm text-foreground-secondary">
						Collection filters and column controls belong in a toolbar below the
						page header — not inside PageHeader actions.
					</CardContent>
				</Card>
			</div>
		</div>
	),
};

export const SemanticUsage: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"One header family: PageHeader for page identity, SectionHeader for major sections with consumer-owned headings, EntityHeader for record-detail subjects.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-4xl gap-10">
			<StorySection title="PageHeader · page identity">
				<PageHeader>
					<div>
						<PageHeaderHeading>Purchase orders</PageHeaderHeading>
						<PageHeaderDescription>
							Track open commitments and receiving readiness.
						</PageHeaderDescription>
					</div>
					<PageHeaderActions>
						<Button type="button" variant="outline">
							Export
						</Button>
						<Button type="button">New order</Button>
					</PageHeaderActions>
				</PageHeader>
			</StorySection>

			<StorySection title="SectionHeader · section layout with real heading">
				<SectionHeader>
					<div className="grid gap-1">
						<h2 className="text-base font-semibold tracking-tight">
							Commercial terms
						</h2>
						<p className="text-sm text-foreground-secondary">
							Payment and delivery conditions for this supplier.
						</p>
					</div>
					<Button type="button" size="sm" variant="outline">
						Edit terms
					</Button>
				</SectionHeader>
			</StorySection>

			<StorySection title="EntityHeader · record subject">
				<EntityHeader
					title="INV-1042"
					status={<StatusBadge status="active" label="Approved" />}
					description="Northwind Trading Sdn. Bhd."
					metadata={
						<>
							<span>MYR 18,420.00</span>
							<span>Due 15 Aug 2026</span>
						</>
					}
					actions={
						<Button type="button" variant="outline">
							More actions
						</Button>
					}
				/>
			</StorySection>
		</div>
	),
};

export const Usage: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Use PageHeader once per page. Keep actions limited to page-scoped commands — Export and New invoice fit; filters do not.",
			},
		},
	},
	render: () => (
		<PageHeader>
			<div>
				<PageHeaderHeading>Supplier invoices</PageHeaderHeading>
				<PageHeaderDescription>
					Review approval and posting readiness.
				</PageHeaderDescription>
			</div>
			<PageHeaderActions>
				<Button type="button" variant="outline">
					Export
				</Button>
				<Button type="button">New invoice</Button>
			</PageHeaderActions>
		</PageHeader>
	),
};

export const StatesAndAccessibility: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"One primary h1 identifies the workspace. Descriptions clarify scope when the title alone is not enough. Actions keep clear names.",
			},
		},
	},
	render: () => (
		<PageHeader aria-labelledby="invoice-page-title">
			<div>
				<PageHeaderHeading id="invoice-page-title">
					Accounts payable
				</PageHeaderHeading>
				<PageHeaderDescription>
					One page-level heading identifies this workspace.
				</PageHeaderDescription>
			</div>
			<PageHeaderActions>
				<Button type="button" variant="outline">
					Download register
				</Button>
			</PageHeaderActions>
		</PageHeader>
	),
};

export const Composition: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"EntityHeader composes StatusBadge for authoritative lifecycle. Metadata stays concise and read-only; dense tools stay outside the header.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-4xl gap-8">
			<EntityHeader
				title="INV-1042"
				status={<StatusBadge status="active" label="Approved" />}
				description="Northwind Trading Sdn. Bhd."
				metadata={
					<>
						<span>MYR 18,420.00</span>
						<span>Due 15 Aug 2026</span>
						<span>Owner Aisha Rahman</span>
					</>
				}
				actions={
					<>
						<Button type="button" variant="outline">
							Print
						</Button>
						<Button type="button">Post to ledger</Button>
					</>
				}
			/>
			<Card className="shadow-none">
				<CardHeader>
					<CardTitle>Line summary</CardTitle>
					<CardDescription>
						Record body content stays below EntityHeader.
					</CardDescription>
				</CardHeader>
				<CardContent className="text-sm text-foreground-secondary">
					Do not overload entity metadata with editable fields or full line
					tables.
				</CardContent>
			</Card>
		</div>
	),
};

export const DoAndDoNot: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Do keep one clear page heading and StatusBadge for lifecycle. Do not put filters in PageHeader or replace StatusBadge with a categorical Badge.",
			},
		},
	},
	render: () => (
		<div className="grid gap-6 sm:grid-cols-2">
			<StorySection title="Do: one clear page heading">
				<PageHeaderHeading>Purchase orders</PageHeaderHeading>
			</StorySection>
			<StorySection title="Do not: let actions compete with the title">
				<p className="text-sm text-foreground-secondary">
					Keep secondary commands visually subordinate to the page subject. Move
					filters, columns, and pagination out of PageHeader.
				</p>
			</StorySection>
			<StorySection title="Do: StatusBadge for approval state">
				<EntityHeader
					title="INV-1048"
					status={<StatusBadge status="pending" label="Awaiting approval" />}
					description="Contoso Logistics Pte. Ltd."
				/>
			</StorySection>
			<StorySection title="Do not: EntityHeader on list pages">
				<p className="text-sm text-foreground-secondary">
					List and report workspaces use PageHeader. EntityHeader is for the
					record itself as the page subject.
				</p>
			</StorySection>
		</div>
	),
};
