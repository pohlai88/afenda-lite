import { cn } from "../../lib/utils";

/**
 * Inline monospace identifier — org/user/audit IDs, slugs, codes, paths.
 * Locked to the caption/tertiary type role (afenda-elite-ui-compose):
 * `font-mono text-sm text-foreground-tertiary`. Server-safe leaf.
 */
function Code({ className, ...props }: React.ComponentProps<"code">) {
	return (
		<code
			data-slot="code"
			className={cn(
				"font-mono text-sm text-foreground-tertiary",
				className,
			)}
			{...props}
		/>
	);
}

export { Code };
