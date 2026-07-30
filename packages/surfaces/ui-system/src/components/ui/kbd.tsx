import { cn } from "../../lib/utils";

function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
	return (
		<kbd
			className={cn(
				"pointer-events-none inline-flex h-5 w-fit min-w-5 select-none items-center justify-center gap-1 rounded-sm bg-muted px-1 font-medium font-sans text-foreground text-xs",
				"[&_svg:not([class*='size-'])]:size-3",
				"[[data-slot=tooltip-content]_&]:bg-kbd-tooltip-fill [[data-slot=tooltip-content]_&]:text-background",
				className,
			)}
			data-slot="kbd"
			{...props}
		/>
	);
}

function KbdGroup({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<kbd
			className={cn("inline-flex items-center gap-1", className)}
			data-slot="kbd-group"
			{...props}
		/>
	);
}

export { Kbd, KbdGroup };
