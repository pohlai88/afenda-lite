import {
	Badge,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
	KeyValue,
	KeyValueList,
	StatusBadge,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";

const evidence = contractEvidence("ui.key-value");

const meta = {
	title: "UI System/Key Value",
	component: KeyValue,
	tags: ["autodocs", "test"],
	args: {
		label: "Invoice reference",
	},
	parameters: {
		...contractDocsParameters(evidence, "Key Value"),
		docs: {
			description: {
				component:
					"KeyValue and KeyValueList present labelled, read-only facts. They own label–value hierarchy and optional copy controls; feature code owns formatting, redaction, freshness, authority, ordering, and edit permissions.",
			},
		},
	},
} satisfies Meta<typeof KeyValue>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"Invoice detail summary for labelled, read-only facts and copyable identifiers. KeyValue owns label–value hierarchy only; feature code owns formatting, redaction, freshness, authority, and edit permissions.",
			},
		},
	},
	render: () => (
		<div className="min-h-screen bg-canvas text-foreground">
			<div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
				<header className="grid gap-2 border-b pb-6">
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="outline">Accounts receivable</Badge>
						<StatusBadge size="sm" status="pending" label="Awaiting evidence" />
					</div>
					<h1 className="text-2xl font-semibold tracking-tight">
						Invoice INV-1042 · record summary
					</h1>
					<p className="max-w-5xl text-sm leading-6 text-foreground-secondary">
						KeyValue presents labelled read-only facts. Feature code owns
						formatting, redaction, ordering, and whether a value may be shown.
					</p>
				</header>

				<section
					className="grid gap-3"
					aria-labelledby="key-value-summary-title"
				>
					<div className="grid gap-1">
						<h2
							className="text-base font-semibold tracking-tight text-foreground"
							id="key-value-summary-title"
						>
							Invoice identity
						</h2>
						<p className="text-sm text-foreground-secondary">
							Stacked labels for clear hierarchy; copyable where operators need
							exact identifiers.
						</p>
					</div>
					<Card className="shadow-none">
						<CardHeader>
							<CardTitle>Northwind Trading Sdn. Bhd.</CardTitle>
							<CardDescription>
								Open invoice awaiting tax evidence before posting
							</CardDescription>
						</CardHeader>
						<CardContent>
							<KeyValueList
								orientation="vertical"
								size="md"
								items={[
									{ label: "Invoice", value: "INV-1042", copyable: true },
									{ label: "Supplier", value: "SUP-004821", copyable: true },
									{ label: "Currency", value: "MYR" },
									{ label: "Due date", value: "28 Jul 2026" },
								]}
							/>
						</CardContent>
						<CardFooter className="justify-end border-t">
							<Button type="button" size="sm" variant="outline">
								Open full record
							</Button>
						</CardFooter>
					</Card>
				</section>
			</div>
		</div>
	),
};

export const SemanticUsage: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Use KeyValue for labelled read-only facts and KeyValueList for ordered metadata. Values must be formatted, authorized, and ready for display before reaching the component.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-md gap-6">
			<StorySection
				title="Single pair"
				description="One labelled fact with optional copy."
			>
				<KeyValue label="Organization" value="org-fragrant-lake" copyable />
			</StorySection>
			<StorySection
				title="Metadata list"
				description="Ordered by task importance, not storage order."
			>
				<KeyValueList
					items={[
						{ label: "Payment terms", value: "Net 30" },
						{ label: "Settlement currency", value: "USD" },
						{ label: "Remittance email", value: "finance@northwind.example" },
					]}
				/>
			</StorySection>
		</div>
	),
};

