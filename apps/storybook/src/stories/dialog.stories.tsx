import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	FormField,
	FormInput,
	Input,
	Spinner,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { FormEvent, ReactNode } from "react";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";
import { interactionFor } from "./interactions";

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

const saveContact = fn();
const postInvoice = fn();
const savePolicy = fn();

function EditFinanceContactDialog() {
	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		saveContact();
	}

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button>Edit supplier contact</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Edit finance contact</DialogTitle>
					<DialogDescription>
						Update the finance contact used for remittance and payment-query
						notices.
					</DialogDescription>
				</DialogHeader>
				<form className="grid gap-5" onSubmit={handleSubmit}>
					<div className="grid gap-4">
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
								defaultValue="finance@northwind.example"
								required
							/>
						</FormField>
					</div>
					<DialogFooter>
						<DialogClose asChild>
							<Button type="button" variant="outline">
								Cancel
							</Button>
						</DialogClose>
						<Button type="submit">Save contact</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

function ReviewInvoicePostingDialog() {
	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		postInvoice();
	}

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant="outline">Review invoice posting</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Review invoice posting</DialogTitle>
					<DialogDescription>
						Posting writes MYR 18,420.00 to the July receivables ledger. The
						entry may be corrected through the governed reversal workflow.
					</DialogDescription>
				</DialogHeader>
				<form className="grid gap-5" onSubmit={handleSubmit}>
					<div className="grid gap-2">
						<p className="text-sm text-foreground-secondary">
							Supplier Northwind Trading · Due 15 Aug 2026 · Owner Aisha Rahman
						</p>
						<p className="text-xs text-foreground-tertiary">
							INV-1048 · Draft ready for posting
						</p>
					</div>
					<DialogFooter>
						<DialogClose asChild>
							<Button type="button" variant="outline">
								Keep draft
							</Button>
						</DialogClose>
						<Button type="submit">Post invoice</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

function ConfigureApprovalPolicyDialog() {
	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		savePolicy();
	}

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant="secondary">Configure approval policy</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Configure approval policy</DialogTitle>
					<DialogDescription>
						Define escalation for high-value supplier invoices. Header and
						actions stay fixed while the policy body scrolls.
					</DialogDescription>
				</DialogHeader>
				<form className="grid gap-5" onSubmit={handleSubmit}>
					<div className="grid max-h-[min(24rem,60vh)] gap-4 overflow-y-auto pr-2">
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
						<FormField
							label="Threshold (MYR)"
							description="Invoices at or above this amount require escalation."
						>
							<FormInput
								name="threshold"
								defaultValue="10000.00"
								inputMode="decimal"
							/>
						</FormField>
						<FormField
							label="Reviewer guidance"
							description="Shown to approvers before they act."
						>
							<FormInput
								name="guidance"
								defaultValue="Verify bank evidence before approving."
							/>
						</FormField>
					</div>
					<DialogFooter>
						<DialogClose asChild>
							<Button type="button" variant="outline">
								Cancel
							</Button>
						</DialogClose>
						<Button type="submit">Save policy</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

