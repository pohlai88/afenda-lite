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
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
	InputGroupText,
	InputGroupTextarea,
	StatusBadge,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { CopyIcon, SearchIcon } from "lucide-react";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";
import { interactionFor } from "./interactions";

const evidence = contractEvidence("ui.input-group");

const meta = {
	title: "UI System/Input Group",
	component: InputGroup,
	tags: ["autodocs", "test"],
	parameters: {
		...contractDocsParameters(evidence, "Input Group"),
		docs: {
			description: {
				component:
					"InputGroup composes one Input or Textarea with tightly related prefixes, suffixes, supporting text, or local actions. It owns shared framing and addon placement. FormField owns the external label and error relationship; feature code owns value semantics, authorization, parsing, validation, persistence, and workflow commands.",
			},
		},
	},
} satisfies Meta<typeof InputGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"One remittance entry Card: currency amount with inline addons, memo with block addons, then local clear. InputGroup owns framing — not posting, FX, or field validation.",
			},
		},
	},
	render: () => (
		<div className="min-h-screen bg-canvas text-foreground">
			<main className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
				<header className="grid gap-5 border-b pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
					<div className="grid gap-2">
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant="outline">Accounts payable</Badge>
							<StatusBadge size="sm" status="active" label="Draft remittance" />
						</div>
						<div className="grid gap-1">
							<h1 className="text-2xl font-semibold tracking-tight">
								Supplier remittance line
							</h1>
							<p className="max-w-5xl text-sm leading-6 text-foreground-secondary">
								InputGroup keeps prefixes, suffixes, and local actions visually
								tied to one control. Feature code owns currency meaning,
								autosave, and posting.
							</p>
						</div>
					</div>
					<dl className="grid grid-cols-2 gap-x-8 gap-y-3 rounded-lg border bg-card p-4">
						<div className="grid gap-1">
							<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								Subject
							</dt>
							<dd className="text-sm">Supplier remittance line</dd>
						</div>
						<div className="grid gap-1">
							<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								Area
							</dt>
							<dd className="text-sm">Accounts payable</dd>
						</div>
						<div className="grid gap-1">
							<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								Scope
							</dt>
							<dd className="text-sm">Prefix, suffix, and local actions</dd>
						</div>
						<div className="grid gap-1">
							<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								State
							</dt>
							<dd className="text-sm">Draft remittance</dd>
						</div>
					</dl>
				</header>

				<section
					className="grid gap-3"
					aria-labelledby="input-group-amount-title"
				>
					<div className="grid gap-1">
						<h2
							className="text-base font-semibold tracking-tight text-foreground"
							id="input-group-amount-title"
						>
							Payment amount
						</h2>
						<p className="text-sm text-foreground-secondary">
							Inline addons explain unit and currency without becoming the
							submitted value.
						</p>
					</div>
					<Card className="shadow-none">
						<CardHeader>
							<CardTitle>Settlement amount</CardTitle>
							<CardDescription>
								Northwind Trading · remittance REM-2026-0718
							</CardDescription>
						</CardHeader>
						<CardContent className="grid gap-4">
							<FormField
								label="Amount"
								description="Enter the settled value in the remittance currency."
							>
								<InputGroup>
									<InputGroupAddon align="inline-start">$</InputGroupAddon>
									<InputGroupInput
										aria-label="Amount"
										defaultValue="1250.00"
										inputMode="decimal"
									/>
									<InputGroupAddon align="inline-end">USD</InputGroupAddon>
								</InputGroup>
							</FormField>
						</CardContent>
						<CardFooter className="justify-end border-t">
							<Button type="button" size="sm">
								Save line
							</Button>
						</CardFooter>
					</Card>
				</section>

				<section
					className="grid gap-3"
					aria-labelledby="input-group-memo-title"
				>
					<div className="grid gap-1">
						<h2
							className="text-base font-semibold tracking-tight text-foreground"
							id="input-group-memo-title"
						>
							Remittance memo
						</h2>
						<p className="text-sm text-foreground-secondary">
							Block addons host supporting copy and a local clear action above
							and below the control.
						</p>
					</div>
					<Card className="shadow-none">
						<CardContent className="grid gap-4 pt-6">
							<FormField
								label="Description"
								description="Visible on the remittance advice sent to the supplier."
							>
								<InputGroup>
									<InputGroupAddon align="block-start">
										Memo for supplier advice
									</InputGroupAddon>
									<InputGroupTextarea
										aria-label="Description"
										defaultValue="Quarterly service fee — PO-1042"
										rows={3}
									/>
									<InputGroupAddon align="block-end">
										<InputGroupText>Autosaved</InputGroupText>
										<InputGroupButton size="xs" type="button">
											Clear
										</InputGroupButton>
									</InputGroupAddon>
								</InputGroup>
							</FormField>
						</CardContent>
					</Card>
				</section>
			</main>
		</div>
	),
};

