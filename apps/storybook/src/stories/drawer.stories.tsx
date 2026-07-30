import {
	Badge,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
	StatusBadge,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";
import { interactionFor } from "./interactions";

const evidence = contractEvidence("ui.drawer");

const DRAWER_MATURITY_DOCTRINE =
	"Drawer benchmarks enterprise operating maturity rather than another product’s appearance. It must remain a transient, touch-friendly review surface with a persistent title, explicit close path, complete keyboard operation, and clear separation from retained Sheet work, compact Dialog decisions, application navigation, authorization, and posting authority.";

const meta = {
	title: "UI System/Drawer",
	component: Drawer,
	tags: ["autodocs", "test"],
	parameters: {
		...contractDocsParameters(evidence, "Drawer"),
		docs: {
			description: {
				component: DRAWER_MATURITY_DOCTRINE,
			},
		},
	},
} satisfies Meta<typeof Drawer>;

export default meta;
type Story = StoryObj<typeof meta>;

function PostingBatchDrawer() {
	return (
		<Drawer>
			<DrawerTrigger asChild>
				<Button type="button">Review posting batch</Button>
			</DrawerTrigger>
			<DrawerContent>
				<div className="mx-auto w-full max-w-lg">
					<DrawerHeader>
						<DrawerTitle>Review posting batch</DrawerTitle>
						<DrawerDescription>
							Batch PB-2026-0728 contains 18 balanced journals and is ready for
							final review.
						</DrawerDescription>
					</DrawerHeader>
					<div className="grid gap-2 px-4 text-foreground-secondary text-sm">
						<p>Debit total: MYR 184,250.00</p>
						<p>Credit total: MYR 184,250.00</p>
						<p>Organization time zone: MYT</p>
					</div>
					<DrawerFooter>
						<Button type="button">Continue review</Button>
						<DrawerClose asChild>
							<Button type="button" variant="outline">
								Cancel
							</Button>
						</DrawerClose>
					</DrawerFooter>
				</div>
			</DrawerContent>
		</Drawer>
	);
}

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"One period-close workbench demonstrates Drawer as a transient edge review: compact posting-batch context, an explicit Continue and Cancel path, and a quiet acknowledgement. Retained inspector work remains on Sheet, compact decisions remain in Dialog, and gesture support never grants posting authority.",
			},
		},
	},
	play: interactionFor("drawer"),
	render: () => (
		<div className="min-h-screen bg-canvas text-foreground">
			<main className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
				<header className="grid gap-5 border-b pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
					<div className="grid gap-2">
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant="outline">Accounts receivable</Badge>
							<StatusBadge
								label="Close in progress"
								size="sm"
								status="pending"
							/>
						</div>
						<div className="grid gap-1">
							<h1 className="font-semibold text-2xl tracking-tight">
								July posting batch queue
							</h1>
							<p className="max-w-5xl text-foreground-secondary text-sm leading-6">
								Drawer opens a transient edge review for balanced batches.
								Feature code owns authorization and whether Continue posts,
								advances review, or opens a subsequent governed step.
							</p>
							<p className="max-w-5xl text-foreground-tertiary text-xs leading-5">
								Operational standard: title, summary, action hierarchy, focus,
								keyboard dismissal, and explicit close controls must remain
								coherent without relying on drag gestures.
							</p>
						</div>
					</div>
					<dl className="grid grid-cols-2 gap-x-8 gap-y-3 rounded-lg border bg-card p-4">
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								Subject
							</dt>
							<dd className="text-sm">Posting batch queue</dd>
						</div>
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								Area
							</dt>
							<dd className="text-sm">Accounts receivable</dd>
						</div>
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								Scope
							</dt>
							<dd className="text-sm">Transient edge review</dd>
						</div>
						<div className="grid gap-1">
							<dt className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
								State
							</dt>
							<dd className="text-sm">Close in progress</dd>
						</div>
					</dl>
				</header>

				<section aria-labelledby="drawer-batch-title" className="grid gap-3">
					<div className="grid gap-1">
						<h2
							className="font-semibold text-base text-foreground tracking-tight"
							id="drawer-batch-title"
						>
							Batch ready for review
						</h2>
						<p className="text-foreground-secondary text-sm">
							Compact totals and an explicit Cancel path — not gesture-only
							dismissal.
						</p>
					</div>
					<Card className="shadow-none">
						<CardHeader>
							<CardTitle>PB-2026-0728</CardTitle>
							<CardDescription>
								18 balanced journals · debit and credit MYR 184,250.00
							</CardDescription>
							<div className="pt-1">
								<StatusBadge label="Balanced" size="sm" status="active" />
							</div>
						</CardHeader>
						<CardContent>
							<PostingBatchDrawer />
						</CardContent>
					</Card>
				</section>

				<section aria-labelledby="drawer-sheet-title" className="grid gap-3">
					<div className="grid gap-1">
						<h2
							className="font-semibold text-base text-foreground tracking-tight"
							id="drawer-sheet-title"
						>
							Retained inspector work stays on Sheet
						</h2>
						<p className="text-foreground-secondary text-sm">
							Long invoice inspection and side-task editing belong on Sheet —
							Drawer stays transient.
						</p>
					</div>
					<p className="text-foreground-secondary text-sm">
						Open INV-1042 in the record Sheet when operators need persistent
						side context while scrolling the queue.
					</p>
				</section>

				<section aria-labelledby="drawer-ack-title" className="grid gap-3">
					<div className="grid gap-1">
						<h2
							className="font-semibold text-base text-foreground tracking-tight"
							id="drawer-ack-title"
						>
							Quiet acknowledgement
						</h2>
						<p className="text-foreground-secondary text-sm">
							Short notices may use Drawer when touch-friendly dismissal is
							appropriate.
						</p>
					</div>
					<Drawer>
						<DrawerTrigger asChild>
							<Button type="button" variant="outline">
								Close window reminder
							</Button>
						</DrawerTrigger>
						<DrawerContent>
							<div className="mx-auto w-full max-w-lg">
								<DrawerHeader>
									<DrawerTitle>Close window reminder</DrawerTitle>
									<DrawerDescription>
										Month-end close for July 2026 ends at 17:00 MYT.
									</DrawerDescription>
								</DrawerHeader>
								<DrawerFooter>
									<DrawerClose asChild>
										<Button type="button">Acknowledge</Button>
									</DrawerClose>
								</DrawerFooter>
							</div>
						</DrawerContent>
					</Drawer>
				</section>
			</main>
		</div>
	),
};

