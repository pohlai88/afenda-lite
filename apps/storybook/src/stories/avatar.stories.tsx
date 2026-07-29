import {
	Avatar,
	AvatarBadge,
	AvatarFallback,
	AvatarGroup,
	AvatarGroupCount,
	AvatarImage,
	Badge,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	StatusBadge,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";

const evidence = contractEvidence("ui.avatar");

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
	title: "UI System/Avatar",
	component: Avatar,
	tags: ["autodocs", "test"],
	parameters: {
		...contractDocsParameters(evidence, "Avatar"),
	},
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"One finance directory workbench: Avatar marks operator identity in roster rows. Badge remains taxonomy; StatusBadge remains lifecycle — Avatar does not encode either.",
			},
		},
	},
	render: () => (
		<div className="min-h-screen bg-canvas text-foreground">
			<div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
				<header className="grid gap-5 border-b pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
					<div className="grid gap-2">
						<p className="text-sm font-medium text-foreground-secondary">
							Organization directory
						</p>
						<div className="grid gap-1">
							<h1 className="text-2xl font-semibold tracking-tight">
								Finance operators
							</h1>
							<p className="max-w-5xl text-sm leading-6 text-foreground-secondary">
								Avatar shows who the person is. Feature code owns identity data
								and image policy. Status and department use separate primitives.
							</p>
						</div>
					</div>
					<dl className="grid grid-cols-2 gap-x-8 gap-y-3 rounded-lg border bg-card p-4">
						<div className="grid gap-1">
							<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								Subject
							</dt>
							<dd className="text-sm">Directory identity</dd>
						</div>
						<div className="grid gap-1">
							<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								Scope
							</dt>
							<dd className="text-sm">Named operator</dd>
						</div>
						<div className="grid gap-1">
							<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								Ownership
							</dt>
							<dd className="text-sm">Identity only</dd>
						</div>
						<div className="grid gap-1">
							<dt className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
								Lifecycle
							</dt>
							<dd className="text-sm">Roster and presence</dd>
						</div>
					</dl>
				</header>

				<Card className="shadow-none">
					<CardHeader>
						<CardTitle>Active controllers</CardTitle>
						<CardDescription>
							org-fragrant-lake · receivables and period close
						</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-3">
						<div className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
							<div className="flex min-w-0 items-center gap-3">
								<Avatar size="default">
									<AvatarFallback className="text-foreground">
										AR
									</AvatarFallback>
								</Avatar>
								<div className="min-w-0 grid gap-0.5">
									<p className="truncate text-sm font-medium text-foreground">
										Aisha Rahman
									</p>
									<p className="truncate text-sm text-foreground-secondary">
										Finance controller · remittance owner
									</p>
								</div>
							</div>
							<div className="flex shrink-0 items-center gap-2">
								<Badge variant="secondary">Finance</Badge>
								<StatusBadge status="active" label="Active" />
							</div>
						</div>

						<div className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
							<div className="flex min-w-0 items-center gap-3">
								<Avatar size="default">
									<AvatarFallback className="text-foreground">
										JT
									</AvatarFallback>
								</Avatar>
								<div className="min-w-0 grid gap-0.5">
									<p className="truncate text-sm font-medium text-foreground">
										Jordan Tan
									</p>
									<p className="truncate text-sm text-foreground-secondary">
										Accounts receivable · collection follow-up
									</p>
								</div>
							</div>
							<div className="flex shrink-0 items-center gap-2">
								<Badge variant="secondary">Finance</Badge>
								<StatusBadge status="pending" label="Awaiting access" />
							</div>
						</div>

						<div className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
							<div className="flex min-w-0 items-center gap-3">
								<Avatar size="default">
									<AvatarFallback className="text-foreground">
										NL
									</AvatarFallback>
									<AvatarBadge aria-hidden="true" />
								</Avatar>
								<div className="min-w-0 grid gap-0.5">
									<p className="truncate text-sm font-medium text-foreground">
										Nora Lim
									</p>
									<p className="truncate text-sm text-foreground-secondary">
										Period close lead · July 2026
									</p>
								</div>
							</div>
							<div className="flex shrink-0 items-center gap-2">
								<Badge variant="secondary">Finance</Badge>
								<StatusBadge status="active" label="Active" />
							</div>
						</div>
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
					"Approved Avatar roles: named operator, supplier entity, and reviewer group. Lifecycle and taxonomy stay on StatusBadge and Badge.",
			},
		},
	},
	render: () => (
		<WorkbenchSection
			id="avatar-semantic-usage-title"
			title="Directory identity roles"
			description="Avatar identifies a person or entity and keeps status or taxonomy on the right primitive."
		>
			<div className="grid w-full max-w-5xl gap-6">
				<StorySection title="Named operator in a directory row">
					<div className="flex items-center gap-3">
						<Avatar>
							<AvatarFallback className="text-foreground">AR</AvatarFallback>
						</Avatar>
						<div className="grid gap-0.5">
							<p className="text-sm font-medium text-foreground">
								Aisha Rahman
							</p>
							<p className="text-sm text-foreground-secondary">
								Finance controller · remittance owner
							</p>
						</div>
					</div>
				</StorySection>
				<StorySection title="Supplier entity identity">
					<div className="flex items-center gap-3">
						<Avatar>
							<AvatarFallback className="text-foreground">NT</AvatarFallback>
						</Avatar>
						<div className="grid gap-0.5">
							<p className="text-sm font-medium text-foreground">
								Northwind Trading Sdn. Bhd.
							</p>
							<p className="text-sm text-foreground-secondary">
								Active supplier · MY-TAX-1042
							</p>
						</div>
					</div>
				</StorySection>
				<StorySection title="Reviewer group on an approval trail">
					<div className="grid gap-2">
						<AvatarGroup aria-label="Invoice reviewers">
							<Avatar size="sm">
								<AvatarFallback className="text-foreground">AR</AvatarFallback>
							</Avatar>
							<Avatar size="sm">
								<AvatarFallback className="text-foreground">JT</AvatarFallback>
							</Avatar>
							<AvatarGroupCount className="text-foreground">
								+3
							</AvatarGroupCount>
						</AvatarGroup>
						<p className="text-sm text-foreground-secondary">
							Group overflow stays deterministic. Approval state stays on
							StatusBadge outside the stack.
						</p>
					</div>
				</StorySection>
			</div>
		</WorkbenchSection>
	),
};