export const SemanticUsage: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Approved InputGroup job: one control plus tightly related prefixes, suffixes, text, or local actions. External FormField owns the field label.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-md gap-6">
			<StorySection
				title="Inline currency framing"
				description="Leading and trailing addons explain the amount without joining the value."
			>
				<FormField label="Invoice total">
					<InputGroup>
						<InputGroupAddon align="inline-start">MYR</InputGroupAddon>
						<InputGroupInput
							aria-label="Invoice total"
							defaultValue="4820.50"
							inputMode="decimal"
						/>
						<InputGroupAddon align="inline-end">.00</InputGroupAddon>
					</InputGroup>
				</FormField>
			</StorySection>
			<StorySection
				title="Reference with local action"
				description="Trailing button operates on the same control — copy does not redefine the field."
			>
				<FormField label="Supplier reference">
					<InputGroup>
						<InputGroupInput
							aria-label="Supplier reference"
							defaultValue="SUP-004821"
							readOnly
						/>
						<InputGroupAddon align="inline-end">
							<InputGroupButton
								size="icon-xs"
								type="button"
								aria-label="Copy supplier reference"
							>
								<CopyIcon />
							</InputGroupButton>
						</InputGroupAddon>
					</InputGroup>
				</FormField>
			</StorySection>
		</div>
	),
};

export const AdaptiveLayout: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"InputGroup preserves one logical field across constrained layouts. Addons may wrap only where their block alignment permits; inline currency and unit meaning must not disappear, overlap, or become an unlabeled icon.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-4xl gap-8">
			<StorySection
				title="Narrow payment drawer"
				description="Currency framing remains visible and the numeric control retains usable width."
			>
				<div className="w-full max-w-xs rounded-xl border border-dashed border-border p-4">
					<FormField
						label="Settlement amount"
						description="Enter the value in the invoice currency."
					>
						<InputGroup>
							<InputGroupAddon align="inline-start">MYR</InputGroupAddon>
							<InputGroupInput
								aria-label="Settlement amount"
								defaultValue="18420.00"
								inputMode="decimal"
							/>
						</InputGroup>
					</FormField>
				</div>
			</StorySection>
			<StorySection
				title="Long supporting status"
				description="Block addons can carry supporting copy without compressing the textarea into an unusable inline row."
			>
				<FormField label="Internal reconciliation note">
					<InputGroup>
						<InputGroupTextarea
							aria-label="Internal reconciliation note"
							defaultValue="Receipt requires customer confirmation before matching."
							rows={3}
						/>
						<InputGroupAddon align="block-end">
							<InputGroupText>
								Draft saved to the current reconciliation case
							</InputGroupText>
							<InputGroupButton size="xs" type="button">
								Clear note
							</InputGroupButton>
						</InputGroupAddon>
					</InputGroup>
				</FormField>
			</StorySection>
		</div>
	),
};

