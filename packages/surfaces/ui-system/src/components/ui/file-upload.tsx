"use client";

import { PaperclipIcon, UploadIcon, XIcon } from "lucide-react";
import * as React from "react";
import { cn } from "../../lib/utils";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";

interface UiAttachment {
	id: string;
	name: string;
	size?: number;
	href?: string;
}

interface FileUploadProps
	extends Omit<React.ComponentProps<"input">, "type" | "onChange"> {
	label?: string;
	description?: string;
	onFilesSelected: (files: readonly File[]) => void;
}

function FileUpload({
	id,
	label = "Attachments",
	description,
	className,
	onFilesSelected,
	...props
}: FileUploadProps) {
	const generatedId = React.useId();
	const inputId = id ?? generatedId;
	return (
		<div className="grid gap-2">
			<Label htmlFor={inputId}>{label}</Label>
			<label
				htmlFor={inputId}
				className={cn(
					"flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/40 p-4 text-center transition-colors hover:bg-muted focus-within:ring-2 focus-within:ring-ring",
					className,
				)}
			>
				<UploadIcon
					className="size-5 text-muted-foreground"
					aria-hidden="true"
				/>
				<span className="text-sm font-medium">Choose files</span>
				{description ? (
					<span className="text-xs text-muted-foreground">{description}</span>
				) : null}
				<Input
					id={inputId}
					type="file"
					className="sr-only"
					onChange={(event) =>
						onFilesSelected(Array.from(event.target.files ?? []))
					}
					{...props}
				/>
			</label>
		</div>
	);
}

interface AttachmentListProps extends React.ComponentProps<"ul"> {
	attachments: readonly UiAttachment[];
	onRemove?: (id: string) => void;
}

function AttachmentList({
	attachments,
	onRemove,
	className,
	...props
}: AttachmentListProps) {
	return (
		<ul className={cn("divide-y rounded-lg border", className)} {...props}>
			{attachments.map((attachment) => (
				<li key={attachment.id} className="flex items-center gap-3 px-3 py-2">
					<PaperclipIcon
						className="size-4 shrink-0 text-muted-foreground"
						aria-hidden="true"
					/>
					<div className="min-w-0 flex-1">
						<a
							href={attachment.href}
							className={cn(
								"block truncate text-sm font-medium",
								attachment.href && "underline-offset-4 hover:underline",
							)}
						>
							{attachment.name}
						</a>
						{attachment.size !== undefined ? (
							<span className="text-xs text-muted-foreground">
								{attachment.size.toLocaleString()} bytes
							</span>
						) : null}
					</div>
					{onRemove ? (
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							onClick={() => onRemove(attachment.id)}
							aria-label={`Remove ${attachment.name}`}
						>
							<XIcon aria-hidden="true" />
						</Button>
					) : null}
				</li>
			))}
		</ul>
	);
}

export {
	AttachmentList,
	type AttachmentListProps,
	FileUpload,
	type FileUploadProps,
	type UiAttachment,
};
