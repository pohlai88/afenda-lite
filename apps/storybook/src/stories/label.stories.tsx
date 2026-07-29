import {
	Badge,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
	Checkbox,
	Input,
	Label,
	StatusBadge,
	Switch,
	Textarea,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";

const evidence = contractEvidence("ui.label");

type WorkbenchSectionProps = Readonly<{
	id: string;
	title: string;
	description: string;
	children: ReactNode;
}>;

function WorkbenchSection({
	id,
	title,
	description,
	children,
}: WorkbenchSectionProps) {
	return (
		<section className="grid gap-4" aria-labelledby={id}>
			<div className="grid gap-1">
				<h2 className="text-base font-semibold tracking-tight" id={id}>
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

const meta = {
	title: "UI System/Label",
	component: Label,
	tags: ["autodocs", "test"],
	parameters: {
		...contractDocsParameters(evidence, "Label"),
		docs: {
			description: {
				component:
					"Label provides the durable visible name for one form control. Field and FormField own help and error composition; feature code owns validation and authorization; StatusBadge owns record lifecycle.",
			},
		},
	},
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"Enterprise form labelling for legal-company identity. Label provides the durable visible name for one control; Field owns help and error composition, feature code owns validation, and StatusBadge owns record lifecycle.",
			},
		},
	},
	render: () => (
		<div className="min-h-screen bg-canvas text-foreground">
			<div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
				<header className="grid gap-5 border-b pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
					<div className="grid gap-2">
						<p className="text-sm font-medium text-foreground-secondary">
							Corporate administration · legal company
						</p>
						<div className="grid gap-1">
							<h1 className="text-2xl font-semibold tracking-tight">
								Organization identity
							</h1>
							<p className="max-w-5xl text-sm leading-6 text-foreground-secondary">
								Every editable control needs a concise Label tied to a stable
								id. Help text and errors belong beside the field — not inside
								the label.
							</p>
						</div>
					</div>
					<dl className="grid grid-cols-2 gap-x-8 gap-y-3 rounded-lg border bg-card p-4">
						<div className="grid gap-1">
							<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								Subject
							</dt>
							<dd className="text-sm">Form labelling</dd>
						</div>
						<div className="grid gap-1">
							<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								Scope
							</dt>
							<dd className="text-sm">Visible control names</dd>
						</div>
						<div className="grid gap-1">
							<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								Ownership
							</dt>
							<dd className="text-sm">Label semantics</dd>
						</div>
						<div className="grid gap-1">
							<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								Lifecycle
							</dt>
							<dd className="text-sm">Stable at every breakpoint</dd>
						</div>
					</dl>
				</header>

				<Card className="shadow-none">
					<CardHeader>
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant="outline">Corporate Administration</Badge>
							<StatusBadge size="sm" status="pending" label="Draft" />
						</div>
						<CardTitle>Legal identity</CardTitle>
						<CardDescription>
							org-fragrant-lake · Malaysia · finance-control review
						</CardDescription>
					</CardHeader>
					<CardContent>
						<form
							className="grid gap-5"
							onSubmit={(event) => event.preventDefault()}
						>
							<div className="grid gap-2">
								<Label htmlFor="overview-org-name">Organization name</Label>
								<Input
									id="overview-org-name"
									name="organizationName"
									defaultValue="Nexus Canon Sdn. Bhd."
									autoComplete="organization"
								/>
								<p className="text-sm text-foreground-secondary">
									Registered legal name as it appears on tax documents.
								</p>
							</div>

							<div className="grid gap-2">
								<Label htmlFor="overview-trading-name">Trading name</Label>
								<Input
									id="overview-trading-name"
									name="tradingName"
									defaultValue="Afenda"
									autoComplete="organization"
								/>
							</div>

							<div className="grid gap-2">
								<Label htmlFor="overview-tax-id">Tax registration number</Label>
								<Input
									id="overview-tax-id"
									name="taxRegistration"
									defaultValue="C1234567890"
									autoComplete="off"
								/>
							</div>
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
					"Associate Label with Input, Textarea, Checkbox, and Switch through htmlFor or intentional nesting. Use stable business language, preserve the label at every breakpoint, and never make placeholder text the only visible name.",
			},
		},
	},
	render: () => (
		<WorkbenchSection
			id="label-usage-title"
			title="Labels tied to controls"
			description="Label provides the visible name while the control owns the input itself."
		>
			<div className="grid w-full max-w-xl gap-6">
				<StorySection title="Label + Input (htmlFor)">
					<div className="grid gap-2">
						<Label htmlFor="usage-supplier-code">Supplier code</Label>
						<Input
							id="usage-supplier-code"
							defaultValue="SUP-0142"
							autoComplete="off"
						/>
					</div>
				</StorySection>

				<StorySection title="Label + Textarea">
					<div className="grid gap-2">
						<Label htmlFor="usage-remittance-notes">Remittance notes</Label>
						<Textarea
							id="usage-remittance-notes"
							rows={3}
							defaultValue="Prefer MYR settlement on Tuesdays."
						/>
					</div>
				</StorySection>

				<StorySection title="Label wrapping Checkbox">
					<Label className="gap-3 rounded-lg border p-3">
						<Checkbox defaultChecked />
						<span>Send remittance advice to the finance contact</span>
					</Label>
				</StorySection>

				<StorySection title="Label beside Switch">
					<div className="flex items-center justify-between gap-4 rounded-lg border px-3 py-2">
						<Label htmlFor="usage-auto-match">Auto-match payments</Label>
						<Switch id="usage-auto-match" defaultChecked />
					</div>
				</StorySection>
			</div>
		</WorkbenchSection>
	),
};

