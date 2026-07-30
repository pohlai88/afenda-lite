import {
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	Spinner,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";

const evidence = contractEvidence("ui.spinner");
const spinnerVariants = ["default", "secondary", "destructive"] as const;
const spinnerSizes = ["sm", "md", "lg", "xl"] as const;
const meta = {
	title: "UI System/Spinner",
	component: Spinner,
	tags: ["autodocs", "test"],
	args: { label: "Loading invoice register", size: "md", variant: "default" },
	argTypes: {
		size: { control: "select", options: evidence.sizes },
		variant: { control: "select", options: evidence.variants },
	},
	parameters: {
		controls: { include: ["size", "variant", "label"] },
		...contractDocsParameters(evidence, "Spinner"),
	},
} satisfies Meta<typeof Spinner>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	tags: ["visual"],
	render: (args) => (
		<Card className="w-full max-w-md shadow-none">
			<CardHeader>
				<CardTitle>Invoice register</CardTitle>
			</CardHeader>
			<CardContent className="flex items-center gap-3">
				<Spinner {...args} />
				<span className="text-foreground-secondary text-sm">
					Refreshing posted invoices…
				</span>
			</CardContent>
		</Card>
	),
};
export const Usage: Story = {
	render: () => (
		<StorySection title="Named indeterminate activity">
			<div className="flex items-center gap-2">
				<Spinner label="Saving invoice" size="sm" />
				<span className="text-sm">Saving invoice…</span>
			</div>
		</StorySection>
	),
};
export const StatesAndAccessibility: Story = {
	render: () => (
		<div className="flex flex-wrap items-center gap-6">
			<Spinner label="Loading remittance match" />
			<Spinner label="Refreshing register" variant="secondary" />
			<Spinner label="Voiding invoice" variant="destructive" />
		</div>
	),
};
export const VariantsAndSizes: Story = {
	render: () => (
		<div className="grid gap-5">
			{spinnerVariants.map((variant) => (
				<div className="flex items-center gap-4" key={variant}>
					{spinnerSizes.map((size) => (
						<Spinner
							key={size}
							label={`${variant} ${size} loading`}
							size={size}
							variant={variant}
						/>
					))}
				</div>
			))}
		</div>
	),
};
export const Composition: Story = {
	render: () => (
		<Button disabled>
			<Spinner label="Saving supplier" size="sm" variant="secondary" />
			Saving supplier…
		</Button>
	),
};
export const DoAndDoNot: Story = {
	render: () => (
		<div className="grid gap-6 sm:grid-cols-2">
			<StorySection title="Do: identify the operation">
				<p className="text-foreground-secondary text-sm">
					Use “Saving invoice…” and transition to ready, empty, or error.
				</p>
			</StorySection>
			<StorySection title="Do not: leave an endless spinner">
				<p className="text-foreground-secondary text-sm">
					Timeout, cancellation, and failure remain consumer-owned.
				</p>
			</StorySection>
		</div>
	),
};