export const Variants: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Orientation variants are vertical, horizontal, and inline. Orientation changes reading layout only; it never changes value meaning, authority, redaction, or copy permission.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-lg gap-6">
			<StorySection
				title="vertical"
				description="Stacked label and value for wrapping or clear hierarchy."
			>
				<KeyValue orientation="vertical" label="Invoice" value="INV-1042" />
			</StorySection>
			<StorySection
				title="horizontal"
				description="Opposed label and value across available width."
			>
				<KeyValue
					orientation="horizontal"
					label="Supplier"
					value="Northwind Trading Sdn. Bhd."
				/>
			</StorySection>
			<StorySection
				title="inline"
				description="Compact inline pair for dense repeated metadata."
			>
				<KeyValue orientation="inline" label="Currency" value="MYR" size="sm" />
			</StorySection>
		</div>
	),
};

export const Sizes: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Sizes sm, md, and lg adjust density and emphasis only. Do not use size to imply lifecycle, sensitivity, confidence, or editability.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-md gap-6">
			{(
				[
					{ size: "sm" as const, description: "Dense supporting metadata." },
					{ size: "md" as const, description: "Ordinary record detail." },
					{ size: "lg" as const, description: "Sparse summary emphasis." },
				] as const
			).map(({ size, description }) => (
				<StorySection key={size} title={size} description={description}>
					<KeyValue
						orientation="horizontal"
						size={size}
						label="Invoice"
						value="INV-1042"
					/>
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
					"Loaded, copyable, loading, unavailable, and intentionally redacted values must remain distinguishable. Loading never invents a fact, and an em dash must not hide an authorization or data-quality problem.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-md gap-6">
			<StorySection title="Loaded" description="Stable labelled value.">
				<KeyValue label="Invoice" value="INV-1042" />
			</StorySection>
			<StorySection
				title="Copyable"
				description="String values may expose a copy control with an explicit title."
			>
				<KeyValue label="Correlation ID" value="corr-9f2a1c" copyable />
			</StorySection>
			<StorySection
				title="Loading"
				description="Pulse placeholder while feature code resolves the value."
			>
				<KeyValue label="Settlement bank" loading />
			</StorySection>
			<StorySection
				title="Unavailable"
				description="Use an em dash only when the domain value is genuinely absent."
			>
				<KeyValue label="External reference" />
			</StorySection>
		</div>
	),
};

export const Composition: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Compose KeyValueList inside a record-detail surface and order facts by operator task. Editing actions stay outside the list; KeyValue remains read-only and must not masquerade as an input.",
			},
		},
	},
	render: () => (
		<Card className="w-full max-w-lg shadow-none">
			<CardHeader>
				<CardTitle>Remittance REM-2026-0718</CardTitle>
				<CardDescription>
					Supplier settlement summary before advice generation.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<KeyValueList
					orientation="horizontal"
					size="sm"
					items={[
						{ label: "Supplier", value: "SUP-004821", copyable: true },
						{ label: "Amount", value: "USD 1,250.00" },
						{ label: "Method", value: "ACH" },
						{ label: "Advice status", value: "Draft" },
					]}
				/>
			</CardContent>
			<CardFooter className="justify-end gap-2 border-t">
				<Button type="button" variant="outline" size="sm">
					Edit remittance
				</Button>
				<Button type="button" size="sm">
					Generate advice
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
					"Do show labelled, consistently formatted, authorized facts. Do not use KeyValue as an editable field, mix incompatible units, expose raw sensitive values, or imply that display text is audit authority.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6 md:grid-cols-2">
			<StorySection
				title="Do"
				description="Read-only summary with consistent currency formatting."
			>
				<KeyValueList
					orientation="vertical"
					items={[
						{ label: "Invoiced", value: "MYR 4,820.50" },
						{ label: "Paid", value: "MYR 1,200.00" },
						{ label: "Open", value: "MYR 3,620.50" },
					]}
				/>
			</StorySection>
			<StorySection
				title="Do not"
				description="Do not treat KeyValue as the edit surface for mutable fields."
			>
				<div className="grid gap-2 rounded-md border border-destructive/40 p-3">
					<KeyValue label="Invoice total (edit here)" value="4820.5" />
					<p className="text-xs text-destructive">
						Editable amounts belong in FormField + Input or NumericInput — not
						KeyValue.
					</p>
				</div>
			</StorySection>
		</div>
	),
};