export const StatesAndAccessibility: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Labels remain readable in default, required, read-only, disabled, invalid, high-contrast, and zoomed layouts. Required and invalid meaning must exist in control semantics and supporting text—not colour or punctuation alone.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-xl gap-6">
			<StorySection title="Default labelled control">
				<div className="grid gap-2">
					<Label htmlFor="state-default">Invoice number</Label>
					<Input
						id="state-default"
						defaultValue="INV-1048"
						autoComplete="off"
					/>
				</div>
			</StorySection>

			<StorySection title="Disabled — labelled but unavailable">
				<div className="grid gap-2">
					<Label htmlFor="state-disabled">Organization id</Label>
					<Input
						id="state-disabled"
						disabled
						defaultValue="org-fragrant-lake-90358173"
						autoComplete="off"
					/>
					<p className="text-sm text-foreground-secondary">
						Assigned by the platform — operators cannot edit it here.
					</p>
				</div>
			</StorySection>

			<StorySection title="Required — text + control required">
				<div className="grid gap-2">
					<Label htmlFor="state-required">
						Legal name <span className="text-destructive">*</span>
					</Label>
					<Input
						id="state-required"
						required
						name="legalName"
						autoComplete="organization"
						aria-required
					/>
					<p className="text-sm text-foreground-secondary">
						Asterisk is visual cue only — required lives on the control.
					</p>
				</div>
			</StorySection>

			<StorySection title="Do not rely on destructive color alone">
				<div className="grid gap-2">
					<Label htmlFor="state-color-only" className="text-destructive">
						Required field
					</Label>
					<Input id="state-color-only" defaultValue="" autoComplete="off" />
					<p className="text-sm text-foreground-secondary">
						Color-only “Required field” copy is not a substitute for a named
						value label plus required semantics.
					</p>
				</div>
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
					"Compose Label inside the form primitive that owns spacing, help, and errors. Card owns the workspace and StatusBadge owns lifecycle; Label never communicates approval, validation success, or authorization.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6 lg:grid-cols-2">
			<Card className="shadow-none">
				<CardHeader>
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="outline">Payables</Badge>
						<StatusBadge size="sm" status="pending" label="Awaiting review" />
					</div>
					<CardTitle>Supplier remittance</CardTitle>
					<CardDescription>
						Northwind Trading · SUP-0142 · labelled bank fields
					</CardDescription>
				</CardHeader>
				<CardContent className="grid gap-4">
					<div className="grid gap-2">
						<Label htmlFor="comp-bank-name">Bank name</Label>
						<Input
							id="comp-bank-name"
							defaultValue="Maybank Berhad"
							autoComplete="off"
						/>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="comp-account">Account number</Label>
						<Input
							id="comp-account"
							defaultValue="512345678901"
							inputMode="numeric"
							autoComplete="off"
						/>
					</div>
					<Label className="gap-3 rounded-lg border p-3">
						<Checkbox id="comp-primary" defaultChecked />
						<span>Mark as primary settlement account</span>
					</Label>
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
						<StatusBadge size="sm" status="active" label="Operational" />
					</div>
					<CardTitle>Invoice header</CardTitle>
					<CardDescription>
						INV-1048 · customer PO and dispute notes
					</CardDescription>
				</CardHeader>
				<CardContent className="grid gap-4">
					<div className="grid gap-2">
						<Label htmlFor="comp-po">Customer PO</Label>
						<Input id="comp-po" defaultValue="PO-77821" autoComplete="off" />
					</div>
					<div className="grid gap-2">
						<Label htmlFor="comp-dispute">Dispute notes</Label>
						<Textarea
							id="comp-dispute"
							rows={3}
							defaultValue="Customer queried freight line on 12 Jul."
						/>
					</div>
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
					"Label is the durable visible name for one control. It is not generic typography, a section heading, validation feedback, or a substitute for Field / FormField composition.",
			},
		},
	},
	render: () => (
		<div className="grid max-w-5xl gap-6 sm:grid-cols-2">
			<StorySection title="Do: htmlFor + stable control id">
				<div className="grid gap-2 rounded-lg border p-3">
					<Label htmlFor="do-legal-name">Legal name</Label>
					<Input
						id="do-legal-name"
						defaultValue="Nexus Canon Sdn. Bhd."
						autoComplete="organization"
					/>
				</div>
			</StorySection>

			<StorySection title="Do not: Label as generic typography">
				<p className="text-sm text-foreground-secondary">
					Do not use Label for Card titles, page headings, or body copy. Those
					surfaces use heading elements or CardTitle — Label only names form
					controls.
				</p>
			</StorySection>

			<StorySection title="Do: keep wording stable and task-specific">
				<div className="grid gap-2 rounded-lg border p-3">
					<Label htmlFor="do-tax">Tax registration number</Label>
					<Input id="do-tax" defaultValue="C1234567890" autoComplete="off" />
				</div>
			</StorySection>

			<StorySection title="Do not: placeholder as the only label">
				<div className="grid gap-2 rounded-lg border p-3">
					<Input
						aria-label="Missing visible label demo"
						placeholder="Legal name"
						defaultValue=""
						autoComplete="off"
					/>
					<p className="text-sm text-foreground-secondary">
						Placeholder disappears on input and is not a durable visible label.
						Always pair a Label (or an equally clear accessible name pattern).
					</p>
				</div>
			</StorySection>
		</div>
	),
};
