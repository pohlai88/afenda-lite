"use client";

import { PaperclipIcon, UploadIcon, XIcon } from "lucide-react";
import {
	type ChangeEvent,
	type ComponentProps,
	type MouseEvent,
	useCallback,
	useId,
} from "react";
import { cn } from "../../lib/utils";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";

interface UiAttachment {
	href?: string;
	id: string;
	name: string;
	size?: number;
}

interface FileUploadProps
	extends Omit<ComponentProps<"input">, "type" | "onChange"> {
	description?: string;
	label?: string;
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
	const generatedId = useId();
	const inputId = id ?? generatedId;
	const handleFilesSelected = useCallback(
		(event: ChangeEvent<HTMLInputElement>) =>
			onFilesSelected(Array.from(event.target.files ?? [])),
		[onFilesSelected],
	);
	return (
		<div className="grid gap-2">
			<Label htmlFor={inputId}>{label}</Label>
			<label
				className={cn(
					"flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/40 p-4 text-center transition-colors focus-within:ring-2 focus-within:ring-ring hover:bg-muted",
					className,
				)}
				htmlFor={inputId}
			>
				<UploadIcon
					aria-hidden="true"
					className="size-5 text-muted-foreground"
				/>
				<span className="font-medium text-sm">Choose files</span>
				{description ? (
					<span className="text-muted-foreground text-xs">{description}</span>
				) : null}
				<Input
					className="sr-only"
					id={inputId}
					onChange={handleFilesSelected}
					type="file"
					{...props}
				/>
			</label>
		</div>
	);
}

interface AttachmentListProps extends ComponentProps<"ul"> {
	attachments: readonly UiAttachment[];
	onRemove?: (id: string) => void;
}

function AttachmentList({
	attachments,
	onRemove,
	className,
	...props
}: AttachmentListProps) {
	const handleRemove = useCallback(
		(event: MouseEvent<HTMLButtonElement>) =>
			onRemove?.(event.currentTarget.value),
		[onRemove],
	);
	return (
		<ul className={cn("divide-y rounded-lg border", className)} {...props}>
			{attachments.map((attachment) => (
				<li className="flex items-center gap-3 px-3 py-2" key={attachment.id}>
					<PaperclipIcon
						aria-hidden="true"
						className="size-4 shrink-0 text-muted-foreground"
					/>
					<div className="min-w-0 flex-1">
						<a
							className={cn(
								"block truncate font-medium text-sm",
								attachment.href && "underline-offset-4 hover:underline",
							)}
							href={attachment.href}
						>
							{attachment.name}
						</a>
						{attachment.size === undefined ? null : (
							<span className="text-muted-foreground text-xs">
								{attachment.size.toLocaleString()} bytes
							</span>
						)}
					</div>
					{onRemove ? (
						<Button
							aria-label={`Remove ${attachment.name}`}
							onClick={handleRemove}
							size="icon-sm"
							type="button"
							value={attachment.id}
							variant="ghost"
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
