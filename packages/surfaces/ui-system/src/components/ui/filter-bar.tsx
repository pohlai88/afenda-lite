import type * as React from "react";
import { cn } from "../../lib/utils";

function FilterBar({ className, ...props }: React.ComponentProps<"section">) {
	return (
		<section
			aria-label="Filters"
			className={cn(
				"flex flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:items-end sm:justify-between",
				className,
			)}
			{...props}
		/>
	);
}

function FilterBarGroup({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn("flex flex-1 flex-wrap items-end gap-2", className)}
			{...props}
		/>
	);
}

function FilterBarActions({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			className={cn("flex shrink-0 flex-wrap items-center gap-2", className)}
			{...props}
		/>
	);
}

export { FilterBar, FilterBarActions, FilterBarGroup };
