import type * as React from "react";
import { cn } from "../../lib/utils";

function Toolbar({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card p-2",
				className,
			)}
			role="toolbar"
			{...props}
		/>
	);
}

function ToolbarGroup({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn("flex flex-wrap items-center gap-1", className)}
			role="group"
			{...props}
		/>
	);
}

function ToolbarSeparator({
	className,
	...props
}: React.ComponentProps<"span">) {
	return (
		<span
			aria-hidden="true"
			className={cn("mx-1 hidden h-6 w-px bg-border sm:block", className)}
			{...props}
		/>
	);
}

export { Toolbar, ToolbarGroup, ToolbarSeparator };
