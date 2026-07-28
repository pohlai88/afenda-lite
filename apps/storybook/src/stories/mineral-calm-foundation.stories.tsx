import {
	Badge,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	Input,
	NativeSelect,
	NativeSelectOption,
	PageHeader,
	PageHeaderActions,
	PageHeaderDescription,
	PageHeaderHeading,
	StatusBadge,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";

function SurfaceHierarchyEvidence() {
	return (
		<main
			data-visual-test="true"
			className="mx-auto grid w-full max-w-6xl gap-6 bg-canvas p-6"
			aria-labelledby="surface-hierarchy-title"
		>
			<header className="grid gap-2">
				<Badge variant="outline" className="w-fit">
					Mineral Calm foundation
				</Badge>
				<h1
					id="surface-hierarchy-title"
					className="text-2xl font-semibold tracking-tight"
				>
					Surface hierarchy
				</h1>
				<p className="max-w-3xl text-sm text-foreground-secondary">
					Canvas frames the application; workspace, sunken, card, raised, and
					popover roles create restrained depth without gradients or glow.
				</p>
			</header>

			<section className="grid gap-4 bg-background p-6" aria-label="Workspace">
				<div className="grid gap-4 lg:grid-cols-3">
					<div className="rounded-md border bg-surface-sunken p-4">
						<p className="text-sm font-medium">Sunken</p>
						<p className="text-sm text-muted-foreground">
							Inset filters and supporting context.
						</p>
					</div>
					<Card>
						<CardHeader>
							<CardTitle>Card</CardTitle>
							<CardDescription>
								Primary grouped operational content.
							</CardDescription>
						</CardHeader>
					</Card>
					<div className="rounded-xl border bg-surface-raised p-4 shadow-(--shadow-raised)">
						<p className="text-sm font-medium">Raised</p>
						<p className="text-sm text-foreground-secondary">
							Persistent floating or inset chrome.
						</p>
					</div>
				</div>

				<div className="grid gap-4 sm:grid-cols-3">
					<div className="rounded-lg border bg-popover p-4 text-popover-foreground shadow-(--shadow-overlay)">
						<p className="text-sm font-medium">Overlay</p>
						<p className="text-sm text-muted-foreground">
							Transient selection and guidance.
						</p>
					</div>
					<div className="rounded-xl border bg-popover p-4 text-popover-foreground shadow-(--shadow-dialog)">
						<p className="text-sm font-medium">Dialog</p>
						<p className="text-sm text-muted-foreground">
							Focused decisions above the workspace.
						</p>
					</div>
					<div className="grid content-center gap-2 rounded-md border bg-control-fill p-4">
						<p className="text-sm font-medium">Control fill</p>
						<p className="text-sm text-muted-foreground">
							Border and tone provide affordance without elevation.
						</p>
					</div>
				</div>
			</section>
		</main>
	);
}

const journalRows = [
	{
		id: "JV-2026-1042",
		entity: "Afenda Holdings",
		period: "2026-07",
		amount: "MYR 84,250.00",
		status: "Approved",
	},
	{
		id: "JV-2026-1043",
		entity: "Afenda Operations",
		period: "2026-07",
		amount: "MYR 62,000.00",
		status: "Pending",
	},
	{
		id: "JV-2026-1044",
		entity: "Afenda Services",
		period: "2026-07",
		amount: "MYR 38,000.00",
		status: "Review",
	},
] as const;

function OperationalWorkspaceEvidence() {
	return (
		<main
			data-visual-test="true"
			className="mx-auto grid w-full max-w-6xl gap-6"
			aria-label="Accounting operational workspace"
		>
			<PageHeader>
				<div className="grid gap-2">
					<PageHeaderHeading>Journal operations</PageHeaderHeading>
					<PageHeaderDescription>
						Review balanced journals before the July posting run.
					</PageHeaderDescription>
				</div>
				<PageHeaderActions>
					<Button variant="outline">Export register</Button>
					<Button>Create journal</Button>
				</PageHeaderActions>
			</PageHeader>

			<section
				className="grid gap-4 sm:grid-cols-3"
				aria-label="Journal metrics"
			>
				<Card>
					<CardHeader>
						<CardDescription>Balanced value</CardDescription>
						<CardTitle>MYR 184,250</CardTitle>
					</CardHeader>
					<CardContent className="text-sm text-foreground-secondary">
						Across 18 journal lines
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardDescription>Ready to post</CardDescription>
						<CardTitle>12 journals</CardTitle>
					</CardHeader>
					<CardContent>
						<StatusBadge status="success">Controls passed</StatusBadge>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardDescription>Awaiting review</CardDescription>
						<CardTitle>3 journals</CardTitle>
					</CardHeader>
					<CardContent>
						<StatusBadge status="warning">Attention required</StatusBadge>
					</CardContent>
				</Card>
			</section>

			<Card>
				<CardHeader>
					<CardTitle>Posting register</CardTitle>
					<CardDescription>
						Opaque controls and semantic status preserve hierarchy at ERP
						density.
					</CardDescription>
				</CardHeader>
				<CardContent className="grid gap-4">
					<div className="grid gap-3 bg-surface-sunken p-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
						<Input aria-label="Search journals" placeholder="Search journals" />
						<NativeSelect aria-label="Posting status" defaultValue="all">
							<NativeSelectOption value="all">All statuses</NativeSelectOption>
							<NativeSelectOption value="approved">Approved</NativeSelectOption>
							<NativeSelectOption value="pending">Pending</NativeSelectOption>
						</NativeSelect>
					</div>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Journal</TableHead>
								<TableHead>Entity</TableHead>
								<TableHead>Period</TableHead>
								<TableHead className="text-right">Amount</TableHead>
								<TableHead>Status</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{journalRows.map((journal, index) => (
								<TableRow
									key={journal.id}
									className={index % 2 === 1 ? "bg-table-stripe" : undefined}
								>
									<TableCell className="font-mono text-foreground-tertiary">
										{journal.id}
									</TableCell>
									<TableCell>{journal.entity}</TableCell>
									<TableCell>{journal.period}</TableCell>
									<TableCell className="text-right font-medium">
										{journal.amount}
									</TableCell>
									<TableCell>
										<StatusBadge
											status={
												journal.status === "Approved"
													? "success"
													: journal.status === "Pending"
														? "pending"
														: "warning"
											}
										>
											{journal.status}
										</StatusBadge>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</main>
	);
}

const meta = {
	title: "UI System/Foundation/Mineral Calm",
	component: SurfaceHierarchyEvidence,
	tags: ["autodocs", "test"],
	parameters: {
		docs: {
			description: {
				component:
					"Representative visual evidence for Mineral Calm surface depth and operational composition. Tokens and primitive contracts remain authoritative.",
			},
		},
	},
} satisfies Meta<typeof SurfaceHierarchyEvidence>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SurfaceHierarchy: Story = {
	tags: ["visual"],
};

export const OperationalWorkspace: Story = {
	tags: ["visual"],
	render: () => <OperationalWorkspaceEvidence />,
};
