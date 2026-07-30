import {
	Badge,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSeparator,
	FieldSet,
	FieldTitle,
	Input,
	StatusBadge,
	Textarea,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { FormEvent } from "react";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";

const evidence = contractEvidence("ui.field");

function preventSubmit(event: FormEvent<HTMLFormElement>): void {
	event.preventDefault();
}

const meta = {
	title: "UI System/Field",
	component: Field,
	tags: ["autodocs", "test"],
	parameters: {
		...contractDocsParameters(evidence, "Field"),
	},
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"Legal company registration uses FieldSet, FieldLegend, FieldGroup, and Field so labels, help, errors, and controls remain structurally associated. Field owns form composition; feature schemas own validation, normalization, persistence, and authorization.",
			},
		},
	},
	render: () => (
		<div className="min-h-screen bg-canvas text-foreground">
			<div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
				<header className="grid gap-2 border-b pb-6">
					<p className="font-medium text-foreground-secondary text-sm">
						Corporate administration · legal company
					</p>
					<h1 className="font-semibold text-2xl tracking-tight">
						Register legal company
					</h1>
					<p className="max-w-5xl text-foreground-secondary text-sm leading-6">
						Field composes labels, descriptions, and errors around controls.
						Domain validation and save authorization stay in feature code.
					</p>
				</header>

				<Card className="shadow-none">
					<CardHeader>
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant="outline">Corporate Administration</Badge>
							<StatusBadge label="Draft" size="sm" status="pending" />
						</div>
						<CardTitle>Legal identity</CardTitle>
						<CardDescription>
							org-fragrant-lake · Malaysia · finance-control review
						</CardDescription>
					</CardHeader>
					<CardContent>
						<form className="grid gap-6" onSubmit={preventSubmit}>
							<FieldSet>
								<FieldLegend>Organization details</FieldLegend>
								<FieldDescription>
									Use the registered legal name that appears on tax and banking
									documents. Supporting guidance stays visible before
									validation.
								</FieldDescription>
								<FieldGroup>
									<Field orientation="vertical">
										<FieldLabel htmlFor="overview-legal-name">
											Legal name
										</FieldLabel>
										<FieldContent>
											<Input
												autoComplete="organization"
												defaultValue="Nexus Canon Sdn. Bhd."
												id="overview-legal-name"
												name="legalName"
											/>
											<FieldDescription>
												Must match SSM / Companies Commission registration.
											</FieldDescription>
										</FieldContent>
									</Field>

									<Field orientation="vertical">
										<FieldLabel htmlFor="overview-trading-name">
											Trading name
										</FieldLabel>
										<FieldContent>
											<Input
												autoComplete="organization"
												defaultValue="Afenda"
												id="overview-trading-name"
												name="tradingName"
											/>
											<FieldDescription>
												Optional display name used on operator workspaces.
											</FieldDescription>
										</FieldContent>
									</Field>

									<FieldSeparator>Tax identity</FieldSeparator>

									<Field orientation="vertical">
										<FieldLabel htmlFor="overview-tax-id">
											Tax registration number
										</FieldLabel>
										<FieldContent>
											<Input
												autoComplete="off"
												defaultValue="C1234567890"
												id="overview-tax-id"
												inputMode="text"
												name="taxRegistration"
											/>
											<FieldDescription>
												Malaysia SST / TIN as issued by LHDN.
											</FieldDescription>
										</FieldContent>
									</Field>
								</FieldGroup>
							</FieldSet>
						</form>
					</CardContent>
					<CardFooter className="justify-end gap-2 border-t">
						<Button type="button" variant="outline">
							Cancel
						</Button>
						<Button type="button">Save draft</Button>
					</CardFooter>
				</Card>
			</div>
		</div>
	),
};