function DialogOperationalOverview() {
	return (
		<div className="min-h-screen bg-canvas text-foreground">
			<div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
				<header className="grid gap-2 border-b pb-6">
					<p className="text-sm font-medium text-foreground-secondary">
						Supplier master data
					</p>
					<h1 className="text-2xl font-semibold tracking-tight">
						Supplier administration
					</h1>
					<p className="max-w-5xl text-sm leading-6 text-foreground-secondary">
						Dialog interrupts this surface only for bounded edit, review, and
						policy work. Irreversible harm belongs in AlertDialog, while feature
						code owns validation, authorization, submission, and pending state.
					</p>
					<p className="max-w-5xl text-xs leading-5 text-foreground-tertiary">
						Operational standard: title, description, focus containment,
						keyboard dismissal, error recovery, and action hierarchy must remain
						coherent across narrow and high-contrast layouts.
					</p>
				</header>

				<Card className="shadow-none">
					<CardHeader>
						<CardTitle>Northwind Trading Sdn. Bhd.</CardTitle>
						<CardDescription>
							Active supplier · Tax registration MY-TAX-1042 · Remittance
							currency MYR
						</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-4 sm:grid-cols-3">
						<div className="grid gap-1">
							<p className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								Finance contact
							</p>
							<p className="text-sm text-foreground">Aisha Rahman</p>
							<p className="text-sm text-foreground-secondary">
								finance@northwind.example
							</p>
						</div>
						<div className="grid gap-1">
							<p className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								Open draft
							</p>
							<p className="text-sm text-foreground">INV-1048</p>
							<p className="text-sm text-foreground-secondary">
								MYR 18,420.00 · Due 15 Aug 2026
							</p>
						</div>
						<div className="grid gap-1">
							<p className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								Approval policy
							</p>
							<p className="text-sm text-foreground">
								High-value supplier invoices
							</p>
							<p className="text-sm text-foreground-secondary">
								Escalates at MYR 10,000.00
							</p>
						</div>
					</CardContent>
				</Card>

				<WorkbenchSection
					id="supplier-administration-tasks"
					title="Administration tasks"
					description="Each task opens one focused Dialog with a single primary action."
				>
					<div className="grid gap-3">
						<Card className="shadow-none">
							<CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
								<div className="grid gap-1">
									<p className="text-sm font-medium text-foreground">
										Edit finance contact
									</p>
									<p className="text-sm text-foreground-secondary">
										Correct remittance contact details for this supplier.
									</p>
								</div>
								<EditFinanceContactDialog />
							</CardContent>
						</Card>

						<Card className="shadow-none">
							<CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
								<div className="grid gap-1">
									<p className="text-sm font-medium text-foreground">
										Review invoice posting
									</p>
									<p className="text-sm text-foreground-secondary">
										Confirm a reversible ledger write before posting INV-1048.
									</p>
								</div>
								<ReviewInvoicePostingDialog />
							</CardContent>
						</Card>

						<Card className="shadow-none">
							<CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
								<div className="grid gap-1">
									<p className="text-sm font-medium text-foreground">
										Configure approval policy
									</p>
									<p className="text-sm text-foreground-secondary">
										Adjust escalation mailbox and threshold for high-value
										invoices.
									</p>
								</div>
								<ConfigureApprovalPolicyDialog />
							</CardContent>
						</Card>
					</div>
				</WorkbenchSection>
			</div>
		</div>
	);
}

const evidence = contractEvidence("ui.dialog");

const DIALOG_MATURITY_DOCTRINE =
	"Dialog benchmarks enterprise operating maturity rather than another product’s appearance. It must interrupt only for bounded work, preserve a persistent title and consequence description, contain and restore focus, support complete keyboard dismissal, keep validation and pending state explicit, and reserve AlertDialog for difficult-to-recover harm.";

const meta = {
	title: "UI System/Dialog",
	component: Dialog,
	tags: ["autodocs", "test"],
	parameters: {
		...contractDocsParameters(evidence, "Dialog"),
		docs: {
			description: {
				component: DIALOG_MATURITY_DOCTRINE,
			},
		},
	},
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"One supplier-administration workbench demonstrates three approved interruptions: edit one bounded record, review a material but reversible posting, and configure a focused policy. Every Dialog preserves title and consequence meaning, uses real form submission, and contains one dominant action.",
			},
		},
	},
	render: () => <DialogOperationalOverview />,
	play: interactionFor("dialog"),
};

