import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	Skeleton,
	Spinner,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";

const evidence = contractEvidence("ui.skeleton");

const meta = {
	title: "UI System/Skeleton",
	component: Skeleton,
	tags: ["autodocs", "test"],
	parameters: {
		...contractDocsParameters(evidence, "Skeleton"),
	},
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"Receivables queue loading evidence: Skeleton preserves the expected table geometry while the owning region communicates one busy state. It never represents an empty, failed, or authorized outcome.",
			},
		},
	},
	render: () => (
		<div className="min-h-screen bg-canvas text-foreground">
			<div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
				<header className="grid gap-2 border-b pb-6">
					<p className="font-medium text-foreground-secondary text-sm">
						Accounts receivable
					</p>
					<h1 className="font-semibold text-2xl tracking-tight">
						Collection queue
					</h1>
					<p className="max-w-5xl text-foreground-secondary text-sm leading-6">
						Skeleton reduces layout shift. Feature code replaces it with rows,
						Empty, or error — never leave it after failure.
					</p>
				</header>

				<Card
					aria-busy="true"
					aria-describedby="skeleton-queue-status"
					className="shadow-none"
				>
					<p className="sr-only" id="skeleton-queue-status" role="status">
						Loading overdue invoices.
					</p>
					<CardHeader className="gap-1 pb-3">
						<CardTitle id="skeleton-queue-title">Receivables queue</CardTitle>
						<CardDescription>
							Loading overdue invoices for collection follow-up.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Table aria-labelledby="skeleton-queue-title">
							<TableHeader>
								<TableRow>
									<TableHead>Invoice</TableHead>
									<TableHead>Customer</TableHead>
									<TableHead className="text-right">Amount</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{["row-a", "row-b", "row-c"].map((row) => (
									<TableRow key={row}>
										<TableCell>
											<Skeleton aria-hidden="true" className="h-4 w-24" />
										</TableCell>
										<TableCell>
											<Skeleton aria-hidden="true" className="h-4 w-40" />
										</TableCell>
										<TableCell className="text-right">
											<Skeleton
												aria-hidden="true"
												className="ml-auto h-4 w-20"
											/>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
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
					"Match broad content shape — table rows, identity blocks, metric strips — without fabricating realistic values.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6">
			<StorySection title="Table rows">
				<div className="grid gap-3 rounded-lg border p-4">
					{["a", "b", "c"].map((id) => (
						<div className="flex items-center justify-between gap-4" key={id}>
							<Skeleton aria-hidden="true" className="h-4 w-32" />
							<Skeleton aria-hidden="true" className="h-4 w-20" />
						</div>
					))}
				</div>
			</StorySection>
			<StorySection title="Identity block">
				<div className="flex items-center gap-4 rounded-lg border p-4">
					<Skeleton aria-hidden="true" className="size-12 rounded-full" />
					<div className="grid flex-1 gap-2">
						<Skeleton aria-hidden="true" className="h-4 w-1/3" />
						<Skeleton aria-hidden="true" className="h-4 w-2/3" />
					</div>
				</div>
			</StorySection>
		</div>
	),
};

export const Usage: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Hide decorative bars with aria-hidden. Announce loading on the owning region with aria-busy when needed.",
			},
		},
	},
	render: () => (
		<div
			aria-busy="true"
			aria-label="Supplier summary loading"
			className="grid w-80 gap-2 rounded-lg border p-4"
			role="status"
		>
			<Skeleton aria-hidden="true" className="h-4 w-40" />
			<Skeleton aria-hidden="true" className="h-4 w-full" />
			<Skeleton aria-hidden="true" className="h-4 w-2/3" />
		</div>
	),
};