export const Usage: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Use initials fallback when no image is available. Keep fallback text readable. Pair visible names so identity does not depend on the glyph alone.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-xl gap-4">
			<div className="flex items-center gap-3">
				<Avatar>
					<AvatarFallback className="text-foreground">AR</AvatarFallback>
				</Avatar>
				<div className="grid gap-0.5">
					<p className="text-sm font-medium text-foreground">Aisha Rahman</p>
					<p className="text-sm text-foreground-secondary">
						Finance controller
					</p>
				</div>
			</div>
			<div className="flex items-center gap-3">
				<Avatar>
					<AvatarFallback className="text-foreground">NT</AvatarFallback>
				</Avatar>
				<div className="grid gap-0.5">
					<p className="text-sm font-medium text-foreground">
						Northwind Trading
					</p>
					<p className="text-sm text-foreground-secondary">Supplier entity</p>
				</div>
			</div>
		</div>
	),
};

export const StatesAndAccessibility: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Failed or missing images fall back to readable initials. Decorative AvatarBadge is hidden from assistive technology. Visible names accompany every avatar.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-xl gap-4">
			<div className="flex items-center gap-3">
				<Avatar>
					<AvatarImage
						src="/storybook/missing-operator-photo.png"
						alt="Aisha Rahman"
					/>
					<AvatarFallback className="text-foreground">AR</AvatarFallback>
				</Avatar>
				<p className="text-sm text-foreground">
					Aisha Rahman · image fails, initials remain
				</p>
			</div>
			<div className="flex items-center gap-3">
				<Avatar>
					<AvatarFallback className="text-foreground">NL</AvatarFallback>
					<AvatarBadge aria-hidden="true" />
				</Avatar>
				<p className="text-sm text-foreground">
					Nora Lim · decorative badge does not encode lifecycle
				</p>
			</div>
		</div>
	),
};

export const VariantsAndSizes: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Implemented size inventory: sm for dense rows and groups, default for ordinary directories, lg for profile emphasis.",
			},
		},
	},
	render: () => (
		<div className="flex flex-wrap items-end gap-6">
			<div className="grid justify-items-center gap-2">
				<Avatar size="sm">
					<AvatarFallback className="text-foreground">AR</AvatarFallback>
				</Avatar>
				<p className="text-xs text-foreground-tertiary">sm</p>
			</div>
			<div className="grid justify-items-center gap-2">
				<Avatar size="default">
					<AvatarFallback className="text-foreground">AR</AvatarFallback>
				</Avatar>
				<p className="text-xs text-foreground-tertiary">default</p>
			</div>
			<div className="grid justify-items-center gap-2">
				<Avatar size="lg">
					<AvatarFallback className="text-foreground">AR</AvatarFallback>
				</Avatar>
				<p className="text-xs text-foreground-tertiary">lg</p>
			</div>
		</div>
	),
};

