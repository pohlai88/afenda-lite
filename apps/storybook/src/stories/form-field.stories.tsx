import {
	Badge,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
	FormField,
	FormInput,
	FormTextarea,
	StatusBadge,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { FormEvent, ReactNode } from "react";
import { useState } from "react";
import { expect, fn, userEvent, within } from "storybook/test";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";

type SectionProps = Readonly<{
	id: string;
	title: string;
	description: string;
	children: ReactNode;
}>;

function WorkbenchSection({ id, title, description, children }: SectionProps) {
	return (
		<section className="grid gap-4" aria-labelledby={id}>
			<div className="grid gap-1">
				<h2
					className="text-base font-semibold tracking-tight text-foreground"
					id={id}
				>
					{title}
				</h2>
				<p className="max-w-5xl text-sm leading-5 text-foreground-secondary">
					{description}
				</p>
			</div>
			{children}
		</section>
	);
}

const saveSupplier = fn();
const cancelSupplier = fn();

function SupplierMasterForm() {
	const [submitted, setSubmitted] = useState(false);
	const [taxRegistration, setTaxRegistration] = useState("");

	const taxMissing = taxRegistration.trim().length === 0;
	const taxError =
		submitted && taxMissing
			? "Tax registration number is required."
			: undefined;

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setSubmitted(true);

		if (event.currentTarget.checkValidity()) {
			saveSupplier();
		}
	}

	return (
		<Card className="shadow-none">
			<CardHeader>
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div className="grid gap-1">
						<CardTitle>Supplier registration</CardTitle>
						<CardDescription>
							Create the legal identity and finance contact used by purchasing,
							payables, and remittance workflows.
						</CardDescription>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="outline">Master data</Badge>
						<StatusBadge status="pending" label="Draft" />
					</div>
				</div>
			</CardHeader>

			<form noValidate onSubmit={handleSubmit}>
				<CardContent className="grid gap-6">
					<WorkbenchSection
						id="supplier-legal-identity"
						title="Legal identity"
						description="Registration values must match the supplier’s official records."
					>
						<div className="grid gap-4 sm:grid-cols-2">
							<FormField
								label="Registered supplier name"
								description="Use the name shown on the registration certificate."
								required
							>
								<FormInput
									name="registeredName"
									defaultValue="Northwind Trading Sdn. Bhd."
									required
								/>
							</FormField>

							<FormField
								fieldId="supplier-tax-registration"
								label="Tax registration number"
								description="Enter the identifier issued by the tax authority."
								{...(taxError === undefined ? {} : { error: taxError })}
								required
							>
								<FormInput
									name="taxRegistration"
									value={taxRegistration}
									onChange={(event) =>
										setTaxRegistration(event.currentTarget.value)
									}
									required
								/>
							</FormField>
						</div>
					</WorkbenchSection>

					<WorkbenchSection
						id="supplier-finance-contact"
						title="Finance contact"
						description="This contact receives remittance and payment-query notices."
					>
						<div className="grid gap-4 sm:grid-cols-2">
							<FormField label="Contact name" required>
								<FormInput
									name="contactName"
									defaultValue="Aisha Rahman"
									required
								/>
							</FormField>

							<FormField label="Email address" required>
								<FormInput
									name="email"
									type="email"
									defaultValue="aisha@example.com"
									required
								/>
							</FormField>
						</div>
					</WorkbenchSection>

					<WorkbenchSection
						id="supplier-governed-values"
						title="Governed values"
						description="Read-only values remain reviewable. Disabled controls do not participate in the current task."
					>
						<div className="grid gap-4 sm:grid-cols-2">
							<FormField
								label="Approved legal name"
								description="Updated only through the legal-identity change workflow."
							>
								<FormInput
									defaultValue="Northwind Trading Sdn. Bhd."
									readOnly
								/>
							</FormField>

							<FormField
								label="External integration reference"
								description="Unavailable until the supplier is activated."
							>
								<FormInput defaultValue="Assigned after activation" disabled />
							</FormField>
						</div>
					</WorkbenchSection>

					<FormField
						label="Internal review note"
						description="Visible to procurement and finance reviewers."
					>
						<FormTextarea defaultValue="Bank account evidence verified." />
					</FormField>
				</CardContent>

				<CardFooter className="justify-end gap-2 border-t">
					<Button type="button" variant="outline" onClick={cancelSupplier}>
						Cancel
					</Button>
					<Button type="submit">Save supplier</Button>
				</CardFooter>
			</form>
		</Card>
	);
}

