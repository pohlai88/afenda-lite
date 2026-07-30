import { Badge, MetricCard, MetricGrid } from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { expect, within } from "storybook/test";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";

type SectionProps = Readonly<{
	id: string;
	title: string;
	description: string;
	children: ReactNode;
}>;

function WorkbenchSection({ id, title, description, children }: SectionProps) {
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

function MetricCardOperationalOverview() {
	return (
		<div className="min-h-screen bg-canvas text-foreground">
			<div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
				<header className="grid gap-5 border-b pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
					<div className="grid gap-2">
						<p className="font-medium text-foreground-secondary text-sm">
							Accounts receivable
						</p>
						<div className="grid gap-1">
							<h1 className="font-semibold text-2xl tracking-tight">
								Receivables health
							</h1>
							<p className="max-w-5xl text-foreground-secondary text-sm leading-6">
								Review current exposure, collection risk and operating
								efficiency. Trend communicates numerical direction only; feature
								copy explains business consequence.
							</p>
						</div>
					</div>

					<dl className="grid grid-cols-2 gap-x-8 gap-y-3 rounded-lg border bg-card p-4">
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								Reporting period
							</dt>
							<dd className="text-sm">July 2026</dd>
						</div>
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								As of
							</dt>
							<dd className="text-sm">28 Jul 2026 · 09:45</dd>
						</div>
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								Currency
							</dt>
							<dd className="text-sm">MYR</dd>
						</div>
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								Comparison
							</dt>
							<dd className="text-sm">Prior month</dd>
						</div>
					</dl>
				</header>

				<main className="grid gap-9">
					<WorkbenchSection
						description="Primary KPIs communicate material value and comparison basis without decorative state treatment."
						id="metric-primary-exposure"
						title="Financial exposure"
					>
						<MetricGrid
							columns={3}
							metrics={[
								{
									title: "Open receivables",
									value: "MYR 482,300.00",
									change: 8.4,
									trend: "up",
									description: "vs prior month",
								},
								{
									title: "Overdue balance",
									value: "MYR 70,200.00",
									change: 6,
									trend: "up",
									description: "vs last week · collection exposure increased",
								},
								{
									title: "Unallocated receipts",
									value: "MYR 12,400.00",
									description: "Six receipts awaiting remittance match",
								},
							]}
						/>
					</WorkbenchSection>

					<WorkbenchSection
						description="Percentage and count metrics use the same hierarchy but retain their own comparison basis. Non-percentage deltas use preformatted change strings."
						id="metric-operating-efficiency"
						title="Collection efficiency"
					>
						<MetricGrid
							columns={3}
							metrics={[
								{
									title: "Collection rate",
									value: "94.0%",
									change: "+2.1 pp",
									trend: "up",
									description: "vs prior month",
								},
								{
									title: "Average collection period",
									value: "31 days",
									change: "-3 days",
									trend: "down",
									description: "vs prior month · fewer days outstanding",
								},
								{
									title: "Disputed invoices",
									value: 8,
									change: "0",
									trend: "neutral",
									description: "unchanged vs prior week",
								},
							]}
						/>
					</WorkbenchSection>

					<WorkbenchSection
						description="Missing, stale and non-comparable metrics remain explicit instead of presenting misleading neutral trends."
						id="metric-data-quality"
						title="Data availability"
					>
						<div className="grid gap-4 sm:grid-cols-3">
							<MetricCard
								description="Unavailable · dispute valuation not published"
								title="Dispute exposure"
								value="—"
							/>
							<MetricCard
								description="Stale · last refreshed 25 Jul 2026"
								title="Promise-to-pay conversion"
								value="—"
							/>
							<MetricCard
								description="No comparable prior-period cohort"
								title="New-customer collection rate"
								value="91.0%"
							/>
						</div>
					</WorkbenchSection>
				</main>
			</div>
		</div>
	);
}

const evidence = contractEvidence("ui.metric-card");
const meta = {
	title: "UI System/Metric Card",
	component: MetricCard,
	tags: ["autodocs", "test"],
	args: {
		title: "Open receivables",
	},
	argTypes: {
		trend: {
			control: "select",
			options: evidence.variants,
		},
	},
	parameters: {
		controls: { include: ["trend"], sort: "none" },
		...contractDocsParameters(evidence, "Metric Card"),
	},
} satisfies Meta<typeof MetricCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"One receivables finance review surface: reporting basis, material exposure, collection efficiency, and explicit unavailable or stale evidence. Trend communicates direction only — never business sentiment.",
			},
		},
	},
	render: () => <MetricCardOperationalOverview />,
};

