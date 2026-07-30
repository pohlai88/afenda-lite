import { cn } from "../../lib/utils";

/**
 * Inline monospace identifier — org/user/audit IDs, slugs, codes, paths.
 * Locked to the caption/tertiary type role (afenda-elite-ui-compose):
 * `font-mono text-sm text-foreground-tertiary`. Server-safe leaf.
 */
function Code({ className, ...props }: React.ComponentProps<"code">) {
	return (
		<code
			className={cn("font-mono text-foreground-tertiary text-sm", className)}
			data-slot="code"
			{...props}
		/>
	);
}

export { Code };
