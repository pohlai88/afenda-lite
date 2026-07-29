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
	Spinner,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";
import { interactionFor } from "./interactions";

const evidence = contractEvidence("ui.alert-dialog");

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
	title: "UI System/Alert Dialog",
	component: AlertDialog,
	tags: ["autodocs", "test"],
	parameters: {
		...contractDocsParameters(evidence, "Alert Dialog"),
	},
} satisfies Meta<typeof AlertDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"AlertDialog blocks an ERP workflow only when the operator must confirm a destructive or difficult-to-recover consequence. The title names the action, the description explains the impact, and Cancel remains the safe path.",
			},
		},
	},
	render: () => (
		<div className="min-h-screen bg-canvas text-foreground">
			<div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
				<header className="grid gap-5 border-b pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
					<div className="grid gap-2">
						<p className="text-sm font-medium text-foreground-secondary">
							Accounts receivable
						</p>
						<div className="grid gap-1">
							<h1 className="text-2xl font-semibold tracking-tight">
								Posted invoice controls
							</h1>
							<p className="max-w-5xl text-sm leading-6 text-foreground-secondary">
								Use blocking confirmation only when continuing may cause
								permanent or difficult-to-recover operational harm.
								Authorization and command execution remain feature-owned.
							</p>
						</div>
					</div>
					<dl className="grid grid-cols-2 gap-x-8 gap-y-3 rounded-lg border bg-card p-4">
						<div className="grid gap-1">
							<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								Subject
							</dt>
							<dd className="text-sm">Posted invoice</dd>
						</div>
						<div className="grid gap-1">
							<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								Scope
							</dt>
							<dd className="text-sm">Destructive confirmation</dd>
						</div>
						<div className="grid gap-1">
							<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								Ownership
							</dt>
							<dd className="text-sm">Irreversible consequence</dd>
						</div>
						<div className="grid gap-1">
							<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								Lifecycle
							</dt>
							<dd className="text-sm">Open, cancel, confirm</dd>
						</div>
					</dl>
				</header>

				<Card className="shadow-none">
					<CardHeader>
						<CardTitle>INV-1048</CardTitle>
						<CardDescription>
							Northwind Trading · MYR 18,420.00 · Posted 28 Jul 2026
						</CardDescription>
					</CardHeader>

					<CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div className="grid gap-1">
							<p className="text-sm font-medium">Delete receivables record</p>

							<p className="max-w-xl text-sm leading-6 text-foreground-secondary">
								Deletion removes this record from the current register and
								cannot be restored from this surface.
							</p>
						</div>

						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button type="button" variant="destructive">
									Delete record
								</Button>
							</AlertDialogTrigger>

							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>Delete INV-1048?</AlertDialogTitle>

									<AlertDialogDescription>
										This permanently removes the invoice from the receivables
										register. It cannot be restored from this surface.
									</AlertDialogDescription>
								</AlertDialogHeader>

								<AlertDialogFooter>
									<AlertDialogCancel>Keep invoice</AlertDialogCancel>

									<AlertDialogAction variant="destructive">
										Delete invoice
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
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
					"Use AlertDialog for destructive or difficult-to-recover consequences. Do not use it for ordinary approval, review, navigation, or reversible editing.",
			},
		},
	},
	render: () => (
		<WorkbenchSection
			id="alert-dialog-semantic-usage-title"
			title="Destructive confirmation only"
			description="AlertDialog is for irreversible or difficult-to-recover consequences."
		>
			<div className="grid w-full max-w-5xl gap-6 sm:grid-cols-2">
				<StorySection title="Delete a durable record">
					<p className="text-sm leading-6 text-foreground-secondary">
						Use when the record will be permanently removed and normal recovery
						is not available from the current workflow.
					</p>
				</StorySection>

				<StorySection title="Permanently void an entry">
					<p className="text-sm leading-6 text-foreground-secondary">
						Use when the operation creates a permanent ledger consequence that
						requires explicit operator acknowledgement.
					</p>
				</StorySection>

				<StorySection title="Not for reversible review">
					<p className="text-sm leading-6 text-foreground-secondary">
						Posting review, editable confirmation, and correctable decisions
						belong in Dialog or on the page surface.
					</p>
				</StorySection>

				<StorySection title="Not for normal approval">
					<p className="text-sm leading-6 text-foreground-secondary">
						Approval is a governed workflow decision. Use a page action or
						Dialog unless approval itself creates irreversible harm.
					</p>
				</StorySection>
			</div>
		</WorkbenchSection>
	),
};

