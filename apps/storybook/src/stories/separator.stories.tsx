import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	Separator,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";

const evidence = contractEvidence("ui.separator");

type WorkbenchSectionProps = Readonly<{
	id: string;
	title: string;
	description: string;
	children: React.ReactNode;
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
	title: "UI System/Separator",
	component: Separator,
	tags: ["autodocs", "test"],
	parameters: {
		...contractDocsParameters(evidence, "Separator"),
	},
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"Invoice detail boundary between identity and commercial terms. Separator reinforces an already understandable structure; it does not create hierarchy, spacing, workflow state, or authorization.",
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
								Invoice review
							</h1>
							<p className="max-w-5xl text-foreground-secondary text-sm leading-6">
								Use Separator when adjacent groups need a visible boundary
								beyond spacing. Prefer headings for major hierarchy.
							</p>
						</div>
					</div>
					<dl className="grid grid-cols-2 gap-x-8 gap-y-3 rounded-lg border bg-card p-4">
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								Subject
							</dt>
							<dd className="text-sm">Invoice INV-1042</dd>
						</div>
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								Record
							</dt>
							<dd className="text-sm">Northwind Trading</dd>
						</div>
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								Boundary
							</dt>
							<dd className="text-sm">Identity / terms</dd>
						</div>
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								Use
							</dt>
							<dd className="text-sm">Visible divider</dd>
						</div>
					</dl>
				</header>

				<Card aria-labelledby="separator-invoice-title" className="shadow-none">
					<CardHeader className="gap-1">
						<CardTitle id="separator-invoice-title">Invoice INV-1042</CardTitle>
						<CardDescription>
							Northwind Trading · receivables review
						</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-4">
						<div className="grid gap-1 text-sm">
							<p className="text-foreground-secondary">Customer</p>
							<p className="text-foreground">Northwind Trading Sdn Bhd</p>
						</div>
						<Separator />
						<div className="grid gap-3 sm:grid-cols-2">
							<div className="grid gap-1 text-sm">
								<p className="text-foreground-secondary">Amount due</p>
								<p className="font-medium text-foreground">MYR 18,420.00</p>
							</div>
							<div className="grid gap-1 text-sm">
								<p className="text-foreground-secondary">Due date</p>
								<p className="text-foreground">15 Aug 2026</p>
							</div>
						</div>
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
					"Horizontal divides stacked groups. Vertical divides peer labels in one row. Decorative by default.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6 sm:grid-cols-2">
			<WorkbenchSection
				description="Use the horizontal separator to split adjacent blocks within one subject."
				id="horizontal"
				title="Horizontal · stacked groups"
			>
				<div className="grid gap-3 rounded-lg border bg-card p-4">
					<p className="font-medium text-sm">Supplier identity</p>
					<Separator />
					<p className="text-foreground-secondary text-sm">
						Bank and remittance details
					</p>
				</div>
			</WorkbenchSection>
			<WorkbenchSection
				description="Use the vertical separator to divide peer labels in a compact row."
				id="vertical"
				title="Vertical · toolbar peers"
			>
				<div className="flex h-10 items-center gap-3 rounded-lg border px-3 text-sm">
					<span>Sales</span>
					<Separator orientation="vertical" />
					<span>Inventory</span>
					<Separator orientation="vertical" />
					<span>Accounting</span>
				</div>
			</WorkbenchSection>
		</div>
	),
};

export const Usage: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Place Separator between related blocks inside a surface. Keep surrounding spacing modest.",
			},
		},
	},
	render: () => (
		<div className="grid w-80 gap-4">
			<div className="grid gap-3 rounded-lg border bg-card p-4 text-sm">
				<p className="font-medium">Remittance advice</p>
				<Separator />
				<p className="text-foreground-secondary">REF-4412 · MYR 9,200.00</p>
			</div>
		</div>
	),
};

export const StatesAndAccessibility: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Keep separators decorative when headings, grouping, or surrounding copy already explain the structure. Use decorative=false sparingly when the separator itself carries structural meaning for assistive technology.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-md gap-4">
			<div className="grid gap-3 rounded-lg border bg-card p-4">
				<p className="text-sm">Above decorative boundary</p>
				<Separator decorative />
				<p className="text-sm">Below decorative boundary</p>
			</div>
			<div className="grid gap-3 rounded-lg border bg-card p-4">
				<p className="text-sm">Section A</p>
				<Separator decorative={false} />
				<p className="text-sm">Section B</p>
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
					"Compose Separator inside Card content to split identity metadata from commercial terms without inventing extra headings.",
			},
		},
	},
	render: () => (
		<Card className="w-full max-w-5xl shadow-none">
			<CardHeader>
				<CardTitle>Purchase order PO-2201</CardTitle>
				<CardDescription>Contoso Logistics · open commitment</CardDescription>
			</CardHeader>
			<CardContent className="grid gap-4">
				<div className="grid gap-1 text-sm">
					<p className="text-foreground-secondary">Buyer</p>
					<p>Afenda Holdings</p>
				</div>
				<Separator />
				<div className="grid gap-3 text-sm sm:grid-cols-2">
					<div className="grid gap-1">
						<p className="text-foreground-secondary">Ordered</p>
						<p className="font-medium">MYR 42,000.00</p>
					</div>
					<div className="grid gap-1">
						<p className="text-foreground-secondary">Received</p>
						<p>MYR 18,500.00</p>
					</div>
				</div>
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
					"Do mark content group boundaries. Do not use Separator as vertical rhythm or as a substitute for headings.",
			},
		},
	},
	render: () => (
		<div className="grid gap-6 sm:grid-cols-2">
			<WorkbenchSection
				description="Use one divider where a content group change is already obvious from the surrounding labels."
				id="clear-boundary"
				title="Do: one clear content boundary"
			>
				<div className="grid gap-3 rounded-lg border bg-card p-4 text-sm">
					<p className="font-medium">Legal identity</p>
					<Separator />
					<p className="text-foreground-secondary">Finance contact</p>
				</div>
			</WorkbenchSection>
			<WorkbenchSection
				description="Stacked separators should not replace whitespace or section headings."
				id="line-heavy-spacing"
				title="Do not: line-heavy spacing"
			>
				<p className="text-foreground-secondary text-sm">
					Stacked separators between every field create noise. Prefer whitespace
					and SectionHeader for hierarchy.
				</p>
			</WorkbenchSection>
		</div>
	),
};

export const AdaptiveAndHighContrast: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Orientation follows content flow. Boundaries remain perceivable in high-contrast presentation, while responsive layouts avoid preserving a vertical divider after peers stack.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6">
			<StorySection title="Responsive stacked content">
				<div className="grid gap-4 rounded-lg border bg-card p-4 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
					<section className="grid gap-1">
						<p className="font-medium text-sm">Invoice identity</p>
						<p className="text-foreground-secondary text-sm">INV-1042</p>
					</section>
					<Separator className="hidden sm:block" orientation="vertical" />
					<Separator className="sm:hidden" />
					<section className="grid gap-1">
						<p className="font-medium text-sm">Commercial terms</p>
						<p className="text-foreground-secondary text-sm">MYR · Net 30</p>
					</section>
				</div>
			</StorySection>
			<StorySection title="Major hierarchy still needs a heading">
				<div className="grid gap-3 rounded-lg border bg-card p-4">
					<h3 className="font-semibold text-sm">Settlement instructions</h3>
					<Separator />
					<p className="text-foreground-secondary text-sm">
						The heading communicates the section meaning; the line only
						reinforces its boundary.
					</p>
				</div>
			</StorySection>
		</div>
	),
};
