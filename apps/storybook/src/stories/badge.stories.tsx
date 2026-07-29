import {
	Badge,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	StatusBadge,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";

const evidence = contractEvidence("ui.badge");

const meta = {
	title: "UI System/Badge",
	component: Badge,
	tags: ["autodocs", "test"],
	parameters: {
		...contractDocsParameters(evidence, "Badge"),
	},
} satisfies Meta<typeof Badge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"Badge presents compact taxonomy and record attributes. StatusBadge presents authoritative lifecycle or health state; Badge color must not imply workflow truth.",
			},
		},
	},
	render: () => (
		<div className="min-h-screen bg-canvas text-foreground">
			<div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
				<header className="grid gap-5 border-b pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
					<div className="grid gap-2">
						<p className="text-sm font-medium text-foreground-secondary">
							Master data · Suppliers
						</p>
						<div className="grid gap-1">
							<h1 className="text-2xl font-semibold tracking-tight">
								Supplier classification
							</h1>
							<p className="max-w-5xl text-sm leading-6 text-foreground-secondary">
								Use Badge for category, region, source, and policy attributes.
								Feature code owns the vocabulary. Lifecycle and approval state
								remain on StatusBadge.
							</p>
						</div>
					</div>
					<dl className="grid grid-cols-2 gap-x-8 gap-y-3 rounded-lg border bg-card p-4">
						<div className="grid gap-1">
							<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								Subject
							</dt>
							<dd className="text-sm">Supplier classification</dd>
						</div>
						<div className="grid gap-1">
							<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								Scope
							</dt>
							<dd className="text-sm">Taxonomy labels</dd>
						</div>
						<div className="grid gap-1">
							<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								Ownership
							</dt>
							<dd className="text-sm">Feature vocabulary</dd>
						</div>
						<div className="grid gap-1">
							<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								Lifecycle
							</dt>
							<dd className="text-sm">Metadata, not status</dd>
						</div>
					</dl>
				</header>

				<Card className="shadow-none">
					<CardHeader>
						<CardTitle>Preferred suppliers</CardTitle>
						<CardDescription>
							Malaysia procurement roster · 3 records
						</CardDescription>
					</CardHeader>

					<CardContent className="grid gap-3">
						<div className="flex items-start justify-between gap-4 rounded-lg border border-border px-4 py-3">
							<div className="grid min-w-0 gap-1">
								<p className="truncate text-sm font-medium text-foreground">
									Northwind Trading Sdn. Bhd.
								</p>

								<p className="truncate text-sm text-foreground-secondary">
									MY-TAX-1042 · Agricultural inputs
								</p>

								<div className="flex flex-wrap gap-2 pt-1">
									<Badge>Strategic</Badge>
									<Badge variant="secondary">Preferred</Badge>
									<Badge variant="outline">Malaysia</Badge>
								</div>
							</div>

							<StatusBadge
								status="active"
								label="Active"
								className="shrink-0"
							/>
						</div>

						<div className="flex items-start justify-between gap-4 rounded-lg border border-border px-4 py-3">
							<div className="grid min-w-0 gap-1">
								<p className="truncate text-sm font-medium text-foreground">
									Contoso Logistics Pte. Ltd.
								</p>

								<p className="truncate text-sm text-foreground-secondary">
									SG-TAX-2201 · Freight and customs
								</p>

								<div className="flex flex-wrap gap-2 pt-1">
									<Badge variant="secondary">Logistics</Badge>
									<Badge variant="outline">Singapore</Badge>
									<Badge variant="destructive">Policy exception</Badge>
								</div>
							</div>

							<StatusBadge
								status="pending"
								label="Awaiting review"
								className="shrink-0"
							/>
						</div>

						<div className="flex items-start justify-between gap-4 rounded-lg border border-border px-4 py-3">
							<div className="grid min-w-0 gap-1">
								<p className="truncate text-sm font-medium text-foreground">
									Fabrikam Packaging Co.
								</p>

								<p className="truncate text-sm text-foreground-secondary">
									MY-TAX-0881 · Packaging materials
								</p>

								<div className="flex flex-wrap gap-2 pt-1">
									<Badge variant="ghost">Imported from PO</Badge>
									<Badge variant="outline">External reference</Badge>
								</div>
							</div>

							<StatusBadge
								status="active"
								label="Active"
								className="shrink-0"
							/>
						</div>
					</CardContent>
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
					"Compose short governed labels beside record identity. Pair with StatusBadge when lifecycle must appear. Use asChild with a real anchor for link treatment.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-md gap-4">
			<div className="flex flex-wrap gap-2">
				<Badge>Strategic</Badge>
				<Badge variant="secondary">Preferred</Badge>
				<Badge variant="outline">Malaysia</Badge>
			</div>
			<p className="text-sm leading-6 text-foreground-secondary">
				Feature code owns vocabulary and destinations. Badge only presents the
				label chrome.
			</p>
		</div>
	),
};