const evidence = contractEvidence("ui.form-field");

const meta = {
	title: "UI System/Form Field",
	component: FormField,
	tags: ["autodocs", "test"],
	parameters: {
		...contractDocsParameters(evidence, "Form Field"),
	},
} satisfies Meta<typeof FormField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"One supplier registration workbench: FormField owns labels, helpers, and field-level correction. Feature code owns validation, Cancel versus Save, and whether the write succeeds.",
			},
		},
	},
	render: () => (
		<div className="min-h-screen bg-canvas text-foreground">
			<div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
				<header className="grid gap-2 border-b pb-6">
					<p className="text-sm font-medium text-foreground-secondary">
						Supplier master data
					</p>
					<h1 className="text-2xl font-semibold tracking-tight">
						Supplier registration
					</h1>
					<p className="max-w-5xl text-sm leading-6 text-foreground-secondary">
						FormField provides persistent labels, supporting guidance, and
						field-level correction. Feature code owns validation, submission,
						and business policy — Badge taxonomy and StatusBadge lifecycle stay
						on the record chrome.
					</p>
				</header>

				<SupplierMasterForm />
			</div>
		</div>
	),
	play: async ({ canvasElement }) => {
		saveSupplier.mockClear();
		cancelSupplier.mockClear();

		const canvas = within(canvasElement);

		await userEvent.click(
			canvas.getByRole("button", { name: "Save supplier" }),
		);

		const taxInput = canvas.getByRole("textbox", {
			name: /Tax registration number/,
		});

		await expect(taxInput).toHaveAttribute("aria-invalid", "true");
		await expect(saveSupplier).toHaveBeenCalledTimes(0);

		await userEvent.type(taxInput, "MY-TAX-1042");

		await userEvent.click(
			canvas.getByRole("button", { name: "Save supplier" }),
		);

		await expect(saveSupplier).toHaveBeenCalledTimes(1);

		await userEvent.click(canvas.getByRole("button", { name: "Cancel" }));

		await expect(cancelSupplier).toHaveBeenCalledTimes(1);
	},
};