export const SemanticUsage: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Approved Dialog roles are deliberately narrow: edit one bounded record, review a material but reversible operation, configure a focused policy, or acknowledge required operational guidance. Long, multi-step, persistent, or irreversible work belongs elsewhere.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6">
			<StorySection title="Edit one bounded record">
				<p className="text-sm text-foreground-secondary">
					Use Dialog when the operator must change a small, self-contained set
					of fields without leaving the parent surface. Keep Cancel and one Save
					primary.
				</p>
			</StorySection>

			<StorySection title="Review a material but reversible operation">
				<p className="text-sm text-foreground-secondary">
					Use Dialog to confirm ledger writes or status changes that remain
					correctable through a governed reversal or undo path. Do not frame
					these as irreversible destruction prompts.
				</p>
			</StorySection>

			<StorySection title="Configure a focused policy">
				<p className="text-sm text-foreground-secondary">
					Use Dialog for short administrative settings with a fixed header,
					scrollable body when needed, and one Save primary. Multi-step or
					long-running workflows belong on a page or sheet.
				</p>
			</StorySection>

			<StorySection title="Acknowledge required operational guidance">
				<p className="text-sm text-foreground-secondary">
					Use Dialog for time-bound notices that need an explicit Acknowledge
					action. Prefer a page Alert when the message should remain visible
					beside ongoing work.
				</p>
				<Dialog>
					<DialogTrigger asChild>
						<Button variant="secondary">Period notice</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Close window reminder</DialogTitle>
							<DialogDescription>
								Month-end close for July 2026 ends at 17:00 MYT.
							</DialogDescription>
						</DialogHeader>
						<DialogFooter>
							<DialogClose asChild>
								<Button type="button">Acknowledge</Button>
							</DialogClose>
						</DialogFooter>
					</DialogContent>
				</Dialog>
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
					"Labelled Dialog proves focus containment, predictable tab order, Escape dismissal, focus return, validation that keeps the surface open for correction, and consumer-owned pending submission with retained command wording.",
			},
		},
	},
	render: () => (
		<div className="flex flex-wrap gap-3">
			<Dialog>
				<DialogTrigger asChild>
					<Button>Open labelled dialog</Button>
				</DialogTrigger>
				<DialogContent showCloseButton={false}>
					<DialogHeader>
						<DialogTitle>Supplier reference</DialogTitle>
						<DialogDescription>
							Update the external supplier reference used by integration.
						</DialogDescription>
					</DialogHeader>
					<Input
						aria-label="Supplier reference"
						defaultValue="SUP-1042"
						autoComplete="off"
						autoFocus
					/>
					<DialogFooter>
						<DialogClose asChild>
							<Button type="button" variant="outline">
								Close
							</Button>
						</DialogClose>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog>
				<DialogTrigger asChild>
					<Button variant="outline">Open invalid edit</Button>
				</DialogTrigger>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit finance contact</DialogTitle>
						<DialogDescription>
							The Dialog stays open when field validation fails so the operator
							can correct the value.
						</DialogDescription>
					</DialogHeader>
					<form
						className="grid gap-5"
						onSubmit={(event) => event.preventDefault()}
					>
						<div className="grid gap-4">
							<FormField label="Contact name" required>
								<FormInput
									name="contactName"
									defaultValue="Aisha Rahman"
									required
								/>
							</FormField>
							<FormField
								label="Email address"
								error="Enter a valid finance email address."
								required
							>
								<FormInput
									name="email"
									type="email"
									defaultValue="invalid-address"
									required
								/>
							</FormField>
						</div>
						<DialogFooter>
							<DialogClose asChild>
								<Button type="button" variant="outline">
									Cancel
								</Button>
							</DialogClose>
							<Button type="submit">Save contact</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			<Dialog>
				<DialogTrigger asChild>
					<Button variant="secondary">Open pending save</Button>
				</DialogTrigger>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit finance contact</DialogTitle>
						<DialogDescription>
							Feature code owns pending state. Command wording stays stable
							while the control reports busy progress.
						</DialogDescription>
					</DialogHeader>
					<form
						className="grid gap-5"
						onSubmit={(event) => event.preventDefault()}
					>
						<div className="grid gap-4">
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
									defaultValue="finance@northwind.example"
									required
								/>
							</FormField>
						</div>
						<p
							id="save-contact-progress"
							className="text-sm text-foreground-secondary"
						>
							Supplier contact changes are being saved.
						</p>
						<DialogFooter>
							<Button type="button" variant="outline" disabled>
								Cancel
							</Button>
							<Button
								type="submit"
								disabled
								aria-busy="true"
								aria-describedby="save-contact-progress"
							>
								<Spinner aria-hidden="true" size="sm" />
								Save contact
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const trigger = canvas.getByRole("button", {
			name: "Open labelled dialog",
		});

		await userEvent.click(trigger);

		const dialog = within(document.body).getByRole("dialog", {
			name: "Supplier reference",
		});

		await expect(dialog).toHaveAccessibleDescription(
			"Update the external supplier reference used by integration.",
		);

		const input = within(dialog).getByRole("textbox", {
			name: "Supplier reference",
		});

		await expect(input).toHaveFocus();

		await userEvent.tab();

		await expect(
			within(dialog).getByRole("button", {
				name: "Close",
			}),
		).toHaveFocus();

		await userEvent.keyboard("{Escape}");

		await waitFor(() =>
			expect(
				within(document.body).queryByRole("dialog"),
			).not.toBeInTheDocument(),
		);

		await expect(trigger).toHaveFocus();
	},
};