export const SemanticUsage: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Approved ERP roles: current value, directional comparison, operational count, and explicit unavailable evidence. MetricCard presents feature-calculated facts; it does not calculate KPIs, thresholds, sentiment, or freshness.",
			},
		},
	},
	render: () => (
		<div className="grid gap-6 sm:grid-cols-2">
			<StorySection title="Current value with named basis">
				<MetricCard
					change={8.4}
					description="8.4% vs June 2026 close"
					title="Open receivables"
					trend="up"
					value="MYR 482,300.00"
				/>
			</StorySection>
			<StorySection title="Operational count with unit">
				<MetricCard
					change="-2 invoices"
					description="vs 21 Jul 2026 queue snapshot"
					title="Invoices awaiting approval"
					trend="down"
					value={14}
				/>
			</StorySection>
			<StorySection title="Known zero">
				<MetricCard
					description="Measured through 28 Jul 2026"
					title="Write-offs this period"
					value="MYR 0.00"
				/>
			</StorySection>
			<StorySection title="Unavailable evidence">
				<MetricCard
					description="Unavailable · dispute valuation not published"
					title="Dispute exposure"
					value="—"
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
					"Scannable KPI trio with magnitude, unit, freshness, and comparison basis. Number changes represent percentage deltas; other units use preformatted strings.",
			},
		},
	},
	render: () => (
		<div className="grid gap-4 sm:grid-cols-3">
			<MetricCard
				change={8.4}
				description="vs prior month"
				title="Open receivables"
				trend="up"
				value="MYR 482,300.00"
			/>
			<MetricCard
				change="-2"
				description="count vs last week"
				title="Overdue invoices"
				trend="down"
				value={14}
			/>
			<MetricCard
				description="Unavailable · remittance matching incomplete"
				title="Unallocated receipts"
				value="—"
			/>
		</div>
	),
};

export const VariantsAndSizes: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Directional trend inventory using one stable KPI. MetricCard currently exposes trend variants only — it does not expose a consumer-selectable size axis. Direction reports numerical movement only and does not encode favorable or unfavorable performance.",
			},
		},
	},
	render: () => (
		<div className="grid gap-4 sm:grid-cols-3">
			<MetricCard
				change="+4 pp"
				description="above prior month"
				title="Collection rate"
				trend="up"
				value="96.0%"
			/>
			<MetricCard
				change="-3 pp"
				description="below prior month"
				title="Collection rate"
				trend="down"
				value="89.0%"
			/>
			<MetricCard
				change="0 pp"
				description="unchanged from prior month"
				title="Collection rate"
				trend="neutral"
				value="94.0%"
			/>
		</div>
	),
};

export const StatesAndAccessibility: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Loading preserves metric identity and layout. Zero, unavailable and non-comparable states remain distinguishable. Trend meaning must be present in text rather than colour or icon alone.",
			},
		},
	},
	render: () => (
		<fieldset className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			<legend className="sr-only">Receivables metric states</legend>
			<MetricCard loading title="Open receivables" />
			<MetricCard
				description="No write-offs recorded"
				title="Write-offs this period"
				value="MYR 0.00"
			/>
			<MetricCard
				description="Unavailable · dispute valuation not published"
				title="Dispute exposure"
				value="—"
			/>
			<MetricCard
				description="No comparable prior-period cohort"
				title="Collection rate"
				value="94.0%"
			/>
		</fieldset>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(canvas.getByText("MYR 0.00")).toBeVisible();
		await expect(
			canvas.getByText("Unavailable · dispute valuation not published"),
		).toBeVisible();
		await expect(
			canvas.getByText("No comparable prior-period cohort"),
		).toBeVisible();
	},
};