export const ConsequenceClarity: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"The dialog must identify the affected object, explain the consequence, and use action-specific labels. Avoid generic confirmation wording.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6 lg:grid-cols-2">
			<StorySection title="Delete supplier draft">
				<AlertDialog>
					<AlertDialogTrigger asChild>
						<Button type="button" variant="destructive">
							Delete supplier draft
						</Button>
					</AlertDialogTrigger>

					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>
								Delete supplier draft SUP-0182?
							</AlertDialogTitle>

							<AlertDialogDescription>
								The draft, entered tax details, and uploaded evidence will be
								permanently removed.
							</AlertDialogDescription>
						</AlertDialogHeader>

						<AlertDialogFooter>
							<AlertDialogCancel>Keep draft</AlertDialogCancel>

							<AlertDialogAction variant="destructive">
								Delete draft
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</StorySection>

			<StorySection title="Void posted invoice">
				<AlertDialog>
					<AlertDialogTrigger asChild>
						<Button type="button" variant="destructive">
							Void posted invoice
						</Button>
					</AlertDialogTrigger>

					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Void INV-1048?</AlertDialogTitle>

							<AlertDialogDescription>
								This creates a permanent reversal for MYR 18,420.00 in the
								current accounting period.
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
		</div>
	),
};

export const StatesAndAccessibility: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"AlertDialog provides labelled modal semantics, traps focus while open, returns focus after dismissal, supports Escape through the safe path, and keeps destructive confirmation explicit.",
			},
		},
	},
	render: () => (
		<div className="flex flex-wrap gap-3">
			<AlertDialog>
				<AlertDialogTrigger asChild>
					<Button type="button" variant="destructive">
						Open delete confirmation
					</Button>
				</AlertDialogTrigger>

				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete INV-1048?</AlertDialogTitle>

						<AlertDialogDescription>
							This permanently removes the invoice from the receivables
							register.
						</AlertDialogDescription>
					</AlertDialogHeader>

					<AlertDialogFooter>
						<AlertDialogCancel>Keep invoice</AlertDialogCancel>

						<AlertDialogAction variant="destructive">
							Delete invoice
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<AlertDialog>
				<AlertDialogTrigger asChild>
					<Button type="button" variant="outline">
						Open pending confirmation
					</Button>
				</AlertDialogTrigger>

				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Void INV-1048?</AlertDialogTitle>

						<AlertDialogDescription>
							The permanent ledger reversal is being submitted. Controls remain
							disabled until the command completes.
						</AlertDialogDescription>
					</AlertDialogHeader>

					<p
						id="void-invoice-progress"
						className="text-sm leading-6 text-foreground-secondary"
					>
						Submitting ledger reversal.
					</p>

					<AlertDialogFooter>
						<AlertDialogCancel disabled>Keep posted</AlertDialogCancel>

						<AlertDialogAction
							variant="destructive"
							disabled
							aria-busy="true"
							aria-describedby="void-invoice-progress"
						>
							<Spinner aria-hidden="true" size="sm" />
							Void invoice
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<AlertDialog>
				<AlertDialogTrigger asChild>
					<Button type="button" variant="secondary">
						Open compact confirmation
					</Button>
				</AlertDialogTrigger>

				<AlertDialogContent size="sm">
					<AlertDialogHeader>
						<AlertDialogTitle>Delete draft INV-1051?</AlertDialogTitle>

						<AlertDialogDescription>
							The unsaved invoice draft will be permanently removed.
						</AlertDialogDescription>
					</AlertDialogHeader>

					<AlertDialogFooter>
						<AlertDialogCancel>Keep draft</AlertDialogCancel>

						<AlertDialogAction variant="destructive">
							Delete draft
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	),
	play: interactionFor("alert-dialog"),
};

