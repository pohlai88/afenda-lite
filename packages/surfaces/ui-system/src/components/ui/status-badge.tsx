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
import type { HTMLAttributes, RefObject } from "react";
import { cn } from "../../lib/utils";

const statusBadgeVariants = cva(
	// font-medium matches Badge weight; text-sm keeps APCA-readable status labels.
	"inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-full border px-2 py-0.5 font-medium text-sm transition-colors [&_svg]:pointer-events-none [&_svg]:size-3",
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
				inactive: "border-border bg-muted text-foreground-secondary",
				active: "border-info-border bg-info-subtle text-info-subtle-foreground",
			},
			size: {
				sm: "gap-1 px-1.5 py-0.5 text-xs",
				md: "gap-1 px-2 py-0.5 text-sm",
				lg: "gap-1.5 px-2.5 py-1 text-sm",
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
	extends HTMLAttributes<HTMLSpanElement>,
		VariantProps<typeof statusBadgeVariants> {
	label?: string;
	showIcon?: boolean;
}

const StatusBadge = ({
	className,
	status = "inactive",
	size,
	label,
	showIcon = true,
	children,
	ref,
	...props
}: StatusBadgeProps & { ref?: RefObject<HTMLSpanElement | null> }) => {
	const content = label || children;
	const IconComponent = status ? statusIcons[status] : null;

	return (
		<span
			aria-label={`Status: ${content}`}
			className={cn(statusBadgeVariants({ status, size }), className)}
			ref={ref}
			role="status"
			{...props}
		>
			{showIcon && IconComponent ? <IconComponent aria-hidden="true" /> : null}
			{content}
		</span>
	);
};
StatusBadge.displayName = "StatusBadge";

export { StatusBadge, statusBadgeVariants };
