import {
	AttachmentList,
	Badge,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	FileUpload,
	StatusBadge,
	type UiAttachment,
} from "@afenda/ui-system";
import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";
import { interactionFor } from "./interactions";

const evidence = contractEvidence("ui.file-upload");

const persistedInvoiceAttachment: UiAttachment = {
	id: "invoice-1048",
	name: "invoice-1048.pdf",
	size: 248_320,
	href: "#invoice-1048",
};

const persistedRemittanceAttachment: UiAttachment = {
	id: "remittance-note",
	name: "remittance-note.pdf",
	size: 96_112,
	href: "#remittance-note",
};

function InvoiceSupportingDocumentsUpload() {
	const [attachments, setAttachments] = React.useState<UiAttachment[]>([
		persistedInvoiceAttachment,
	]);

	return (
		<div className="grid gap-4">
			<FileUpload
				label="Supporting documents"
				description="PDF, PNG, or XLSX up to 10 MB · feature policy enforces limits"
				accept=".pdf,.png,.xlsx"
				multiple
				onFilesSelected={(files) =>
					setAttachments((current) => [
						...current,
						...files.map((file, index) => ({
							id: `${file.name}-${index}`,
							name: file.name,
							size: file.size,
						})),
					])
				}
			/>
			{attachments.length > 0 ? (
				<AttachmentList
					attachments={attachments}
					onRemove={(id) =>
						setAttachments((current) =>
							current.filter((attachment) => attachment.id !== id),
						)
					}
					aria-label="Supporting documents"
				/>
			) : (
				<p className="text-sm text-foreground-secondary">
					No attachments yet. Selected files appear here after choose — not as
					persisted storage proof.
				</p>
			)}
		</div>
	);
}

const meta = {
	title: "UI System/File Upload",
	component: FileUpload,
	tags: ["autodocs", "test"],
	args: {
		onFilesSelected: () => undefined,
	},
	parameters: {
		...contractDocsParameters(evidence, "File Upload"),
	},
} satisfies Meta<typeof FileUpload>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
	tags: ["visual"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				story:
					"One invoice workbench: FileUpload selects local files and AttachmentList presents attachment records. Selection, queued upload, scan, persistence, and removal are distinct feature states. Client accept is guidance—not security validation or durable storage.",
			},
		},
	},
	render: () => (
		<div className="min-h-screen bg-canvas text-foreground">
			<div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-6 sm:px-6 lg:px-8">
				<header className="grid gap-2 border-b pb-6">
					<p className="text-sm font-medium text-foreground-secondary">
						Accounts receivable
					</p>
					<h1 className="text-2xl font-semibold tracking-tight">
						INV-1048 supporting documents
					</h1>
					<p className="max-w-5xl text-sm leading-6 text-foreground-secondary">
						FileUpload owns the labelled chooser. Feature Actions own malware
						scanning, transport, retention, and whether remove is authorized.
					</p>
				</header>

				<Card className="shadow-none">
					<CardHeader>
						<div className="flex flex-wrap items-start justify-between gap-4">
							<div className="grid gap-1">
								<CardTitle>Northwind Trading Sdn. Bhd.</CardTitle>
								<CardDescription>
									MYR 18,420.00 · remittance evidence
								</CardDescription>
							</div>
							<div className="flex flex-wrap items-center gap-2">
								<Badge variant="outline">Invoice</Badge>
								<StatusBadge status="pending" label="Awaiting approval" />
							</div>
						</div>
					</CardHeader>
					<CardContent>
						<InvoiceSupportingDocumentsUpload />
					</CardContent>
				</Card>
			</div>
		</div>
	),
	play: interactionFor("file-upload"),
};

export const SemanticUsage: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Approved roles: multi-file supporting evidence, single policy attachment, and persisted AttachmentList with remove. Local selection is not completed storage.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6">
			<StorySection title="Multi-file supporting evidence">
				<FileUpload
					label="Supporting documents"
					description="PDF, PNG, or XLSX up to 10 MB"
					accept=".pdf,.png,.xlsx"
					multiple
					onFilesSelected={() => undefined}
				/>
			</StorySection>
			<StorySection title="Single policy attachment">
				<FileUpload
					label="Signed policy PDF"
					description="One PDF · 5 MB maximum"
					accept=".pdf"
					onFilesSelected={() => undefined}
				/>
			</StorySection>
			<StorySection title="Persisted attachments with remove">
				<AttachmentList
					attachments={[
						persistedInvoiceAttachment,
						persistedRemittanceAttachment,
					]}
					onRemove={() => undefined}
					aria-label="Persisted invoice attachments"
				/>
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
					"Declare accept and size guidance in description before selection. Wire onFilesSelected to feature-owned queue handling.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-md gap-3">
			<FileUpload
				label="Supporting documents"
				description="PDF or PNG up to 10 MB"
				accept=".pdf,.png"
				multiple
				onFilesSelected={() => undefined}
			/>
			<p className="text-sm text-foreground-secondary">
				accept guides the OS chooser only. Server validation still rejects
				disallowed types and sizes.
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
					"Ready chooser, disabled chooser, empty list guidance, and remove actions named per file. Keyboard reaches the file input via the labelled control.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-md gap-6">
			<FileUpload
				label="Supporting documents"
				description="Ready for selection"
				accept=".pdf,.png,.xlsx"
				multiple
				onFilesSelected={() => undefined}
			/>
			<FileUpload
				label="Locked attachments"
				description="Upload closed for this period"
				accept=".pdf"
				disabled
				onFilesSelected={() => undefined}
			/>
			<div className="grid gap-2">
				<p className="text-sm font-medium text-foreground">Attachment list</p>
				<AttachmentList
					attachments={[persistedInvoiceAttachment]}
					onRemove={() => undefined}
					aria-label="Invoice attachments"
				/>
			</div>
		</div>
	),
};

