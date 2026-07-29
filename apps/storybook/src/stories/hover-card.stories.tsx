import {
	Avatar,
	AvatarFallback,
	Badge,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	Code,
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
	StatusBadge,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";

const evidence = contractEvidence("ui.hover-card");

const meta = {
	title: "UI System/Hover Card",
	component: HoverCard,
	tags: ["autodocs", "test"],
	parameters: {
		...contractDocsParameters(evidence, "Hover Card"),
	},
} satisfies Meta<typeof HoverCard>;

export default meta;
type Story = StoryObj<typeof meta>;

function SupplierHoverCard() {
	return (
		<HoverCard openDelay={0} closeDelay={0}>
			<HoverCardTrigger asChild>
				<Button type="button" variant="link">
					Northwind Trading Sdn. Bhd.
				</Button>
			</HoverCardTrigger>
			<HoverCardContent className="w-80">
				<div className="flex gap-3">
					<Avatar>
						<AvatarFallback className="text-foreground">NT</AvatarFallback>
					</Avatar>
					<div className="grid gap-1">
						<p className="text-sm font-medium text-foreground">
							Northwind Trading Sdn. Bhd.
						</p>
						<p className="text-sm text-foreground-secondary">
							Supplier <Code>SUP-004821</Code> · Net 30 · MYR
						</p>
						<div className="pt-1">
							<StatusBadge size="sm" status="active" label="Active" />
						</div>
					</div>
				</div>
			</HoverCardContent>
		</HoverCard>
	);
}

function OperatorHoverCard() {
	return (
		<HoverCard openDelay={0} closeDelay={0}>
			<HoverCardTrigger asChild>
				<Button type="button" variant="link">
					Aisha Rahman
				</Button>
			</HoverCardTrigger>
			<HoverCardContent className="w-80">
				<div className="flex gap-3">
					<Avatar>
						<AvatarFallback className="text-foreground">AR</AvatarFallback>
					</Avatar>
					<div className="grid gap-1">
						<p className="text-sm font-medium text-foreground">Aisha Rahman</p>
						<p className="text-sm text-foreground-secondary">
							Finance controller · remittance owner
						</p>
						<div className="flex flex-wrap gap-2 pt-1">
							<Badge variant="secondary">Finance</Badge>
							<StatusBadge size="sm" status="active" label="Active" />
						</div>
					</div>
				</div>
			</HoverCardContent>
		</HoverCard>
	);
}

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"One invoice workbench: HoverCard previews supplier and operator identity beside stable triggers. Preview is supplemental — required identity stays on the Card without opening the card.",
			},
		},
	},
	render: () => (
		<div className="min-h-screen bg-canvas text-foreground">
			<div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
				<header className="grid gap-2 border-b pb-6">
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="outline">Accounts receivable</Badge>
						<StatusBadge
							size="sm"
							status="warning"
							label="Evidence incomplete"
						/>
					</div>
					<h1 className="text-2xl font-semibold tracking-tight">
						Invoice INV-1042
					</h1>
					<p className="max-w-5xl text-sm leading-6 text-foreground-secondary">
						Hover or focus a link to preview supplier or operator context.
						Feature code owns whether preview data may be shown.
					</p>
				</header>

				<section
					className="grid gap-3"
					aria-labelledby="hover-card-supplier-title"
				>
					<div className="grid gap-1">
						<h2
							className="text-base font-semibold tracking-tight text-foreground"
							id="hover-card-supplier-title"
						>
							Supplier preview
						</h2>
						<p className="text-sm text-foreground-secondary">
							Trigger remains a readable supplier name without the preview.
						</p>
					</div>
					<Card className="shadow-none">
						<CardHeader>
							<CardTitle>Customer on invoice</CardTitle>
							<CardDescription>
								Open receivables · MYR 18,420.00 · Net 30
							</CardDescription>
						</CardHeader>
						<CardContent className="grid gap-2 text-sm">
							<p className="text-foreground-secondary">
								Bill to <SupplierHoverCard />
							</p>
							<p className="text-foreground-secondary">
								Supplier code <Code>SUP-004821</Code> remains visible on the
								record without opening the preview.
							</p>
						</CardContent>
					</Card>
				</section>

				<section
					className="grid gap-3"
					aria-labelledby="hover-card-operator-title"
				>
					<div className="grid gap-1">
						<h2
							className="text-base font-semibold tracking-tight text-foreground"
							id="hover-card-operator-title"
						>
							Operator preview
						</h2>
						<p className="text-sm text-foreground-secondary">
							Identity chrome uses Avatar; lifecycle stays on StatusBadge.
						</p>
					</div>
					<p className="text-sm text-foreground-secondary">
						Assigned remittance owner <OperatorHoverCard />
					</p>
				</section>

				<section
					className="grid gap-3"
					aria-labelledby="hover-card-fallback-title"
				>
					<div className="grid gap-1">
						<h2
							className="text-base font-semibold tracking-tight text-foreground"
							id="hover-card-fallback-title"
						>
							Quiet fallback
						</h2>
						<p className="text-sm text-foreground-secondary">
							Required facts stay on the page when the preview never opens.
						</p>
					</div>
					<p className="text-sm text-foreground-secondary">
						Invoice <Code>INV-1042</Code> · Posted state uses StatusBadge on the
						record header — not only inside a hover preview.
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
					"Use HoverCard for supplemental identity or record previews. Keep the trigger useful alone. Prefer Tooltip for short labels and Popover when controls must be interactive.",
			},
		},
	},
	render: () => (
		<div className="grid max-w-5xl gap-6">
			<StorySection title="Supplier identity preview">
				<p className="text-sm text-foreground-secondary">
					Bill to <SupplierHoverCard />
				</p>
			</StorySection>

			<StorySection title="Operator identity preview">
				<p className="text-sm text-foreground-secondary">
					Owner <OperatorHoverCard />
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
					"Preview opens from pointer hover and keyboard focus. Required supplier code and status remain outside the card. Avoid nesting focusable commands in the preview.",
			},
		},
	},
	render: () => (
		<div className="grid max-w-5xl gap-4">
			<p className="text-sm text-foreground-secondary">
				Focus or hover <SupplierHoverCard /> — Tab to the trigger, then confirm
				preview content without relying on colour alone.
			</p>
			<p className="text-sm text-foreground-secondary">
				Without opening the preview: supplier <Code>SUP-004821</Code> ·{" "}
				<StatusBadge size="sm" status="active" label="Active" />
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
					"Compose HoverCard inside Card copy. Avatar marks identity; Badge remains taxonomy; StatusBadge remains lifecycle.",
			},
		},
	},
	render: () => (
		<div className="grid max-w-5xl gap-6">
			<Card className="shadow-none">
				<CardHeader>
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="outline">Invoice</Badge>
						<Code>INV-1042</Code>
						<StatusBadge
							size="sm"
							status="warning"
							label="Evidence incomplete"
						/>
					</div>
					<CardTitle>Receivables follow-up</CardTitle>
					<CardDescription>
						Preview the supplier without leaving the queue row.
					</CardDescription>
				</CardHeader>
				<CardContent className="text-sm text-foreground-secondary">
					Customer <SupplierHoverCard /> · Owner <OperatorHoverCard />
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
					"Do keep previews supplemental and triggers self-sufficient. Do not hide critical actions in HoverCard, use it as a Tooltip, or expose unauthorized data.",
			},
		},
	},
	render: () => (
		<div className="grid max-w-5xl gap-6 sm:grid-cols-2">
			<StorySection title="Do: preview supplemental identity">
				<p className="text-sm text-foreground-secondary">
					Supplier <SupplierHoverCard />
				</p>
			</StorySection>

			<StorySection title="Do not: put critical actions only in the preview">
				<div className="rounded-md border border-dashed p-4 text-sm text-foreground-tertiary">
					Approve, Void, and Attach evidence must remain on the record surface —
					never only inside a hover preview.
				</div>
			</StorySection>

			<StorySection title="Do: keep required facts outside">
				<p className="text-sm text-foreground-secondary">
					Code <Code>SUP-004821</Code> stays visible beside the trigger.
				</p>
			</StorySection>

			<StorySection title="Do not: use HoverCard as Tooltip">
				<div className="rounded-md border border-dashed p-4 text-sm text-foreground-tertiary">
					Short labels such as “Net 30” belong on Tooltip — not a full identity
					card.
				</div>
			</StorySection>

			<StorySection title="Do: open from keyboard focus">
				<p className="text-sm text-foreground-secondary">
					Tab to the trigger and confirm the preview without a pointer.
				</p>
			</StorySection>

			<StorySection title="Do not: nest forms or menus">
				<div className="rounded-md border border-dashed p-4 text-sm text-foreground-tertiary">
					Interactive edit, menu, or confirmation work belongs in Popover,
					Dialog, or Sheet.
				</div>
			</StorySection>
		</div>
	),
};
