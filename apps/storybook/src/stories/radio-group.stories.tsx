import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	Label,
	RadioGroup,
	RadioGroupItem,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";

const evidence = contractEvidence("ui.radio-group");

const meta = {
	title: "UI System/Radio Group",
	component: RadioGroup,
	tags: ["autodocs", "test"],
	parameters: {
		...contractDocsParameters(evidence, "Radio Group"),
	},
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"One remittance schedule workbench: RadioGroup picks exactly one settlement frequency. Selection chrome is not proof the policy was saved.",
			},
		},
	},
	render: () => (
		<div className="min-h-screen bg-canvas text-foreground">
			<div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
				<header className="grid gap-2 border-b pb-6">
					<p className="text-sm font-medium text-foreground-secondary">
						Accounts payable · remittance
					</p>
					<h1 className="text-2xl font-semibold tracking-tight">
						Settlement frequency
					</h1>
					<p className="max-w-5xl text-sm leading-6 text-foreground-secondary">
						Choose one visible option. Feature code owns persistence and whether
						the supplier is eligible for each cadence.
					</p>
				</header>

				<Card className="shadow-none">
					<CardHeader>
						<CardTitle>Northwind Trading Sdn. Bhd.</CardTitle>
						<CardDescription>
							Preferred remittance cadence for July 2026 onwards
						</CardDescription>
					</CardHeader>
					<CardContent>
						<fieldset className="grid gap-4">
							<legend className="text-sm font-medium text-foreground">
								Settlement frequency
							</legend>
							<RadioGroup defaultValue="monthly" className="grid gap-3">
								<Label className="flex items-center gap-2">
									<RadioGroupItem value="weekly" />
									Weekly
								</Label>
								<Label className="flex items-center gap-2">
									<RadioGroupItem value="monthly" />
									Monthly
								</Label>
								<Label className="flex items-center gap-2">
									<RadioGroupItem value="quarterly" />
									Quarterly
								</Label>
								<Label className="flex items-center gap-2 text-foreground-secondary">
									<RadioGroupItem value="annual" disabled />
									Annual — not offered for this supplier
								</Label>
							</RadioGroup>
						</fieldset>
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
					"Use RadioGroup for small mutually exclusive policy sets. Prefer Select when the option list cannot stay fully visible.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-xl gap-6">
			<StorySection title="Posting mode">
				<fieldset className="grid gap-3">
					<legend className="text-sm font-medium">Posting mode</legend>
					<RadioGroup defaultValue="batch">
						<Label className="flex items-center gap-2">
							<RadioGroupItem value="batch" />
							Batch posting
						</Label>
						<Label className="flex items-center gap-2">
							<RadioGroupItem value="immediate" />
							Immediate posting
						</Label>
					</RadioGroup>
				</fieldset>
			</StorySection>
			<StorySection title="Tax treatment">
				<fieldset className="grid gap-3">
					<legend className="text-sm font-medium">Tax treatment</legend>
					<RadioGroup defaultValue="inclusive">
						<Label className="flex items-center gap-2">
							<RadioGroupItem value="inclusive" />
							Tax inclusive
						</Label>
						<Label className="flex items-center gap-2">
							<RadioGroupItem value="exclusive" />
							Tax exclusive
						</Label>
					</RadioGroup>
				</fieldset>
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
					"One shared group label and a distinct label per item. Values are stable domain identifiers.",
			},
		},
	},
	render: () => (
		<fieldset className="grid w-80 gap-3">
			<legend className="text-sm font-medium">Invoice matching</legend>
			<RadioGroup defaultValue="exact">
				<Label className="flex items-center gap-2">
					<RadioGroupItem value="exact" />
					Exact amount
				</Label>
				<Label className="flex items-center gap-2">
					<RadioGroupItem value="tolerance" />
					Within tolerance
				</Label>
			</RadioGroup>
		</fieldset>
	),
};

export const StatesAndAccessibility: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Fieldset labels the group. Arrow keys move selection. Disabled options stay visible but unavailable.",
			},
		},
	},
	render: () => (
		<fieldset className="grid w-96 gap-3">
			<legend className="text-sm font-medium">Close window</legend>
			<RadioGroup defaultValue="standard" aria-invalid={false}>
				<Label className="flex items-center gap-2">
					<RadioGroupItem value="standard" />
					Standard close
				</Label>
				<Label className="flex items-center gap-2">
					<RadioGroupItem value="early" />
					Early close
				</Label>
				<Label className="flex items-center gap-2 text-foreground-secondary">
					<RadioGroupItem value="locked" disabled />
					Locked period — unavailable
				</Label>
			</RadioGroup>
		</fieldset>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const standard = canvas.getByRole("radio", { name: "Standard close" });
		await expect(standard).toBeChecked();
		await userEvent.click(canvas.getByRole("radio", { name: "Early close" }));
		await expect(
			canvas.getByRole("radio", { name: "Early close" }),
		).toBeChecked();
		await expect(
			canvas.getByRole("radio", { name: "Locked period — unavailable" }),
		).toBeDisabled();
	},
};

export const Composition: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Compose RadioGroup inside a policy Card. Feature code owns save; the group owns single-select interaction.",
			},
		},
	},
	render: () => (
		<Card className="w-full max-w-md shadow-none">
			<CardHeader>
				<CardTitle>Allocation rule</CardTitle>
				<CardDescription>
					How remittances apply when several invoices are open.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<fieldset className="grid gap-3">
					<legend className="sr-only">Allocation rule</legend>
					<RadioGroup defaultValue="oldest">
						<Label className="flex items-center gap-2">
							<RadioGroupItem value="oldest" />
							Oldest invoice first
						</Label>
						<Label className="flex items-center gap-2">
							<RadioGroupItem value="largest" />
							Largest balance first
						</Label>
						<Label className="flex items-center gap-2">
							<RadioGroupItem value="manual" />
							Manual allocation only
						</Label>
					</RadioGroup>
				</fieldset>
			</CardContent>
		</Card>
	),
};

export const DoAndDoNot: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Do use RadioGroup for one-of-many visible choices. Do not use it for independent booleans — use Checkbox or Switch.",
			},
		},
	},
	render: () => (
		<div className="grid gap-6 sm:grid-cols-2">
			<StorySection title="Do: mutually exclusive cadence">
				<fieldset className="grid gap-3">
					<legend className="text-sm font-medium">Billing cycle</legend>
					<RadioGroup defaultValue="monthly">
						<Label className="flex items-center gap-2">
							<RadioGroupItem value="monthly" />
							Monthly
						</Label>
						<Label className="flex items-center gap-2">
							<RadioGroupItem value="quarterly" />
							Quarterly
						</Label>
					</RadioGroup>
				</fieldset>
			</StorySection>
			<StorySection title="Do not: independent toggles as radios">
				<p className="text-sm text-foreground-secondary">
					Send remittance email and require dual approval are independent
					booleans. They belong on Checkbox or Switch, not RadioGroup.
				</p>
			</StorySection>
		</div>
	),
};