export const Usage: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Approved orientations vertical, horizontal, and responsive. Keep one orientation consistent inside a local section unless the FieldGroup must adapt by container width.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-2xl gap-6">
			<StorySection title="orientation=vertical — default ERP flow">
				<FieldSet>
					<FieldLegend variant="label">Supplier contact</FieldLegend>
					<FieldGroup>
						<Field orientation="vertical">
							<FieldLabel htmlFor="usage-vertical-email">
								Finance email
							</FieldLabel>
							<FieldContent>
								<Input
									autoComplete="email"
									defaultValue="ap@northwind.example"
									id="usage-vertical-email"
									type="email"
								/>
								<FieldDescription>
									Used for remittance advice and invoice disputes.
								</FieldDescription>
							</FieldContent>
						</Field>
					</FieldGroup>
				</FieldSet>
			</StorySection>

			<StorySection title="orientation=horizontal — compact wide row">
				<FieldGroup>
					<Field orientation="horizontal">
						<FieldLabel htmlFor="usage-horizontal-code">
							Supplier code
						</FieldLabel>
						<FieldContent>
							<Input
								autoComplete="off"
								className="max-w-xs"
								defaultValue="SUP-0142"
								id="usage-horizontal-code"
							/>
							<FieldDescription>
								Stable master-data identifier — not the legal name.
							</FieldDescription>
						</FieldContent>
					</Field>
				</FieldGroup>
			</StorySection>

			<StorySection title="orientation=responsive — adapts in FieldGroup">
				<FieldGroup className="@container/field-group">
					<Field orientation="responsive">
						<FieldLabel htmlFor="usage-responsive-currency">
							Settlement currency
						</FieldLabel>
						<FieldContent>
							<Input
								autoComplete="off"
								className="max-w-[8rem]"
								defaultValue="MYR"
								id="usage-responsive-currency"
							/>
							<FieldDescription>
								ISO currency for payables settlement in this organization.
							</FieldDescription>
						</FieldContent>
					</Field>
				</FieldGroup>
			</StorySection>
		</div>
	),
};

export const StatesAndAccessibility: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Invalid fields pair data-invalid with FieldError text. Disabled fields stay labelled. Legend variants name groups without replacing control labels.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-2xl gap-6">
			<StorySection title="Invalid — actionable FieldError">
				<FieldGroup>
					<Field data-invalid orientation="vertical">
						<FieldLabel htmlFor="state-invalid-legal">Legal name</FieldLabel>
						<FieldContent>
							<Input
								aria-invalid
								autoComplete="organization"
								defaultValue=""
								id="state-invalid-legal"
								name="legalName"
							/>
							<FieldError errors={[{ message: "Legal name is required." }]} />
						</FieldContent>
					</Field>
				</FieldGroup>
			</StorySection>

			<StorySection title="Multiple FieldError messages">
				<FieldGroup>
					<Field data-invalid orientation="vertical">
						<FieldLabel htmlFor="state-multi-tax">
							Tax registration number
						</FieldLabel>
						<FieldContent>
							<Input
								aria-invalid
								autoComplete="off"
								defaultValue="ABC"
								id="state-multi-tax"
								name="taxRegistration"
							/>
							<FieldError
								errors={[
									{ message: "Tax registration must be 10–13 characters." },
									{ message: "Only letters and digits are allowed." },
								]}
							/>
						</FieldContent>
					</Field>
				</FieldGroup>
			</StorySection>

			<StorySection title="Disabled — labelled, non-interactive">
				<FieldGroup>
					<Field data-disabled orientation="vertical">
						<FieldLabel htmlFor="state-disabled-org">
							Organization id
						</FieldLabel>
						<FieldContent>
							<Input
								autoComplete="off"
								defaultValue="org-fragrant-lake-90358173"
								disabled
								id="state-disabled-org"
							/>
							<FieldDescription>
								Assigned by the platform — operators cannot edit it here.
							</FieldDescription>
						</FieldContent>
					</Field>
				</FieldGroup>
			</StorySection>

			<StorySection title="FieldLegend variant=legend vs label">
				<div className="grid gap-6 sm:grid-cols-2">
					<FieldSet>
						<FieldLegend variant="legend">Bank remittance</FieldLegend>
						<FieldDescription>
							Legend scale for a primary group heading.
						</FieldDescription>
						<FieldGroup>
							<Field orientation="vertical">
								<FieldLabel htmlFor="state-legend-bank">
									Account name
								</FieldLabel>
								<Input
									autoComplete="off"
									defaultValue="Nexus Canon Operating"
									id="state-legend-bank"
								/>
							</Field>
						</FieldGroup>
					</FieldSet>
					<FieldSet>
						<FieldLegend variant="label">Bank remittance</FieldLegend>
						<FieldDescription>
							Label scale when the group sits beside denser sections.
						</FieldDescription>
						<FieldGroup>
							<Field orientation="vertical">
								<FieldLabel htmlFor="state-label-bank">Account name</FieldLabel>
								<Input
									autoComplete="off"
									defaultValue="Nexus Canon Operating"
									id="state-label-bank"
								/>
							</Field>
						</FieldGroup>
					</FieldSet>
				</div>
			</StorySection>
		</div>
	),
};