export const Composition: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"AlertDialog may be launched from a record Card or action region. The parent surface owns record context; AlertDialog owns only the final destructive confirmation.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6 lg:grid-cols-2">
			<Card className="shadow-none">
				<CardHeader>
					<CardTitle>Delete invoice record</CardTitle>
					<CardDescription>
						INV-1048 · Northwind Trading · MYR 18,420.00
					</CardDescription>
				</CardHeader>

				<CardContent className="grid gap-4">
					<p className="text-sm leading-6 text-foreground-secondary">
						Use only when the record should be permanently removed from the
						current register.
					</p>

					<div>
						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button type="button" variant="destructive">
									Delete record
								</Button>
							</AlertDialogTrigger>

							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>Delete INV-1048?</AlertDialogTitle>

									<AlertDialogDescription>
										This permanently removes the invoice from the receivables
										register.
									</AlertDialogDescription>
								</AlertDialogHeader>

								<AlertDialogFooter>
									<AlertDialogCancel>Keep invoice</AlertDialogCancel>

									<AlertDialogAction variant="destructive">
										Delete invoice
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					</div>
				</CardContent>
			</Card>

			<Card className="shadow-none">
				<CardHeader>
					<CardTitle>Void ledger posting</CardTitle>
					<CardDescription>
						INV-1048 · Accounting period July 2026
					</CardDescription>
				</CardHeader>

				<CardContent className="grid gap-4">
					<p className="text-sm leading-6 text-foreground-secondary">
						Use when policy requires a permanent reversal and the operator must
						acknowledge the ledger impact.
					</p>

					<div>
						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button type="button" variant="destructive">
									Void posted invoice
								</Button>
							</AlertDialogTrigger>

							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>Void INV-1048?</AlertDialogTitle>

									<AlertDialogDescription>
										This creates a permanent reversal for MYR 18,420.00 in the
										current accounting period.
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
					"Reserve AlertDialog for one explicit harmful consequence. Keep the safe path clear and avoid generic wording, competing actions, reversible workflows, or form editing.",
			},
		},
	},
	render: () => (
		<div className="grid max-w-5xl gap-6 sm:grid-cols-2">
			<StorySection title="Do: name the affected record">
				<AlertDialog>
					<AlertDialogTrigger asChild>
						<Button type="button" variant="destructive">
							Void posted invoice
						</Button>
					</AlertDialogTrigger>

					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Void INV-1048?</AlertDialogTitle>

							<AlertDialogDescription>
								This creates a permanent ledger reversal for MYR 18,420.00.
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

			<StorySection title="Do not: use generic confirmation">
				<div className="grid gap-2">
					<Button type="button" variant="destructive">
						Confirm
					</Button>

					<p className="text-sm leading-6 text-foreground-secondary">
						“Are you sure?” and “Confirm” do not explain the affected object,
						action, or consequence.
					</p>
				</div>
			</StorySection>

			<StorySection title="Do: keep one destructive action">
				<p className="text-sm leading-6 text-foreground-secondary">
					Provide one action-specific destructive control and one clearly safe
					cancel path.
				</p>
			</StorySection>

			<StorySection title="Do not: offer competing actions">
				<div className="grid gap-2">
					<div className="flex flex-wrap gap-2">
						<Button type="button" variant="destructive">
							Delete
						</Button>

						<Button type="button" variant="destructive">
							Void permanently
						</Button>
					</div>

					<p className="text-sm leading-6 text-foreground-secondary">
						Separate harmful outcomes into separate workflows. Do not force the
						operator to compare them inside one confirmation.
					</p>
				</div>
			</StorySection>

			<StorySection title="Do: preserve the safe path">
				<p className="text-sm leading-6 text-foreground-secondary">
					Use contextual labels such as “Keep invoice”, “Keep posted”, or “Keep
					draft” when they make the safe outcome clearer than “Cancel”.
				</p>
			</StorySection>

			<StorySection title="Do not: confirm ordinary approval">
				<p className="text-sm leading-6 text-foreground-secondary">
					Approval, submission, posting review, and other reversible workflow
					decisions belong on the page or in Dialog.
				</p>
			</StorySection>

			<StorySection title="Do: retain action wording while pending">
				<p className="text-sm leading-6 text-foreground-secondary">
					Keep “Delete invoice” or “Void invoice” visible with a Spinner,
					`disabled`, and `aria-busy="true"`.
				</p>
			</StorySection>

			<StorySection title="Do not: place forms inside">
				<p className="text-sm leading-6 text-foreground-secondary">
					Do not place editable fields, reason collection, or multi-step
					workflows inside AlertDialog. Collect required information before the
					final confirmation.
				</p>
			</StorySection>
		</div>
	),
};