export const VocabularyAndHierarchy: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Use short, stable domain vocabulary. Primary content remains visually stronger than its supporting labels.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6">
			<StorySection title="Record classification">
				<div className="grid gap-3 rounded-lg border border-border px-4 py-3">
					<div className="grid gap-1">
						<p className="text-sm font-medium text-foreground">
							Northwind Trading Sdn. Bhd.
						</p>

						<p className="text-sm text-foreground-secondary">
							Supplier MY-TAX-1042
						</p>
					</div>

					<div className="flex flex-wrap gap-2">
						<Badge>Strategic</Badge>
						<Badge variant="secondary">Preferred</Badge>
						<Badge variant="outline">Malaysia</Badge>
					</div>
				</div>
			</StorySection>

			<StorySection title="Stable vocabulary">
				<div className="flex flex-wrap gap-2">
					<Badge variant="secondary">Raw materials</Badge>
					<Badge variant="secondary">Packaging</Badge>
					<Badge variant="secondary">Logistics</Badge>
				</div>

				<p className="mt-3 text-sm leading-6 text-foreground-secondary">
					Labels should come from governed feature vocabulary rather than
					operator-authored decorative wording.
				</p>
			</StorySection>

			<StorySection title="Compact supporting reference">
				<div className="flex flex-wrap gap-2">
					<Badge variant="ghost">Source: purchase order</Badge>
					<Badge asChild variant="link">
						<a href="#purchase-order-1042">PO-1042</a>
					</Badge>
				</div>
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
					"Badge meaning must remain understandable without color. Linked badges preserve anchor semantics, keyboard focus, and a descriptive accessible name.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6">
			<StorySection title="Text carries the meaning">
				<div className="flex flex-wrap gap-2">
					<Badge>Strategic supplier</Badge>
					<Badge variant="secondary">Preferred category</Badge>
					<Badge variant="outline">Reference PO-1042</Badge>
					<Badge variant="destructive">Policy exception</Badge>
				</div>

				<p className="mt-3 text-sm leading-6 text-foreground-secondary">
					Each label remains meaningful when color is unavailable or overridden
					by a high-contrast theme.
				</p>
			</StorySection>

			<StorySection title="Linked Badge">
				<div className="flex flex-wrap gap-2">
					<Badge asChild variant="link">
						<a href="#invoice-inv-1048">Invoice INV-1048</a>
					</Badge>

					<Badge asChild variant="link">
						<a href="#supplier-northwind">Supplier Northwind Trading</a>
					</Badge>
				</div>

				<p className="mt-3 text-sm leading-6 text-foreground-secondary">
					Use a real anchor when the label navigates. The destination remains
					available to keyboard users and assistive technology.
				</p>
			</StorySection>

			<StorySection title="Long labels wrap safely">
				<div className="max-w-xs">
					<Badge variant="outline" className="whitespace-normal text-left">
						Imported from externally managed procurement reference
					</Badge>
				</div>
			</StorySection>
		</div>
	),
};

export const VariantsAndSizes: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Badge supports the implemented default, secondary, destructive, outline, ghost, and link treatments. Badge has no independent size scale.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6">
			<div className="flex flex-wrap items-center gap-3">
				<Badge>Default</Badge>
				<Badge variant="secondary">Secondary</Badge>
				<Badge variant="destructive">Destructive</Badge>
				<Badge variant="outline">Outline</Badge>
				<Badge variant="ghost">Ghost</Badge>
				<Badge asChild variant="link">
					<a href="#related-record">Related supplier record</a>
				</Badge>
			</div>

			<p className="text-sm leading-6 text-foreground-secondary">
				Choose treatment according to information hierarchy and meaning, not to
				decorate the interface. Destructive means risk or exception
				classification — not lifecycle error.
			</p>
		</div>
	),
};