export const OwnershipAndLocalActions: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Addon actions must operate only on the grouped field: copy, clear, reveal, validate locally, or invoke a closely related lookup. Posting, approval, navigation, and permission decisions stay outside the group.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6">
			<StorySection
				title="Local copy action"
				description="Copy uses the exact value already visible in the same field."
			>
				<FormField label="Supplier reference">
					<InputGroup>
						<InputGroupInput
							aria-label="Supplier reference"
							defaultValue="SUP-004821"
							readOnly
						/>
						<InputGroupAddon align="inline-end">
							<InputGroupButton
								size="icon-xs"
								type="button"
								aria-label="Copy supplier reference"
							>
								<CopyIcon aria-hidden="true" />
							</InputGroupButton>
						</InputGroupAddon>
					</InputGroup>
				</FormField>
			</StorySection>
			<StorySection
				title="Workflow command stays outside"
				description="Approve remittance is not a local field action and therefore belongs in the Card footer."
			>
				<p className="text-sm leading-6 text-foreground-secondary">
					Do not place Submit, Approve, Post, or Delete inside an InputGroup
					addon. Those commands act on the record or workflow, not only on the
					grouped field.
				</p>
			</StorySection>
		</div>
	),
};

export const Variants: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Addon align variants: inline-start, inline-end, block-start, and block-end. Align changes placement only — not value semantics.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-md gap-6">
			<StorySection title="inline-start" description="Leading inline addon.">
				<InputGroup>
					<InputGroupAddon align="inline-start">$</InputGroupAddon>
					<InputGroupInput
						aria-label="Inline start amount"
						defaultValue="100.00"
					/>
				</InputGroup>
			</StorySection>
			<StorySection title="inline-end" description="Trailing inline addon.">
				<InputGroup>
					<InputGroupInput
						aria-label="Inline end amount"
						defaultValue="100.00"
					/>
					<InputGroupAddon align="inline-end">USD</InputGroupAddon>
				</InputGroup>
			</StorySection>
			<StorySection
				title="block-start"
				description="Full-width supporting content before the control."
			>
				<InputGroup>
					<InputGroupAddon align="block-start">Line note</InputGroupAddon>
					<InputGroupTextarea
						aria-label="Block start note"
						defaultValue="Freight adjustment"
						rows={2}
					/>
				</InputGroup>
			</StorySection>
			<StorySection
				title="block-end"
				description="Full-width supporting content after the control."
			>
				<InputGroup>
					<InputGroupTextarea
						aria-label="Block end note"
						defaultValue="Hold for credit note"
						rows={2}
					/>
					<InputGroupAddon align="block-end">
						<InputGroupText>Not posted</InputGroupText>
					</InputGroupAddon>
				</InputGroup>
			</StorySection>
		</div>
	),
};

export const Sizes: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"InputGroupButton sizes: xs, sm, icon-xs, and icon-sm. Size applies to the local action — not the grouped Input itself.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-md gap-6">
			{(
				[
					{ size: "xs" as const, label: "Apply" },
					{ size: "sm" as const, label: "Apply" },
					{ size: "icon-xs" as const, label: "Search compact" },
					{ size: "icon-sm" as const, label: "Search" },
				] as const
			).map(({ size, label }) => (
				<StorySection
					key={size}
					title={size}
					description={
						size.startsWith("icon")
							? "Icon action with an explicit accessible name."
							: "Labelled local action inside the group."
					}
				>
					<InputGroup>
						<InputGroupInput
							aria-label={`Lookup (${size})`}
							placeholder="Supplier code"
						/>
						<InputGroupAddon align="inline-end">
							<InputGroupButton
								size={size}
								type="button"
								aria-label={size.startsWith("icon") ? label : undefined}
							>
								{size.startsWith("icon") ? <SearchIcon /> : label}
							</InputGroupButton>
						</InputGroupAddon>
					</InputGroup>
				</StorySection>
			))}
		</div>
	),
};

