import {
	Badge,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
	FormError,
	FormField,
	FormInput,
	StatusBadge,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { expect, within } from "storybook/test";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence } from "./evidence";

const evidence = contractEvidence("ui.form-error");
const CLOSED_LEDGER_WINDOW_PATTERN =
	/Invoice date is outside the open ledger window/i;

function WorkbenchSection({
	title,
	children,
}: {
	title: string;
	children: ReactNode;
}) {
	return (
		<section className="rounded-2xl border border-border/60 bg-surface p-5 shadow-sm">
			<div className="grid gap-4">
				<p className="font-semibold text-foreground-tertiary text-xs uppercase tracking-[0.2em]">
					{title}
				</p>
				{children}
			</div>
		</section>
	);
}

const meta = {
	title: "UI System/Form Error",
	component: FormError,
	tags: ["autodocs", "test"],
	parameters: {
		...contractDocsParameters(evidence, "Form Error"),
		controls: {
			include: ["variant", "size", "message", "showIcon"],
		},
	},
	argTypes: {
		variant: {
			control: "select",
			options: evidence.variants,
		},
		size: {
			control: "select",
			options: evidence.sizes,
		},
		message: {
			control: "text",
		},
		showIcon: {
			control: "boolean",
		},
	},
	args: {
		variant: "default",
		size: "md",
		message: "Tax registration number is required before save.",
		showIcon: true,
	},
} satisfies Meta<typeof FormError>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"One supplier registration workbench: FormError reports the form-level save failure while FormField keeps the tax field correction. Severity chrome does not prove the Action blocked the write.",
			},
		},
	},
	render: () => (
		<div className="min-h-screen bg-canvas text-foreground">
			<div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
				<header className="grid gap-6 border-border/60 border-b pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
					<div className="grid gap-2">
						<p className="font-medium text-foreground-secondary text-sm">
							Master data
						</p>
						<h1 className="font-semibold text-2xl tracking-tight">
							Supplier registration
						</h1>
						<p className="max-w-5xl text-foreground-secondary text-sm leading-6">
							FormError owns one form-level summary. Feature Actions own
							validation, severity, and whether save is blocked. Field
							corrections stay on FormField.
						</p>
					</div>
					<dl className="grid min-w-[220px] gap-3 rounded-2xl border border-border/60 bg-surface p-4 text-sm shadow-sm">
						<div className="flex items-center justify-between gap-4">
							<dt className="text-foreground-tertiary">Domain</dt>
							<dd className="font-medium text-foreground">Suppliers</dd>
						</div>
						<div className="flex items-center justify-between gap-4">
							<dt className="text-foreground-tertiary">Status</dt>
							<dd className="font-medium text-foreground">Save blocked</dd>
						</div>
						<div className="flex items-center justify-between gap-4">
							<dt className="text-foreground-tertiary">Pattern</dt>
							<dd className="font-medium text-foreground">
								Form-level summary
							</dd>
						</div>
					</dl>
				</header>

				<Card className="shadow-none">
					<CardHeader>
						<div className="flex flex-wrap items-start justify-between gap-4">
							<div className="grid gap-1">
								<CardTitle>Legal identity</CardTitle>
								<CardDescription>
									Northwind Trading · org-fragrant-lake
								</CardDescription>
							</div>
							<div className="flex flex-wrap items-center gap-2">
								<Badge variant="outline">Suppliers</Badge>
								<StatusBadge label="Save blocked" status="error" />
							</div>
						</div>
					</CardHeader>
					<CardContent className="grid gap-6">
						<FormError message="Save failed. Complete the required tax registration number, then try again." />
						<FormField
							description="Use the registered entity name."
							label="Legal name"
							required
						>
							<FormInput defaultValue="Northwind Trading Sdn Bhd" />
						</FormField>
						<FormField
							error="Tax registration number is required."
							label="Tax registration number"
							required
						>
							<FormInput aria-invalid placeholder="Enter tax registration" />
						</FormField>
					</CardContent>
					<CardFooter className="justify-end gap-2">
						<Button type="button" variant="outline">
							Cancel
						</Button>
						<Button type="button">Save supplier</Button>
					</CardFooter>
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
					"Maps each FormError variant to permitted ERP meaning. Default blocks or reports failure; warning asks for review; info explains context without claiming harm.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-4">
			<WorkbenchSection title="default · confirmed save failure">
				<FormError
					message="Save failed. Complete the required tax registration number, then try again."
					variant="default"
				/>
			</WorkbenchSection>
			<WorkbenchSection title="warning · review before submit">
				<FormError
					message="Credit limit is near capacity. Review open invoices before posting this remittance."
					variant="warning"
				/>
			</WorkbenchSection>
			<WorkbenchSection title="info · submission context">
				<FormError
					message="Changes apply to the next payroll run after approval. They do not alter posted July journals."
					variant="info"
				/>
			</WorkbenchSection>
		</div>
	),
};

