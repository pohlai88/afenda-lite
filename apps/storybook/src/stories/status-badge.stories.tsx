import {
	Badge,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	StatusBadge,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";

const evidence = contractEvidence("ui.status-badge");
const statusEntries = [
	["success", "Posted"],
	["pending", "Awaiting approval"],
	["error", "Posting failed"],
	["warning", "Evidence expiring"],
	["inactive", "Inactive"],
	["active", "Active"],
] as const;
const statusSizes = ["sm", "md", "lg"] as const;
const meta = {
	title: "UI System/Status Badge",
	component: StatusBadge,
	tags: ["autodocs", "test"],
	args: { status: "pending", size: "md", label: "Awaiting approval" },
	argTypes: {
		status: { control: "select", options: evidence.variants },
		size: { control: "select", options: evidence.sizes },
	},
	parameters: {
		controls: { include: ["status", "size", "label", "showIcon"] },
		...contractDocsParameters(evidence, "Status Badge"),
	},
} satisfies Meta<typeof StatusBadge>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	tags: ["visual"],
	render: () => (
		<div className="grid w-full max-w-5xl gap-6">
			<header>
				<h1 className="font-semibold text-2xl tracking-tight">
					Invoice posting state
				</h1>
				<p className="text-foreground-secondary text-sm">
					StatusBadge presents one authoritative state supplied by accounting.
				</p>
			</header>
			<Card className="shadow-none">
				<CardHeader>
					<div className="flex items-center justify-between gap-4">
						<CardTitle>INV-1048</CardTitle>
						<StatusBadge label="Awaiting approval" status="pending" />
					</div>
				</CardHeader>
				<CardContent className="text-foreground-secondary text-sm">
					MYR 18,420.00 · Northwind Trading
				</CardContent>
			</Card>
		</div>
	),
};
export const Usage: Story = {
	render: () => (
		<div className="flex flex-wrap gap-3">
			<Badge variant="outline">Supplier invoice</Badge>
			<StatusBadge label="Evidence expiring" status="warning" />
		</div>
	),
};
export const Variants: Story = {
	render: () => (
		<div className="flex flex-wrap gap-3">
			{statusEntries.map(([status, label]) => (
				<StatusBadge key={status} label={label} status={status} />
			))}
		</div>
	),
};
export const Sizes: Story = {
	render: () => (
		<div className="flex items-center gap-3">
			{statusSizes.map((size) => (
				<StatusBadge key={size} label="Posted" size={size} status="success" />
			))}
		</div>
	),
};
export const StatesAndAccessibility: Story = {
	render: () => (
		<StorySection title="Text, icon, and colour agree">
			<StatusBadge label="Posting failed" status="error" />
			<p className="text-foreground-secondary text-sm">
				The explicit label preserves meaning without colour or icon.
			</p>
		</StorySection>
	),
};
export const Composition: Story = {
	render: () => (
		<Card className="w-full max-w-md shadow-none">
			<CardHeader>
				<div className="flex items-center justify-between gap-4">
					<CardTitle>Supplier SUP-1042</CardTitle>
					<StatusBadge label="Active" status="active" />
				</div>
			</CardHeader>
		</Card>
	),
};
export const DoAndDoNot: Story = {
	render: () => (
		<div className="grid gap-6 sm:grid-cols-2">
			<StorySection title="Do: authoritative lifecycle">
				<StatusBadge label="Posted" status="success" />
			</StorySection>
			<StorySection title="Do not: taxonomy">
				<Badge variant="secondary">Finance</Badge>
				<p className="text-foreground-secondary text-sm">
					Categories belong on Badge.
				</p>
			</StorySection>
		</div>
	),
};
