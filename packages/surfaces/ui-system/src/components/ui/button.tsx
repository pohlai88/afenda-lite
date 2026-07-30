import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type * as React from "react";

import { cn } from "../../lib/utils";

const buttonVariants = cva(
	"inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium text-sm outline-none transition-all focus-visible:border-ring focus-visible:ring-[1.5px] focus-visible:ring-ring-focus disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-ring-destructive-focus dark:aria-invalid:ring-ring-destructive-focus-strong [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
	{
		variants: {
			variant: {
				default: "bg-primary text-primary-foreground hover:bg-primary-hover",
				destructive:
					"bg-destructive text-destructive-foreground hover:bg-destructive-hover focus-visible:ring-ring-destructive-focus dark:bg-destructive-soft dark:focus-visible:ring-ring-destructive-focus-strong",
				outline:
					"border bg-background hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-control-fill dark:hover:bg-control-fill-hover",
				secondary:
					"bg-secondary text-secondary-foreground hover:bg-secondary-hover",
				ghost:
					"hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent-fill-hover",
				link: "text-primary underline-offset-4 hover:underline",
			},
			size: {
				default:
					"h-(--control-height) px-4 py-2 transition-[color,background-color,box-shadow] duration-(--duration-fast) ease-(--ease-standard) has-[>svg]:px-3",
				xs: "h-6 gap-1 rounded-sm px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
				sm: "h-(--control-height-sm) gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
				lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
				icon: "size-(--control-height)",
				"icon-xs": "size-6 rounded-sm [&_svg:not([class*='size-'])]:size-3",
				"icon-sm": "size-(--control-height-sm)",
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
			className={cn(buttonVariants({ variant, size, className }))}
			data-size={size}
			data-slot="button"
			data-variant={variant}
			{...props}
		/>
	);
}

export { Button, buttonVariants };