export const Composition: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Badge composes with record identity and StatusBadge. Taxonomy, lifecycle, and navigation remain separate semantic responsibilities.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6 lg:grid-cols-2">
			<Card className="shadow-none">
				<CardHeader>
					<div className="flex items-start justify-between gap-4">
						<div className="grid min-w-0 gap-1">
							<CardTitle>Northwind Trading Sdn. Bhd.</CardTitle>
							<CardDescription>Supplier profile · MY-TAX-1042</CardDescription>
						</div>

						<StatusBadge status="active" label="Active" className="shrink-0" />
					</div>
				</CardHeader>

				<CardContent className="flex flex-wrap items-center gap-2">
					<Badge>Strategic</Badge>
					<Badge variant="secondary">Preferred</Badge>
					<Badge variant="outline">Malaysia</Badge>
				</CardContent>
			</Card>

			<Card className="shadow-none">
				<CardHeader>
					<div className="flex items-start justify-between gap-4">
						<div className="grid min-w-0 gap-1">
							<CardTitle>Contoso Logistics Pte. Ltd.</CardTitle>
							<CardDescription>Supplier profile · SG-TAX-2201</CardDescription>
						</div>

						<StatusBadge
							status="pending"
							label="Awaiting review"
							className="shrink-0"
						/>
					</div>
				</CardHeader>

				<CardContent className="flex flex-wrap items-center gap-2">
					<Badge variant="secondary">Logistics</Badge>
					<Badge variant="outline">Singapore</Badge>
					<Badge variant="destructive">Policy exception</Badge>
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
					"Use Badge for compact governed labels. Do not use it as lifecycle truth, an action control, free-form decoration, or a substitute for structured record fields.",
			},
		},
	},
	render: () => (
		<div className="grid max-w-5xl gap-6 sm:grid-cols-2">
			<StorySection title="Do: describe categorical metadata">
				<div className="flex flex-wrap gap-2">
					<Badge>Strategic</Badge>
					<Badge variant="secondary">Packaging</Badge>
					<Badge variant="outline">Malaysia</Badge>
				</div>
			</StorySection>

			<StorySection title="Do not: imply lifecycle authority">
				<div className="grid gap-2">
					<Badge variant="destructive">Awaiting approval</Badge>

					<p className="text-sm leading-6 text-foreground-secondary">
						Approval and lifecycle state belong on StatusBadge and must come
						from workflow truth.
					</p>
				</div>
			</StorySection>

			<StorySection title="Do: pair taxonomy with StatusBadge">
				<div className="flex flex-wrap items-center gap-2">
					<Badge>Finance</Badge>
					<Badge variant="outline">Malaysia</Badge>
					<StatusBadge status="pending" label="Awaiting approval" />
				</div>
			</StorySection>

			<StorySection title="Do not: overload the record">
				<div className="grid gap-2">
					<div className="flex flex-wrap gap-1">
						<Badge>Strategic</Badge>
						<Badge variant="secondary">Preferred</Badge>
						<Badge variant="outline">Malaysia</Badge>
						<Badge variant="ghost">Imported</Badge>
						<Badge variant="outline">PO-1042</Badge>
						<Badge variant="destructive">Exception</Badge>
						<Badge>Logistics</Badge>
						<Badge variant="secondary">Freight</Badge>
					</div>

					<p className="text-sm leading-6 text-foreground-secondary">
						Show only labels needed for the current decision. Move remaining
						attributes into structured fields or record details.
					</p>
				</div>
			</StorySection>

			<StorySection title="Do: use a real link for navigation">
				<Badge asChild variant="link">
					<a href="#supplier-filter-strategic">Strategic suppliers</a>
				</Badge>
			</StorySection>

			<StorySection title="Do not: simulate a link">
				<div className="grid gap-2">
					<Badge variant="link">Northwind Trading</Badge>

					<p className="text-sm leading-6 text-foreground-secondary">
						A linked treatment without an anchor has no navigation semantics.
						Use `asChild` with a real destination.
					</p>
				</div>
			</StorySection>

			<StorySection title="Do: use stable domain vocabulary">
				<div className="flex flex-wrap gap-2">
					<Badge variant="secondary">Raw materials</Badge>
					<Badge variant="secondary">Packaging</Badge>
				</div>
			</StorySection>

			<StorySection title="Do not: use conversational labels">
				<div className="grid gap-2">
					<Badge variant="ghost">This supplier seems quite important</Badge>

					<p className="text-sm leading-6 text-foreground-secondary">
						Badge text should come from controlled vocabulary, not informal or
						subjective commentary.
					</p>
				</div>
			</StorySection>

			<StorySection title="Do: use Button for commands">
				<p className="text-sm leading-6 text-foreground-secondary">
					Approve, reject, remove, submit, and retry remain explicit Button
					actions on the owning workflow surface.
				</p>
			</StorySection>

			<StorySection title="Do not: make Badge a command">
				<p className="text-sm leading-6 text-foreground-secondary">
					Badge must not approve, reject, mutate, toggle, or submit a record.
					Interactive commands belong to Button.
				</p>
			</StorySection>
		</div>
	),
};
