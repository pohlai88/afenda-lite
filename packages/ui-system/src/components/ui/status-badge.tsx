"use client";

import { cva, type VariantProps } from "class-variance-authority";
import {
	AlertCircleIcon,
	CheckCircleIcon,
	ClockIcon,
	PauseCircleIcon,
	PlayCircleIcon,
	XCircleIcon,
} from "lucide-react";
import * as React from "react";
import { cn } from "../../lib/utils";

const statusBadgeVariants = cva(
	"inline-flex w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full border px-2 py-1 text-xs font-medium whitespace-nowrap transition-colors",
	{
		variants: {
			status: {
				success:
					"border-success-border bg-success-subtle text-success-subtle-foreground",
				pending:
					"border-warning-border bg-warning-subtle text-warning-subtle-foreground",
				error:
					"border-destructive-border bg-destructive-subtle text-destructive-subtle-foreground",
				warning:
					"border-warning-border bg-warning-subtle text-warning-subtle-foreground",
				inactive: "border-border bg-muted text-muted-foreground",
				active:
					"border-info-border bg-info-subtle text-info-subtle-foreground",
			},
			size: {
				sm: "px-1.5 py-0.5 text-xs",
				md: "px-2 py-1 text-xs",
				lg: "px-3 py-1.5 text-sm",
			},
		},
		defaultVariants: {
			status: "inactive",
			size: "md",
		},
	},
);

const statusIcons = {
	success: CheckCircleIcon,
	pending: ClockIcon,
	error: XCircleIcon,
	warning: AlertCircleIcon,
	inactive: PauseCircleIcon,
	active: PlayCircleIcon,
} as const;

interface StatusBadgeProps
	extends React.HTMLAttributes<HTMLSpanElement>,
		VariantProps<typeof statusBadgeVariants> {
	label?: string;
	showIcon?: boolean;
}

const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
	(
		{
			className,
			status = "inactive",
			size,
			label,
			showIcon = true,
			children,
			...props
		},
		ref,
	) => {
		const content = label || children;
		const IconComponent = status ? statusIcons[status] : null;

		return (
			<span
				ref={ref}
				className={cn(statusBadgeVariants({ status, size }), className)}
				role="status"
				aria-label={`Status: ${content}`}
				{...props}
			>
				{showIcon && IconComponent && (
					<IconComponent className="h-3 w-3" aria-hidden="true" />
				)}
				{content}
			</span>
		);
	},
);
StatusBadge.displayName = "StatusBadge";

export { StatusBadge, statusBadgeVariants };