export const LifecycleStates: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Feature UI must distinguish local selection, queued upload, scanning, persisted attachment, rejected file, and removal failure. FileUpload only captures selection; it does not imply any later state succeeded.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6">
			<StorySection title="Ready for local selection">
				<FileUpload
					label="Supporting documents"
					description="PDF or PNG up to 10 MB"
					accept=".pdf,.png"
					multiple
					onFilesSelected={() => undefined}
				/>
			</StorySection>
			<StorySection title="Persisted attachments">
				<div className="grid gap-2">
					<p className="text-sm text-foreground-secondary">
						These records have durable identifiers and download references.
					</p>
					<AttachmentList
						attachments={[
							persistedInvoiceAttachment,
							persistedRemittanceAttachment,
						]}
						onRemove={() => undefined}
						aria-label="Persisted supporting documents"
					/>
				</div>
			</StorySection>
			<StorySection title="Rejected selection">
				<div
					className="rounded-md border border-destructive-border bg-destructive-subtle p-4 text-sm text-destructive-subtle-foreground"
					role="alert"
				>
					<strong>bank-details.exe</strong> was rejected. Choose PDF, PNG, or
					XLSX evidence up to 10 MB.
				</div>
			</StorySection>
			<StorySection title="Upload processing">
				<p
					className="rounded-md border p-4 text-sm text-foreground-secondary"
					aria-live="polite"
				>
					invoice-1048.pdf is uploading and awaiting security scanning. Do not
					present it as persisted evidence until the feature Action confirms
					success.
				</p>
			</StorySection>
		</div>
	),
};

export const VariantsAndSizes: Story = {
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"FileUpload has no visual variant or size scale. Composition options are single versus multiple selection and AttachmentList with or without remove.",
			},
		},
	},
	render: () => (
		<div className="grid w-full max-w-5xl gap-6 sm:grid-cols-2">
			<div className="grid gap-2">
				<p className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
					single
				</p>
				<FileUpload
					label="Signed policy"
					accept=".pdf"
					onFilesSelected={() => undefined}
				/>
			</div>
			<div className="grid gap-2">
				<p className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
					multiple
				</p>
				<FileUpload
					label="Supporting documents"
					accept=".pdf,.png,.xlsx"
					multiple
					onFilesSelected={() => undefined}
				/>
			</div>
			<div className="grid gap-2 sm:col-span-2">
				<p className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
					AttachmentList read-only
				</p>
				<AttachmentList
					attachments={[persistedInvoiceAttachment]}
					aria-label="Read-only attachments"
				/>
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
					"Compose FileUpload and AttachmentList inside an invoice Card. StatusBadge owns lifecycle; Badge owns taxonomy.",
			},
		},
	},
	render: () => (
		<Card className="w-full max-w-md shadow-none">
			<CardHeader>
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div className="grid gap-1">
						<CardTitle>INV-1048 evidence</CardTitle>
						<CardDescription>
							Northwind Trading · remittance pack
						</CardDescription>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="secondary">Finance</Badge>
						<StatusBadge status="pending" label="Awaiting approval" />
					</div>
				</div>
			</CardHeader>
			<CardContent className="grid gap-4">
				<FileUpload
					label="Add evidence"
					description="PDF or PNG up to 10 MB"
					accept=".pdf,.png"
					multiple
					onFilesSelected={() => undefined}
				/>
				<AttachmentList
					attachments={[
						persistedInvoiceAttachment,
						persistedRemittanceAttachment,
					]}
					onRemove={() => undefined}
					aria-label="Invoice evidence"
				/>
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
					"Do declare accept guidance and keep persisted lists distinct from new selection. Do not treat accept as security or local selection as durable storage.",
			},
		},
	},
	render: () => (
		<div className="grid max-w-5xl gap-6 sm:grid-cols-2">
			<StorySection title="Do: declare type and size guidance">
				<FileUpload
					label="Supporting documents"
					description="PDF, PNG, or XLSX up to 10 MB"
					accept=".pdf,.png,.xlsx"
					multiple
					onFilesSelected={() => undefined}
				/>
			</StorySection>

			<StorySection title="Do not: rely on accept as security">
				<p className="text-sm text-foreground-secondary">
					accept only shapes the OS dialog. Feature policy and server checks
					remain authoritative for type, size, and malware scanning.
				</p>
			</StorySection>

			<StorySection title="Do: name remove actions per file">
				<AttachmentList
					attachments={[persistedInvoiceAttachment]}
					onRemove={() => undefined}
					aria-label="Named remove actions"
				/>
			</StorySection>

			<StorySection title="Do not: present local selection as persisted">
				<p className="text-sm text-foreground-secondary">
					A newly chosen File in memory is not a durable attachment until the
					upload Action succeeds. Keep queued and persisted states distinct in
					feature UI.
				</p>
			</StorySection>

			<StorySection title="Do: authorize remove in feature code">
				<p className="text-sm text-foreground-secondary">
					AttachmentList onRemove is presentation only. Delete outcomes and
					permission checks stay in the owning Action.
				</p>
			</StorySection>

			<StorySection title="Do not: omit a label on the chooser">
				<p className="text-sm text-foreground-secondary">
					FileUpload ships a Label. Product forms must keep a meaningful label
					so operators know which evidence bucket they are filling.
				</p>
			</StorySection>
		</div>
	),
};
