import {
	Badge,
	Breadcrumb,
	BreadcrumbEllipsis,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	StatusBadge,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";

const evidence = contractEvidence("ui.breadcrumb");

const meta = {
	title: "UI System/Breadcrumb",
	component: Breadcrumb,
	tags: ["autodocs", "test"],
	parameters: {
		...contractDocsParameters(evidence, "Breadcrumb"),
	},
} satisfies Meta<typeof Breadcrumb>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"One receivables invoice workbench: Breadcrumb shows hierarchical location (Finance → Invoices → INV-1048). It is not a stepper and not browser history.",
			},
		},
	},
	render: () => (
		<div className="min-h-screen bg-canvas text-foreground">
			<div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
				<header className="grid gap-5 border-b pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
					<div className="grid gap-2">
						<p className="font-medium text-foreground-secondary text-sm">
							Accounts receivable
						</p>
						<div className="grid gap-1">
							<h1 className="font-semibold text-2xl tracking-tight">
								INV-1048
							</h1>
							<p className="max-w-5xl text-foreground-secondary text-sm leading-6">
								Breadcrumb marks where the operator is in the workspace tree.
								Feature code owns destinations and which ancestors are
								authorized.
							</p>
						</div>
					</div>
					<div className="grid gap-2 rounded-lg border bg-card p-4">
						<p className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
							Location
						</p>
						<Breadcrumb aria-label="Invoice location">
							<BreadcrumbList>
								<BreadcrumbItem>
									<BreadcrumbLink href="#finance">Finance</BreadcrumbLink>
								</BreadcrumbItem>
								<BreadcrumbSeparator />
								<BreadcrumbItem>
									<BreadcrumbLink href="#invoices">Invoices</BreadcrumbLink>
								</BreadcrumbItem>
								<BreadcrumbSeparator />
								<BreadcrumbItem>
									<BreadcrumbPage>INV-1048</BreadcrumbPage>
								</BreadcrumbItem>
							</BreadcrumbList>
						</Breadcrumb>
					</div>
				</header>

				<Card className="shadow-none">
					<CardHeader>
						<div className="flex flex-wrap items-center justify-between gap-3">
							<div className="grid gap-1">
								<CardTitle>Northwind Trading Sdn. Bhd.</CardTitle>
								<CardDescription>
									MYR 18,420.00 · due 15 Aug 2026
								</CardDescription>
							</div>
							<div className="flex flex-wrap items-center gap-2">
								<Badge variant="outline">Malaysia</Badge>
								<StatusBadge label="Awaiting approval" status="pending" />
							</div>
						</div>
					</CardHeader>
					<CardContent className="grid gap-2 text-foreground-secondary text-sm">
						<p>Remittance owner: Aisha Rahman</p>
						<p>Ledger: July 2026 receivables batch</p>
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
					"Keep labels concise and aligned with destination headings. Prefer stable workspace hierarchy over click-path history.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-xl gap-4">
			<div className="grid gap-2 rounded-lg border bg-card p-4">
				<Breadcrumb aria-label="Purchase order location">
					<BreadcrumbList>
						<BreadcrumbItem>
							<BreadcrumbLink href="#purchasing">Purchasing</BreadcrumbLink>
						</BreadcrumbItem>
						<BreadcrumbSeparator />
						<BreadcrumbItem>
							<BreadcrumbLink href="#purchase-orders">
								Purchase orders
							</BreadcrumbLink>
						</BreadcrumbItem>
						<BreadcrumbSeparator />
						<BreadcrumbItem>
							<BreadcrumbPage>PO-2201</BreadcrumbPage>
						</BreadcrumbItem>
					</BreadcrumbList>
				</Breadcrumb>
			</div>
			<p className="text-foreground-secondary text-sm">
				Labels match list and record titles operators already recognize.
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
					"nav landmark is labelled breadcrumb. Current page uses aria-current. Separators and ellipsis are presentation-only.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-xl gap-4">
			<div className="grid gap-2 rounded-lg border bg-card p-4">
				<Breadcrumb aria-label="Invoice detail location">
					<BreadcrumbList>
						<BreadcrumbItem>
							<BreadcrumbLink href="#finance">Finance</BreadcrumbLink>
						</BreadcrumbItem>
						<BreadcrumbSeparator />
						<BreadcrumbItem>
							<BreadcrumbLink href="#invoices">Invoices</BreadcrumbLink>
						</BreadcrumbItem>
						<BreadcrumbSeparator />
						<BreadcrumbItem>
							<BreadcrumbPage>INV-1048</BreadcrumbPage>
						</BreadcrumbItem>
					</BreadcrumbList>
				</Breadcrumb>
			</div>
			<p className="text-foreground-secondary text-sm">
				Assistive technology announces the trail as navigation. The current page
				is not a self-link.
			</p>
		</div>
	),
};

