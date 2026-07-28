import {
	Button,
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
	FormField,
	Input,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { ComponentShowcase } from "./catalog";
import {
	contractEvidence,
	evidenceDescription,
	StorySection,
} from "./evidence";

const evidence = contractEvidence("ui.input");
const meta = {
	title: "UI System/Forms/Input",
	component: Input,
	tags: ["autodocs", "test"],
	parameters: {
		docs: { description: { component: evidenceDescription(evidence) } },
	},
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	tags: ["visual"],
	render: () => <ComponentShowcase component="input" />,
};

export const Usage: Story = {
	render: () => (
		<div className="grid w-96 gap-4">
			<FormField
				label="Supplier reference"
				description="Use the reference shown on the supplier record."
			>
				<Input defaultValue="SUP-1042" autoComplete="off" />
			</FormField>
			<FormField label="Contact email">
				<Input
					type="email"
					defaultValue="finance@example.com"
					autoComplete="email"
				/>
			</FormField>
		</div>
	),
};

export const StatesAndAccessibility: Story = {
	render: () => (
		<div className="grid w-96 gap-4">
			<FormField label="Editable reference">
				<Input defaultValue="PO-1042" />
			</FormField>
			<FormField label="Approved reference">
				<Input defaultValue="PO-1038" readOnly />
			</FormField>
			<FormField label="Unavailable integration reference">
				<Input defaultValue="Not available" disabled />
			</FormField>
			<FormField label="Tax identifier" error="Enter a valid tax identifier.">
				<Input defaultValue="?" />
			</FormField>
		</div>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const editable = canvas.getByLabelText("Editable reference");
		await userEvent.click(editable);
		await expect(editable).toHaveFocus();
		await expect(canvas.getByLabelText("Approved reference")).toHaveAttribute(
			"readonly",
		);
		await expect(canvas.getByLabelText("Tax identifier")).toHaveAttribute(
			"aria-invalid",
			"true",
		);
	},
};

export const Composition: Story = {
	render: () => (
		<Card className="w-[32rem]">
			<CardHeader>
				<CardTitle>Search supplier ledger</CardTitle>
			</CardHeader>
			<CardContent>
				<FormField label="Supplier name or reference">
					<Input placeholder="Northwind or SUP-1042" />
				</FormField>
			</CardContent>
			<CardFooter className="justify-end">
				<Button>Search suppliers</Button>
			</CardFooter>
		</Card>
	),
};

export const DoAndDoNot: Story = {
	render: () => (
		<div className="grid gap-6 sm:grid-cols-2">
			<StorySection title="Do: retain a visible label">
				<FormField label="Invoice reference">
					<Input placeholder="INV-1042" />
				</FormField>
			</StorySection>
			<StorySection title="Do not: use placeholder-only instruction">
				<Input
					placeholder="Enter invoice reference"
					aria-label="Invoice reference"
				/>
			</StorySection>
		</div>
	),
};
