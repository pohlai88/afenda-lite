import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	StatusBadge,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ComponentShowcase } from "./catalog";
import {
	contractEvidence,
	evidenceDescription,
	StorySection,
} from "./evidence";

const evidence = contractEvidence("ui.status-badge");
const meta = {
	title: "UI System/Feedback/Status Badge",
	component: StatusBadge,
	tags: ["autodocs", "test"],
	parameters: {
		docs: { description: { component: evidenceDescription(evidence) } },
	},
} satisfies Meta<typeof StatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	tags: ["visual"],
	render: () => <ComponentShowcase component="status-badge" />,
};

export const Usage: Story = {
	render: () => (
		<div className="flex flex-wrap gap-3">
			<StatusBadge status="success" label="Posted" />
			<StatusBadge status="pending" label="Awaiting approval" />
			<StatusBadge status="error" label="Posting failed" />
			<StatusBadge status="warning" label="Evidence incomplete" />
			<StatusBadge status="inactive" label="Archived" />
			<StatusBadge status="active" label="In review" />
		</div>
	),
};

export const StatesAndAccessibility: Story = {
	render: () => (
		<fieldset className="flex flex-wrap gap-3">
			<legend className="sr-only">Invoice lifecycle states</legend>
			<StatusBadge status="pending" label="Awaiting finance approval" />
			<StatusBadge status="error" label="Rejected by posting control" />
			<StatusBadge status="inactive" label="Unknown lifecycle state" />
		</fieldset>
	),
};

export const Composition: Story = {
	render: () => (
		<Card className="w-96">
			<CardHeader>
				<CardTitle>Invoice INV-1042</CardTitle>
			</CardHeader>
			<CardContent className="flex items-center justify-between">
				<span>Northwind Trading</span>
				<StatusBadge status="success" label="Approved" />
			</CardContent>
		</Card>
	),
};

export const VariantsAndSizes: Story = {
	render: () => (
		<div className="grid gap-4">
			{(["sm", "md", "lg"] as const).map((size) => (
				<div key={size} className="flex flex-wrap gap-3">
					<StatusBadge size={size} status="success" label="Posted" />
					<StatusBadge size={size} status="pending" label="Pending" />
					<StatusBadge size={size} status="error" label="Failed" />
					<StatusBadge size={size} status="warning" label="Review" />
					<StatusBadge size={size} status="inactive" label="Archived" />
					<StatusBadge size={size} status="active" label="Active" />
				</div>
			))}
		</div>
	),
};

export const DoAndDoNot: Story = {
	render: () => (
		<div className="grid gap-6 sm:grid-cols-2">
			<StorySection title="Do: use canonical lifecycle vocabulary">
				<StatusBadge status="pending" label="Awaiting approval" />
			</StorySection>
			<StorySection title="Do not: infer status from color alone">
				<StatusBadge status="warning" label="Yellow" showIcon={false} />
			</StorySection>
		</div>
	),
};