export const Composition: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"lg Avatar anchors a supplier contact Card. AvatarGroup stacks reviewers on an invoice trail. StatusBadge remains outside the group for lifecycle.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6 lg:grid-cols-2">
			<Card className="shadow-none">
				<CardHeader>
					<CardTitle>Supplier finance contact</CardTitle>
					<CardDescription>
						Northwind Trading · remittance notices
					</CardDescription>
				</CardHeader>
				<CardContent className="flex items-center gap-4">
					<Avatar size="lg">
						<AvatarFallback className="text-foreground">AR</AvatarFallback>
					</Avatar>
					<div className="grid gap-1">
						<p className="text-sm font-medium text-foreground">Aisha Rahman</p>
						<p className="text-sm text-foreground-secondary">
							finance@northwind.example
						</p>
						<Badge variant="secondary" className="w-fit">
							Finance
						</Badge>
					</div>
				</CardContent>
			</Card>

			<Card className="shadow-none">
				<CardHeader>
					<CardTitle>INV-1048 approval trail</CardTitle>
					<CardDescription>
						MYR 18,420.00 · awaiting finance review
					</CardDescription>
				</CardHeader>
				<CardContent className="flex items-center justify-between gap-4">
					<div className="grid gap-2">
						<p className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
							Reviewers
						</p>
						<AvatarGroup aria-label="Invoice reviewers">
							<Avatar size="sm">
								<AvatarFallback className="text-foreground">AR</AvatarFallback>
							</Avatar>
							<Avatar size="sm">
								<AvatarFallback className="text-foreground">JT</AvatarFallback>
							</Avatar>
							<Avatar size="sm">
								<AvatarFallback className="text-foreground">NL</AvatarFallback>
							</Avatar>
							<AvatarGroupCount className="text-foreground">
								+2
							</AvatarGroupCount>
						</AvatarGroup>
					</div>
					<StatusBadge status="pending" label="Awaiting approval" />
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
					"Do pair Avatar with a visible name and use StatusBadge for lifecycle. Do not encode approval through AvatarBadge or omit names in dense stacks.",
			},
		},
	},
	render: () => (
		<div className="grid max-w-5xl gap-6 sm:grid-cols-2">
			<StorySection title="Do: pair avatar with a visible name">
				<div className="flex items-center gap-3">
					<Avatar>
						<AvatarFallback className="text-foreground">AR</AvatarFallback>
					</Avatar>
					<p className="text-sm font-medium text-foreground">Aisha Rahman</p>
				</div>
			</StorySection>

			<StorySection title="Do not: rely on initials alone in a dense row">
				<div className="grid gap-2">
					<div className="flex gap-2">
						<Avatar size="sm">
							<AvatarFallback className="text-foreground">AR</AvatarFallback>
						</Avatar>
						<Avatar size="sm">
							<AvatarFallback className="text-foreground">JT</AvatarFallback>
						</Avatar>
						<Avatar size="sm">
							<AvatarFallback className="text-foreground">NL</AvatarFallback>
						</Avatar>
					</div>
					<p className="text-sm text-foreground-secondary">
						Without names or an accessible group label, overlapping initials are
						not operable identity.
					</p>
				</div>
			</StorySection>

			<StorySection title="Do: use StatusBadge for lifecycle">
				<div className="flex items-center gap-3">
					<Avatar>
						<AvatarFallback className="text-foreground">AR</AvatarFallback>
					</Avatar>
					<StatusBadge status="active" label="Active" />
				</div>
			</StorySection>

			<StorySection title="Do not: encode status only with AvatarBadge">
				<div className="grid gap-2">
					<Avatar>
						<AvatarFallback className="text-foreground">AR</AvatarFallback>
						<AvatarBadge aria-hidden="true" />
					</Avatar>
					<p className="text-sm text-foreground-secondary">
						A decorative dot is not authoritative presence or approval state.
					</p>
				</div>
			</StorySection>

			<StorySection title="Do: use Badge for taxonomy">
				<div className="flex items-center gap-3">
					<Avatar>
						<AvatarFallback className="text-foreground">AR</AvatarFallback>
					</Avatar>
					<Badge variant="secondary">Finance</Badge>
				</div>
			</StorySection>

			<StorySection title="Do not: treat Avatar as authentication proof">
				<p className="text-sm text-foreground-secondary">
					Showing initials does not prove the operator is signed in or
					authorized. Session and permission checks stay in feature code.
				</p>
			</StorySection>
		</div>
	),
};