export const Composition: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Edit-record and policy-configuration Dialogs use real forms, explicit Cancel versus Submit types, stable headers, bounded scroll regions, and one dominant primary action.",
			},
		},
	},
	render: () => (
		<div className="flex flex-wrap gap-3">
			<Dialog>
				<DialogTrigger asChild>
					<Button>Edit supplier contact</Button>
				</DialogTrigger>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit finance contact</DialogTitle>
						<DialogDescription>
							Changes apply to future payables and remittance notices.
						</DialogDescription>
					</DialogHeader>
					<form
						className="grid gap-5"
						onSubmit={(event) => {
							event.preventDefault();
							saveContact();
						}}
					>
						<div className="grid gap-4">
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
									defaultValue="finance@northwind.example"
									required
								/>
							</FormField>
						</div>
						<DialogFooter>
							<DialogClose asChild>
								<Button type="button" variant="outline">
									Cancel
								</Button>
							</DialogClose>
							<Button type="submit">Save contact</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			<Dialog>
				<DialogTrigger asChild>
					<Button variant="outline">Configure approval policy</Button>
				</DialogTrigger>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>Approval policy</DialogTitle>
						<DialogDescription>
							Administrators define escalation for high-value supplier invoices.
						</DialogDescription>
					</DialogHeader>
					<form
						className="grid gap-5"
						onSubmit={(event) => {
							event.preventDefault();
							savePolicy();
						}}
					>
						<div className="grid max-h-[min(24rem,60vh)] gap-4 overflow-y-auto pr-2">
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
							<FormField label="Threshold (MYR)">
								<FormInput
									name="threshold"
									defaultValue="10000.00"
									inputMode="decimal"
								/>
							</FormField>
						</div>
						<DialogFooter>
							<DialogClose asChild>
								<Button type="button" variant="outline">
									Cancel
								</Button>
							</DialogClose>
							<Button type="submit">Save policy</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	),
};

export const DoAndDoNot: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Do keep one primary action, preserve an explicit dismissal path, and use AlertDialog for difficult-to-recover harm. Do not create competing primaries, style authority as destructive, hide validation, or overload Dialog with multi-step workflows.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-4xl gap-6 sm:grid-cols-2">
			<StorySection title="Do: keep one primary action">
				<Dialog>
					<DialogTrigger asChild>
						<Button>Submit for approval</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Submit INV-1048 for approval</DialogTitle>
							<DialogDescription>
								Finance will review before posting. Keep draft remains the
								secondary path.
							</DialogDescription>
						</DialogHeader>
						<form
							className="grid gap-5"
							onSubmit={(event) => event.preventDefault()}
						>
							<DialogFooter>
								<DialogClose asChild>
									<Button type="button" variant="outline">
										Keep draft
									</Button>
								</DialogClose>
								<Button type="submit">Submit for approval</Button>
							</DialogFooter>
						</form>
					</DialogContent>
				</Dialog>
			</StorySection>

			<StorySection title="Do not: create competing primaries">
				<div className="grid gap-2">
					<div className="flex gap-2">
						<Button>Save draft</Button>
						<Button>Submit for approval</Button>
					</div>
					<p className="text-sm text-foreground-secondary">
						Two equal primaries compete for the next step.
					</p>
				</div>
			</StorySection>

			<StorySection title="Do: use AlertDialog for irreversible harm">
				<AlertDialog>
					<AlertDialogTrigger asChild>
						<Button variant="destructive">Void posted invoice</Button>
					</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Void INV-1048?</AlertDialogTitle>
							<AlertDialogDescription>
								This reverses the posted ledger entry and cannot be undone from
								this surface.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Keep posted</AlertDialogCancel>
							<AlertDialogAction variant="destructive">
								Void invoice
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</StorySection>

			<StorySection title="Do not: style Approve as destructive">
				<div className="grid gap-2">
					<Button variant="destructive">Approve invoice</Button>
					<p className="text-sm text-foreground-secondary">
						Destructive styling is reserved for difficult-to-recover harm, not
						approval.
					</p>
				</div>
			</StorySection>

			<StorySection title="Do: keep Dialog bounded">
				<p className="text-sm text-foreground-secondary">
					Edit a contact, review one posting, or adjust a short policy. One
					title, one primary outcome, predictable dismiss.
				</p>
			</StorySection>

			<StorySection title="Do not: overload Dialog with multi-step workflows">
				<div className="grid gap-2 rounded-lg border border-border p-4">
					<p className="text-sm font-medium text-foreground">
						Supplier onboarding wizard
					</p>
					<p className="text-sm text-foreground-secondary">
						Step 1 of 6 · Legal identity, bank evidence, tax profile, remittance
						rules, approval routing, and activation — too large for a modal
						interruption.
					</p>
				</div>
			</StorySection>

			<StorySection title="Do: keep the consequence in the description">
				<p className="text-sm text-foreground-secondary">
					Explain what Save, Post, or Submit changes and whether a governed
					correction or reversal path exists.
				</p>
			</StorySection>

			<StorySection title="Do not: rely on the title alone">
				<p className="text-sm text-foreground-secondary">
					“Review invoice posting” names the task but does not by itself explain
					which ledger, amount, or recovery path is affected.
				</p>
			</StorySection>
		</div>
	),
};
