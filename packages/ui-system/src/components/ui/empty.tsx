"use client";

import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "../../lib/utils";

const emptyVariants = cva(
	"flex flex-col items-center justify-center text-center",
	{
		variants: {
			size: {
				sm: "py-8 px-4",
				md: "py-12 px-6",
				lg: "py-16 px-8",
			},
		},
		defaultVariants: {
			size: "md",
		},
	},
);

interface EmptyProps
	extends React.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof emptyVariants> {
	icon?: React.ReactNode;
	title?: string;
	description?: string;
	action?: React.ReactNode;
}

const Empty = React.forwardRef<HTMLDivElement, EmptyProps>(
	(
		{ className, size, icon, title, description, action, children, ...props },
		ref,
	) => {
		return (
			<div
				ref={ref}
				role="region"
				aria-label={title || "Empty state"}
				className={cn(emptyVariants({ size }), className)}
				{...props}
			>
				{icon && (
					<div className="mb-4 text-muted-foreground" aria-hidden="true">
						{icon}
					</div>
				)}

				{title && (
					<h3 className="mb-2 text-lg font-semibold text-foreground">
						{title}
					</h3>
				)}

				{description && (
					<p className="mb-4 text-sm text-muted-foreground max-w-sm">
						{description}
					</p>
				)}

				{action && <div className="mt-2">{action}</div>}

				{children}
			</div>
		);
	},
);
Empty.displayName = "Empty";

export { Empty, emptyVariants };
