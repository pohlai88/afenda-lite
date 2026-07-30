"use client";

import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes, ReactNode, RefObject } from "react";
import { cn } from "../../lib/utils";

const emptyVariants = cva(
	"flex flex-col items-center justify-center text-center",
	{
		variants: {
			size: {
				sm: "px-4 py-8",
				md: "px-6 py-12",
				lg: "px-8 py-16",
			},
		},
		defaultVariants: {
			size: "md",
		},
	},
);

interface EmptyProps
	extends HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof emptyVariants> {
	action?: ReactNode;
	description?: string;
	icon?: ReactNode;
	title?: string;
}

const Empty = ({
	className,
	size,
	icon,
	title,
	description,
	action,
	children,
	ref,
	...props
}: EmptyProps & { ref?: RefObject<HTMLDivElement | null> }) => (
	<div
		aria-label={title || "Empty state"}
		className={cn(emptyVariants({ size }), className)}
		ref={ref}
		role="region"
		{...props}
	>
		{icon === null || icon === undefined ? null : (
			<div aria-hidden="true" className="mb-4 text-muted-foreground">
				{icon}
			</div>
		)}

		{title === null || title === undefined ? null : (
			<h3 className="mb-2 font-medium text-foreground text-lg">{title}</h3>
		)}

		{description === null || description === undefined ? null : (
			<p className="mb-4 max-w-sm text-muted-foreground text-sm">
				{description}
			</p>
		)}

		{action === null || action === undefined ? null : (
			<div className="mt-2">{action}</div>
		)}

		{children}
	</div>
);
Empty.displayName = "Empty";

export { Empty, emptyVariants };
