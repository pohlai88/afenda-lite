import { Badge, MetricCard, MetricGrid } from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ComponentShowcase } from "./catalog";
import {
	contractEvidence,
	evidenceDescription,
	StorySection,
} from "./evidence";

const evidence = contractEvidence("ui.metric-card");
const meta = {
	title: "UI System/Data Display/Metric Card",
	component: MetricCard,
	tags: ["autodocs", "test"],
	parameters: {
		docs: { description: { component: evidenceDescription(evidence) } },
	},
} satisfies Meta<typeof MetricCard>;

export default meta;
type Story = StoryObj;

export const Overview: Story = {
	tags: ["visual"],
	render: () => <ComponentShowcase component="metric-card" />,
};

export const Usage: Story = {
	render: () => (
		<div className="grid gap-4 sm:grid-cols-3">
			<MetricCard
				title="Open receivables"
				value="MYR 482,300"
				change={8.4}
				trend="up"
				description="from prior period"
			/>
			<MetricCard
				title="Overdue invoices"
				value={14}
				change={-2}
				trend="down"
				description="from last week"
			/>
			<MetricCard
				title="Unallocated receipts"
				value="—"
				description="Data unavailable"
			/>
		</div>
	),
};

export const StatesAndAccessibility: Story = {
	render: () => (
		<fieldset className="grid gap-4 sm:grid-cols-3">
			<legend className="sr-only">Receivables metrics</legend>
			<MetricCard title="Loading exposure" loading />
			<MetricCard
				title="No recorded balance"
				value="—"
				description="No data reported"
			/>
			<MetricCard
				title="Collection rate"
				value="94%"
				change={0}
				trend="neutral"
				description="current period"
			/>
		</fieldset>
	),
};

export const Composition: Story = {
	render: () => (
		<div className="grid gap-4">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-medium">Receivables health</h2>
				<Badge variant="outline">As of 28 Jul 2026</Badge>
			</div>
			<MetricGrid
				columns={3}
				metrics={[
					{ title: "Open balance", value: "MYR 482,300" },
					{ title: "Overdue balance", value: "MYR 64,900" },
					{ title: "Collection rate", value: "94%" },
				]}
			/>
		</div>
	),
};

export const VariantsAndSizes: Story = {
	render: () => (
		<div className="grid gap-4 sm:grid-cols-3">
			<MetricCard
				title="Improving collection"
				value="96%"
				change={4}
				trend="up"
			/>
			<MetricCard
				title="Rising overdue balance"
				value="MYR 70,200"
				change={6}
				trend="down"
			/>
			<MetricCard
				title="Stable dispute count"
				value={8}
				change={0}
				trend="neutral"
			/>
		</div>
	),
};

export const DoAndDoNot: Story = {
	render: () => (
		<div className="grid gap-6 sm:grid-cols-2">
			<StorySection title="Do: identify comparison direction">
				<MetricCard
					title="Collection rate"
					value="94%"
					change={3}
					trend="up"
					description="from prior month"
				/>
			</StorySection>
			<StorySection title="Do not: imply that every increase is positive">
				<MetricCard
					title="Overdue balance"
					value="MYR 70,200"
					change={6}
					trend="down"
					description="increase in risk"
				/>
			</StorySection>
		</div>
	),
};
