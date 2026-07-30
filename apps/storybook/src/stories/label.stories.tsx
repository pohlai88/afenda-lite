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
import type { FormEvent, ReactNode } from "react";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";

const evidence = contractEvidence("ui.label");

function preventSubmit(event: FormEvent<HTMLFormElement>): void {
	event.preventDefault();
}

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
		<section aria-labelledby={id} className="grid gap-4">
			<div className="grid gap-1">
				<h2 className="font-semibold text-base tracking-tight" id={id}>
					{title}
				</h2>
				<p className="max-w-5xl text-foreground-secondary text-sm leading-5">
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
						<p className="font-medium text-foreground-secondary text-sm">
							Corporate administration · legal company
						</p>
						<div className="grid gap-1">
							<h1 className="font-semibold text-2xl tracking-tight">
								Organization identity
							</h1>
							<p className="max-w-5xl text-foreground-secondary text-sm leading-6">
								Every editable control needs a concise Label tied to a stable
								id. Help text and errors belong beside the field — not inside
								the label.
							</p>
						</div>
					</div>
					<dl className="grid grid-cols-2 gap-x-8 gap-y-3 rounded-lg border bg-card p-4">
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								Subject
							</dt>
							<dd className="text-sm">Form labelling</dd>
						</div>
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								Scope
							</dt>
							<dd className="text-sm">Visible control names</dd>
						</div>
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								Ownership
							</dt>
							<dd className="text-sm">Label semantics</dd>
						</div>
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
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
							<StatusBadge label="Draft" size="sm" status="pending" />
						</div>
						<CardTitle>Legal identity</CardTitle>
						<CardDescription>
							org-fragrant-lake · Malaysia · finance-control review
						</CardDescription>
					</CardHeader>
					<CardContent>
						<form className="grid gap-5" onSubmit={preventSubmit}>
							<div className="grid gap-2">
								<Label htmlFor="overview-org-name">Organization name</Label>
								<Input
									autoComplete="organization"
									defaultValue="Nexus Canon Sdn. Bhd."
									id="overview-org-name"
									name="organizationName"
								/>
								<p className="text-foreground-secondary text-sm">
									Registered legal name as it appears on tax documents.
								</p>
							</div>

							<div className="grid gap-2">
								<Label htmlFor="overview-trading-name">Trading name</Label>
								<Input
									autoComplete="organization"
									defaultValue="Afenda"
									id="overview-trading-name"
									name="tradingName"
								/>
							</div>

							<div className="grid gap-2">
								<Label htmlFor="overview-tax-id">Tax registration number</Label>
								<Input
									autoComplete="off"
									defaultValue="C1234567890"
									id="overview-tax-id"
									name="taxRegistration"
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
			description="Label provides the visible name while the control owns the input itself."
			id="label-usage-title"
			title="Labels tied to controls"
		>
			<div className="grid w-full max-w-xl gap-6">
				<StorySection title="Label + Input (htmlFor)">
					<div className="grid gap-2">
						<Label htmlFor="usage-supplier-code">Supplier code</Label>
						<Input
							autoComplete="off"
							defaultValue="SUP-0142"
							id="usage-supplier-code"
						/>
					</div>
				</StorySection>

				<StorySection title="Label + Textarea">
					<div className="grid gap-2">
						<Label htmlFor="usage-remittance-notes">Remittance notes</Label>
						<Textarea
							defaultValue="Prefer MYR settlement on Tuesdays."
							id="usage-remittance-notes"
							rows={3}
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
						<Switch defaultChecked id="usage-auto-match" />
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
						autoComplete="off"
						defaultValue="INV-1048"
						id="state-default"
					/>
				</div>
			</StorySection>

			<StorySection title="Disabled — labelled but unavailable">
				<div className="grid gap-2">
					<Label htmlFor="state-disabled">Organization id</Label>
					<Input
						autoComplete="off"
						defaultValue="org-fragrant-lake-90358173"
						disabled
						id="state-disabled"
					/>
					<p className="text-foreground-secondary text-sm">
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
						aria-required
						autoComplete="organization"
						id="state-required"
						name="legalName"
						required
					/>
					<p className="text-foreground-secondary text-sm">
						Asterisk is visual cue only — required lives on the control.
					</p>
				</div>
			</StorySection>

			<StorySection title="Do not rely on destructive color alone">
				<div className="grid gap-2">
					<Label className="text-destructive" htmlFor="state-color-only">
						Required field
					</Label>
					<Input autoComplete="off" defaultValue="" id="state-color-only" />
					<p className="text-foreground-secondary text-sm">
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
						<StatusBadge label="Awaiting review" size="sm" status="pending" />
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
							autoComplete="off"
							defaultValue="Maybank Berhad"
							id="comp-bank-name"
						/>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="comp-account">Account number</Label>
						<Input
							autoComplete="off"
							defaultValue="512345678901"
							id="comp-account"
							inputMode="numeric"
						/>
					</div>
					<Label className="gap-3 rounded-lg border p-3">
						<Checkbox defaultChecked id="comp-primary" />
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
						<StatusBadge label="Operational" size="sm" status="active" />
					</div>
					<CardTitle>Invoice header</CardTitle>
					<CardDescription>
						INV-1048 · customer PO and dispute notes
					</CardDescription>
				</CardHeader>
				<CardContent className="grid gap-4">
					<div className="grid gap-2">
						<Label htmlFor="comp-po">Customer PO</Label>
						<Input autoComplete="off" defaultValue="PO-77821" id="comp-po" />
					</div>
					<div className="grid gap-2">
						<Label htmlFor="comp-dispute">Dispute notes</Label>
						<Textarea
							defaultValue="Customer queried freight line on 12 Jul."
							id="comp-dispute"
							rows={3}
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
						autoComplete="organization"
						defaultValue="Nexus Canon Sdn. Bhd."
						id="do-legal-name"
					/>
				</div>
			</StorySection>

			<StorySection title="Do not: Label as generic typography">
				<p className="text-foreground-secondary text-sm">
					Do not use Label for Card titles, page headings, or body copy. Those
					surfaces use heading elements or CardTitle — Label only names form
					controls.
				</p>
			</StorySection>

			<StorySection title="Do: keep wording stable and task-specific">
				<div className="grid gap-2 rounded-lg border p-3">
					<Label htmlFor="do-tax">Tax registration number</Label>
					<Input autoComplete="off" defaultValue="C1234567890" id="do-tax" />
				</div>
			</StorySection>

			<StorySection title="Do not: placeholder as the only label">
				<div className="grid gap-2 rounded-lg border p-3">
					<Input
						aria-label="Missing visible label demo"
						autoComplete="off"
						defaultValue=""
						placeholder="Legal name"
					/>
					<p className="text-foreground-secondary text-sm">
						Placeholder disappears on input and is not a durable visible label.
						Always pair a Label (or an equally clear accessible name pattern).
					</p>
				</div>
			</StorySection>
		</div>
	),
};
