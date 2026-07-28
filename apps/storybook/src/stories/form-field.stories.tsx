import {
	Button,
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
	FormField,
	FormInput,
	FormTextarea,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { ComponentShowcase } from "./catalog";
import {
	contractEvidence,
	evidenceDescription,
	StorySection,
} from "./evidence";

const evidence = contractEvidence("ui.form-field");
const meta = {
	title: "UI System/Forms/Form Field",
	component: FormField,
	tags: ["autodocs", "test"],
	parameters: {
		docs: { description: { component: evidenceDescription(evidence) } },
	},
} satisfies Meta<typeof FormField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	tags: ["visual"],
	render: () => <ComponentShowcase component="form-field" />,
};

export const Usage: Story = {
	render: () => (
		<div className="grid w-96 gap-4">
			<FormField
				label="Registered supplier name"
				description="Use the name shown on the registration certificate."
				required
			>
				<FormInput defaultValue="Northwind Trading Sdn. Bhd." required />
			</FormField>
			<FormField label="Internal review note">
				<FormTextarea defaultValue="Bank account evidence verified." />
			</FormField>
		</div>
	),
};

export const StatesAndAccessibility: Story = {
	render: () => (
		<div className="grid w-96 gap-4">
			<FormField
				fieldId="supplier-tax-id"
				label="Tax registration number"
				description="Enter the identifier issued by the tax authority."
				error="Tax registration number is required."
				required
			>
				<FormInput defaultValue="" required />
			</FormField>
			<FormField label="Approved legal name">
				<FormInput defaultValue="Northwind Trading" readOnly />
			</FormField>
			<FormField label="Unavailable external reference">
				<FormInput defaultValue="Pending integration" disabled />
			</FormField>
		</div>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const input = canvas.getByLabelText(/Tax registration number/);
		await userEvent.click(input);
		await expect(input).toHaveFocus();
		await expect(input).toHaveAttribute("aria-invalid", "true");
		await expect(input).toHaveAccessibleDescription(
			/Enter the identifier.*Tax registration number is required/,
		);
	},
};

export const Composition: Story = {
	render: () => (
		<Card className="w-[32rem]">
			<CardHeader>
				<CardTitle>Supplier contact</CardTitle>
			</CardHeader>
			<CardContent className="grid gap-4">
				<FormField label="Contact name" required>
					<FormInput defaultValue="Aisha Rahman" required />
				</FormField>
				<FormField label="Email address" required>
					<FormInput type="email" defaultValue="aisha@example.com" required />
				</FormField>
			</CardContent>
			<CardFooter className="justify-end gap-2">
				<Button variant="outline">Cancel</Button>
				<Button>Save contact</Button>
			</CardFooter>
		</Card>
	),
};

export const DoAndDoNot: Story = {
	render: () => (
		<div className="grid gap-6 sm:grid-cols-2">
			<StorySection title="Do: one labelled field">
				<FormField label="Payment reference">
					<FormInput defaultValue="PO-1042" />
				</FormField>
			</StorySection>
			<StorySection title="Do not: replace the label with a placeholder">
				<FormInput
					placeholder="Payment reference"
					aria-label="Payment reference"
				/>
			</StorySection>
		</div>
	),
};