export const SemanticUsage: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Approved roles: labelled ready field, required marker, field-level error, read-only review value, and disabled non-participating control.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-xl gap-6">
			<StorySection title="Ready · helper guidance">
				<FormField
					label="Registered supplier name"
					description="Use the legal name shown on the registration certificate."
				>
					<FormInput defaultValue="Northwind Trading Sdn. Bhd." />
				</FormField>
			</StorySection>
			<StorySection title="Required · explicit marker">
				<FormField label="Contact name" required>
					<FormInput defaultValue="Aisha Rahman" required />
				</FormField>
			</StorySection>
			<StorySection title="Invalid · actionable correction">
				<FormField
					label="Tax registration number"
					description="Enter the identifier issued by the tax authority."
					error="Tax registration number is required."
					required
				>
					<FormInput required />
				</FormField>
			</StorySection>
			<StorySection title="Read-only · reviewable governed value">
				<FormField
					label="Approved legal name"
					description="Updated only through an approved legal-name change."
				>
					<FormInput defaultValue="Northwind Trading Sdn. Bhd." readOnly />
				</FormField>
			</StorySection>
			<StorySection title="Disabled · not in this task">
				<FormField
					label="External integration reference"
					description="Unavailable until the supplier is activated."
				>
					<FormInput defaultValue="Assigned after activation" disabled />
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
					"One FormField owns one visible label and one control. Helper text adds business guidance without repeating the label. FormField sets id and ARIA on the child — do not duplicate them.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-xl gap-6">
			<FormField
				label="Registered supplier name"
				description="Use the legal name shown on the registration certificate."
				required
			>
				<FormInput defaultValue="Northwind Trading Sdn. Bhd." required />
			</FormField>

			<FormField
				label="Payment reference prefix"
				description="Appears before generated remittance references, for example SUP-."
			>
				<FormInput defaultValue="SUP-" />
			</FormField>

			<FormField
				label="Internal review note"
				description="Visible to procurement and finance reviewers only."
			>
				<FormTextarea defaultValue="Bank account evidence verified." />
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
					"Required, invalid, read-only, and disabled controls retain distinct semantics. Description and error content are programmatically associated with their controls.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-xl gap-6">
			<FormField
				fieldId="supplier-tax-id"
				label="Tax registration number"
				description="Enter the identifier issued by the tax authority."
				error="Tax registration number is required."
				required
			>
				<FormInput required />
			</FormField>

			<FormField
				label="Approved legal name"
				description="Updated only through an approved legal-name change."
			>
				<FormInput defaultValue="Northwind Trading Sdn. Bhd." readOnly />
			</FormField>

			<FormField
				label="External integration reference"
				description="Unavailable until the supplier is activated."
			>
				<FormInput defaultValue="Assigned after activation" disabled />
			</FormField>
		</div>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		const taxInput = canvas.getByRole("textbox", {
			name: /Tax registration number/,
		});
		const legalName = canvas.getByRole("textbox", {
			name: "Approved legal name",
		});
		const integrationReference = canvas.getByRole("textbox", {
			name: "External integration reference",
		});

		await expect(taxInput).toHaveAttribute("aria-invalid", "true");
		await expect(taxInput).toBeRequired();
		await expect(taxInput).toHaveAccessibleDescription(
			/Enter the identifier issued by the tax authority.*Tax registration number is required/,
		);

		await expect(legalName).toHaveAttribute("readonly");
		await expect(legalName).not.toBeDisabled();

		await expect(integrationReference).toBeDisabled();

		await userEvent.click(taxInput);
		await expect(taxInput).toHaveFocus();

		await expect(taxInput.id).not.toBe("");
		await expect(legalName.id).not.toBe("");
		await expect(integrationReference.id).not.toBe("");

		await expect(legalName.id).not.toBe(taxInput.id);
		await expect(integrationReference.id).not.toBe(taxInput.id);
	},
};

export const VariantsAndSizes: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Family inventory: FormField with FormInput (single-line) and FormTextarea (multi-line). No size scale on FormField — denseness comes from the composed control and layout width.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6 sm:grid-cols-2">
			<div className="grid gap-2">
				<p className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
					FormInput
				</p>
				<FormField
					label="Payment reference"
					description="Single-line remittance reference."
				>
					<FormInput defaultValue="PO-1042" />
				</FormField>
			</div>
			<div className="grid gap-2">
				<p className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
					FormTextarea
				</p>
				<FormField
					label="Internal review note"
					description="Multi-line reviewer context."
				>
					<FormTextarea defaultValue="Bank account evidence verified." />
				</FormField>
			</div>
		</div>
	),
};

