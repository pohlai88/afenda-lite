import {
	Button,
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
	FormField,
	MoneyInput,
	NumberInput,
	PercentInput,
	QuantityInput,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";

const evidence = contractEvidence("ui.numeric-input");

const meta = {
	title: "UI System/Numeric Input",
	component: NumberInput,
	tags: ["autodocs", "test"],
	parameters: {
		...contractDocsParameters(evidence, "Numeric Input"),
	},
} satisfies Meta<typeof NumberInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"One payables line entry workbench: MoneyInput for amounts, QuantityInput for units, PercentInput for tax rate, NumberInput for generic scalars — wrapper choice follows domain kind.",
			},
		},
	},
	render: () => (
		<div className="min-h-screen bg-canvas text-foreground">
			<div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
				<header className="grid gap-2 border-b pb-6">
					<p className="font-medium text-foreground-secondary text-sm">
						Accounts payable · invoice lines
					</p>
					<h1 className="font-semibold text-2xl tracking-tight">
						Line value entry
					</h1>
					<p className="max-w-5xl text-foreground-secondary text-sm leading-6">
						Currency, unit, and percent chrome come from feature policy. The
						control formats entry — it does not own rounding or ledger
						precision.
					</p>
				</header>

				<Card className="shadow-none">
					<CardHeader>
						<CardTitle>INV-1042 · packaging materials</CardTitle>
						<CardDescription>
							Northwind Trading · MYR commercial terms
						</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-4 sm:grid-cols-2">
						<FormField
							description="Enter the net price before tax."
							label="Unit price"
						>
							<MoneyInput currency="MYR" defaultValue="18.50" />
						</FormField>
						<FormField
							description="Stock unit from the item master."
							label="Ordered quantity"
						>
							<QuantityInput defaultValue="120" unit="units" />
						</FormField>
						<FormField description="Statutory output tax." label="Tax rate">
							<PercentInput defaultValue="8" />
						</FormField>
						<FormField
							description="Generic scalar without money or unit meaning."
							label="Sequence"
						>
							<NumberInput defaultValue="3" />
						</FormField>
					</CardContent>
				</Card>
			</div>
		</div>
	),
};

export const SemanticUsage: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Maps each wrapper to permitted ERP meaning. Money, quantity, percent, and number are distinct kinds — do not collapse them into one bare control.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6">
			<StorySection title="MoneyInput · monetary amount">
				<FormField label="Invoice total">
					<MoneyInput currency="MYR" defaultValue="18420.50" />
				</FormField>
			</StorySection>
			<StorySection title="QuantityInput · counted stock">
				<FormField label="Received quantity">
					<QuantityInput defaultValue="250" unit="kg" />
				</FormField>
			</StorySection>
			<StorySection title="PercentInput · rate">
				<FormField label="Discount rate">
					<PercentInput defaultValue="2.5" />
				</FormField>
			</StorySection>
			<StorySection title="NumberInput · generic scalar">
				<FormField label="Revision">
					<NumberInput defaultValue="4" min={1} />
				</FormField>
			</StorySection>
		</div>
	),
};

export const Usage: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Always pair numeric wrappers with FormField labels and unit context. Feature code declares currency and bounds.",
			},
		},
	},
	render: () => (
		<div className="grid w-96 gap-4">
			<FormField
				description="Use the amount shown on the supplier remittance advice."
				label="Remittance amount"
			>
				<MoneyInput currency="MYR" defaultValue="9200.00" />
			</FormField>
			<FormField label="Allocated quantity">
				<QuantityInput defaultValue="40" unit="units" />
			</FormField>
		</div>
	),
};

export const StatesAndAccessibility: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Expose invalid, read-only, and disabled semantics through FormField and native attributes. Unit chrome must not be the only accessible cue.",
			},
		},
	},
	render: () => (
		<div className="grid w-96 gap-4">
			<FormField label="Editable amount">
				<MoneyInput currency="MYR" defaultValue="1500.00" />
			</FormField>
			<FormField label="Posted amount">
				<MoneyInput currency="MYR" defaultValue="1500.00" readOnly />
			</FormField>
			<FormField label="Locked quantity">
				<QuantityInput defaultValue="25" disabled unit="units" />
			</FormField>
			<FormField error="Enter a rate between 0 and 100." label="Tax rate">
				<PercentInput aria-invalid defaultValue="120" />
			</FormField>
		</div>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const editable = canvas.getByLabelText("Editable amount");
		await userEvent.click(editable);
		await expect(editable).toHaveFocus();
		await expect(canvas.getByLabelText("Posted amount")).toHaveAttribute(
			"readonly",
		);
		await expect(canvas.getByLabelText("Tax rate")).toHaveAttribute(
			"aria-invalid",
			"true",
		);
	},
};

export const Composition: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Numeric wrappers compose inside Card forms. Feature code owns save commands; the control owns entry chrome only.",
			},
		},
	},
	render: () => (
		<Card className="w-[32rem] shadow-none">
			<CardHeader>
				<CardTitle>Adjust receipt quantity</CardTitle>
				<CardDescription>
					Update counted stock before posting goods receipt GRN-2201.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<FormField
					description="Must not exceed the ordered quantity of 120 units."
					label="Accepted quantity"
				>
					<QuantityInput defaultValue="118" max={120} min={0} unit="units" />
				</FormField>
			</CardContent>
			<CardFooter className="justify-end gap-2">
				<Button type="button" variant="outline">
					Cancel
				</Button>
				<Button type="button">Save quantity</Button>
			</CardFooter>
		</Card>
	),
};

export const DoAndDoNot: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Do choose the domain wrapper and visible label. Do not rely on placeholder-only instruction or locale-inferred currency.",
			},
		},
	},
	render: () => (
		<div className="grid gap-6 sm:grid-cols-2">
			<StorySection title="Do: MoneyInput with labelled currency">
				<FormField label="Invoice amount">
					<MoneyInput currency="MYR" defaultValue="18420.00" />
				</FormField>
			</StorySection>
			<StorySection title="Do not: bare number without unit meaning">
				<NumberInput
					aria-label="Invoice amount without currency"
					defaultValue="18420"
					placeholder="Enter money amount"
				/>
			</StorySection>
		</div>
	),
};
