"use client";

import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes, RefObject } from "react";
import { cn } from "../../lib/utils";

const spinnerVariants = cva(
	"animate-spin rounded-full border-2 border-current border-t-transparent",
	{
		variants: {
			size: {
				sm: "h-4 w-4",
				md: "h-6 w-6",
				lg: "h-8 w-8",
				xl: "h-12 w-12",
			},
			variant: {
				default: "text-primary",
				secondary: "text-muted-foreground",
				destructive: "text-destructive-subtle-foreground",
			},
		},
		defaultVariants: {
			size: "md",
			variant: "default",
		},
	},
);

interface SpinnerProps
	extends HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof spinnerVariants> {
	label?: string;
}

const Spinner = ({
	className,
	size,
	variant,
	label = "Loading",
	ref,
	...props
}: SpinnerProps & { ref?: RefObject<HTMLDivElement | null> }) => (
	<div
		aria-label={label}
		aria-live="polite"
		className={cn(spinnerVariants({ size, variant }), className)}
		ref={ref}
		role="status"
		{...props}
	>
		<span className="sr-only">{label}</span>
	</div>
);
Spinner.displayName = "Spinner";

export { Spinner, spinnerVariants };