export const RequiredReadOnlyAndOptional: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Required, optional, read-only, and disabled are distinct contracts. Required uses visible copy and native semantics; read-only values remain focusable and copyable; disabled controls are unavailable.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-2xl gap-6">
			<StorySection title="Required field">
				<FieldGroup>
					<Field orientation="vertical">
						<FieldLabel htmlFor="required-legal-name">
							Legal name <span aria-hidden="true">*</span>
						</FieldLabel>
						<FieldContent>
							<Input
								aria-required="true"
								autoComplete="organization"
								id="required-legal-name"
								name="legalName"
								required
							/>
							<FieldDescription>
								Required. Enter the name shown on the registration document.
							</FieldDescription>
						</FieldContent>
					</Field>
				</FieldGroup>
			</StorySection>
			<StorySection title="Optional field">
				<FieldGroup>
					<Field orientation="vertical">
						<FieldLabel htmlFor="optional-trading-name">
							Trading name
						</FieldLabel>
						<FieldContent>
							<Input
								autoComplete="organization"
								id="optional-trading-name"
								name="tradingName"
							/>
							<FieldDescription>
								Optional. Used only for operator-facing display.
							</FieldDescription>
						</FieldContent>
					</Field>
				</FieldGroup>
			</StorySection>
			<StorySection title="Read-only field">
				<FieldGroup>
					<Field orientation="vertical">
						<FieldLabel htmlFor="readonly-organization-id">
							Organization id
						</FieldLabel>
						<FieldContent>
							<Input
								aria-readonly="true"
								id="readonly-organization-id"
								name="organizationId"
								readOnly
								value="org-fragrant-lake-90358173"
							/>
							<FieldDescription>
								Platform-assigned value. It remains available for copying.
							</FieldDescription>
						</FieldContent>
					</Field>
				</FieldGroup>
			</StorySection>
		</div>
	),
};

