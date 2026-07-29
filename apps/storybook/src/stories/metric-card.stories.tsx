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

function MetricCardOperationalOverview() {
	return (
		<div className="min-h-screen bg-canvas text-foreground">
			<div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
				<header className="grid gap-5 border-b pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
					<div className="grid gap-2">
						<p className="text-sm font-medium text-foreground-secondary">
							Accounts receivable
						</p>
						<div className="grid gap-1">
							<h1 className="text-2xl font-semibold tracking-tight">
								Receivables health
							</h1>
							<p className="max-w-5xl text-sm leading-6 text-foreground-secondary">
								Review current exposure, collection risk and operating
								efficiency. Trend communicates numerical direction only; feature
								copy explains business consequence.
							</p>
						</div>
					</div>

					<dl className="grid grid-cols-2 gap-x-8 gap-y-3 rounded-lg border bg-card p-4">
						<div className="grid gap-1">
							<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								Reporting period
							</dt>
							<dd className="text-sm">July 2026</dd>
						</div>
						<div className="grid gap-1">
							<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								As of
							</dt>
							<dd className="text-sm">28 Jul 2026 · 09:45</dd>
						</div>
						<div className="grid gap-1">
							<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								Currency
							</dt>
							<dd className="text-sm">MYR</dd>
						</div>
						<div className="grid gap-1">
							<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								Comparison
							</dt>
							<dd className="text-sm">Prior month</dd>
						</div>
					</dl>
				</header>

				<main className="grid gap-9">
					<WorkbenchSection
						id="metric-primary-exposure"
						title="Financial exposure"
						description="Primary KPIs communicate material value and comparison basis without decorative state treatment."
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
						id="metric-operating-efficiency"
						title="Collection efficiency"
						description="Percentage and count metrics use the same hierarchy but retain their own comparison basis. Non-percentage deltas use preformatted change strings."
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
						id="metric-data-quality"
						title="Data availability"
						description="Missing, stale and non-comparable metrics remain explicit instead of presenting misleading neutral trends."
					>
						<div className="grid gap-4 sm:grid-cols-3">
							<MetricCard
								title="Dispute exposure"
								value="—"
								description="Unavailable · dispute valuation not published"
							/>
							<MetricCard
								title="Promise-to-pay conversion"
								value="—"
								description="Stale · last refreshed 25 Jul 2026"
							/>
							<MetricCard
								title="New-customer collection rate"
								value="91.0%"
								description="No comparable prior-period cohort"
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
					title="Open receivables"
					value="MYR 482,300.00"
					change={8.4}
					trend="up"
					description="8.4% vs June 2026 close"
				/>
			</StorySection>
			<StorySection title="Operational count with unit">
				<MetricCard
					title="Invoices awaiting approval"
					value={14}
					change="-2 invoices"
					trend="down"
					description="vs 21 Jul 2026 queue snapshot"
				/>
			</StorySection>
			<StorySection title="Known zero">
				<MetricCard
					title="Write-offs this period"
					value="MYR 0.00"
					description="Measured through 28 Jul 2026"
				/>
			</StorySection>
			<StorySection title="Unavailable evidence">
				<MetricCard
					title="Dispute exposure"
					value="—"
					description="Unavailable · dispute valuation not published"
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
				title="Open receivables"
				value="MYR 482,300.00"
				change={8.4}
				trend="up"
				description="vs prior month"
			/>
			<MetricCard
				title="Overdue invoices"
				value={14}
				change="-2"
				trend="down"
				description="count vs last week"
			/>
			<MetricCard
				title="Unallocated receipts"
				value="—"
				description="Unavailable · remittance matching incomplete"
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
				title="Collection rate"
				value="96.0%"
				change="+4 pp"
				trend="up"
				description="above prior month"
			/>
			<MetricCard
				title="Collection rate"
				value="89.0%"
				change="-3 pp"
				trend="down"
				description="below prior month"
			/>
			<MetricCard
				title="Collection rate"
				value="94.0%"
				change="0 pp"
				trend="neutral"
				description="unchanged from prior month"
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
			<MetricCard title="Open receivables" loading />
			<MetricCard
				title="Write-offs this period"
				value="MYR 0.00"
				description="No write-offs recorded"
			/>
			<MetricCard
				title="Dispute exposure"
				value="—"
				description="Unavailable · dispute valuation not published"
			/>
			<MetricCard
				title="Collection rate"
				value="94.0%"
				description="No comparable prior-period cohort"
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
			className="grid max-w-5xl gap-4"
			aria-labelledby="receivables-health-title"
		>
			<header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
				<div className="grid gap-1">
					<h2
						className="text-lg font-semibold tracking-tight"
						id="receivables-health-title"
					>
						Receivables health
					</h2>
					<p className="text-sm text-foreground-secondary">
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
				<h2 className="text-lg font-semibold tracking-tight">
					Period operations
				</h2>
				<p className="text-sm text-foreground-secondary">
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
						title="Collection rate"
						value="94.0%"
						change="+3 pp"
						trend="up"
						description="vs prior month"
					/>
					<p className="text-sm text-foreground-secondary">
						The operator can identify direction, magnitude, unit and comparison
						period.
					</p>
				</div>
			</StorySection>
			<StorySection title="Do not: present an unexplained change">
				<div className="grid gap-3">
					<MetricCard
						title="Collection rate"
						value="94.0%"
						change={3}
						trend="up"
						description="Changed"
					/>
					<p className="text-sm text-foreground-secondary">
						“3%” remains ambiguous without a comparison basis, and the
						description does not name the unit of decision.
					</p>
				</div>
			</StorySection>
			<StorySection title="Do: explain harmful numerical movement">
				<div className="grid gap-3">
					<MetricCard
						title="Overdue balance"
						value="MYR 70,200.00"
						change={6}
						trend="up"
						description="6% vs last week · collection risk increased"
					/>
					<p className="text-sm text-foreground-secondary">
						The upward direction is factual; the description explains the
						negative business consequence.
					</p>
				</div>
			</StorySection>
			<StorySection title="Do not: equate upward with favorable">
				<div className="grid gap-3">
					<MetricCard
						title="Overdue balance"
						value="MYR 70,200.00"
						change={6}
						trend="up"
						description="Performance improved"
					/>
					<p className="text-sm text-foreground-secondary">
						Trend direction alone cannot determine KPI sentiment.
					</p>
				</div>
			</StorySection>
			<StorySection title="Do: distinguish zero from unavailable">
				<div className="grid gap-3">
					<MetricCard
						title="Write-offs this period"
						value="MYR 0.00"
						description="No write-offs recorded"
					/>
					<p className="text-sm text-foreground-secondary">
						A measured zero remains a published value.
					</p>
				</div>
			</StorySection>
			<StorySection title="Do not: replace a known zero with a dash">
				<div className="grid gap-3">
					<MetricCard
						title="Write-offs this period"
						value="—"
						description="No write-offs recorded"
					/>
					<p className="text-sm text-foreground-secondary">
						A dash means unavailable — not a measured zero.
					</p>
				</div>
			</StorySection>
		</div>
	),
};
