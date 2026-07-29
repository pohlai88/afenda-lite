import {
	Badge,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	StatusBadge,
	Toggle,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { BoldIcon, ItalicIcon, PinIcon } from "lucide-react";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";
import { interactionFor } from "./interactions";

const evidence = contractEvidence("ui.toggle");

type WorkbenchSectionProps = Readonly<{
	id: string;
	title: string;
	description: string;
	children: React.ReactNode;
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

const meta = {
	title: "UI System/Toggle",
	component: Toggle,
	tags: ["autodocs", "test"],
	parameters: {
		...contractDocsParameters(evidence, "Toggle"),
		controls: {
			include: ["variant", "size", "disabled", "pressed"],
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
		disabled: { control: "boolean" },
		pressed: { control: "boolean" },
	},
	args: {
		variant: "default",
		size: "default",
		children: "Pin filter",
		defaultPressed: true,
	},
} satisfies Meta<typeof Toggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"One invoice list workbench: Toggle pins the overdue filter as a transient view option. Pressed chrome is not save confirmation — feature code owns persistence.",
			},
		},
	},
	render: () => (
		<div className="min-h-screen bg-canvas text-foreground">
			<div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
				<header className="grid gap-5 border-b pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
					<div className="grid gap-2">
						<p className="text-sm font-medium text-foreground-secondary">
							Accounts payable
						</p>
						<div className="grid gap-1">
							<h1 className="text-2xl font-semibold tracking-tight">
								Invoice queue view options
							</h1>
							<p className="max-w-5xl text-sm leading-6 text-foreground-secondary">
								Toggle owns pressed interaction. Feature Actions own whether the
								pinned filter is stored for the operator session.
							</p>
						</div>
					</div>
					<dl className="grid grid-cols-2 gap-x-8 gap-y-3 rounded-lg border bg-card p-4">
						<div className="grid gap-1">
							<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								Subject
							</dt>
							<dd className="text-sm">Invoice queue</dd>
						</div>
						<div className="grid gap-1">
							<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								Scope
							</dt>
							<dd className="text-sm">Transient view options</dd>
						</div>
						<div className="grid gap-1">
							<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								Ownership
							</dt>
							<dd className="text-sm">Feature state</dd>
						</div>
						<div className="grid gap-1">
							<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								Lifecycle
							</dt>
							<dd className="text-sm">Pressed or unpressed</dd>
						</div>
					</dl>
				</header>

				<Card className="shadow-none">
					<CardHeader>
						<div className="flex flex-wrap items-start justify-between gap-4">
							<div className="grid gap-1">
								<CardTitle>List density and pins</CardTitle>
								<CardDescription>
									July 2026 payables · org-fragrant-lake
								</CardDescription>
							</div>
							<div className="flex flex-wrap items-center gap-2">
								<Badge variant="outline">Payables</Badge>
								<StatusBadge status="pending" label="Draft view" />
							</div>
						</div>
					</CardHeader>
					<CardContent className="flex flex-wrap items-center gap-2">
						<Toggle defaultPressed aria-label="Pin overdue filter">
							<PinIcon />
							Pin overdue
						</Toggle>
						<Toggle variant="outline" aria-label="Bold amounts">
							<BoldIcon />
							Bold amounts
						</Toggle>
						<Toggle size="sm" aria-label="Italic notes" disabled>
							<ItalicIcon />
							Italic notes
						</Toggle>
					</CardContent>
				</Card>
			</div>
		</div>
	),
	play: interactionFor("toggle"),
};

