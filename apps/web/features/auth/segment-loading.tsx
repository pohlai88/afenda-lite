"use client";

import { Spinner } from "@afenda/ui-system";

type SegmentLoadingProps = {
	className?: string;
};

/** Shared segment loading chrome — instant fallback, no fetch (scaffold rule). */
export function SegmentLoading({ className }: SegmentLoadingProps) {
	return (
		<main
			className={
				className ?? "flex min-h-dvh items-center justify-center gap-3 p-4"
			}
		>
			<Spinner size="md" variant="secondary" label="Loading" />
		</main>
	);
}
