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
	Input,
	StatusBadge,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";
import { interactionFor } from "./interactions";

const evidence = contractEvidence("ui.input");

const meta = {
	title: "UI System/Input",
	component: Input,
	tags: ["autodocs", "test"],
	parameters: {
		...contractDocsParameters(evidence, "Input"),
		docs: {
			description: {
				component:
					"Input is Afenda's native single-line data-entry primitive. It owns browser input semantics, focus, and value entry. FormField owns visible labelling, description, required and error relationships. Feature code owns authorization, normalization, validation policy, masking, persistence, and commands.",
			},
		},
	},
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"One supplier master-data Card: reference and contact email entry. Input owns native single-line entry — not labelling, parsing, or save.",
			},
		},
	},
	render: () => (
		<div className="min-h-screen bg-canvas text-foreground">
			<main className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
				<header className="grid gap-5 border-b pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
					<div className="grid gap-2">
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant="outline">Master data</Badge>
							<StatusBadge label="Supplier draft" size="sm" status="active" />
						</div>
						<div className="grid gap-1">
							<h1 className="font-semibold text-2xl tracking-tight">
								Supplier identity
							</h1>
							<p className="max-w-5xl text-foreground-secondary text-sm leading-6">
								Each Input is one labelled single-line value. FormField owns
								labels and errors; feature code owns validation, permissions,
								and persistence.
							</p>
						</div>
					</div>
					<dl className="grid grid-cols-2 gap-x-8 gap-y-3 rounded-lg border bg-card p-4">
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								Subject
							</dt>
							<dd className="text-sm">Supplier identity</dd>
						</div>
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								Area
							</dt>
							<dd className="text-sm">Master data</dd>
						</div>
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								Scope
							</dt>
							<dd className="text-sm">Single-line entry fields</dd>
						</div>
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								State
							</dt>
							<dd className="text-sm">Supplier draft</dd>
						</div>
					</dl>
				</header>

				<section aria-labelledby="input-identity-title" className="grid gap-3">
					<div className="grid gap-1">
						<h2
							className="font-semibold text-base text-foreground tracking-tight"
							id="input-identity-title"
						>
							Identity fields
						</h2>
						<p className="text-foreground-secondary text-sm">
							Reference and email use native types; placeholders stay examples,
							not labels.
						</p>
					</div>
					<Card className="shadow-none">
						<CardHeader>
							<CardTitle>Supplier record</CardTitle>
							<CardDescription>
								Northwind Trading · draft SUP-004821
							</CardDescription>
						</CardHeader>
						<CardContent className="grid gap-4">
							<FormField
								description="Use the reference shown on the supplier record."
								label="Supplier reference"
							>
								<Input autoComplete="off" defaultValue="SUP-004821" />
							</FormField>
							<FormField
								description="Finance remittance and statement delivery."
								label="Contact email"
							>
								<Input
									autoComplete="email"
									defaultValue="finance@northwind.example"
									type="email"
								/>
							</FormField>
						</CardContent>
						<CardFooter className="justify-end border-t">
							<Button size="sm" type="button">
								Save supplier
							</Button>
						</CardFooter>
					</Card>
				</section>
			</main>
		</div>
	),
};

export const Usage: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Approved Input roles are one labelled single-line textual or scalar value, with the native HTML type, inputMode, and autocomplete chosen for the actual data. Input is not a search workflow, permission boundary, parser, or save command.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-md gap-4">
			<FormField
				description="Use the reference shown on the supplier record."
				label="Supplier reference"
			>
				<Input autoComplete="off" defaultValue="SUP-1042" />
			</FormField>
			<FormField label="Contact email">
				<Input
					autoComplete="email"
					defaultValue="finance@example.com"
					type="email"
				/>
			</FormField>
		</div>
	),
};