export const Usage: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Approved roles: pin a transient filter, outline formatting toggle, and disabled option. Commands stay on Button; settings stay on Switch.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6 sm:grid-cols-2">
			<WorkbenchSection
				id="pin-filter"
				title="default · pin filter"
				description="Use Toggle for a transient pressed state that the operator can switch on or off without leaving the screen."
			>
				<Toggle defaultPressed aria-label="Pin overdue filter">
					<PinIcon />
					Pin overdue
				</Toggle>
			</WorkbenchSection>
			<WorkbenchSection
				id="formatting"
				title="outline · formatting"
				description="Formatting toggles preserve the same pressed semantics even when the visual treatment changes."
			>
				<Toggle variant="outline" aria-label="Bold amounts">
					<BoldIcon />
					Bold amounts
				</Toggle>
			</WorkbenchSection>
			<WorkbenchSection
				id="button-contrast"
				title="command contrast · Button"
				description="Command actions that commit, save, or navigate should stay on Button, not Toggle."
			>
				<Button type="button" size="sm">
					Export queue
				</Button>
			</WorkbenchSection>
		</div>
	),
};

export const ControlledUsage: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Bind pressed or defaultPressed from feature state. Keep a visible label or sr-only name on every toggle.",
			},
		},
	},
	render: (args) => (
		<div className="grid w-full max-w-sm gap-3">
			<Toggle {...args} />
			<p className="text-sm text-foreground-secondary">
				Pressed presentation is transient chrome — persistence stays with the
				feature.
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
					"Off, on, disabled, and icon-named toggles preserve aria-pressed and accessible names.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-4">
			<div className="flex flex-wrap items-center gap-3">
				<Toggle aria-label="Pin overdue filter">Pin overdue</Toggle>
				<Toggle defaultPressed aria-label="Pin overdue filter on">
					Pin overdue
				</Toggle>
				<Toggle disabled aria-label="Pin overdue filter locked">
					Pin overdue
				</Toggle>
				<Toggle aria-label="Pin overdue filter" variant="outline">
					<PinIcon />
					<span className="sr-only">Pin overdue</span>
				</Toggle>
			</div>
			<p className="text-sm text-foreground-secondary">
				The accessible name must describe the action independently of pressed
				state or icon treatment.
			</p>
		</div>
	),
};

export const VariantsAndSizes: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Approved inventory: default · outline crossed with sm · default · lg denseness.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6">
			{(["default", "outline"] as const).map((variant) => (
				<div key={variant} className="grid gap-2">
					<p className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
						{variant}
					</p>
					<div className="flex flex-wrap items-center gap-2">
						{(["sm", "default", "lg"] as const).map((size) => (
							<Toggle
								key={`${variant}-${size}`}
								variant={variant}
								size={size}
								defaultPressed={size === "default"}
							>
								{variant} {size}
							</Toggle>
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
					"Compose Toggle beside Badge taxonomy and StatusBadge lifecycle inside a Card. Toggle does not encode approval.",
			},
		},
	},
	render: () => (
		<Card className="w-full max-w-md shadow-none">
			<CardHeader>
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div className="grid gap-1">
						<CardTitle>INV-1048 preview</CardTitle>
						<CardDescription>Northwind Trading</CardDescription>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="secondary">Finance</Badge>
						<StatusBadge status="pending" label="Awaiting approval" />
					</div>
				</div>
			</CardHeader>
			<CardContent className="flex flex-wrap gap-2">
				<Toggle defaultPressed aria-label="Bold amounts">
					<BoldIcon />
					Bold amounts
				</Toggle>
				<Toggle variant="outline" aria-label="Italic notes">
					<ItalicIcon />
					Italic notes
				</Toggle>
			</CardContent>
		</Card>
	),
};

export const DoAndDoNot: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Do name toggles and keep them transient. Do not use Toggle for destructive commands or unlabeled icons.",
			},
		},
	},
	render: () => (
		<div className="grid max-w-5xl gap-6 sm:grid-cols-2">
			<StorySection title="Do: named transient option">
				<Toggle defaultPressed aria-label="Pin overdue filter">
					<PinIcon />
					Pin overdue
				</Toggle>
			</StorySection>
			<StorySection title="Do not: unlabeled or destructive toggle">
				<p className="text-sm text-foreground-secondary">
					Do not ship an icon-only Toggle without an accessible name, and do not
					use pressed state for void, delete, or approval commands — use Button.
				</p>
			</StorySection>
		</div>
	),
};
