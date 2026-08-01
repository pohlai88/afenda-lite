import {
	Badge,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
	StatusBadge,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";

const evidence = contractEvidence("ui.chart");

function formatChartYearLabel(label: ReactNode): ReactNode {
	return <>{label} 2026</>;
}

const receivablesByMonth = [
	{ month: "Apr", invoiced: 186, paid: 120 },
	{ month: "May", invoiced: 305, paid: 248 },
	{ month: "Jun", invoiced: 237, paid: 201 },
	{ month: "Jul", invoiced: 273, paid: 265 },
] as const;

const receivablesConfig = {
	invoiced: {
		label: "Invoiced",
		series: 1,
	},
	paid: {
		label: "Paid",
		series: 2,
	},
} as const;

const meta = {
	title: "UI System/Chart",
	component: ChartContainer,
	tags: ["autodocs", "test"],
	args: {
		config: receivablesConfig,
		children: null,
	},
	parameters: {
		...contractDocsParameters(evidence, "Chart"),
	},
} satisfies Meta<typeof ChartContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

type ReceivablesChartProps = Readonly<{
	id: string;
	className?: string;
	showYAxis?: boolean;
}>;

function ReceivablesBarChart({
	id,
	className = "h-72 w-full",
	showYAxis = false,
}: ReceivablesChartProps) {
	return (
		<ChartContainer className={className} config={receivablesConfig} id={id}>
			<BarChart
				accessibilityLayer
				data={[...receivablesByMonth]}
				margin={{ left: showYAxis ? 8 : 0, right: 8 }}
			>
				<CartesianGrid vertical={false} />
				<XAxis
					axisLine={false}
					dataKey="month"
					tickLine={false}
					tickMargin={8}
				/>
				{showYAxis ? (
					<YAxis
						axisLine={false}
						domain={[0, "dataMax + 40"]}
						tickLine={false}
						tickMargin={8}
						width={36}
					/>
				) : null}
				<ChartTooltip
					content={
						<ChartTooltipContent labelFormatter={formatChartYearLabel} />
					}
					cursor={false}
				/>
				<ChartLegend content={<ChartLegendContent />} />
				<Bar dataKey="invoiced" fill="var(--color-invoiced)" radius={4} />
				<Bar dataKey="paid" fill="var(--color-paid)" radius={4} />
			</BarChart>
		</ChartContainer>
	);
}

function ReceivablesTable() {
	return (
		<div className="overflow-x-auto">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead scope="col">Month</TableHead>
						<TableHead className="text-right" scope="col">
							Invoiced (MYR thousands)
						</TableHead>
						<TableHead className="text-right" scope="col">
							Paid (MYR thousands)
						</TableHead>
						<TableHead className="text-right" scope="col">
							Open gap (MYR thousands)
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{receivablesByMonth.map((row) => (
						<TableRow key={row.month}>
							<TableCell>{row.month} 2026</TableCell>
							<TableCell className="text-right font-mono tabular-nums">
								{row.invoiced}
							</TableCell>
							<TableCell className="text-right font-mono tabular-nums">
								{row.paid}
							</TableCell>
							<TableCell className="text-right font-mono tabular-nums">
								{row.invoiced - row.paid}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}

function EmptyChartFrame() {
	return (
		<div
			className="grid min-h-56 place-items-center rounded-lg border border-dashed p-6 text-center"
			role="status"
		>
			<div className="grid max-w-sm gap-1">
				<p className="font-medium text-foreground text-sm">
					No receivables data for this period
				</p>
				<p className="text-foreground-secondary text-sm">
					Change the reporting period or verify that invoices have been posted.
				</p>
			</div>
		</div>
	);
}

export const Overview: Story = {
	args: {},
	tags: ["visual"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"An ERP chart answers one declared analytical question using comparable, permission-scoped data. The visual supports pattern recognition; the table preserves exact values and auditability.",
			},
		},
	},
	render: () => (
		<div className="min-h-screen bg-canvas text-foreground">
			<div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
				<header className="grid gap-3 border-b pb-6">
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="outline">Accounts receivable</Badge>
						<StatusBadge label="Operational" size="sm" status="active" />
					</div>
					<div className="grid gap-2">
						<h1 className="font-semibold text-2xl tracking-tight">
							How closely are collections tracking invoicing?
						</h1>
						<p className="max-w-5xl text-foreground-secondary text-sm leading-6">
							Apr–Jul 2026 · MYR thousands · current organization. Feature code
							owns authorization, aggregation, period boundaries, currency, and
							source-of-truth selection.
						</p>
					</div>
				</header>

				<Card className="shadow-none">
					<CardHeader>
						<CardTitle>Invoiced versus paid by month</CardTitle>
						<CardDescription>
							Comparable monthly totals · MYR thousands · Apr–Jul 2026
						</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-5">
						<figure className="grid gap-3">
							<figcaption className="sr-only">
								Grouped bar chart comparing monthly invoiced and paid
								receivables amounts from April through July 2026.
							</figcaption>
							<ReceivablesBarChart id="receivables-overview" showYAxis />
						</figure>
						<p className="text-foreground-secondary text-sm leading-6">
							July shows the smallest open gap at MYR 8k. That observation is a
							follow-up signal, not evidence of cause, posting completeness, or
							collection quality by itself.
						</p>
					</CardContent>
				</Card>

				<section aria-labelledby="exact-values-title" className="grid gap-3">
					<div className="grid gap-1">
						<h2
							className="font-semibold text-base tracking-tight"
							id="exact-values-title"
						>
							Exact values
						</h2>
						<p className="text-foreground-secondary text-sm">
							Use the tabular representation for reconciliation, posting,
							export, and assistive-technology access to exact amounts.
						</p>
					</div>
					<Card className="shadow-none">
						<CardContent className="pt-6">
							<ReceivablesTable />
						</CardContent>
					</Card>
				</section>
			</div>
		</div>
	),
};

export const Usage: Story = {
	args: {},
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Approved chart usage begins with a question, then defines metric, unit, comparison basis, period, and authoritative source. ChartContainer provides visual framing; domain code owns analytical meaning.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-4xl gap-6">
			<StorySection title="One analytical question">
				<div className="grid gap-3">
					<div className="grid gap-1">
						<p className="font-medium text-foreground text-sm">
							How closely are collections tracking invoicing?
						</p>
						<p className="text-foreground-secondary text-sm">
							Invoiced versus paid · MYR thousands · monthly · Apr–Jul 2026
						</p>
					</div>
					<ReceivablesBarChart id="receivables-semantic" showYAxis />
				</div>
			</StorySection>

			<StorySection title="Declared ownership boundary">
				<div className="grid gap-2 text-foreground-secondary text-sm">
					<p>
						Feature code owns query authorization, tenant scope, currency,
						period definition, aggregation, rounding, and empty-state meaning.
					</p>
					<p>
						Chart primitives own rendering, responsive geometry, tooltip and
						legend composition, and semantic chart tokens.
					</p>
				</div>
			</StorySection>
		</div>
	),
};

export const ResponsiveLayout: Story = {
	args: {},
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"ChartContainer adapts to its parent width. Product layouts must still reserve a deliberate height, preserve readable labels, and provide horizontal table overflow when exact values cannot fit.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
			<StorySection title="Wide operational panel">
				<ReceivablesBarChart
					className="h-72 w-full"
					id="receivables-responsive-wide"
					showYAxis
				/>
			</StorySection>
			<StorySection title="Narrow side panel">
				<div className="grid gap-3">
					<ReceivablesBarChart
						className="h-64 w-full"
						id="receivables-responsive-narrow"
					/>
					<p className="text-foreground-secondary text-sm">
						Keep the same question and series meaning. Reduce secondary axis
						decoration before removing labels, units, or the exact-value path.
					</p>
				</div>
			</StorySection>
		</div>
	),
};

export const StatesAndAccessibility: Story = {
	args: {},
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Charts require a visible title, period, unit, named series, keyboard-compatible chart rendering where supported, and a non-visual route to exact values. Colour must never be the only differentiator.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-4xl gap-6">
			<StorySection title="Accessible analytical figure">
				<figure className="grid gap-4">
					<figcaption className="grid gap-1">
						<p className="font-semibold text-base tracking-tight">
							Invoiced versus paid by month
						</p>
						<p className="text-foreground-secondary text-sm">
							MYR thousands · Apr–Jul 2026. Legend labels identify both series
							independently of colour.
						</p>
					</figcaption>
					<ReceivablesBarChart
						className="h-64 w-full"
						id="receivables-accessibility"
						showYAxis
					/>
					<div className="grid gap-2">
						<p className="font-medium text-foreground text-sm">
							Exact-value alternative
						</p>
						<ReceivablesTable />
					</div>
				</figure>
			</StorySection>

			<StorySection title="Empty period">
				<EmptyChartFrame />
			</StorySection>

			<StorySection title="High-contrast contract">
				<p className="text-foreground-secondary text-sm leading-6">
					Series remain named in the legend and tooltip, grid and axis contrast
					use semantic tokens, and exact values remain available when chart
					colours or geometry are difficult to distinguish.
				</p>
			</StorySection>
		</div>
	),
};

