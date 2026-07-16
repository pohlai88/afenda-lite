import type * as React from "react";

import { cn } from "../../lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
	return (
		<input
			type={type}
			data-slot="input"
			className={cn(
				"h-[var(--control-height)] w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-[var(--shadow-raised)] transition-[color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-standard)] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-control-fill",
				"focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring-focus",
				"aria-invalid:border-destructive aria-invalid:ring-ring-destructive-focus dark:aria-invalid:ring-ring-destructive-focus-strong",
				className,
			)}
			{...props}
		/>
	);
}

export { Input };