export const StatesAndAccessibility: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Announce loading once on the owning region, keep individual placeholders decorative, and preserve a predictable focus model. Use Spinner for an action or compact control that is actively processing.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-xl gap-6">
			<section
				aria-busy="true"
				aria-label="Invoice detail loading"
				className="grid gap-3 rounded-lg border p-4"
			>
				<Skeleton aria-hidden="true" className="h-5 w-48" />
				<Skeleton aria-hidden="true" className="h-4 w-full" />
				<Skeleton aria-hidden="true" className="h-4 w-3/4" />
			</section>
			<div className="flex items-center gap-3 rounded-lg border px-4 py-3">
				<Spinner label="Saving remittance" />
				<p className="text-foreground-secondary text-sm">
					Busy controls use Spinner — not Skeleton chrome.
				</p>
			</div>
		</div>
	),
};

function SeparatorLikeSkeletons() {
	return (
		<div className="grid gap-3">
			<Skeleton aria-hidden="true" className="h-px w-full" />
			<div className="grid gap-2 sm:grid-cols-2">
				<Skeleton aria-hidden="true" className="h-4 w-full" />
				<Skeleton aria-hidden="true" className="h-4 w-full" />
			</div>
		</div>
	);
}

export const Composition: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Compose Skeleton inside the same Card/Table structure the loaded content will occupy.",
			},
		},
	},
	render: () => (
		<Card aria-busy="true" className="w-full max-w-xl shadow-none">
			<CardHeader>
				<CardTitle>Supplier master</CardTitle>
				<CardDescription>Loading preferred supplier roster</CardDescription>
			</CardHeader>
			<CardContent className="grid gap-4">
				<div className="flex items-center gap-4">
					<Skeleton aria-hidden="true" className="size-10 rounded-full" />
					<div className="grid flex-1 gap-2">
						<Skeleton aria-hidden="true" className="h-4 w-48" />
						<Skeleton aria-hidden="true" className="h-4 w-32" />
					</div>
				</div>
				<SeparatorLikeSkeletons />
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
					"Do preserve layout shape. Do not leave Skeleton after failure or use it as decorative page chrome.",
			},
		},
	},
	render: () => (
		<div className="grid gap-6 sm:grid-cols-2">
			<StorySection title="Do: shape-matched placeholders">
				<div aria-busy="true" className="grid gap-2 rounded-lg border p-4">
					<Skeleton aria-hidden="true" className="h-4 w-28" />
					<Skeleton aria-hidden="true" className="h-4 w-full" />
					<Skeleton aria-hidden="true" className="h-4 w-2/3" />
				</div>
			</StorySection>
			<StorySection title="Do not: forever after failure">
				<p className="text-foreground-secondary text-sm">
					When loading ends in error, replace Skeleton with an explicit failure
					notice. Do not imply success with pulsing chrome.
				</p>
			</StorySection>
		</div>
	),
};

export const AdaptiveAndHighContrast: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Skeleton follows the loaded component across narrow and wide layouts. Shape remains visible in high-contrast presentation without relying on animation alone.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-4xl gap-6 lg:grid-cols-2">
			<StorySection title="Narrow record summary">
				<section
					aria-busy="true"
					aria-label="Invoice summary loading"
					className="grid gap-3 rounded-lg border p-4"
				>
					<Skeleton aria-hidden="true" className="h-5 w-36 max-w-full" />
					<Skeleton aria-hidden="true" className="h-4 w-full" />
					<Skeleton aria-hidden="true" className="h-4 w-2/3" />
				</section>
			</StorySection>
			<StorySection title="Wide metric row">
				<section
					aria-busy="true"
					aria-label="Receivables metrics loading"
					className="grid gap-4 rounded-lg border p-4 sm:grid-cols-3"
				>
					{["invoiced", "paid", "open"].map((metric) => (
						<div className="grid gap-2" key={metric}>
							<Skeleton aria-hidden="true" className="h-3 w-16" />
							<Skeleton aria-hidden="true" className="h-7 w-28 max-w-full" />
						</div>
					))}
				</section>
			</StorySection>
		</div>
	),
};