export const StatesAndAccessibility: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Editable, invalid, and disabled groups preserve one field relationship. FormField owns the visible label and error; the primary control exposes invalid state; addon buttons keep unique names and match the field's availability.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-md gap-4">
			<FormField label="Editable amount">
				<InputGroup>
					<InputGroupAddon align="inline-start">$</InputGroupAddon>
					<InputGroupInput
						aria-label="Editable amount"
						defaultValue="250.00"
						inputMode="decimal"
					/>
					<InputGroupAddon align="inline-end">USD</InputGroupAddon>
				</InputGroup>
			</FormField>
			<FormField
				label="Invalid tax identifier"
				error="Enter a valid tax identifier."
			>
				<InputGroup>
					<InputGroupInput
						aria-label="Invalid tax identifier"
						aria-invalid
						defaultValue="?"
					/>
					<InputGroupAddon align="inline-end">
						<InputGroupButton size="xs" type="button">
							Validate
						</InputGroupButton>
					</InputGroupAddon>
				</InputGroup>
			</FormField>
			<FormField label="Locked remittance reference">
				<InputGroup data-disabled="true">
					<InputGroupInput
						aria-label="Locked remittance reference"
						defaultValue="REM-2026-0718"
						disabled
					/>
					<InputGroupAddon align="inline-end">
						<InputGroupButton
							size="icon-xs"
							type="button"
							disabled
							aria-label="Copy locked remittance reference"
						>
							<CopyIcon />
						</InputGroupButton>
					</InputGroupAddon>
				</InputGroup>
			</FormField>
		</div>
	),
	play: interactionFor("input-group"),
};

export const Composition: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Compose InputGroup inside FormField on a Card workbench. Keep posting and permissions on the Card footer — not inside addon chrome.",
			},
		},
	},
	render: () => (
		<Card className="w-full max-w-lg shadow-none">
			<CardHeader>
				<CardTitle>Credit note allocation</CardTitle>
				<CardDescription>
					Allocate CN-3391 against open AP invoices for Northwind Trading.
				</CardDescription>
			</CardHeader>
			<CardContent className="grid gap-4">
				<FormField
					label="Allocation amount"
					description="Currency framing stays outside the submitted amount."
				>
					<InputGroup>
						<InputGroupAddon align="inline-start">$</InputGroupAddon>
						<InputGroupInput
							aria-label="Allocation amount"
							defaultValue="480.00"
							inputMode="decimal"
						/>
						<InputGroupAddon align="inline-end">USD</InputGroupAddon>
					</InputGroup>
				</FormField>
				<FormField label="Allocation note">
					<InputGroup>
						<InputGroupAddon align="block-start">Internal note</InputGroupAddon>
						<InputGroupTextarea
							aria-label="Allocation note"
							defaultValue="Apply to INV-8841 freight variance"
							rows={3}
						/>
						<InputGroupAddon align="block-end">
							<InputGroupText>Draft only</InputGroupText>
							<InputGroupButton size="xs" type="button">
								Clear
							</InputGroupButton>
						</InputGroupAddon>
					</InputGroup>
				</FormField>
			</CardContent>
			<CardFooter className="justify-end gap-2 border-t">
				<Button type="button" variant="outline" size="sm">
					Cancel
				</Button>
				<Button type="button" size="sm">
					Allocate
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
					"Do: one control with related addons and an external field label. Do not: pack unrelated controls into one group or use addon text as the only label.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6 md:grid-cols-2">
			<StorySection
				title="Do"
				description="One amount control, related currency framing, and FormField labelling."
			>
				<FormField label="Settled amount">
					<InputGroup>
						<InputGroupAddon align="inline-start">$</InputGroupAddon>
						<InputGroupInput
							aria-label="Settled amount"
							defaultValue="1250.00"
							inputMode="decimal"
						/>
						<InputGroupAddon align="inline-end">USD</InputGroupAddon>
					</InputGroup>
				</FormField>
			</StorySection>
			<StorySection
				title="Do not"
				description="Do not treat addon chrome as the field label or cram unrelated inputs into one group."
			>
				<div className="grid gap-2 rounded-md border border-destructive/40 p-3">
					<InputGroup>
						<InputGroupAddon align="inline-start">Amount</InputGroupAddon>
						<InputGroupInput defaultValue="1250.00" aria-label="Amount" />
						<InputGroupInput defaultValue="USD" aria-label="Currency code" />
						<InputGroupInput defaultValue="PO-1042" aria-label="PO reference" />
					</InputGroup>
					<p className="text-xs text-destructive">
						Addon text is not a field label, and three unrelated controls are
						not one logical field.
					</p>
				</div>
			</StorySection>
		</div>
	),
};
