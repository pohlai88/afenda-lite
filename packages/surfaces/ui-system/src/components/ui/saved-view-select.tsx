"use client";

import { BookmarkIcon } from "lucide-react";
import { type ChangeEvent, useCallback } from "react";
import { cn } from "../../lib/utils";
import { NativeSelect, NativeSelectOption } from "./native-select";

interface SavedViewOption {
	disabled?: boolean;
	id: string;
	label: string;
}

interface SavedViewSelectProps {
	className?: string;
	disabled?: boolean;
	onValueChange: (id: string) => void;
	placeholder?: string;
	value?: string;
	views: readonly SavedViewOption[];
}

function SavedViewSelect({
	value,
	views,
	onValueChange,
	placeholder = "Select view",
	className,
	disabled,
}: SavedViewSelectProps) {
	const handleChange = useCallback(
		(event: ChangeEvent<HTMLSelectElement>) =>
			onValueChange(event.target.value),
		[onValueChange],
	);
	return (
		<div className={cn("relative min-w-44", className)}>
			<BookmarkIcon
				aria-hidden="true"
				className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-muted-foreground"
			/>
			<NativeSelect
				aria-label="Saved view"
				className="pl-9"
				disabled={disabled}
				onChange={handleChange}
				value={value ?? ""}
			>
				<NativeSelectOption disabled value="">
					{placeholder}
				</NativeSelectOption>
				{views.map((view) => (
					<NativeSelectOption
						disabled={view.disabled}
						key={view.id}
						value={view.id}
					>
						{view.label}
					</NativeSelectOption>
				))}
			</NativeSelect>
		</div>
	);
}

export { type SavedViewOption, SavedViewSelect };
