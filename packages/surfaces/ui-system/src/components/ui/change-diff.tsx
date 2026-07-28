import type * as React from "react";
import { cn } from "../../lib/utils";

interface ChangeDiffRowProps extends React.ComponentProps<"div"> {
	label: React.ReactNode;
	before: React.ReactNode;
	after: React.ReactNode;
	changed?: boolean;
}

function ChangeDiffRow({
	label,
	before,
	after,
	changed = true,
	className,
	...props
}: ChangeDiffRowProps) {
	return (
		<div
			className={cn(
				"grid gap-2 border-b py-3 last:border-b-0 sm:grid-cols-[minmax(8rem,0.7fr)_1fr_1fr]",
				className,
			)}
			{...props}
		>
			<div className="text-sm font-medium">{label}</div>
			<div
				className={cn(
					"rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground",
					changed && "line-through",
				)}
			>
				<span className="sr-only">Previous value: </span>
				{before}
			</div>
			<div
				className={cn(
					"rounded-md px-3 py-2 text-sm",
					changed
						? "bg-info-subtle text-info-subtle-foreground"
						: "bg-muted text-muted-foreground",
				)}
			>
				<span className="sr-only">New value: </span>
				{after}
			</div>
		</div>
	);
}

function ChangeDiff({ className, ...props }: React.ComponentProps<"div">) {
	return <div className={cn("rounded-lg border px-4", className)} {...props} />;
}

export { ChangeDiff, ChangeDiffRow };
