import type * as React from "react";
import { cn } from "../../lib/utils";

interface BulkActionBarProps extends React.ComponentProps<"div"> {
	selectedCount: number;
	actions: React.ReactNode;
	selectionLabel?: (count: number) => string;
}

function BulkActionBar({
	selectedCount,
	actions,
	selectionLabel = (count) => `${count} selected`,
	className,
	...props
}: BulkActionBarProps) {
	if (selectedCount < 1) return null;
	return (
		<div
			role="region"
			aria-label="Bulk actions"
			className={cn(
				"flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-surface-raised px-4 py-3 text-card-foreground shadow-(--shadow-raised)",
				className,
			)}
			{...props}
		>
			<p className="text-sm font-medium" aria-live="polite">
				{selectionLabel(selectedCount)}
			</p>
			<div className="flex flex-wrap items-center gap-2">{actions}</div>
		</div>
	);
}

export { BulkActionBar };
