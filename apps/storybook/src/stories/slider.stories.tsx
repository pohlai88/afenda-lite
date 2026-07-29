import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	Slider,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";

const evidence = contractEvidence("ui.slider");
const meta = {
	title: "UI System/Slider",
	component: Slider,
	tags: ["autodocs", "test"],
	args: {
		defaultValue: [25],
		min: 0,
		max: 100,
		step: 5,
		"aria-label": "Allocation percentage",
	},
	parameters: { ...contractDocsParameters(evidence, "Slider") },
} satisfies Meta<typeof Slider>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	tags: ["visual"],
	render: (args) => (
		<Card className="w-full max-w-xl shadow-none">
			<CardHeader>
				<CardTitle>Cost-centre allocation</CardTitle>
			</CardHeader>
			<CardContent className="grid gap-3">
				<div className="flex justify-between text-sm">
					<span>Marketing allocation</span>
					<output>25%</output>
				</div>
				<Slider {...args} />
			</CardContent>
		</Card>
	),
};
export const Usage: Story = {
	render: () => (
		<StorySection title="Bounded approximate input">
			<Slider
				defaultValue={[40]}
				step={5}
				aria-label="Discount cap percentage"
			/>
			<p className="text-sm text-foreground-secondary">
				40% discount cap. Feature validation owns the persisted value.
			</p>
		</StorySection>
	),
};
export const StatesAndAccessibility: Story = {
	render: () => (
		<div className="grid max-w-xl gap-6">
			<Slider defaultValue={[30]} aria-label="Risk threshold percentage" />
			<Slider defaultValue={[20, 70]} aria-label="Approved allocation range" />
			<Slider defaultValue={[50]} aria-label="Locked threshold" disabled />
		</div>
	),
};
export const VariantsAndSizes: Story = {
	render: () => (
		<p className="text-sm text-foreground-secondary">
			Slider has one governed presentation; domain bounds, step, units, and
			precision are consumer-owned.
		</p>
	),
};
export const Composition: Story = {
	render: () => (
		<Card className="w-full max-w-xl shadow-none">
			<CardHeader>
				<CardTitle>Approval threshold</CardTitle>
			</CardHeader>
			<CardContent>
				<Slider
					defaultValue={[65]}
					aria-label="Approval threshold percentage"
				/>
			</CardContent>
		</Card>
	),
};
export const DoAndDoNot: Story = {
	render: () => (
		<div className="grid gap-6 sm:grid-cols-2">
			<StorySection title="Do: show exact output">
				<p className="text-sm text-foreground-secondary">
					Pair the control with 65% and its business unit.
				</p>
			</StorySection>
			<StorySection title="Do not: imply precision from position">
				<p className="text-sm text-foreground-secondary">
					Use NumericInput when exact entry is the primary task.
				</p>
			</StorySection>
		</div>
	),
};
