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
							<StatusBadge label="Draft remittance" size="sm" status="active" />
						</div>
						<div className="grid gap-1">
							<h1 className="font-semibold text-2xl tracking-tight">
								Supplier remittance line
							</h1>
							<p className="max-w-5xl text-foreground-secondary text-sm leading-6">
								InputGroup keeps prefixes, suffixes, and local actions visually
								tied to one control. Feature code owns currency meaning,
								autosave, and posting.
							</p>
						</div>
					</div>
					<dl className="grid grid-cols-2 gap-x-8 gap-y-3 rounded-lg border bg-card p-4">
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								Subject
							</dt>
							<dd className="text-sm">Supplier remittance line</dd>
						</div>
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								Area
							</dt>
							<dd className="text-sm">Accounts payable</dd>
						</div>
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								Scope
							</dt>
							<dd className="text-sm">Prefix, suffix, and local actions</dd>
						</div>
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								State
							</dt>
							<dd className="text-sm">Draft remittance</dd>
						</div>
					</dl>
				</header>

				<section
					aria-labelledby="input-group-amount-title"
					className="grid gap-3"
				>
					<div className="grid gap-1">
						<h2
							className="font-semibold text-base text-foreground tracking-tight"
							id="input-group-amount-title"
						>
							Payment amount
						</h2>
						<p className="text-foreground-secondary text-sm">
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
								description="Enter the settled value in the remittance currency."
								label="Amount"
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
							<Button size="sm" type="button">
								Save line
							</Button>
						</CardFooter>
					</Card>
				</section>

				<section
					aria-labelledby="input-group-memo-title"
					className="grid gap-3"
				>
					<div className="grid gap-1">
						<h2
							className="font-semibold text-base text-foreground tracking-tight"
							id="input-group-memo-title"
						>
							Remittance memo
						</h2>
						<p className="text-foreground-secondary text-sm">
							Block addons host supporting copy and a local clear action above
							and below the control.
						</p>
					</div>
					<Card className="shadow-none">
						<CardContent className="grid gap-4 pt-6">
							<FormField
								description="Visible on the remittance advice sent to the supplier."
								label="Description"
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
				description="Leading and trailing addons explain the amount without joining the value."
				title="Inline currency framing"
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
				description="Trailing button operates on the same control — copy does not redefine the field."
				title="Reference with local action"
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
								aria-label="Copy supplier reference"
								size="icon-xs"
								type="button"
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
				description="Currency framing remains visible and the numeric control retains usable width."
				title="Narrow payment drawer"
			>
				<div className="w-full max-w-xs rounded-xl border border-border border-dashed p-4">
					<FormField
						description="Enter the value in the invoice currency."
						label="Settlement amount"
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
				description="Block addons can carry supporting copy without compressing the textarea into an unusable inline row."
				title="Long supporting status"
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
				description="Copy uses the exact value already visible in the same field."
				title="Local copy action"
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
								aria-label="Copy supplier reference"
								size="icon-xs"
								type="button"
							>
								<CopyIcon aria-hidden="true" />
							</InputGroupButton>
						</InputGroupAddon>
					</InputGroup>
				</FormField>
			</StorySection>
			<StorySection
				description="Approve remittance is not a local field action and therefore belongs in the Card footer."
				title="Workflow command stays outside"
			>
				<p className="text-foreground-secondary text-sm leading-6">
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
			<StorySection description="Leading inline addon." title="inline-start">
				<InputGroup>
					<InputGroupAddon align="inline-start">$</InputGroupAddon>
					<InputGroupInput
						aria-label="Inline start amount"
						defaultValue="100.00"
					/>
				</InputGroup>
			</StorySection>
			<StorySection description="Trailing inline addon." title="inline-end">
				<InputGroup>
					<InputGroupInput
						aria-label="Inline end amount"
						defaultValue="100.00"
					/>
					<InputGroupAddon align="inline-end">USD</InputGroupAddon>
				</InputGroup>
			</StorySection>
			<StorySection
				description="Full-width supporting content before the control."
				title="block-start"
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
				description="Full-width supporting content after the control."
				title="block-end"
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
					description={
						size.startsWith("icon")
							? "Icon action with an explicit accessible name."
							: "Labelled local action inside the group."
					}
					key={size}
					title={size}
				>
					<InputGroup>
						<InputGroupInput
							aria-label={`Lookup (${size})`}
							placeholder="Supplier code"
						/>
						<InputGroupAddon align="inline-end">
							<InputGroupButton
								aria-label={size.startsWith("icon") ? label : undefined}
								size={size}
								type="button"
							>
								{size.startsWith("icon") ? (
									<SearchIcon />
								) : (
									<span>{label}</span>
								)}
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
				error="Enter a valid tax identifier."
				label="Invalid tax identifier"
			>
				<InputGroup>
					<InputGroupInput
						aria-invalid
						aria-label="Invalid tax identifier"
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
							aria-label="Copy locked remittance reference"
							disabled
							size="icon-xs"
							type="button"
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
					description="Currency framing stays outside the submitted amount."
					label="Allocation amount"
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
				<Button size="sm" type="button" variant="outline">
					Cancel
				</Button>
				<Button size="sm" type="button">
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
				description="One amount control, related currency framing, and FormField labelling."
				title="Do"
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
				description="Do not treat addon chrome as the field label or cram unrelated inputs into one group."
				title="Do not"
			>
				<div className="grid gap-2 rounded-md border border-destructive/40 p-3">
					<InputGroup>
						<InputGroupAddon align="inline-start">Amount</InputGroupAddon>
						<InputGroupInput aria-label="Amount" defaultValue="1250.00" />
						<InputGroupInput aria-label="Currency code" defaultValue="USD" />
						<InputGroupInput aria-label="PO reference" defaultValue="PO-1042" />
					</InputGroup>
					<p className="text-destructive text-xs">
						Addon text is not a field label, and three unrelated controls are
						not one logical field.
					</p>
				</div>
			</StorySection>
		</div>
	),
};