export const VariantsAndSizes: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Breadcrumb has no visual variant or size scale. Composition options are full trails versus truncated trails with BreadcrumbEllipsis.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6">
			<div className="grid gap-2">
				<p className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
					Full trail
				</p>
				<Breadcrumb aria-label="Full invoice trail">
					<BreadcrumbList>
						<BreadcrumbItem>
							<BreadcrumbLink href="#finance">Finance</BreadcrumbLink>
						</BreadcrumbItem>
						<BreadcrumbSeparator />
						<BreadcrumbItem>
							<BreadcrumbLink href="#receivables">Receivables</BreadcrumbLink>
						</BreadcrumbItem>
						<BreadcrumbSeparator />
						<BreadcrumbItem>
							<BreadcrumbLink href="#invoices">Invoices</BreadcrumbLink>
						</BreadcrumbItem>
						<BreadcrumbSeparator />
						<BreadcrumbItem>
							<BreadcrumbPage>INV-1048</BreadcrumbPage>
						</BreadcrumbItem>
					</BreadcrumbList>
				</Breadcrumb>
			</div>
			<div className="grid gap-2">
				<p className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
					Truncated trail
				</p>
				<Breadcrumb aria-label="Truncated invoice trail">
					<BreadcrumbList>
						<BreadcrumbItem>
							<BreadcrumbLink href="#finance">Finance</BreadcrumbLink>
						</BreadcrumbItem>
						<BreadcrumbSeparator />
						<BreadcrumbItem>
							<BreadcrumbEllipsis />
						</BreadcrumbItem>
						<BreadcrumbSeparator />
						<BreadcrumbItem>
							<BreadcrumbPage>INV-1048</BreadcrumbPage>
						</BreadcrumbItem>
					</BreadcrumbList>
				</Breadcrumb>
			</div>
		</div>
	),
};

export const Composition: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Breadcrumb sits above a supplier record Card. Taxonomy and lifecycle stay on Badge and StatusBadge — not in the trail.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-xl gap-4">
			<Breadcrumb aria-label="Supplier location">
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink href="#master-data">Master data</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink href="#suppliers">Suppliers</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>Northwind Trading</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>
			<Card className="shadow-none">
				<CardHeader>
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div className="grid gap-1">
							<CardTitle>Northwind Trading Sdn. Bhd.</CardTitle>
							<CardDescription>
								MY-TAX-1042 · remittance notices
							</CardDescription>
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<Badge>Strategic</Badge>
							<StatusBadge label="Active" status="active" />
						</div>
					</div>
				</CardHeader>
				<CardContent className="text-foreground-secondary text-sm">
					Trail location is independent of supplier classification and
					lifecycle.
				</CardContent>
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
					"Do use Breadcrumb for stable hierarchy with linked ancestors. Do not use it as a stepper, history stack, or unauthorized ancestor filler.",
			},
		},
	},
	render: () => (
		<div className="grid max-w-5xl gap-6 sm:grid-cols-2">
			<StorySection title="Do: link ancestors, mark current page">
				<Breadcrumb aria-label="Approved invoice trail">
					<BreadcrumbList>
						<BreadcrumbItem>
							<BreadcrumbLink href="#invoices">Invoices</BreadcrumbLink>
						</BreadcrumbItem>
						<BreadcrumbSeparator />
						<BreadcrumbItem>
							<BreadcrumbPage>INV-1048</BreadcrumbPage>
						</BreadcrumbItem>
					</BreadcrumbList>
				</Breadcrumb>
			</StorySection>

			<StorySection title="Do not: link the current page to itself">
				<div className="grid gap-2">
					<Breadcrumb aria-label="Invalid self-linked trail">
						<BreadcrumbList>
							<BreadcrumbItem>
								<BreadcrumbLink href="#inv-1048">INV-1048</BreadcrumbLink>
							</BreadcrumbItem>
						</BreadcrumbList>
					</Breadcrumb>
					<p className="text-foreground-secondary text-sm">
						The current page must use BreadcrumbPage, not a self-link.
					</p>
				</div>
			</StorySection>

			<StorySection title="Do: truncate deep trees with ellipsis">
				<Breadcrumb aria-label="Collapsed invoice trail">
					<BreadcrumbList>
						<BreadcrumbItem>
							<BreadcrumbLink href="#finance">Finance</BreadcrumbLink>
						</BreadcrumbItem>
						<BreadcrumbSeparator />
						<BreadcrumbItem>
							<BreadcrumbEllipsis />
						</BreadcrumbItem>
						<BreadcrumbSeparator />
						<BreadcrumbItem>
							<BreadcrumbPage>INV-1048</BreadcrumbPage>
						</BreadcrumbItem>
					</BreadcrumbList>
				</Breadcrumb>
			</StorySection>

			<StorySection title="Do not: treat Breadcrumb as a stepper">
				<p className="text-foreground-secondary text-sm">
					Step progress and wizard stages belong on Stepper. Breadcrumb only
					answers where the operator is in the workspace tree.
				</p>
			</StorySection>

			<StorySection title="Do: keep labels aligned with destination titles">
				<p className="text-foreground-secondary text-sm">
					Prefer “Purchase orders” over vague crumbs such as “Back” or “Previous
					page”.
				</p>
			</StorySection>

			<StorySection title="Do not: expose unauthorized ancestors">
				<p className="text-foreground-secondary text-sm">
					Feature code must omit ancestors the operator cannot open. Completing
					a visual trail is not a reason to leak restricted modules.
				</p>
			</StorySection>
		</div>
	),
};