export const AdaptiveLayout: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Input fills the available field width and preserves its visible label, entered value, and validation meaning in narrow drawers and wide desktop forms. Consumers own responsive form layout; Input does not invent compact semantics.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-4xl gap-8">
			<StorySection
				description="Long business labels wrap outside the control while the entered value remains usable."
				title="Narrow approval drawer"
			>
				<div className="w-full max-w-xs rounded-xl border border-border border-dashed p-4">
					<FormField
						description="Use the exact reference printed on the supporting document."
						label="Supplier tax registration reference"
					>
						<Input autoComplete="off" defaultValue="MY-SST-W10-1808-32000123" />
					</FormField>
				</div>
			</StorySection>
			<StorySection
				description="Related fields may share layout columns, but each Input remains independently labelled."
				title="Wide master-data form"
			>
				<div className="grid gap-4 md:grid-cols-2">
					<FormField label="Legal name">
						<Input
							autoComplete="organization"
							defaultValue="Northwind Trading Sdn. Bhd."
						/>
					</FormField>
					<FormField label="Finance contact email">
						<Input
							autoComplete="email"
							defaultValue="finance@northwind.example"
							type="email"
						/>
					</FormField>
				</div>
			</StorySection>
		</div>
	),
};

export const AuthorizationAndValidation: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Rendering an Input does not grant field access, and browser validity does not replace domain validation. Sensitive projections, edit permission, normalization, uniqueness, and save-time revalidation remain feature-owned.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6">
			<StorySection
				description="Feature code has already determined that this operator may view and edit the value."
				title="Authorized editable field"
			>
				<FormField
					description="Uniqueness is revalidated when Save supplier runs."
					label="Supplier reference"
				>
					<Input autoComplete="off" defaultValue="SUP-004821" />
				</FormField>
			</StorySection>
			<StorySection
				description="Use readOnly when the value must remain selectable and available to an authorized operator."
				title="Readable but not editable"
			>
				<FormField label="Approved legal registration number">
					<Input defaultValue="202601004821" readOnly />
				</FormField>
			</StorySection>
			<StorySection
				description="Do not render a disabled raw value as a substitute for field-level authorization."
				title="Unauthorized sensitive field"
			>
				<p className="text-foreground-secondary text-sm leading-6">
					Feature projections must omit or mask unauthorized data before it
					reaches Input. Disabled styling is interaction state, not privacy
					enforcement.
				</p>
			</StorySection>
		</div>
	),
};

export const StatesAndAccessibility: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Editable, read-only, disabled, and invalid states retain visible labels and entered values. Read-only remains focusable and selectable; disabled is unavailable; invalid preserves user input and exposes the FormField error relationship.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-md gap-4">
			<FormField label="Editable reference">
				<Input defaultValue="PO-1042" />
			</FormField>
			<FormField label="Approved reference">
				<Input defaultValue="PO-1038" readOnly />
			</FormField>
			<FormField label="Unavailable integration reference">
				<Input defaultValue="Not available" disabled />
			</FormField>
			<FormField error="Enter a valid tax identifier." label="Tax identifier">
				<Input defaultValue="?" />
			</FormField>
		</div>
	),
	play: async (context) => interactionFor("input")(context),
};

export const Composition: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Compose Input inside FormField on a Card workbench. Search and permissions stay on the Card footer — not inside the control.",
			},
		},
	},
	render: () => (
		<Card className="w-full max-w-lg shadow-none">
			<CardHeader>
				<CardTitle>Search supplier ledger</CardTitle>
				<CardDescription>
					Find suppliers by legal name or reference before opening the record.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<FormField
					description="Example: Northwind or SUP-1042."
					label="Supplier name or reference"
				>
					<Input autoComplete="off" placeholder="Northwind or SUP-1042" />
				</FormField>
			</CardContent>
			<CardFooter className="justify-end border-t">
				<Button size="sm" type="button">
					Search suppliers
				</Button>
			</CardFooter>
		</Card>
	),
};

export const DoAndDoNot: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Do: keep a visible FormField label. Do not: rely on placeholder-only instruction as the field label.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6 md:grid-cols-2">
			<StorySection
				description="Visible FormField label with an optional format hint in the placeholder."
				title="Do"
			>
				<FormField label="Invoice reference">
					<Input autoComplete="off" placeholder="INV-1042" />
				</FormField>
			</StorySection>
			<StorySection
				description="Placeholder-only instruction is not a field label."
				title="Do not"
			>
				<div className="grid gap-2 rounded-md border border-destructive/40 p-3">
					<Input
						aria-label="Invoice reference"
						placeholder="Enter invoice reference"
					/>
					<p className="text-destructive text-xs">
						Accessible name alone does not replace a visible field label for
						operators.
					</p>
				</div>
			</StorySection>
		</div>
	),
};