export const Composition: Story = {
	args: {},
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Compose ChartContainer inside a Card that names the decision context. Badge owns taxonomy, StatusBadge owns operational state, and surrounding copy owns interpretation and caveats.",
			},
		},
	},
	render: () => (
		<Card className="w-full max-w-4xl shadow-none">
			<CardHeader>
				<div className="flex flex-wrap items-center gap-2">
					<Badge variant="outline">Receivables</Badge>
					<StatusBadge label="Close in progress" size="sm" status="pending" />
				</div>
				<CardTitle>How closely are collections tracking invoicing?</CardTitle>
				<CardDescription>
					MYR thousands · Apr–Jul 2026 · current organization ledger
				</CardDescription>
			</CardHeader>
			<CardContent className="grid gap-4">
				<ReceivablesBarChart id="receivables-composition" showYAxis />
				<p className="text-foreground-secondary text-sm leading-6">
					Use the pattern to select a period for investigation. Confirm exact
					posted amounts and document status in the authoritative receivables
					workflow before acting.
				</p>
			</CardContent>
		</Card>
	),
};

export const DoAndDoNot: Story = {
	args: {},
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Do make the analytical contract explicit and preserve access to exact values. Do not use chart geometry as audit evidence, mix incompatible bases, hide zero or empty states, or add visual complexity without decision value.",
			},
		},
	},
	render: () => (
		<div className="grid max-w-5xl gap-6 sm:grid-cols-2">
			<StorySection title="Do: state question, metric, unit, and period">
				<div className="grid gap-2">
					<p className="font-medium text-foreground text-sm">
						How closely are collections tracking invoicing?
					</p>
					<p className="text-foreground-secondary text-sm">
						Invoiced versus paid · MYR thousands · Apr–Jul 2026
					</p>
					<ReceivablesBarChart
						className="h-56 w-full"
						id="receivables-do-contract"
					/>
				</div>
			</StorySection>

			<StorySection title="Do not: decorate without a question">
				<div className="rounded-md border border-dashed p-4 text-foreground-tertiary text-sm leading-6">
					A colourful trend with no metric definition, unit, period, comparison
					basis, or intended decision is decoration—not ERP analytics.
				</div>
			</StorySection>

			<StorySection title="Do: provide exact values">
				<ReceivablesTable />
			</StorySection>

			<StorySection title="Do not: treat geometry as ledger truth">
				<div className="rounded-md border border-dashed p-4 text-foreground-tertiary text-sm leading-6">
					Bar height is not a posted journal amount, audit trail, or proof of
					cause. Authoritative figures remain in the governed domain record.
				</div>
			</StorySection>

			<StorySection title="Do: compare compatible series">
				<p className="text-foreground-secondary text-sm leading-6">
					Use the same organization scope, currency, aggregation grain, period
					boundary, and accounting basis for every series in the frame.
				</p>
			</StorySection>

			<StorySection title="Do not: mix incompatible bases">
				<div className="rounded-md border border-dashed p-4 text-foreground-tertiary text-sm leading-6">
					Do not compare MYR invoiced with USD paid, calendar months with fiscal
					weeks, or gross values with net values without explicit normalization.
				</div>
			</StorySection>

			<StorySection title="Do: explain empty data">
				<EmptyChartFrame />
			</StorySection>

			<StorySection title="Do not: silently render an empty plot">
				<div className="rounded-md border border-dashed p-4 text-foreground-tertiary text-sm leading-6">
					An empty axis does not tell operators whether there are no records,
					filters excluded everything, access was denied, or the query failed.
				</div>
			</StorySection>
		</div>
	),
};