export const Usage: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Use Drawer for transient, touch-friendly review or acknowledgement. Prefer Sheet for retained side tasks, Dialog for compact decisions, and the application shell for navigation. Always provide an explicit Cancel, Close, or Acknowledge control.",
			},
		},
	},
	render: () => (
		<div className="grid max-w-5xl gap-6">
			<StorySection title="Posting batch review">
				<PostingBatchDrawer />
			</StorySection>

			<StorySection title="Short acknowledgement">
				<Drawer>
					<DrawerTrigger asChild>
						<Button type="button" variant="secondary">
							Period notice
						</Button>
					</DrawerTrigger>
					<DrawerContent>
						<div className="mx-auto w-full max-w-lg">
							<DrawerHeader>
								<DrawerTitle>Close window reminder</DrawerTitle>
								<DrawerDescription>
									Month-end close for July 2026 ends at 17:00 MYT.
								</DrawerDescription>
							</DrawerHeader>
							<DrawerFooter>
								<DrawerClose asChild>
									<Button type="button">Acknowledge</Button>
								</DrawerClose>
							</DrawerFooter>
						</div>
					</DrawerContent>
				</Drawer>
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
					"Title and description label the transient surface. Focus stays contained while open and returns predictably after dismissal. Cancel remains keyboard and pointer operable; drag is never the only exit or the only way to understand that the Drawer can close.",
			},
		},
	},
	render: () => (
		<div className="grid max-w-5xl gap-4">
			<PostingBatchDrawer />
			<p className="text-foreground-secondary text-sm">
				Open the Drawer, Tab through Continue and Cancel, then dismiss with
				Cancel or Escape when the surface allows it.
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
					"Compose Drawer from a persistent Card that names the batch and preserves the originating context. StatusBadge owns balance state; Drawer owns only the transient review edge; feature policy owns what Continue is allowed to do.",
			},
		},
	},
	render: () => (
		<div className="grid max-w-5xl gap-6">
			<Card className="shadow-none">
				<CardHeader>
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="outline">Posting</Badge>
						<StatusBadge label="Balanced" size="sm" status="active" />
					</div>
					<CardTitle>Batch PB-2026-0728</CardTitle>
					<CardDescription>
						18 journals · ready for final review before July close
					</CardDescription>
				</CardHeader>
				<CardContent>
					<PostingBatchDrawer />
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
					"Do keep Drawer transient, bounded, and equipped with an explicit close path. Do not use it as primary navigation, a retained Sheet replacement, a multi-step workspace, or a gesture-only surface.",
			},
		},
	},
	render: () => (
		<div className="grid max-w-5xl gap-6 sm:grid-cols-2">
			<StorySection title="Do: provide explicit Cancel">
				<PostingBatchDrawer />
			</StorySection>

			<StorySection title="Do not: rely on drag alone">
				<div className="rounded-md border border-dashed p-4 text-foreground-tertiary text-sm">
					Keyboard and pointer operators must reach Cancel or Close without
					using a drag gesture.
				</div>
			</StorySection>

			<StorySection title="Do: keep content compact">
				<p className="text-foreground-secondary text-sm">
					Summaries, totals, and one Continue action fit Drawer. Multi-field
					invoice editing belongs on Sheet or a page.
				</p>
			</StorySection>

			<StorySection title="Do not: replace Sheet for side tasks">
				<div className="rounded-md border border-dashed p-4 text-foreground-tertiary text-sm">
					Retained invoice inspectors and long contextual forms use Sheet — not
					Drawer as a mechanical twin.
				</div>
			</StorySection>

			<StorySection title="Do: use Dialog for compact decisions">
				<p className="text-foreground-secondary text-sm">
					Approve-or-keep-draft choices that interrupt the page belong in
					Dialog, not an edge Drawer.
				</p>
			</StorySection>

			<StorySection title="Do not: use Drawer as app navigation">
				<div className="rounded-md border border-dashed p-4 text-foreground-tertiary text-sm">
					Module menus and primary navigation stay in the application shell —
					never inside a posting Drawer.
				</div>
			</StorySection>

			<StorySection title="Do: preserve the originating context">
				<p className="text-foreground-secondary text-sm">
					The trigger and Drawer title should name the same posting batch,
					notice, or review subject.
				</p>
			</StorySection>

			<StorySection title="Do not: turn Drawer into a hidden workflow">
				<div className="rounded-md border border-dashed p-4 text-foreground-tertiary text-sm">
					A sequence of approvals, attachments, policy edits, and posting steps
					belongs on a page workflow rather than stacked transient Drawers.
				</div>
			</StorySection>
		</div>
	),
};