export const Composition: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"FormField composes inside bounded record and policy Cards. Card owns the surface; FormField owns one labelled control; the form owns submission. Lifecycle stays on StatusBadge.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6 lg:grid-cols-2">
			<Card className="shadow-none">
				<CardHeader>
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div className="grid gap-1">
							<CardTitle>Supplier contact</CardTitle>
							<CardDescription>Finance remittance notices</CardDescription>
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant="secondary">Suppliers</Badge>
							<StatusBadge status="pending" label="Awaiting save" />
						</div>
					</div>
				</CardHeader>

				<form onSubmit={(event) => event.preventDefault()}>
					<CardContent className="grid gap-4">
						<FormField label="Contact name" required>
							<FormInput
								name="contactName"
								defaultValue="Aisha Rahman"
								required
							/>
						</FormField>

						<FormField label="Email address" required>
							<FormInput
								name="email"
								type="email"
								defaultValue="aisha@example.com"
								required
							/>
						</FormField>
					</CardContent>

					<CardFooter className="justify-end gap-2 border-t">
						<Button type="button" variant="outline">
							Cancel
						</Button>
						<Button type="submit">Save contact</Button>
					</CardFooter>
				</form>
			</Card>

			<Card className="shadow-none">
				<CardHeader>
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div className="grid gap-1">
							<CardTitle>Approval policy</CardTitle>
							<CardDescription>High-value invoice routing</CardDescription>
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant="outline">Governance</Badge>
							<StatusBadge status="success" label="Active" />
						</div>
					</div>
				</CardHeader>

				<form onSubmit={(event) => event.preventDefault()}>
					<CardContent className="grid gap-4">
						<FormField
							label="Policy name"
							description="Visible in audit history."
							required
						>
							<FormInput
								name="policyName"
								defaultValue="High-value supplier invoices"
								required
							/>
						</FormField>

						<FormField
							label="Escalation mailbox"
							description="Receives unresolved approval alerts."
							required
						>
							<FormInput
								name="mailbox"
								type="email"
								defaultValue="finance-control@example.com"
								required
							/>
						</FormField>
					</CardContent>

					<CardFooter className="justify-end gap-2 border-t">
						<Button type="button" variant="outline">
							Cancel
						</Button>
						<Button type="submit">Save policy</Button>
					</CardFooter>
				</form>
			</Card>
		</div>
	),
};

export const DoAndDoNot: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Do keep persistent labels, actionable errors, and one control per FormField. Do not rely on placeholder-only labels, vague errors, or multi-control fields.",
			},
		},
	},
	render: () => (
		<div className="grid max-w-5xl gap-6 sm:grid-cols-2">
			<StorySection title="Do: provide a persistent label">
				<FormField label="Payment reference">
					<FormInput defaultValue="PO-1042" />
				</FormField>
			</StorySection>

			<StorySection title="Do not: rely on placeholder-only instruction">
				<div className="grid gap-2">
					<FormInput
						placeholder="Payment reference"
						aria-label="Payment reference"
					/>
					<p className="text-sm text-foreground-secondary">
						Placeholder text disappears after entry and is not a durable visible
						label.
					</p>
				</div>
			</StorySection>

			<StorySection title="Do: make errors actionable">
				<FormField
					label="Tax registration number"
					error="Enter the tax registration number shown on the certificate."
				>
					<FormInput />
				</FormField>
			</StorySection>

			<StorySection title="Do not: use vague error copy">
				<div className="grid gap-2">
					<FormField label="Tax registration number" error="Invalid value.">
						<FormInput />
					</FormField>
					<p className="text-sm text-foreground-secondary">
						Vague errors do not tell the operator how to correct the field.
					</p>
				</div>
			</StorySection>

			<StorySection title="Do: use helper text for business guidance">
				<FormField
					label="Registered supplier name"
					description="Use the legal name shown on the registration certificate."
				>
					<FormInput />
				</FormField>
			</StorySection>

			<StorySection title="Do not: repeat the label as helper text">
				<div className="grid gap-2">
					<FormField
						label="Registered supplier name"
						description="Enter the registered supplier name."
					>
						<FormInput />
					</FormField>
					<p className="text-sm text-foreground-secondary">
						Helper text should add guidance, not restate the label.
					</p>
				</div>
			</StorySection>

			<StorySection title="Do: separate distinct controls">
				<div className="grid gap-4">
					<FormField label="Given name">
						<FormInput />
					</FormField>
					<FormField label="Family name">
						<FormInput />
					</FormField>
				</div>
			</StorySection>

			<StorySection title="Do not: hide multiple controls under one field label">
				<div className="grid gap-2">
					<p className="text-sm font-medium">Contact name</p>
					<div className="grid grid-cols-2 gap-2">
						<FormInput aria-label="Given name" />
						<FormInput aria-label="Family name" />
					</div>
					<p className="text-sm text-foreground-secondary">
						One FormField owns exactly one logical control.
					</p>
				</div>
			</StorySection>
		</div>
	),
};
