import type * as React from "react";

import { cn } from "../../lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
	return (
		<input
			className={cn(
				"h-(--control-height) w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base outline-none transition-[color,box-shadow] duration-(--duration-fast) ease-(--ease-standard) selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:font-medium file:text-foreground file:text-sm placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-control-fill",
				"focus-visible:border-ring focus-visible:ring-[1.5px] focus-visible:ring-ring-focus",
				"aria-invalid:border-destructive aria-invalid:ring-ring-destructive-focus dark:aria-invalid:ring-ring-destructive-focus-strong",
				className,
			)}
			data-slot="input"
			type={type}
			{...props}
		/>
	);
}

export { Input };
