import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	ScrollArea,
	ScrollBar,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";

const evidence = contractEvidence("ui.scroll-area");

const meta = {
	title: "UI System/Scroll Area",
	component: ScrollArea,
	tags: ["autodocs", "test"],
	parameters: {
		...contractDocsParameters(evidence, "Scroll Area"),
	},
} satisfies Meta<typeof ScrollArea>;

export default meta;
type Story = StoryObj<typeof meta>;

const auditEvents = Array.from({ length: 18 }, (_, index) => {
	const n = String(index + 1).padStart(2, "0");
	return {
		id: `evt-${n}`,
		summary: `Audit event ${n} — invoice posting validation`,
		actor: index % 3 === 0 ? "Aisha Rahman" : "System job",
		at: `28 Jul 2026 · 14:${String(10 + index).padStart(2, "0")}`,
	};
});

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"One invoice evidence Card: ScrollArea bounds the audit trail viewport. Off-screen rows remain part of the record — scrolling does not delete them.",
			},
		},
	},
	render: () => (
		<div className="min-h-screen bg-canvas text-foreground">
			<div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
				<header className="grid gap-2 border-b pb-6">
					<p className="text-sm font-medium text-foreground-secondary">
						Accounts payable · INV-1048
					</p>
					<h1 className="text-2xl font-semibold tracking-tight">
						Posting evidence
					</h1>
					<p className="max-w-5xl text-sm leading-6 text-foreground-secondary">
						ScrollArea fits a bounded panel. Large authoritative collections
						still need Pagination or server paging.
					</p>
				</header>

				<Card className="shadow-none">
					<CardHeader>
						<CardTitle>Audit trail</CardTitle>
						<CardDescription>
							Recent validation and posting events for this invoice
						</CardDescription>
					</CardHeader>
					<CardContent>
						<ScrollArea
							aria-label="Invoice audit trail"
							className="h-72 rounded-md border"
						>
							<ul className="grid gap-0 p-1">
								{auditEvents.map((event) => (
									<li
										key={event.id}
										className="grid gap-1 border-b px-3 py-3 last:border-b-0"
									>
										<p className="text-sm font-medium text-foreground">
											{event.summary}
										</p>
										<p className="text-xs text-foreground-secondary">
											{event.actor} · {event.at}
										</p>
									</li>
								))}
							</ul>
						</ScrollArea>
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
					"Vertical for tall lists. Add horizontal ScrollBar when wide content exceeds the viewport. Avoid nested same-direction scrollers.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6">
			<StorySection title="Vertical · dense notes">
				<ScrollArea
					aria-label="Approval notes"
					className="h-40 rounded-md border"
				>
					<div className="grid gap-3 p-4 text-sm">
						{Array.from({ length: 8 }, (_, i) => (
							<p key={i} className="text-foreground-secondary">
								Note {i + 1}: Remittance reference reviewed against bank letter.
							</p>
						))}
					</div>
				</ScrollArea>
			</StorySection>
			<StorySection title="Horizontal · wide ledger strip">
				<ScrollArea
					aria-label="Period balance strip"
					className="h-24 w-full rounded-md border"
				>
					<div className="flex w-[48rem] gap-4 p-4 text-sm">
						{["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"].map(
							(month) => (
								<div
									key={month}
									className="min-w-24 rounded-md border px-3 py-2 text-center"
								>
									<p className="font-medium">{month}</p>
									<p className="text-foreground-secondary">MYR</p>
								</div>
							),
						)}
					</div>
					<ScrollBar orientation="horizontal" />
				</ScrollArea>
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
					"Set an explicit height on the ScrollArea root so the viewport is bounded by layout, not by page overflow accidents.",
			},
		},
	},
	render: () => (
		<ScrollArea className="h-48 w-80 rounded-md border" aria-label="Line items">
			<div className="grid gap-2 p-4 text-sm">
				{Array.from({ length: 12 }, (_, i) => (
					<p key={i}>Line {i + 1} · packaging materials</p>
				))}
			</div>
		</ScrollArea>
	),
};

export const StatesAndAccessibility: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Viewport is keyboard-focusable. Label the region when it scrolls independently of the page. Do not trap focus inside.",
			},
		},
	},
	render: () => (
		<ScrollArea
			aria-label="Supplier activity"
			className="h-52 w-full max-w-md rounded-md border"
		>
			<div className="grid gap-3 p-4">
				<button
					type="button"
					className="rounded-md border px-3 py-2 text-left text-sm"
				>
					Open remittance advice
				</button>
				{Array.from({ length: 10 }, (_, i) => (
					<p key={i} className="text-sm text-foreground-secondary">
						Activity {i + 1} · payment application update
					</p>
				))}
				<button
					type="button"
					className="rounded-md border px-3 py-2 text-left text-sm"
				>
					Download statement
				</button>
			</div>
		</ScrollArea>
	),
};

export const Composition: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Compose ScrollArea inside Card content for panel-local overflow. Keep primary page actions outside the scroll viewport.",
			},
		},
	},
	render: () => (
		<Card className="w-full max-w-md shadow-none">
			<CardHeader>
				<CardTitle>Matching candidates</CardTitle>
				<CardDescription>
					Possible invoices for remittance REF-4412
				</CardDescription>
			</CardHeader>
			<CardContent>
				<ScrollArea
					aria-label="Matching invoice candidates"
					className="h-56 rounded-md border"
				>
					<ul className="grid gap-0">
						{[
							"INV-1048 · MYR 18,420.00",
							"INV-1042 · MYR 6,110.50",
							"INV-1039 · MYR 2,480.00",
							"INV-1031 · MYR 9,120.00",
							"INV-1028 · MYR 1,050.00",
							"INV-1022 · MYR 4,600.00",
						].map((row) => (
							<li
								key={row}
								className="border-b px-3 py-3 text-sm last:border-b-0"
							>
								{row}
							</li>
						))}
					</ul>
				</ScrollArea>
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
					"Do bound a real panel viewport. Do not use ScrollArea to hide page overflow defects or replace server Pagination.",
			},
		},
	},
	render: () => (
		<div className="grid gap-6 sm:grid-cols-2">
			<StorySection title="Do: bounded panel list">
				<ScrollArea
					aria-label="Recent journals"
					className="h-36 rounded-md border"
				>
					<div className="grid gap-2 p-3 text-sm">
						<p>JB-2201 · July batch</p>
						<p>JB-2198 · Accruals</p>
						<p>JB-2194 · FX revaluation</p>
						<p>JB-2188 · Period adjustments</p>
						<p>JB-2181 · Opening balances</p>
					</div>
				</ScrollArea>
			</StorySection>
			<StorySection title="Do not: endless dump for server collections">
				<p className="text-sm text-foreground-secondary">
					Thousands of invoice rows need Pagination and server paging.
					ScrollArea is for bounded chrome — not a substitute for collection
					navigation.
				</p>
			</StorySection>
		</div>
	),
};
