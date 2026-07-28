"use client";

import { BookmarkIcon } from "lucide-react";
import { cn } from "../../lib/utils";
import { NativeSelect, NativeSelectOption } from "./native-select";

interface SavedViewOption {
	id: string;
	label: string;
	disabled?: boolean;
}

interface SavedViewSelectProps {
	value?: string;
	views: readonly SavedViewOption[];
	onValueChange: (id: string) => void;
	placeholder?: string;
	className?: string;
	disabled?: boolean;
}

function SavedViewSelect({
	value,
	views,
	onValueChange,
	placeholder = "Select view",
	className,
	disabled,
}: SavedViewSelectProps) {
	return (
		<div className={cn("relative min-w-44", className)}>
			<BookmarkIcon
				className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground"
				aria-hidden="true"
			/>
			<NativeSelect
				value={value ?? ""}
				onChange={(event) => onValueChange(event.target.value)}
				disabled={disabled}
				className="pl-9"
				aria-label="Saved view"
			>
				<NativeSelectOption value="" disabled>
					{placeholder}
				</NativeSelectOption>
				{views.map((view) => (
					<NativeSelectOption
						key={view.id}
						value={view.id}
						disabled={view.disabled}
					>
						{view.label}
					</NativeSelectOption>
				))}
			</NativeSelect>
		</div>
	);
}

export { type SavedViewOption, SavedViewSelect };