export const Usage: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Pass message or children from feature-owned validation. Prefer one authoritative form-level summary per submission outcome.",
			},
		},
	},
	render: (args) => (
		<div className="grid w-full max-w-md gap-3">
			<FormError {...args} />
			<p className="text-foreground-secondary text-sm">
				Severity and blocking policy stay with the feature. FormError only
				presents the confirmed summary.
			</p>
		</div>
	),
};

export const StatesAndAccessibility: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Empty content renders nothing. With message, role=alert announces politely. showIcon is optional — never the sole severity cue. Field errors stay on FormField.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6">
			<WorkbenchSection title="No message · null render">
				<div data-testid="form-error-empty">
					<FormError />
					<p className="text-foreground-secondary text-sm">
						No form-level summary until the feature supplies a message.
					</p>
				</div>
			</WorkbenchSection>
			<WorkbenchSection title="With message · alert region">
				<FormError message="Invoice date is outside the open ledger window." />
			</WorkbenchSection>
			<WorkbenchSection title="Without icon">
				<FormError
					message="Duplicate supplier code. Choose a unique code before save."
					showIcon={false}
				/>
			</WorkbenchSection>
			<WorkbenchSection title="Paired field error">
				<div className="grid gap-3">
					<FormError message="Resolve the highlighted fields before save." />
					<FormField
						error="Supplier code already exists."
						label="Supplier code"
						required
					>
						<FormInput aria-invalid defaultValue="NW-001" />
					</FormField>
				</div>
			</WorkbenchSection>
		</div>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByText(CLOSED_LEDGER_WINDOW_PATTERN)).toBeVisible();
		const empty = canvas.getByTestId("form-error-empty");
		await expect(within(empty).queryByRole("alert")).toBeNull();
	},
};

export const VariantsAndSizes: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Approved inventory: default · warning · info crossed with sm · md · lg denseness. Each cell is evidence — not a decorative matrix for product screens.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6">
			{(["default", "warning", "info"] as const).map((variant) => (
				<div className="grid gap-2" key={variant}>
					<p className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
						{variant}
					</p>
					<div className="grid gap-3">
						{(["sm", "md", "lg"] as const).map((size) => (
							<FormError
								key={`${variant}-${size}`}
								message={`${variant} summary (${size})`}
								size={size}
								variant={variant}
							/>
						))}
					</div>
				</div>
			))}
		</div>
	),
};

export const Composition: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Compose FormError above labelled fields in a Card. Badge names the domain; StatusBadge carries lifecycle. FormError does not encode approval success.",
			},
		},
	},
	render: () => (
		<Card className="w-full max-w-md shadow-none">
			<CardHeader>
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div className="grid gap-1">
						<CardTitle>Remittance batch</CardTitle>
						<CardDescription>July 2026 · payables</CardDescription>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="secondary">Finance</Badge>
						<StatusBadge label="Review required" status="warning" />
					</div>
				</div>
			</CardHeader>
			<CardContent className="grid gap-4">
				<FormError
					message="Credit limit is near capacity. Review open invoices before posting."
					variant="warning"
				/>
				<FormField label="Payment reference" required>
					<FormInput defaultValue="REM-2026-07-28" />
				</FormField>
			</CardContent>
			<CardFooter className="justify-end gap-2">
				<Button type="button" variant="outline">
					Cancel
				</Button>
				<Button type="button">Post remittance</Button>
			</CardFooter>
		</Card>
	),
};

export const DoAndDoNot: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Do keep one actionable form-level summary and field errors on FormField. Do not use FormError as decorative status or encode successful approval.",
			},
		},
	},
	render: () => (
		<div className="grid max-w-5xl gap-6 sm:grid-cols-2">
			<WorkbenchSection title="Do: actionable form-level summary">
				<FormError message="Save failed. Enter the tax registration number, then try again." />
			</WorkbenchSection>
			<WorkbenchSection title="Do not: decorative or success-as-error">
				<p className="text-foreground-secondary text-sm">
					Do not render FormError for quiet success, marketing copy, or
					conflicting client/server summaries. Do not replace field-level
					corrections with only a form-level banner.
				</p>
			</WorkbenchSection>
		</div>
	),
};
