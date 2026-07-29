import {
	Badge,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	Code,
	StatusBadge,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";

const evidence = contractEvidence("ui.code");

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
	title: "UI System/Code",
	component: Code,
	tags: ["autodocs", "test"],
	parameters: {
		...contractDocsParameters(evidence, "Code"),
		docs: {
			description: {
				component:
					"Code renders short, exact machine-oriented text such as record identifiers, commands, configuration keys, and confirmed error codes. It improves character distinction only; it does not authorize disclosure, redact sensitive data, provide copy behavior, communicate lifecycle, or replace prose.",
			},
		},
	},
} satisfies Meta<typeof Code>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"One invoice audit surface: record identifiers, a confirmed validation error code, then a quiet operator command. Code preserves exact characters — it does not prove safety or lifecycle.",
			},
		},
	},
	render: () => (
		<div className="min-h-screen bg-canvas text-foreground">
			<div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
				<header className="grid gap-5 border-b pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
					<div className="grid gap-2">
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant="outline">Accounts receivable</Badge>
							<StatusBadge
								size="sm"
								status="warning"
								label="Evidence incomplete"
							/>
						</div>
						<div className="grid gap-1">
							<h1 className="text-2xl font-semibold tracking-tight">
								Invoice INV-1042 · machine identifiers
							</h1>
							<p className="max-w-5xl text-sm leading-6 text-foreground-secondary">
								Short monospace values stay distinguishable for operators and
								auditors. Feature code owns redaction, copy actions, and whether
								a value may be shown.
							</p>
						</div>
					</div>
					<dl className="grid grid-cols-2 gap-x-8 gap-y-3 rounded-lg border bg-card p-4">
						<div className="grid gap-1">
							<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								Subject
							</dt>
							<dd className="text-sm">Machine identifiers</dd>
						</div>
						<div className="grid gap-1">
							<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								Scope
							</dt>
							<dd className="text-sm">Exact characters</dd>
						</div>
						<div className="grid gap-1">
							<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								Ownership
							</dt>
							<dd className="text-sm">Code formatting only</dd>
						</div>
						<div className="grid gap-1">
							<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								Lifecycle
							</dt>
							<dd className="text-sm">Read, compare, copy</dd>
						</div>
					</dl>
				</header>

				<section
					className="grid gap-3"
					aria-labelledby="code-identifiers-title"
				>
					<div className="grid gap-1">
						<h2
							className="text-base font-semibold tracking-tight text-foreground"
							id="code-identifiers-title"
						>
							Record identifiers
						</h2>
						<p className="text-sm text-foreground-secondary">
							Exact invoice, organization, and correlation IDs with surrounding
							labels.
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
							<dl className="grid gap-4 sm:grid-cols-2">
								<div className="grid gap-1">
									<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
										Invoice number
									</dt>
									<dd>
										<Code>INV-1042</Code>
									</dd>
								</div>
								<div className="grid gap-1">
									<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
										Organization
									</dt>
									<dd>
										<Code>org-fragrant-lake-90358173</Code>
									</dd>
								</div>
								<div className="grid gap-1">
									<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
										Correlation
									</dt>
									<dd>
										<Code>corr-7f2a9c1e</Code>
									</dd>
								</div>
								<div className="grid gap-1">
									<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
										Supplier code
									</dt>
									<dd>
										<Code>SUP-004821</Code>
									</dd>
								</div>
							</dl>
						</CardContent>
					</Card>
				</section>

				<section className="grid gap-3" aria-labelledby="code-error-title">
					<div className="grid gap-1">
						<h2
							className="text-base font-semibold tracking-tight text-foreground"
							id="code-error-title"
						>
							Confirmed failure code
						</h2>
						<p className="text-sm text-foreground-secondary">
							Destructive colour reinforces a known validation code — prose
							still names the condition.
						</p>
					</div>
					<Card className="shadow-none">
						<CardContent className="grid gap-2 pt-6">
							<p className="text-sm text-foreground">
								Posting blocked because the tax identifier failed format
								validation.
							</p>
							<p className="text-sm text-foreground-secondary">
								Error code{" "}
								<Code className="text-destructive">VALIDATION_ERROR</Code>
							</p>
						</CardContent>
					</Card>
				</section>

				<section className="grid gap-3" aria-labelledby="code-command-title">
					<div className="grid gap-1">
						<h2
							className="text-base font-semibold tracking-tight text-foreground"
							id="code-command-title"
						>
							Quiet operator command
						</h2>
						<p className="text-sm text-foreground-secondary">
							Short commands stay exact without becoming a multi-line log.
						</p>
					</div>
					<p className="text-sm text-foreground-secondary">
						Re-run Storybook coverage with <Code>pnpm check:storybook</Code>{" "}
						after identifier contract changes.
					</p>
				</section>
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
					"Use Code for short machine-oriented values that need character distinction. Pair each value with a label or sentence so identifiers stay interpretable.",
			},
		},
	},
	render: () => (
		<WorkbenchSection
			id="code-semantic-usage-title"
			title="Exact text and surrounding meaning"
			description="Code keeps character identity exact while the surrounding prose carries the business meaning."
		>
			<div className="grid max-w-5xl gap-6">
				<StorySection title="Identifiers in labelled fields">
					<dl className="grid gap-3">
						<div className="grid gap-1">
							<dt className="text-sm font-medium">Invoice</dt>
							<dd>
								<Code>INV-1042</Code>
							</dd>
						</div>
						<div className="grid gap-1">
							<dt className="text-sm font-medium">Organization</dt>
							<dd>
								<Code>org-fragrant-lake-90358173</Code>
							</dd>
						</div>
					</dl>
				</StorySection>

				<StorySection title="Inline command and error code">
					<p className="text-sm text-foreground-secondary">
						Run <Code>pnpm check:storybook</Code>. On failure inspect{" "}
						<Code className="text-destructive">VALIDATION_ERROR</Code>.
					</p>
				</StorySection>
			</div>
		</WorkbenchSection>
	),
};

