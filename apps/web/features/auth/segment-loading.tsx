type SegmentLoadingProps = {
	className?: string;
};

/** Shared segment loading chrome — instant fallback, no fetch (scaffold rule). */
export function SegmentLoading({ className }: SegmentLoadingProps) {
	return (
		<main
			className={className ?? "flex min-h-dvh items-center justify-center p-8"}
		>
			<p className="text-sm text-muted-foreground">Loading…</p>
		</main>
	);
}
