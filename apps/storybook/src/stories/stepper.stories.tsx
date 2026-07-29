import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	StatusBadge,
	Stepper,
	StepperStep,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";

const evidence = contractEvidence("ui.stepper");
function InvoiceSteps() {
	return (
		<Stepper aria-label="Invoice posting workflow">
			<StepperStep
				status="complete"
				title="Draft"
				description="Invoice captured"
			/>
			<StepperStep
				status="complete"
				title="Validation"
				description="Checks passed"
			/>
			<StepperStep
				status="current"
				title="Approval"
				description="Finance review required"
			/>
			<StepperStep status="upcoming" title="Posting" />
			<StepperStep status="upcoming" title="Settlement" />
		</Stepper>
	);
}
const meta = {
	title: "UI System/Stepper",
	component: Stepper,
	tags: ["autodocs", "test"],
	parameters: { ...contractDocsParameters(evidence, "Stepper") },
} satisfies Meta<typeof Stepper>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	tags: ["visual"],
	render: () => (
		<Card className="w-full max-w-5xl shadow-none">
			<CardHeader>
				<div className="flex items-center justify-between gap-4">
					<CardTitle>Invoice INV-1048</CardTitle>
					<StatusBadge status="pending" label="Awaiting approval" />
				</div>
			</CardHeader>
			<CardContent>
				<InvoiceSteps />
			</CardContent>
		</Card>
	),
};
export const Usage: Story = {
	render: () => (
		<StorySection title="Ordered workflow">
			<InvoiceSteps />
		</StorySection>
	),
};
export const StatesAndAccessibility: Story = {
	render: () => (
		<Stepper aria-label="Exceptional posting workflow">
			<StepperStep status="complete" title="Draft" />
			<StepperStep
				status="error"
				title="Validation"
				description="Tax identifier is invalid"
			/>
			<StepperStep status="upcoming" title="Approval" />
		</Stepper>
	),
};
export const VariantsAndSizes: Story = {
	render: () => (
		<p className="text-sm text-foreground-secondary">
			The family exposes complete, current, upcoming, and error step states; it
			has no decorative size scale.
		</p>
	),
};
export const Composition: Story = {
	render: () => (
		<div className="grid max-w-4xl gap-4">
			<StatusBadge status="pending" label="Awaiting approval" />
			<InvoiceSteps />
		</div>
	),
};
export const DoAndDoNot: Story = {
	render: () => (
		<div className="grid gap-6 sm:grid-cols-2">
			<StorySection title="Do: derive steps from workflow truth">
				<p className="text-sm text-foreground-secondary">
					Keep transition policy and primary actions outside Stepper.
				</p>
			</StorySection>
			<StorySection title="Do not: use as tabs">
				<p className="text-sm text-foreground-secondary">
					Use Tabs for peer views without ordered progression.
				</p>
			</StorySection>
		</div>
	),
};