export const AdaptiveLayout: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Exact values must remain readable in narrow ERP regions. Allow long identifiers to wrap or scroll through consumer layout; never remove significant prefixes or suffixes merely to fit a Card.",
			},
		},
	},
	render: () => (
		<div className="grid max-w-4xl gap-6">
			<StorySection title="Narrow metadata region">
				<div className="w-full max-w-xs rounded-lg border border-dashed border-border p-4">
					<dl className="grid gap-4">
						<div className="grid min-w-0 gap-1">
							<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								Organization
							</dt>
							<dd className="min-w-0 overflow-x-auto pb-1">
								<Code>org-fragrant-lake-90358173</Code>
							</dd>
						</div>
						<div className="grid min-w-0 gap-1">
							<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								Correlation
							</dt>
							<dd className="min-w-0 overflow-x-auto pb-1">
								<Code>corr-7f2a9c1e-8841-receivables-posting</Code>
							</dd>
						</div>
					</dl>
				</div>
			</StorySection>

			<StorySection title="Inline operational sentence">
				<p className="max-w-xl text-sm leading-6 text-foreground-secondary">
					Retry journal <Code>JE-2026-07-8841</Code> after restoring ledger
					account <Code>4000-AR</Code>. The surrounding sentence carries the
					meaning; Code preserves the exact operands.
				</p>
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
					"Default monospace remains readable at zoom, high contrast, and forced colours through semantic tokens. Error emphasis uses colour plus surrounding prose. Unexplained IDs always carry adjacent context, and assistive technology receives the same literal text shown visually.",
			},
		},
	},
	render: () => (
		<div className="grid max-w-5xl gap-4">
			<p className="text-sm text-foreground">
				Default treatment: <Code>INV-1042</Code>
			</p>
			<p className="text-sm text-foreground">
				Confirmed error code:{" "}
				<Code className="text-destructive">VALIDATION_ERROR</Code> — tax
				identifier format failed.
			</p>
			<p className="text-sm text-foreground-secondary">
				Correlation for support: <Code>corr-7f2a9c1e</Code>
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
					"Compose Code inside Card metadata rows. Badge remains taxonomy; StatusBadge remains lifecycle — Code only renders the machine value.",
			},
		},
	},
	render: () => (
		<div className="grid max-w-5xl gap-6">
			<Card className="shadow-none">
				<CardHeader>
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="outline">Invoice</Badge>
						<Code>INV-1039</Code>
						<StatusBadge size="sm" status="error" label="Posting failed" />
					</div>
					<CardTitle>Target ledger account inactive</CardTitle>
					<CardDescription>
						Journal reference <Code>JE-2026-07-8841</Code>
					</CardDescription>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-foreground-secondary">
						Restore account <Code>4000-AR</Code> before retrying the July batch.
					</p>
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
					"Do show exact short identifiers with context. Do not expose secrets, use Code as body text, or silently truncate significant prefixes or suffixes.",
			},
		},
	},
	render: () => (
		<div className="grid max-w-5xl gap-6 sm:grid-cols-2">
			<StorySection title="Do: keep exact short machine values">
				<p className="text-sm text-foreground-secondary">
					Invoice <Code>INV-1042</Code> for supplier <Code>SUP-004821</Code>
				</p>
			</StorySection>

			<StorySection title="Do not: use Code as body copy">
				<p className="text-sm text-foreground-tertiary">
					<Code>
						The invoice remains outside the receivables ledger until the account
						mapping is restored and the operator retries posting.
					</Code>
				</p>
			</StorySection>

			<StorySection title="Do: redact sensitive identifiers">
				<p className="text-sm text-foreground-secondary">
					Bank account <Code>•••• 4218</Code>
				</p>
			</StorySection>

			<StorySection title="Do not: expose secrets or tokens">
				<div className="rounded-md border border-dashed p-4 text-sm text-foreground-tertiary">
					Never render API keys, session tokens, or full account numbers inside
					Code.
				</div>
			</StorySection>

			<StorySection title="Do: preserve significant characters">
				<p className="text-sm text-foreground-secondary">
					Organization <Code>org-fragrant-lake-90358173</Code>
				</p>
			</StorySection>

			<StorySection title="Do not: silently truncate IDs">
				<div className="rounded-md border border-dashed p-4 text-sm text-foreground-tertiary">
					Truncating to <Code>org-frag…</Code> can hide the digits operators use
					to match support tickets.
				</div>
			</StorySection>
		</div>
	),
};
