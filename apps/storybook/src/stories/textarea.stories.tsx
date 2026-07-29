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
	StatusBadge,
	Textarea,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";

const evidence = contractEvidence("ui.textarea");

const meta = {
	title: "UI System/Textarea",
	component: Textarea,
	tags: ["autodocs", "test"],
	args: {
		rows: 4,
	},
	parameters: {
		...contractDocsParameters(evidence, "Textarea"),
	},
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"One remittance advice Card: multiline operator note. Textarea owns plain multiline entry — not rich text, length policy, or save.",
			},
		},
	},
	render: () => (
		<div className="min-h-screen bg-canvas text-foreground">
			<div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
				<header className="grid gap-2 border-b pb-6">
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="outline">Accounts payable</Badge>
						<StatusBadge size="sm" status="active" label="Draft advice">
							Draft advice
						</StatusBadge>
					</div>
					<h1 className="text-2xl font-semibold tracking-tight">
						Remittance advice note
					</h1>
					<p className="max-w-5xl text-sm leading-6 text-foreground-secondary">
						Textarea captures plain multiline notes. FormField owns labels and
						errors; feature code owns length and persistence.
					</p>
				</header>

				<section className="grid gap-3" aria-labelledby="textarea-note-title">
					<div className="grid gap-1">
						<h2
							className="text-base font-semibold tracking-tight text-foreground"
							id="textarea-note-title"
						>
							Supplier-facing memo
						</h2>
						<p className="text-sm text-foreground-secondary">
							Placeholder stays an example — never the only label.
						</p>
					</div>
					<Card className="shadow-none">
						<CardHeader>
							<CardTitle>REM-2026-0718</CardTitle>
							<CardDescription>
								Northwind Trading · visible on the remittance advice
							</CardDescription>
						</CardHeader>
						<CardContent>
							<FormField
								label="Advice note"
								description="Plain text only. Keep under 500 characters before submit."
							>
								<Textarea
									defaultValue="Quarterly service fee settlement against PO-1042. Hold freight variance for CN-3391."
									rows={5}
								/>
							</FormField>
						</CardContent>
						<CardFooter className="justify-end border-t">
							<Button type="button" size="sm">
								Save note
							</Button>
						</CardFooter>
					</Card>
				</section>
			</div>
		</div>
	),
};

export const Usage: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Approved Textarea job: labelled multiline plain text inside FormField. Preserve the value after validation failure.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-md gap-4">
			<FormField
				label="Internal posting comment"
				description="Visible to finance controllers on the journal batch."
			>
				<Textarea
					defaultValue="Approved with tax evidence attached."
					rows={4}
				/>
			</FormField>
		</div>
	),
};

export const StatesAndAccessibility: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Editable, invalid, read-only, and disabled. Do not use placeholder as the only instruction.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-md gap-4">
			<FormField label="Editable note">
				<Textarea defaultValue="Ready for advice generation." rows={3} />
			</FormField>
			<FormField label="Invalid note" error="Enter at least 10 characters.">
				<Textarea defaultValue="Too short" aria-invalid rows={3} />
			</FormField>
			<FormField label="Approved note">
				<Textarea defaultValue="Locked after posting." readOnly rows={3} />
			</FormField>
			<FormField label="Unavailable integration note">
				<Textarea disabled placeholder="Not available" rows={3} />
			</FormField>
		</div>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const editable = canvas.getByLabelText("Editable note");
		await userEvent.click(editable);
		await expect(editable).toHaveFocus();
		await expect(canvas.getByLabelText("Invalid note")).toHaveAttribute(
			"aria-invalid",
			"true",
		);
	},
};

export const Composition: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Compose Textarea inside FormField on a Card. Rejection and save stay on the footer.",
			},
		},
	},
	render: () => (
		<Card className="w-full max-w-lg shadow-none">
			<CardHeader>
				<CardTitle>Reject posting batch</CardTitle>
				<CardDescription>
					JB-2044 · reason is required before returning to the preparer.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<FormField
					label="Rejection reason"
					description="Plain text shared with the batch preparer."
				>
					<Textarea placeholder="Describe the posting exception…" rows={5} />
				</FormField>
			</CardContent>
			<CardFooter className="justify-end gap-2 border-t">
				<Button type="button" variant="outline" size="sm">
					Cancel
				</Button>
				<Button type="button" size="sm">
					Reject batch
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
					"Do: visible FormField label with multiline plain text. Do not: rely on placeholder-only labelling or treat Textarea as rich text.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6 md:grid-cols-2">
			<StorySection
				title="Do"
				description="Visible label and optional length guidance."
			>
				<FormField label="Credit note narrative">
					<Textarea
						placeholder="Example: freight variance on INV-8841"
						rows={4}
					/>
				</FormField>
			</StorySection>
			<StorySection
				title="Do not"
				description="Placeholder-only instruction is not a field label."
			>
				<div className="grid gap-2 rounded-md border border-destructive/40 p-3">
					<Textarea
						placeholder="Enter credit note narrative"
						aria-label="Credit note narrative"
						rows={4}
					/>
					<p className="text-xs text-destructive">
						Accessible name alone does not replace a visible field label.
					</p>
				</div>
			</StorySection>
		</div>
	),
};
