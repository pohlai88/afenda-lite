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
import { useCallback, useState } from "react";
import { contractDocsParameters } from "./contract-docs";
import { contractEvidence, StorySection } from "./evidence";
import { interactionFor } from "./interactions";

const evidence = contractEvidence("ui.file-upload");
const ignoreFileUploadAction = () => undefined;

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
	const [attachments, setAttachments] = useState<UiAttachment[]>([
		persistedInvoiceAttachment,
	]);
	const handleFilesSelected = useCallback((files: readonly File[]) => {
		setAttachments((current) => [
			...current,
			...files.map((file, index) => ({
				id: `${file.name}-${index}`,
				name: file.name,
				size: file.size,
			})),
		]);
	}, []);
	const handleRemove = useCallback((id: string) => {
		setAttachments((current) =>
			current.filter((attachment) => attachment.id !== id),
		);
	}, []);

	return (
		<div className="grid gap-4">
			<FileUpload
				accept=".pdf,.png,.xlsx"
				description="PDF, PNG, or XLSX up to 10 MB · feature policy enforces limits"
				label="Supporting documents"
				multiple
				onFilesSelected={handleFilesSelected}
			/>
			{attachments.length > 0 ? (
				<AttachmentList
					aria-label="Supporting documents"
					attachments={attachments}
					onRemove={handleRemove}
				/>
			) : (
				<p className="text-foreground-secondary text-sm">
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
					<p className="font-medium text-foreground-secondary text-sm">
						Accounts receivable
					</p>
					<h1 className="font-semibold text-2xl tracking-tight">
						INV-1048 supporting documents
					</h1>
					<p className="max-w-5xl text-foreground-secondary text-sm leading-6">
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
								<StatusBadge label="Awaiting approval" status="pending" />
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
					accept=".pdf,.png,.xlsx"
					description="PDF, PNG, or XLSX up to 10 MB"
					label="Supporting documents"
					multiple
					onFilesSelected={ignoreFileUploadAction}
				/>
			</StorySection>
			<StorySection title="Single policy attachment">
				<FileUpload
					accept=".pdf"
					description="One PDF · 5 MB maximum"
					label="Signed policy PDF"
					onFilesSelected={ignoreFileUploadAction}
				/>
			</StorySection>
			<StorySection title="Persisted attachments with remove">
				<AttachmentList
					aria-label="Persisted invoice attachments"
					attachments={[
						persistedInvoiceAttachment,
						persistedRemittanceAttachment,
					]}
					onRemove={ignoreFileUploadAction}
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
				accept=".pdf,.png"
				description="PDF or PNG up to 10 MB"
				label="Supporting documents"
				multiple
				onFilesSelected={ignoreFileUploadAction}
			/>
			<p className="text-foreground-secondary text-sm">
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
				accept=".pdf,.png,.xlsx"
				description="Ready for selection"
				label="Supporting documents"
				multiple
				onFilesSelected={ignoreFileUploadAction}
			/>
			<FileUpload
				accept=".pdf"
				description="Upload closed for this period"
				disabled
				label="Locked attachments"
				onFilesSelected={ignoreFileUploadAction}
			/>
			<div className="grid gap-2">
				<p className="font-medium text-foreground text-sm">Attachment list</p>
				<AttachmentList
					aria-label="Invoice attachments"
					attachments={[persistedInvoiceAttachment]}
					onRemove={ignoreFileUploadAction}
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
					accept=".pdf,.png"
					description="PDF or PNG up to 10 MB"
					label="Supporting documents"
					multiple
					onFilesSelected={ignoreFileUploadAction}
				/>
			</StorySection>
			<StorySection title="Persisted attachments">
				<div className="grid gap-2">
					<p className="text-foreground-secondary text-sm">
						These records have durable identifiers and download references.
					</p>
					<AttachmentList
						aria-label="Persisted supporting documents"
						attachments={[
							persistedInvoiceAttachment,
							persistedRemittanceAttachment,
						]}
						onRemove={ignoreFileUploadAction}
					/>
				</div>
			</StorySection>
			<StorySection title="Rejected selection">
				<div
					className="rounded-md border border-destructive-border bg-destructive-subtle p-4 text-destructive-subtle-foreground text-sm"
					role="alert"
				>
					<strong>bank-details.exe</strong> was rejected. Choose PDF, PNG, or
					XLSX evidence up to 10 MB.
				</div>
			</StorySection>
			<StorySection title="Upload processing">
				<p
					aria-live="polite"
					className="rounded-md border p-4 text-foreground-secondary text-sm"
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
				<p className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
					single
				</p>
				<FileUpload
					accept=".pdf"
					label="Signed policy"
					onFilesSelected={ignoreFileUploadAction}
				/>
			</div>
			<div className="grid gap-2">
				<p className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
					multiple
				</p>
				<FileUpload
					accept=".pdf,.png,.xlsx"
					label="Supporting documents"
					multiple
					onFilesSelected={ignoreFileUploadAction}
				/>
			</div>
			<div className="grid gap-2 sm:col-span-2">
				<p className="font-medium text-foreground-tertiary text-xs uppercase tracking-wide">
					AttachmentList read-only
				</p>
				<AttachmentList
					aria-label="Read-only attachments"
					attachments={[persistedInvoiceAttachment]}
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
						<StatusBadge label="Awaiting approval" status="pending" />
					</div>
				</div>
			</CardHeader>
			<CardContent className="grid gap-4">
				<FileUpload
					accept=".pdf,.png"
					description="PDF or PNG up to 10 MB"
					label="Add evidence"
					multiple
					onFilesSelected={ignoreFileUploadAction}
				/>
				<AttachmentList
					aria-label="Invoice evidence"
					attachments={[
						persistedInvoiceAttachment,
						persistedRemittanceAttachment,
					]}
					onRemove={ignoreFileUploadAction}
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
					accept=".pdf,.png,.xlsx"
					description="PDF, PNG, or XLSX up to 10 MB"
					label="Supporting documents"
					multiple
					onFilesSelected={ignoreFileUploadAction}
				/>
			</StorySection>

			<StorySection title="Do not: rely on accept as security">
				<p className="text-foreground-secondary text-sm">
					accept only shapes the OS dialog. Feature policy and server checks
					remain authoritative for type, size, and malware scanning.
				</p>
			</StorySection>

			<StorySection title="Do: name remove actions per file">
				<AttachmentList
					aria-label="Named remove actions"
					attachments={[persistedInvoiceAttachment]}
					onRemove={ignoreFileUploadAction}
				/>
			</StorySection>

			<StorySection title="Do not: present local selection as persisted">
				<p className="text-foreground-secondary text-sm">
					A newly chosen File in memory is not a durable attachment until the
					upload Action succeeds. Keep queued and persisted states distinct in
					feature UI.
				</p>
			</StorySection>

			<StorySection title="Do: authorize remove in feature code">
				<p className="text-foreground-secondary text-sm">
					AttachmentList onRemove is presentation only. Delete outcomes and
					permission checks stay in the owning Action.
				</p>
			</StorySection>

			<StorySection title="Do not: omit a label on the chooser">
				<p className="text-foreground-secondary text-sm">
					FileUpload ships a Label. Product forms must keep a meaningful label
					so operators know which evidence bucket they are filling.
				</p>
			</StorySection>
		</div>
	),
};
