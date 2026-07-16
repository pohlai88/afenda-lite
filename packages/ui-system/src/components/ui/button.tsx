import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type * as React from "react";

import { cn } from "../../lib/utils";

const buttonVariants = cva(
	"inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring-focus disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-ring-destructive-focus dark:aria-invalid:ring-ring-destructive-focus-strong [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
	{
		variants: {
			variant: {
				default: "bg-primary text-primary-foreground hover:bg-primary-hover",
				destructive:
					"bg-destructive text-white hover:bg-destructive-hover focus-visible:ring-ring-destructive-focus dark:bg-destructive-soft dark:focus-visible:ring-ring-destructive-focus-strong",
				outline:
					"border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-control-fill dark:hover:bg-control-fill-hover",
				secondary:
					"bg-secondary text-secondary-foreground hover:bg-secondary-hover",
				ghost:
					"hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent-fill-hover",
				link: "text-primary underline-offset-4 hover:underline",
			},
			size: {
				default:
					"h-[var(--control-height)] px-4 py-2 has-[>svg]:px-3 transition-[color,background-color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-standard)]",
				xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
				sm: "h-[var(--control-height-sm)] gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
				lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
				icon: "size-[var(--control-height)]",
				"icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
				"icon-sm": "size-[var(--control-height-sm)]",
				"icon-lg": "size-10",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

function Button({
	className,
	variant = "default",
	size = "default",
	asChild = false,
	...props
}: React.ComponentProps<"button"> &
	VariantProps<typeof buttonVariants> & {
		asChild?: boolean;
	}) {
	const Comp = asChild ? Slot.Root : "button";

	return (
		<Comp
			data-slot="button"
			data-variant={variant}
			data-size={size}
			className={cn(buttonVariants({ variant, size, className }))}
			{...props}
		/>
	);
}

export { Button, buttonVariants };
