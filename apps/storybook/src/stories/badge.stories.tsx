import {
	Badge,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ComponentShowcase } from "./catalog";
import {
	contractEvidence,
	evidenceDescription,
	StorySection,
} from "./evidence";

const evidence = contractEvidence("ui.badge");
const meta = {
	title: "UI System/Display/Badge",
	component: Badge,
	tags: ["autodocs", "test"],
	parameters: {
		docs: { description: { component: evidenceDescription(evidence) } },
	},
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	tags: ["visual"],
	render: () => <ComponentShowcase component="badge" />,
};

export const Usage: Story = {
	render: () => (
		<StorySection title="Invoice labels">
			<div className="flex flex-wrap gap-3">
				<Badge>Preferred supplier</Badge>
				<Badge variant="secondary">Draft invoice</Badge>
				<Badge variant="outline">External reference</Badge>
				<Badge variant="destructive">Policy exception</Badge>
			</div>
		</StorySection>
	),
};

export const StatesAndAccessibility: Story = {
	render: () => (
		<fieldset className="flex flex-wrap gap-3">
			<legend className="sr-only">Record labels</legend>
			<Badge>Approved category</Badge>
			<Badge variant="outline">Reference PO-1042</Badge>
			<span className="sr-only">
				Labels describe metadata, not workflow state.
			</span>
		</fieldset>
	),
};

export const Composition: Story = {
	render: () => (
		<Card className="w-96">
			<CardHeader>
				<CardTitle>Supplier profile</CardTitle>
			</CardHeader>
			<CardContent className="flex gap-2">
				<Badge>Strategic</Badge>
				<Badge variant="outline">Malaysia</Badge>
			</CardContent>
		</Card>
	),
};

export const VariantsAndSizes: Story = {
	render: () => (
		<div className="flex flex-wrap gap-3">
			<Badge>Recommended</Badge>
			<Badge variant="secondary">Supporting</Badge>
			<Badge variant="destructive">Exception</Badge>
			<Badge variant="outline">Reference</Badge>
			<Badge variant="ghost">Quiet metadata</Badge>
			<Badge variant="link">Related record</Badge>
		</div>
	),
};

export const DoAndDoNot: Story = {
	render: () => (
		<div className="grid gap-6 sm:grid-cols-2">
			<StorySection title="Do: describe metadata">
				<Badge variant="outline">Imported from purchase order</Badge>
			</StorySection>
			<StorySection title="Do not: imply lifecycle authority">
				<Badge variant="destructive">Approval guaranteed</Badge>
			</StorySection>
		</div>
	),
};