export const Composition: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Card owns the workspace surface. FieldSet groups remittance fields. StatusBadge owns record lifecycle — Field never encodes approval success.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6 lg:grid-cols-2">
			<Card className="shadow-none">
				<CardHeader>
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="outline">Payables</Badge>
						<StatusBadge label="Awaiting review" size="sm" status="pending" />
					</div>
					<CardTitle>Supplier remittance</CardTitle>
					<CardDescription>
						Northwind Trading · SUP-0142 · FieldSet for bank details
					</CardDescription>
				</CardHeader>
				<CardContent>
					<FieldSet>
						<FieldLegend>Settlement account</FieldLegend>
						<FieldDescription>
							Bank details used for payment runs. Errors stay field-local.
						</FieldDescription>
						<FieldGroup>
							<Field orientation="vertical">
								<FieldLabel htmlFor="comp-bank-name">Bank name</FieldLabel>
								<FieldContent>
									<Input
										autoComplete="off"
										defaultValue="Maybank Berhad"
										id="comp-bank-name"
									/>
								</FieldContent>
							</Field>
							<Field orientation="vertical">
								<FieldLabel htmlFor="comp-account">Account number</FieldLabel>
								<FieldContent>
									<Input
										autoComplete="off"
										defaultValue="512345678901"
										id="comp-account"
										inputMode="numeric"
									/>
									<FieldDescription>
										Do not store PAN or card numbers in remittance fields.
									</FieldDescription>
								</FieldContent>
							</Field>
							<FieldSeparator>Notes</FieldSeparator>
							<Field orientation="vertical">
								<FieldLabel htmlFor="comp-notes">Operator notes</FieldLabel>
								<FieldContent>
									<Textarea
										defaultValue="Prefer MYR settlement on Tuesdays."
										id="comp-notes"
										rows={3}
									/>
								</FieldContent>
							</Field>
						</FieldGroup>
					</FieldSet>
				</CardContent>
				<CardFooter className="justify-end gap-2 border-t">
					<Button type="button" variant="outline">
						Cancel
					</Button>
					<Button type="button">Save remittance</Button>
				</CardFooter>
			</Card>

			<Card className="shadow-none">
				<CardHeader>
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="secondary">Receivables</Badge>
						<StatusBadge label="Operational" size="sm" status="active" />
					</div>
					<CardTitle>Invoice header edit</CardTitle>
					<CardDescription>
						Horizontal fields for compact reference codes on wide layouts
					</CardDescription>
				</CardHeader>
				<CardContent>
					<FieldGroup>
						<Field orientation="horizontal">
							<FieldLabel htmlFor="comp-invoice">Invoice number</FieldLabel>
							<FieldContent>
								<Input
									autoComplete="off"
									className="max-w-xs"
									defaultValue="INV-1048"
									id="comp-invoice"
								/>
							</FieldContent>
						</Field>
						<Field orientation="horizontal">
							<FieldLabel htmlFor="comp-po">Customer PO</FieldLabel>
							<FieldContent>
								<Input
									autoComplete="off"
									className="max-w-xs"
									defaultValue="PO-77821"
									id="comp-po"
								/>
								<FieldDescription>
									Customer purchase order reference for dispute matching.
								</FieldDescription>
							</FieldContent>
						</Field>
					</FieldGroup>
				</CardContent>
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
					"Field is form association chrome. It is not a layout grid, a StatusBadge, or a substitute for FieldLabel / FieldLegend.",
			},
		},
	},
	render: () => (
		<div className="grid max-w-5xl gap-6 sm:grid-cols-2">
			<StorySection title="Do: FieldLabel + control id association">
				<FieldGroup>
					<Field orientation="vertical">
						<FieldLabel htmlFor="do-legal">Legal name</FieldLabel>
						<FieldContent>
							<Input
								autoComplete="organization"
								defaultValue="Nexus Canon Sdn. Bhd."
								id="do-legal"
							/>
							<FieldDescription>
								Visible label and description before any error.
							</FieldDescription>
						</FieldContent>
					</Field>
				</FieldGroup>
			</StorySection>

			<StorySection title="Do not: FieldTitle as the only control label">
				<p className="text-foreground-secondary text-sm">
					FieldTitle is presentation chrome inside a Field. Associate every
					editable control with FieldLabel (or a FieldSet FieldLegend for a
					group) — never FieldTitle alone.
				</p>
				<FieldGroup>
					<Field data-invalid orientation="vertical">
						<FieldTitle>Legal name</FieldTitle>
						<FieldError
							errors={[
								{
									message:
										"This pattern lacks a labelled control — use FieldLabel.",
								},
							]}
						/>
					</Field>
				</FieldGroup>
			</StorySection>

			<StorySection title="Do: FieldSet for related identity fields">
				<FieldSet>
					<FieldLegend variant="label">Tax identity</FieldLegend>
					<FieldGroup>
						<Field orientation="vertical">
							<FieldLabel htmlFor="do-tax">Tax registration number</FieldLabel>
							<Input
								autoComplete="off"
								defaultValue="C1234567890"
								id="do-tax"
							/>
						</Field>
					</FieldGroup>
				</FieldSet>
			</StorySection>

			<StorySection title="Do not: use Field as page layout">
				<p className="text-foreground-secondary text-sm">
					Do not wrap toolbars, tables, or Card chrome in Field / FieldGroup for
					spacing. Field exists to associate labels, help, and errors with form
					controls.
				</p>
			</StorySection>
		</div>
	),
};
