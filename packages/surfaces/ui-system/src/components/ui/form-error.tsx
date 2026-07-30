"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { AlertCircleIcon } from "lucide-react";
import type { HTMLAttributes, RefObject } from "react";
import { cn } from "../../lib/utils";

const formErrorVariants = cva("flex items-start gap-2 font-bold text-sm", {
	variants: {
		variant: {
			default: "text-destructive-subtle-foreground",
			warning: "text-warning-subtle-foreground",
			info: "text-info-subtle-foreground",
		},
		size: {
			sm: "text-xs",
			md: "text-sm",
			lg: "text-base",
		},
	},
	defaultVariants: {
		variant: "default",
		size: "md",
	},
});

interface FormErrorProps
	extends HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof formErrorVariants> {
	message?: string;
	showIcon?: boolean;
}

const FormError = ({
	className,
	variant,
	size,
	message,
	showIcon = true,
	children,
	ref,
	...props
}: FormErrorProps & { ref?: RefObject<HTMLDivElement | null> }) => {
	const content = message || children;

	if (!content) {
		return null;
	}

	return (
		<div
			aria-live="polite"
			className={cn(formErrorVariants({ variant, size }), className)}
			ref={ref}
			role="alert"
			{...props}
		>
			{showIcon ? (
				<AlertCircleIcon
					aria-hidden="true"
					className="mt-0.5 h-4 w-4 shrink-0"
				/>
			) : null}
			<span className="flex-1">{content}</span>
		</div>
	);
};
FormError.displayName = "FormError";

export { FormError, formErrorVariants };