export const Composition: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"MetricGrid groups metrics sharing one reporting scope and comparison basis. Badge identifies reporting context only; it does not represent lifecycle or health.",
			},
		},
	},
	render: () => (
		<section
			aria-labelledby="receivables-health-title"
			className="grid max-w-5xl gap-4"
		>
			<header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
				<div className="grid gap-1">
					<h2
						className="font-semibold text-lg tracking-tight"
						id="receivables-health-title"
					>
						Receivables health
					</h2>
					<p className="text-foreground-secondary text-sm">
						July 2026 reporting period · comparison against June 2026
					</p>
				</div>
				<Badge variant="outline">As of 28 Jul 2026</Badge>
			</header>
			<MetricGrid
				columns={3}
				metrics={[
					{ title: "Open balance", value: "MYR 482,300.00" },
					{ title: "Overdue balance", value: "MYR 64,900.00" },
					{ title: "Collection rate", value: "94.0%" },
				]}
			/>
		</section>
	),
};

export const PeriodOperations: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Maximum approved four-column finance strip. MetricGrid owns responsive layout; feature code owns KPI calculation, thresholds and reporting scope. Rising expenses are not labelled favourable.",
			},
		},
	},
	render: () => (
		<div className="grid max-w-6xl gap-4">
			<div className="grid gap-1">
				<h2 className="font-semibold text-lg tracking-tight">
					Period operations
				</h2>
				<p className="text-foreground-secondary text-sm">
					July 2026 actuals against approved operating plan
				</p>
			</div>
			<MetricGrid
				columns={4}
				metrics={[
					{
						title: "Net profit",
						value: "MYR 1.82M",
						change: 7,
						trend: "up",
						description: "7% above approved plan",
					},
					{
						title: "Operating expenses",
						value: "MYR 940K",
						change: 3,
						trend: "up",
						description: "3% above approved plan",
					},
					{
						title: "Cash reserves",
						value: "MYR 3.20M",
						description: "92 days operating coverage",
					},
					{
						title: "Budget utilisation",
						value: "68.0%",
						description: "Seven months elapsed",
					},
				]}
			/>
		</div>
	),
};

export const DoAndDoNot: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Metric identity, reporting scope, as-of time, comparison direction, unit, basis, and availability must remain explicit. Trend must never substitute for business interpretation.",
			},
		},
	},
	render: () => (
		<div className="grid gap-6 sm:grid-cols-2">
			<StorySection title="Do: name the comparison basis">
				<div className="grid gap-3">
					<MetricCard
						change="+3 pp"
						description="vs prior month"
						title="Collection rate"
						trend="up"
						value="94.0%"
					/>
					<p className="text-foreground-secondary text-sm">
						The operator can identify direction, magnitude, unit and comparison
						period.
					</p>
				</div>
			</StorySection>
			<StorySection title="Do not: present an unexplained change">
				<div className="grid gap-3">
					<MetricCard
						change={3}
						description="Changed"
						title="Collection rate"
						trend="up"
						value="94.0%"
					/>
					<p className="text-foreground-secondary text-sm">
						“3%” remains ambiguous without a comparison basis, and the
						description does not name the unit of decision.
					</p>
				</div>
			</StorySection>
			<StorySection title="Do: explain harmful numerical movement">
				<div className="grid gap-3">
					<MetricCard
						change={6}
						description="6% vs last week · collection risk increased"
						title="Overdue balance"
						trend="up"
						value="MYR 70,200.00"
					/>
					<p className="text-foreground-secondary text-sm">
						The upward direction is factual; the description explains the
						negative business consequence.
					</p>
				</div>
			</StorySection>
			<StorySection title="Do not: equate upward with favorable">
				<div className="grid gap-3">
					<MetricCard
						change={6}
						description="Performance improved"
						title="Overdue balance"
						trend="up"
						value="MYR 70,200.00"
					/>
					<p className="text-foreground-secondary text-sm">
						Trend direction alone cannot determine KPI sentiment.
					</p>
				</div>
			</StorySection>
			<StorySection title="Do: distinguish zero from unavailable">
				<div className="grid gap-3">
					<MetricCard
						description="No write-offs recorded"
						title="Write-offs this period"
						value="MYR 0.00"
					/>
					<p className="text-foreground-secondary text-sm">
						A measured zero remains a published value.
					</p>
				</div>
			</StorySection>
			<StorySection title="Do not: replace a known zero with a dash">
				<div className="grid gap-3">
					<MetricCard
						description="No write-offs recorded"
						title="Write-offs this period"
						value="—"
					/>
					<p className="text-foreground-secondary text-sm">
						A dash means unavailable — not a measured zero.
					</p>
				</div>
			</StorySection>
		</div>
	),
};
